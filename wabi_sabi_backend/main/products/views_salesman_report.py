# products/views_salesman_report.py
from datetime import datetime, time
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Q, Sum
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import SaleLine, SalePayment


TWOPLACES = Decimal("0.01")


def _q2(x):
    try:
        return Decimal(x or 0).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
    except Exception:
        return Decimal("0.00")


def _parse_dates(request):
    """
    Accepts:
      - ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
      - ?date_from=DD/MM/YYYY&date_to=DD/MM/YYYY
    Returns (start_dt, end_dt) or (None, None).
    """
    df = (request.query_params.get("date_from") or request.GET.get("date_from") or "").strip()
    dt = (request.query_params.get("date_to") or request.GET.get("date_to") or "").strip()

    dfrom = parse_date(df)
    dto = parse_date(dt)

    if not dfrom:
        try:
            dfrom = datetime.strptime(df, "%d/%m/%Y").date()
        except Exception:
            dfrom = None
    if not dto:
        try:
            dto = datetime.strptime(dt, "%d/%m/%Y").date()
        except Exception:
            dto = None

    if not dfrom or not dto or dfrom > dto:
        return None, None

    return datetime.combine(dfrom, time.min), datetime.combine(dto, time.max)


def _get_locations(request):
    locs = request.query_params.getlist("location") or request.GET.getlist("location")
    locs = [str(x).strip() for x in (locs or []) if str(x).strip()]
    # treat "All" as no filter
    locs = [x for x in locs if x.lower() != "all"]
    return locs


class SalesmanReportView(APIView):
    """
    GET /api/reports/salesman-report/

    Admin-only report.

    Filters:
      - date_from, date_to (optional)
      - location (repeatable) by location name/code (optional, default all)
      - salesman (employee id) optional
      - q (invoice search only) optional

    Output rows:
      - sr, salesman, customer, inv, date, product, qty, amount, taxable, createdBy, location
    Totals:
      - total_sales = sum(invoice paid amount) ONCE PER INVOICE
      - other KPI fields set to 0 for now (frontend requirement)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated or not (user.is_superuser or user.is_staff):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        qs = (
            SaleLine.objects
            .select_related(
                "sale",
                "sale__customer",
                "sale__salesman",
                "sale__salesman__outlet",
                "sale__salesman__outlet__location",
                "product",
                "product__task_item",
            )
            .order_by("-sale__transaction_date", "-sale_id", "id")
        )

        # date filter
        start_dt, end_dt = _parse_dates(request)
        if start_dt and end_dt:
            qs = qs.filter(sale__transaction_date__range=(start_dt, end_dt))

        # invoice search only
        q = (request.query_params.get("q") or request.GET.get("q") or "").strip()
        if q:
            qs = qs.filter(sale__invoice_no__icontains=q)

        # salesman filter
        salesman_id = (request.query_params.get("salesman") or request.GET.get("salesman") or "").strip()
        if salesman_id:
            try:
                qs = qs.filter(sale__salesman_id=int(salesman_id))
            except Exception:
                qs = qs.none()

        # location filter
        locs = _get_locations(request)
        if locs:
            loc_q = Q()
            for label in locs:
                loc_q |= Q(sale__salesman__outlet__location__name__icontains=label)
                loc_q |= Q(sale__salesman__outlet__location__code__icontains=label)
            qs = qs.filter(loc_q)

        # Build payment map (paid per sale)
        sale_ids = list(qs.values_list("sale_id", flat=True).distinct()[:50000])
        pay_map = {}
        if sale_ids:
            pay_rows = (
                SalePayment.objects
                .filter(sale_id__in=sale_ids)
                .values("sale_id")
                .annotate(paid=Sum("amount"))
            )
            pay_map = {r["sale_id"]: _q2(r["paid"]) for r in pay_rows}

        def safe_outlet_name(emp):
            outlet = getattr(emp, "outlet", None) if emp else None
            name = getattr(outlet, "name", None)
            if name:
                return str(name).strip()
            loc = getattr(outlet, "location", None) if outlet else None
            return (getattr(loc, "name", None) or getattr(loc, "code", None) or "").strip()

        def safe_location_label(emp):
            outlet = getattr(emp, "outlet", None) if emp else None
            loc = getattr(outlet, "location", None) if outlet else None
            return (getattr(loc, "name", None) or getattr(loc, "code", None) or "").strip()

        rows = []
        total_sales = Decimal("0.00")

        # ✅ FIX: add paid only ONCE per invoice (sale_id)
        seen_sales = set()

        for idx, ln in enumerate(qs, start=1):
            sale = getattr(ln, "sale", None)
            emp = getattr(sale, "salesman", None) if sale else None
            cust = getattr(sale, "customer", None) if sale else None
            ti = getattr(getattr(ln, "product", None), "task_item", None)

            prod_name = (
                (getattr(ti, "item_print_friendly_name", "") or "").strip()
                or (getattr(ti, "item_vasy_name", "") or "").strip()
                or (getattr(ti, "item_full_name", "") or "").strip()
                or ""
            )

            sp = _q2(getattr(ln, "sp", 0))
            if sp > Decimal("2500"):
                taxable = sp - (sp * Decimal("18") / Decimal("100"))
            else:
                taxable = sp - (sp * Decimal("5") / Decimal("100"))
            taxable = _q2(taxable)

            sale_id = getattr(sale, "id", None)

            paid = pay_map.get(sale_id, None)
            if paid is None:
                paid = _q2(getattr(sale, "grand_total", 0))

            # ✅ FIX: count total_sales only once per sale
            if sale_id and sale_id not in seen_sales:
                seen_sales.add(sale_id)
                total_sales += paid

            dt = getattr(sale, "transaction_date", None)
            dt_str = ""
            if dt:
                try:
                    dt_str = dt.strftime("%d/%m/%Y")
                except Exception:
                    dt_str = str(dt)

            customer_name = safe_outlet_name(emp) or (getattr(cust, "name", "") or "")
            created_by = safe_outlet_name(emp)

            rows.append({
                "sr": idx,
                "salesman": (getattr(emp, "name", "") or getattr(getattr(emp, "user", None), "username", "") or "").strip(),
                "customer": customer_name,
                "inv": (getattr(sale, "invoice_no", "") or "").strip(),
                "date": dt_str,
                "product": prod_name,
                "qty": int(getattr(ln, "qty", 1) or 1),
                "amount": float(paid),
                "taxable": float(taxable),
                "createdBy": created_by,
                "location": safe_location_label(emp),
            })

        return Response({
            "results": rows,
            "totals": {
                "target": 0,
                "total_sales": float(_q2(total_sales)),
                "difference": float(_q2(Decimal("0.00") - total_sales)),
                "wages": 0,
                "commission": 0,
                "extra_wages": 0,
                "total_salary": 0,
                "percent_of_sale": 0,
            }
        }, status=status.HTTP_200_OK)
