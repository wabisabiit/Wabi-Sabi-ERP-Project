# products/views_reports_masterpacking.py

from decimal import Decimal, ROUND_HALF_UP

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_date
from django.db.models import Q
from django.http import JsonResponse

from .models import MasterPackLine


TWOPLACES = Decimal("0.01")


def _nm(v):
    return (v or "").strip()


def _norm_dash(s: str) -> str:
    # normalize en-dash/em-dash/minus variants to plain hyphen for matching
    return (s or "").replace("–", "-").replace("—", "-").replace("−", "-").strip()


def _q2(x):
    try:
        return Decimal(x or 0).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    except Exception:
        return Decimal("0.00")


def _loc_filter_q(field_prefix: str, raw: str):
    """
    Build a tolerant Q() for matching Location by code or name.
    raw may be code or the full name from dropdown (often contains en-dash).
    """
    v = _norm_dash(_nm(raw))
    if not v or v.lower() == "all":
        return Q()

    # allow both exact and contains for name (dropdown may have slightly different punctuation)
    return (
        Q(**{f"{field_prefix}__code__iexact": v})
        | Q(**{f"{field_prefix}__name__iexact": v})
        | Q(**{f"{field_prefix}__name__icontains": v})
        | Q(**{f"{field_prefix}__name__icontains": v.replace("-", " ")})
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def master_packing_item_wise(request):
    """
    GET /api/reports/master-packing-item-wise/
      ?date_from=YYYY-MM-DD
      &date_to=YYYY-MM-DD
      &from_location=<Location.code or name>
      &to_location=<Location.code or name>
      &status=... (ignored)
    Returns:
      {"items": [ ... ]}
    """

    df = parse_date((request.query_params.get("date_from") or "").strip())
    dt = parse_date((request.query_params.get("date_to") or "").strip())
    from_q = (request.query_params.get("from_location") or "").strip()
    to_q = (request.query_params.get("to_location") or "").strip()

    qs = (
        MasterPackLine.objects.select_related(
            "pack",
            "pack__from_location",
            "pack__to_location",
            "product",
            "product__task_item",
        )
        .order_by("barcode", "id")
    )

    # date filter on pack.created_at
    if df:
        qs = qs.filter(pack__created_at__date__gte=df)
    if dt:
        qs = qs.filter(pack__created_at__date__lte=dt)

    # location filters (tolerant)
    q_from = _loc_filter_q("pack__from_location", from_q)
    q_to = _loc_filter_q("pack__to_location", to_q)
    if q_from:
        qs = qs.filter(q_from)
    if q_to:
        qs = qs.filter(q_to)

    def dmy(d):
        if not d:
            return ""
        return d.strftime("%d/%m/%Y")

    rows = []
    for line in qs:
        pack = line.pack
        fl = getattr(pack, "from_location", None)
        tl = getattr(pack, "to_location", None)

        p = line.product
        ti = getattr(p, "task_item", None)

        # names from TaskMaster (as requested)
        print_name = _nm(getattr(ti, "item_print_friendly_name", "")) if ti else ""
        vasy_name = _nm(getattr(ti, "item_vasy_name", "")) if ti else ""
        full_name = _nm(getattr(ti, "item_full_name", "")) if ti else ""
        product_name = print_name or vasy_name or full_name

        # selling price + mrp
        sp = _q2(getattr(line, "sp", None) or getattr(p, "selling_price", None) or 0)
        mrp = _q2(getattr(p, "mrp", None) or 0)

        # tax rule: <= 2500 => 5%, > 2500 => 18%
        tax_percent = Decimal("5") if sp <= Decimal("2500") else Decimal("18")
        taxable_value = _q2(sp - (sp * tax_percent / Decimal("100")))

        created_at = getattr(pack, "created_at", None)
        created_date = created_at.date() if created_at else None

        rows.append(
            {
                "from_location": _nm(getattr(fl, "name", "") or getattr(fl, "code", "")),
                "transfer_date": dmy(created_date),
                # ✅ document number must be Master packing number like MP/WS/0001
                "document_number": _nm(getattr(pack, "number", "")),
                # ✅ leave blank for now
                "hsn_code": "",
                "to_location": _nm(getattr(tl, "name", "") or getattr(tl, "code", "")),
                # ✅ default ACTIVE (UI will style it light green + white text)
                "branch_status": "ACTIVE",
                # ✅ same as transfer date
                "transfer_in_date": dmy(created_date),
                "product_name": product_name,
                "print_name": print_name,
                # ✅ leave blank for now
                "department_name": "",
                # ✅ barcode = ItemCode
                "item_code": _nm(getattr(line, "barcode", "")),
                # ✅ default 1
                "quantity": 1,
                # ✅ leave blank
                "value": "",
                # ✅ unit price = selling price
                "unit_price": f"{sp:.2f}",
                "tax_percent": str(tax_percent),
                "taxable_value": f"{taxable_value:.2f}",
                "mrp": f"{mrp:.2f}",
                "sale_price": f"{sp:.2f}",
            }
        )

    return JsonResponse({"items": rows})
