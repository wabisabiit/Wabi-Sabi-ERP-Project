# products/views_reports.py  (append at the end, or place in a new file and import)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.utils.dateparse import parse_date
from django.db.models import Prefetch
from .models import StockTransferLine
from django.http import JsonResponse

def _nm(v):  # safe str
    return (v or "").strip()

@api_view(["GET"])
@permission_classes([AllowAny])
def master_packing_item_wise(request):
    """
    GET /api/reports/master-packing-item-wise/
      ?date_from=YYYY-MM-DD
      &date_to=YYYY-MM-DD
      &from_location=<Location.code or name>
      &to_location=<Location.code or name>
      &status=OPEN|CLOSED   (ignored for now; default OPEN in rows)
    Returns a flat list of item rows for the UI table.
    """
    df = parse_date(request.query_params.get("date_from") or "")
    dt = parse_date(request.query_params.get("date_to") or "")
    from_q = (request.query_params.get("from_location") or "").strip()
    to_q   = (request.query_params.get("to_location") or "").strip()

    qs = (
        StockTransferLine.objects
        .select_related(
            "transfer", "product",
            "product__task_item",
            "transfer__from_location",
            "transfer__to_location",
        )
        .order_by("barcode")
    )
    if df:
        qs = qs.filter(transfer__created_at__date__gte=df)
    if dt:
        qs = qs.filter(transfer__created_at__date__lte=dt)
    if from_q and from_q.lower() != "all":
        qs = qs.filter(
            models.Q(transfer__from_location__code__iexact=from_q) |
            models.Q(transfer__from_location__name__iexact=from_q)
        )
    if to_q and to_q.lower() != "all":
        qs = qs.filter(
            models.Q(transfer__to_location__code__iexact=to_q) |
            models.Q(transfer__to_location__name__iexact=to_q)
        )

    def dmy(d):
        return d.strftime("%d/%m/%Y")

    rows = []
    for line in qs:
        t  = line.transfer
        p  = line.product
        ti = getattr(p, "task_item", None)

        # names from TaskMaster (as requested)
        print_name = _nm(getattr(ti, "item_print_friendly_name", "")) if ti else ""
        vasy_name  = _nm(getattr(ti, "item_vasy_name", "")) if ti else ""
        full_name  = _nm(getattr(ti, "item_full_name", "")) if ti else ""
        product_name = print_name or vasy_name or full_name

        # department from TaskMaster (fallback to category)
        department = _nm(getattr(ti, "department", "")) if ti and hasattr(ti, "department") else _nm(getattr(ti, "category", ""))

        rows.append({
            # keep keys simple; we'll map to UI labels in React
            "from_location": _nm(getattr(t.from_location, "name", t.from_location.code)),
            "transfer_date": dmy(t.created_at.date()),
            "document_number": t.number,
            "hsn_code": _nm(getattr(ti, "hsn_code", "")) if ti else "",
            "to_location": _nm(getattr(t.to_location, "name", t.to_location.code)),
            "branch_status": "OPEN",             # default
            "transfer_in_date": "-",             # default
            "product_name": product_name,
            "print_name": print_name,
            "department_name": department,
            "item_code": line.barcode,           # barcode = ItemCode
            "quantity": 1,                       # default 1 (per spec)
            # leave other financial fields empty except MRP/SP (come from backend)
            "value": "",                         # empty
            "unit_price": "",                    # empty
            "tax_percent": "",                   # empty
            "taxable_value": "",                 # empty
            "mrp": str(line.mrp or p.mrp or 0),
            "sale_price": str(line.sp or p.selling_price or 0),
        })

    return JsonResponse({"items": rows})
