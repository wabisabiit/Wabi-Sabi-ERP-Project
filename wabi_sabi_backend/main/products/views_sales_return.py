# products/views_sales_return.py
from decimal import Decimal, ROUND_HALF_UP

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Sum

from taskmaster.models import Location
from .models import Sale, CreditNote


TWOPLACES = Decimal("0.01")


def q2(x):
    return (Decimal(x or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _sale_to_cart_lines(sale: Sale):
    rows = []
    for ln in sale.lines.select_related("product", "product__task_item").all():
        ti = getattr(ln.product, "task_item", None)
        name = ""
        if ti:
            name = (
                getattr(ti, "item_print_friendly_name", "")
                or getattr(ti, "item_vasy_name", "")
                or getattr(ti, "item_full_name", "")
                or ""
            )
        rows.append(
            {
                "barcode": ln.barcode,
                "qty": ln.qty,
                "mrp": str(ln.mrp),
                "sp": str(ln.sp),
                "name": name or ln.barcode,
            }
        )
    return rows


def _net_unit_paid_map_from_sale(sale: Sale):
    """
    Returns dict: { barcode: Decimal(net_unit_paid) } based on:
      - per-line discount (SaleLine.discount_amount)
      - bill-level discount (derived from payments sum vs base_total)
      - coupon discount (if recorded as payment method=COUPON) is naturally included because payments sum reflects NET payable
    """
    lines = list(
        sale.lines.all().values("barcode", "qty", "sp", "discount_amount")
    )

    def d(x):
        try:
            return Decimal(str(x or 0))
        except Exception:
            return Decimal("0")

    base_total = Decimal("0")
    line_rows = []
    for r in lines:
        bc = str(r.get("barcode") or "").strip()
        qty_sold = max(1, int(r.get("qty") or 1))
        sp = d(r.get("sp"))
        row_disc = d(r.get("discount_amount"))
        base_unit = sp - row_disc
        if base_unit < 0:
            base_unit = Decimal("0")
        base_line = base_unit * Decimal(qty_sold)
        base_total += base_line
        line_rows.append((bc, qty_sold, base_unit, base_line))

    # total actually paid (NET payable) = sum(payments)
    paid_total = Decimal("0")
    try:
        paid_total = d(sale.payments.aggregate(s=Sum("amount")).get("s") or 0)
    except Exception:
        paid_total = Decimal("0")

    bill_disc_total = base_total - paid_total
    if bill_disc_total < 0:
        bill_disc_total = Decimal("0")

    out = {}
    for (bc, qty_sold, base_unit, base_line) in line_rows:
        share = (base_line / base_total) if base_total > 0 else Decimal("0")
        alloc_bill_disc_line = bill_disc_total * share
        net_line_total = base_line - alloc_bill_disc_line
        if net_line_total < 0:
            net_line_total = Decimal("0")

        net_unit_paid = (net_line_total / Decimal(qty_sold)) if qty_sold > 0 else Decimal("0")
        out[bc] = q2(net_unit_paid)

    return out


class SaleLinesByInvoice(APIView):
    """
    GET /api/sales/<invoice_no>/lines/
    """

    def get(self, request, invoice_no: str):
        inv = (invoice_no or "").strip()
        sale = get_object_or_404(Sale, invoice_no__iexact=inv)
        return Response({"invoice_no": sale.invoice_no, "lines": _sale_to_cart_lines(sale)})


class SalesReturn(APIView):
    """
    POST /api/sales/<invoice_no>/return/

    ✅ NEW (optional body):
      - { "barcode": "ABC" }                          -> return 1 qty of ABC
      - { "barcodes": ["A","B"] }                     -> return 1 qty each
      - { "items": [{"barcode":"A","qty":1}, ...] }   -> return qty per barcode

    Old behavior preserved:
      - if body is empty -> creates Credit Notes for ALL sale lines.

    Idempotent:
      - if CRNs already exist for this sale, we just report them.
    """

    def post(self, request, invoice_no: str):
        inv = (invoice_no or "").strip()
        sale = get_object_or_404(
            Sale.objects.select_related("customer"),
            invoice_no__iexact=inv,
        )

        existing = list(
            CreditNote.objects.filter(sale=sale).values_list("note_no", flat=True)
        )
        if existing:
            return Response(
                {
                    "ok": True,
                    "created": False,
                    "notes": existing,
                    "msg": "Credit note(s) already exist.",
                }
            )

        # ✅ set location for dashboard scoping
        # sale.store is forced to manager's location code in SalesView.post
        loc = None
        try:
            store_code = (sale.store or "").strip()
            if store_code:
                loc = Location.objects.filter(code__iexact=store_code).first()
        except Exception:
            loc = None

        # ---------------- NEW: read selection (optional) ----------------
        data = request.data or {}

        barcode_single = (data.get("barcode") or "").strip()
        barcodes_list = data.get("barcodes")
        items_list = data.get("items")

        # Normalize to dict: { barcode: qty_to_return }
        selected = {}

        if barcode_single:
            selected[barcode_single] = selected.get(barcode_single, 0) + 1

        if isinstance(barcodes_list, list):
            for bc in barcodes_list:
                bc = str(bc or "").strip()
                if bc:
                    selected[bc] = selected.get(bc, 0) + 1

        if isinstance(items_list, list):
            for row in items_list:
                bc = str((row or {}).get("barcode") or "").strip()
                try:
                    qty = int((row or {}).get("qty") or 1)
                except Exception:
                    qty = 1
                if bc and qty > 0:
                    selected[bc] = selected.get(bc, 0) + qty

        created_nos = []

        with transaction.atomic():
            # compute NET paid per unit map (handles coupon + bill discount)
            net_unit_paid_map = _net_unit_paid_map_from_sale(sale)

            # If selected is empty -> old behavior (all lines)
            lines_qs = sale.lines.select_related("product").all()
            if selected:
                lines_qs = lines_qs.filter(barcode__in=list(selected.keys()))

            for ln in lines_qs:
                # Determine qty to return
                if selected:
                    qty_to_return = int(selected.get(ln.barcode, 0) or 0)
                    # don't allow returning more than purchased qty
                    qty_to_return = max(0, min(qty_to_return, int(ln.qty or 0)))
                else:
                    qty_to_return = int(ln.qty or 0)

                if qty_to_return <= 0:
                    continue

                # ✅ FIX: credit note amount must match customer's ACTUAL paid price (net),
                # including coupon + bill discount allocation.
                net_unit = net_unit_paid_map.get(str(ln.barcode or "").strip())
                if net_unit is None:
                    # fallback: at least apply line discount if present
                    sp = q2(getattr(ln, "sp", 0) or 0)
                    da = q2(getattr(ln, "discount_amount", 0) or 0)
                    net_unit = q2(sp - da)
                    if net_unit < 0:
                        net_unit = Decimal("0.00")

                amount = q2(net_unit * Decimal(qty_to_return))

                # ✅ Your current CreditNote model stores qty and amount
                cn = CreditNote.objects.create(
                    sale=sale,
                    customer=sale.customer,
                    location=loc,  # ✅ important
                    date=sale.transaction_date,
                    note_date=sale.transaction_date,
                    product=ln.product,
                    barcode=ln.barcode,
                    qty=qty_to_return,
                    amount=amount,
                )
                created_nos.append(cn.note_no)

        if not created_nos:
            return Response(
                {"ok": False, "created": False, "notes": [], "msg": "No items selected for return."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"ok": True, "created": True, "notes": created_nos, "msg": "Credit note created."},
            status=status.HTTP_201_CREATED,
        )