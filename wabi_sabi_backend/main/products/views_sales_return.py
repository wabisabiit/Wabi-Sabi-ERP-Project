# products/views_sales_return.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404

from taskmaster.models import Location
from django.db.models import Sum
from decimal import Decimal, ROUND_HALF_UP

from .models import Sale, CreditNote, SaleLine, SalePayment


TWOPLACES = Decimal("0.01")


def q2(x):
    try:
        return Decimal(str(x or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    except Exception:
        return Decimal("0.00")


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


def _calc_net_unit_paid_map(sale: Sale):
    """
    Returns: dict { barcode: Decimal(net_unit_paid) }
    Uses same logic as CreditNote.save:
      - base_line = (sp - discount_amount) * qty
      - paid_total = sum(payments.amount)
      - bill_disc_total = base_total - paid_total (clamped >= 0)
      - allocate bill_disc proportionally to base_line
    """
    lines = list(
        SaleLine.objects.filter(sale=sale).values("barcode", "qty", "sp", "discount_amount")
    )

    base_total = Decimal("0.00")
    line_rows = []
    for r in lines:
        bc = str(r.get("barcode") or "").strip()
        qty_sold = max(1, int(r.get("qty") or 1))
        sp = q2(r.get("sp"))
        row_disc = q2(r.get("discount_amount"))
        base_unit = q2(sp - row_disc)
        if base_unit < 0:
            base_unit = Decimal("0.00")
        base_line = q2(base_unit * Decimal(qty_sold))
        base_total = q2(base_total + base_line)
        line_rows.append((bc, qty_sold, base_unit, base_line))

    paid_total = Decimal("0.00")
    try:
        paid_total = q2(
            SalePayment.objects.filter(sale=sale).aggregate(s=Sum("amount")).get("s") or 0
        )
    except Exception:
        paid_total = Decimal("0.00")

    bill_disc_total = q2(base_total - paid_total)
    if bill_disc_total < 0:
        bill_disc_total = Decimal("0.00")

    out = {}
    for (bc, qty_sold, base_unit, base_line) in line_rows:
        share = (base_line / base_total) if base_total > 0 else Decimal("0.00")
        alloc_bill_disc_line = q2(bill_disc_total * share)

        net_line_total = q2(base_line - alloc_bill_disc_line)
        if net_line_total < 0:
            net_line_total = Decimal("0.00")

        net_unit_paid = q2(net_line_total / Decimal(qty_sold)) if qty_sold > 0 else Decimal("0.00")
        out[bc] = net_unit_paid

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
            # If selected is empty -> old behavior (all lines)
            lines_qs = sale.lines.select_related("product").all()
            if selected:
                lines_qs = lines_qs.filter(barcode__in=list(selected.keys()))

            lines = list(lines_qs)

            if not lines:
                return Response(
                    {"ok": False, "created": False, "notes": [], "msg": "No items selected for return."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            net_unit_paid_map = _calc_net_unit_paid_map(sale)

            selected_barcodes = []
            total_qty = 0
            total_amount = Decimal("0.00")

            for ln in lines:
                # Determine qty to return
                if selected:
                    qty_to_return = int(selected.get(ln.barcode, 0) or 0)
                    # don't allow returning more than purchased qty
                    qty_to_return = max(0, min(qty_to_return, int(ln.qty or 0)))
                else:
                    qty_to_return = int(ln.qty or 0)

                if qty_to_return <= 0:
                    continue

                bc = str(ln.barcode or "").strip()
                net_unit_paid = q2(net_unit_paid_map.get(bc, q2(ln.sp or 0)))
                amt = q2(net_unit_paid * Decimal(qty_to_return))

                selected_barcodes.append(bc)
                total_qty += qty_to_return
                total_amount = q2(total_amount + amt)

            if total_qty <= 0 or total_amount <= 0:
                return Response(
                    {"ok": False, "created": False, "notes": [], "msg": "No items selected for return."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ✅ ONE credit note for all selected products
            barcode_joined = ",".join(selected_barcodes)
            first_ln = lines[0]

            cn = CreditNote.objects.create(
                sale=sale,
                customer=sale.customer,
                location=loc,  # ✅ important
                date=timezone.localdate(),
                note_date=timezone.localdate(),
                product=first_ln.product,
                barcode=barcode_joined,
                qty=total_qty,
                amount=total_amount,
            )
            created_nos.append(cn.note_no)

        return Response(
            {"ok": True, "created": True, "notes": created_nos, "msg": "Credit note created."},
            status=status.HTTP_201_CREATED,
        )
