from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import Sale, CreditNote

def _sale_to_cart_lines(sale: Sale):
    rows = []
    for ln in sale.lines.select_related("product", "product__task_item").all():
        ti = getattr(ln.product, "task_item", None)
        name = ""
        if ti:
            name = getattr(ti, "item_print_friendly_name", "") \
                or getattr(ti, "item_vasy_name", "") \
                or getattr(ti, "item_full_name", "") \
                or ""
        rows.append({
            "barcode": ln.barcode,
            "qty": ln.qty,
            "mrp": str(ln.mrp),
            "sp": str(ln.sp),
            "name": name or ln.barcode,
        })
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
    Creates Credit Notes (CRN01, CRN02, ...) for this sale's lines.
    Idempotent: if CRNs already exist for this sale, we just report them.
    """
    def post(self, request, invoice_no: str):
        inv = (invoice_no or "").strip()
        sale = get_object_or_404(Sale.objects.select_related("customer"), invoice_no__iexact=inv)

        existing = list(CreditNote.objects.filter(sale=sale).values_list("note_no", flat=True))
        if existing:
            return Response({"ok": True, "created": False, "notes": existing, "msg": "Credit note(s) already exist."})

        created_nos = []
        with transaction.atomic():
            for ln in sale.lines.select_related("product").all():
                cn = CreditNote.objects.create(
                    sale=sale,
                    customer=sale.customer,
                    date=sale.transaction_date,
                    note_date=sale.transaction_date,
                    product=ln.product,
                    barcode=ln.barcode,
                    qty=ln.qty,
                    amount=(ln.sp or 0) * ln.qty
                )
                created_nos.append(cn.note_no)

        return Response({"ok": True, "created": True, "notes": created_nos, "msg": "Credit note created."},
                        status=status.HTTP_201_CREATED)
