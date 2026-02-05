# products/views_reports_masterpacking.py
from datetime import datetime, time
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from taskmaster.models import Location
from .models import MasterPack, MasterPackLine


TWOPLACES = Decimal("0.01")


def q2(x):
    try:
        return Decimal(x or 0).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    except Exception:
        return Decimal("0.00")


def _parse_range(request):
    """
    date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    """
    df = parse_date((request.query_params.get("date_from") or "").strip())
    dt = parse_date((request.query_params.get("date_to") or "").strip())
    if not df or not dt:
        return None, None, None, None

    if dt < df:
        df, dt = dt, df

    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(df, time.min), tz)
    end_dt = timezone.make_aware(datetime.combine(dt, time.max), tz)
    return df, dt, start_dt, end_dt


def _loc_filter_q(param_value: str, field_prefix: str):
    """
    Frontend sends Location NAME strings (e.g. "Brands 4 less – Rajouri Garden Inside"),
    but we also support CODE.

    Builds Q like:
      field_prefix__code__iexact=value OR field_prefix__name__icontains=value
    """
    v = (param_value or "").strip()
    if not v:
        return Q()

    return Q(**{f"{field_prefix}__code__iexact": v}) | Q(**{f"{field_prefix}__name__icontains": v})


def _fmt_dmy(dt):
    try:
        if not dt:
            return ""
        local_dt = timezone.localtime(dt)
        return local_dt.strftime("%d/%m/%Y")
    except Exception:
        return ""


class MasterPackingItemWiseReport(APIView):
    """
    GET /api/reports/master-packing-item-wise/

    Filters (status ignored by requirement):
      - date_from=YYYY-MM-DD
      - date_to=YYYY-MM-DD
      - from_location=<code or name>
      - to_location=<code or name>

    Response:
      { items: [ ... ] }
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        df, dt, start_dt, end_dt = _parse_range(request)

        # If no dates are provided, default to a wide range (so "initially it load all data")
        if not (start_dt and end_dt):
            tz = timezone.get_current_timezone()
            # very wide default
            start_dt = timezone.make_aware(datetime(2000, 1, 1, 0, 0, 0), tz)
            end_dt = timezone.make_aware(datetime(2100, 1, 1, 23, 59, 59), tz)

        from_loc = (request.query_params.get("from_location") or "").strip()
        to_loc = (request.query_params.get("to_location") or "").strip()

        packs = (
            MasterPack.objects
            .select_related("from_location", "to_location")
            .filter(created_at__range=(start_dt, end_dt))
        )

        if from_loc:
            packs = packs.filter(_loc_filter_q(from_loc, "from_location")).distinct()

        if to_loc:
            packs = packs.filter(_loc_filter_q(to_loc, "to_location")).distinct()

        # pull all lines for matched packs
        lines = (
            MasterPackLine.objects
            .select_related("pack", "pack__from_location", "pack__to_location", "product", "product__task_item")
            .filter(pack__in=packs)
            .order_by("-pack__created_at", "-pack__id", "barcode")
        )

        items = []
        for ln in lines:
            pack = ln.pack
            fl = pack.from_location
            tl = pack.to_location

            # selling price from backend (snapshot line.sp if present else product.selling_price)
            sp = q2(ln.sp if ln.sp is not None else getattr(ln.product, "selling_price", 0))

            tax_percent = Decimal("5") if sp <= Decimal("2500") else Decimal("18")
            taxable_value = q2(sp - (sp * tax_percent / Decimal("100")))

            # product name / print name
            ti = getattr(getattr(ln.product, "task_item", None), None, None)
            task_item = getattr(ln.product, "task_item", None)
            print_name = ""
            if task_item:
                print_name = (
                    getattr(task_item, "item_print_friendly_name", "") or
                    getattr(task_item, "item_vasy_name", "") or
                    getattr(task_item, "item_full_name", "") or
                    ""
                )

            product_name = (ln.name or "").strip() or print_name

            transfer_date = _fmt_dmy(getattr(pack, "created_at", None))

            items.append({
                "from_location": (getattr(fl, "name", "") or getattr(fl, "code", "") or "").strip(),
                "transfer_date": transfer_date,
                "document_number": (getattr(pack, "number", "") or "").strip(),   # MP/WS/0001 etc
                "hsn_code": "",

                "to_location": (getattr(tl, "name", "") or getattr(tl, "code", "") or "").strip(),

                # ✅ as per requirement
                "branch_status": "Active",
                "transfer_in_date": transfer_date,

                "product_name": product_name,
                "print_name": print_name,
                "department_name": "",

                "item_code": (ln.barcode or "").strip(),
                "quantity": int(ln.qty or 1),

                "value": "",

                # unit price = selling price
                "unit_price": str(q2(sp)),

                "tax_percent": str(q2(tax_percent)),
                "taxable_value": str(q2(taxable_value)),

                # MRP from DB
                "mrp": str(q2(getattr(ln.product, "mrp", 0))),

                # selling price from backend
                "sale_price": str(q2(sp)),
            })

        return Response({"items": items}, status=status.HTTP_200_OK)


# ✅ keep old import name used in urls.py (if you already had it)
master_packing_item_wise = MasterPackingItemWiseReport.as_view()
