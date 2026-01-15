# products/views_sales_return.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.shortcuts import get_object_or_404

from taskmaster.models import Location
from .models import Sale, CreditNote


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

                # ✅ Your current CreditNote model stores qty and amount
                # amount should be based on SaleLine.sp (billed price)
                cn = CreditNote.objects.create(
                    sale=sale,
                    customer=sale.customer,
                    location=loc,  # ✅ important
                    date=sale.transaction_date,
                    note_date=sale.transaction_date,
                    product=ln.product,
                    barcode=ln.barcode,
                    qty=qty_to_return,
                    amount=(ln.sp or 0) * qty_to_return,
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
