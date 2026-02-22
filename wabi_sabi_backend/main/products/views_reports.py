# products/views_reports.py
from datetime import date, datetime
from decimal import Decimal

from django.db.models import (
    Sum, F, DecimalField, ExpressionWrapper, Count, Q, IntegerField, Value
)
from django.db.models.functions import TruncDate, Coalesce
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import SaleLine, CreditNote
from outlets.models import Employee  # for outlet/location scoping


def _parse_date(s: str):
    if not s:
        return None
    try:
        if "T" in s:
            return datetime.fromisoformat(s).date()
        return date.fromisoformat(s)
    except Exception:
        return None


def _get_user_location_code(request):
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated or user.is_superuser:
        return None
    emp = getattr(user, "employee", None)
    outlet = getattr(emp, "outlet", None) if emp else None
    loc = getattr(outlet, "location", None) if outlet else None
    return getattr(loc, "code", None) or None


class DaywiseSalesSummary(APIView):
    def get(self, request):
        df = _parse_date(request.GET.get("date_from", ""))
        dt = _parse_date(request.GET.get("date_to", ""))
        if not df or not dt or df > dt:
            return Response(
                {"detail": "Provide valid date_from and date_to (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        locs = [s.strip() for s in request.GET.getlist("location") if s.strip()]

        loc_code = _get_user_location_code(request)

        if loc_code:
            loc_filter_label = loc_code
        elif locs:
            loc_filter_label = ", ".join(locs)
        else:
            loc_filter_label = ""

        sl_qs = (
            SaleLine.objects
            .select_related("sale")
            .filter(
                sale__transaction_date__date__gte=df,
                sale__transaction_date__date__lte=dt
            )
        )

        if loc_code:
            sl_qs = sl_qs.filter(sale__store__icontains=loc_code)
        elif locs and "All" not in locs:
            loc_q = Q()
            for label in locs:
                loc_q |= Q(sale__store__icontains=label)
            sl_qs = sl_qs.filter(loc_q)

        cash_rows = (
            sl_qs.annotate(sday=TruncDate("sale__transaction_date"))
                 .values("sday")
                 .annotate(
                     cash=Sum(
                         F("sp") * F("qty"),
                         output_field=DecimalField(max_digits=16, decimal_places=2),
                     )
                 )
        )
        cash_by_day = {r["sday"]: (r["cash"] or Decimal("0.00")) for r in cash_rows}

        cn_qs = CreditNote.objects.select_related("sale").filter(
            note_date__date__gte=df,
            note_date__date__lte=dt,
        )

        if loc_code:
            cn_qs = cn_qs.filter(sale__store__icontains=loc_code)
        elif locs and "All" not in locs:
            loc_q = Q()
            for label in locs:
                loc_q |= Q(sale__store__icontains=label)
            cn_qs = cn_qs.filter(loc_q)

        cn_rows = (
            cn_qs.annotate(sday=TruncDate("note_date"))
                 .values("sday")
                 .annotate(cnt=Count("id"))
        )
        cn_by_day = {r["sday"]: int(r["cnt"] or 0) for r in cn_rows}

        rows = []
        sr = 1
        cur = df
        total_cash = Decimal("0.00")
        total_cn = 0

        while cur <= dt:
            cash = cash_by_day.get(cur, Decimal("0.00"))
            cnotes = cn_by_day.get(cur, 0)
            total_val = cash + Decimal(cnotes)
            rows.append({
                "sr_no": sr,
                "sales_date": cur.isoformat(),
                "cash": f"{cash:.2f}",
                "credit_notes": cnotes,
                "total": f"{total_val:.2f}",
            })
            total_cash += cash
            total_cn += cnotes
            sr += 1
            cur = date.fromordinal(cur.toordinal() + 1)

        return Response({
            "filters": {
                "date_from": df.isoformat(),
                "date_to": dt.isoformat(),
                "location": loc_filter_label,
            },
            "rows": rows,
            "totals": {
                "cash": f"{total_cash:.2f}",
                "credit_notes": total_cn,
                "total": f"{(total_cash + Decimal(total_cn)):.2f}",
            },
        }, status=status.HTTP_200_OK)


class ProductWiseSalesReport(APIView):
    def _format_ddmmyyyy(self, d):
        try:
            return d.strftime("%d/%m/%Y")
        except Exception:
            return ""

    def get(self, request):
        qs = (
            SaleLine.objects
            .select_related(
                "sale",
                "sale__customer",
                "product",
                "product__task_item",
                "product__location",   # ✅ added: barcode -> product -> location
            )
            .order_by("-sale__transaction_date", "-sale_id", "barcode")
        )

        # --- Date range ---
        df = _parse_date(request.GET.get("date_from", ""))
        dt = _parse_date(request.GET.get("date_to", ""))
        if df and dt and df <= dt:
            qs = qs.filter(
                sale__transaction_date__date__gte=df,
                sale__transaction_date__date__lte=dt
            )

        # --- Locations (multi or single) ---
        # ✅ now location filter works on Product.location (barcode -> product -> location)
        locs = [s.strip() for s in request.GET.getlist("location") if s.strip()]
        loc_code = _get_user_location_code(request)
        if loc_code:
            locs = [loc_code]

        if locs and "All" not in locs:
            loc_q = Q()
            for label in locs:
                s = (label or "").strip()
                if not s:
                    continue
                # supports either location code (UV/WS/etc) OR location name
                loc_q |= Q(product__location__code__iexact=s) | Q(product__location__name__icontains=s)
            qs = qs.filter(loc_q)

        # ✅ Department maps to TaskItem.department
        dept = (request.GET.get("department") or "").strip()
        if dept:
            qs = qs.filter(product__task_item__department__iexact=dept)

        # ✅ Category maps to TaskItem.category
        cat = (request.GET.get("category") or "").strip()
        if cat:
            qs = qs.filter(product__task_item__category__iexact=cat)

        # --- Brand (only B4L supported) ---
        brand = (request.GET.get("brand") or "").strip()
        if brand and brand.upper() not in ("B4L", "ALL"):
            qs = qs.none()

        # --- Product search (barcode/name) ---
        prod_q = (request.GET.get("product") or "").strip()
        if len(prod_q) >= 3:
            qs = qs.filter(
                Q(barcode__icontains=prod_q) |
                Q(product__task_item__item_vasy_name__icontains=prod_q) |
                Q(product__task_item__item_full_name__icontains=prod_q) |
                Q(product__task_item__item_print_friendly_name__icontains=prod_q)
            )

        # --- Free text 'q' ---
        q = (request.GET.get("q") or "").strip()
        if q and q.lower() not in ("all", "undefined", "null"):
            qs = qs.filter(
                Q(barcode__icontains=q) |
                Q(product__task_item__item_vasy_name__icontains=q) |
                Q(product__task_item__item_full_name__icontains=q) |
                Q(product__task_item__item_print_friendly_name__icontains=q) |
                Q(sale__customer__name__icontains=q) |
                Q(sale__customer__phone__icontains=q) |
                Q(sale__store__icontains=q)
            )

        want_all = (request.GET.get("all") or "").lower() in ("1", "true", "yes", "on") \
                   or (request.GET.get("page_size") or "").lower() == "all"

        total = qs.count()

        if want_all:
            page = 1
            page_size = total or 1
            items = qs
        else:
            try:
                page_size = max(1, min(1000, int(request.GET.get("page_size", 50))))
            except ValueError:
                page_size = 50
            try:
                page = max(1, int(request.GET.get("page", 1)))
            except ValueError:
                page = 1
            start = (page - 1) * page_size
            end = start + page_size
            items = qs[start:end]

        rows = []
        sr_start = 1 if want_all else ((page - 1) * page_size + 1)
        for i, ln in enumerate(items, start=sr_start):
            sale = getattr(ln, "sale", None)
            cust = getattr(sale, "customer", None)
            ti = getattr(getattr(ln, "product", None), "task_item", None)

            prod_name = (
                (getattr(ti, "item_print_friendly_name", "") or "").strip()
                or (getattr(ti, "item_vasy_name", "") or "").strip()
                or (getattr(ti, "item_full_name", "") or "").strip()
            )

            sdate = getattr(sale, "transaction_date", None)
            sdate_str = self._format_ddmmyyyy(sdate) if sdate else ""

            # ✅ Location shown from barcode -> product -> location
            ploc = getattr(getattr(ln, "product", None), "location", None)
            ploc_code = (getattr(ploc, "code", "") or "").strip()
            ploc_name = (getattr(ploc, "name", "") or "").strip()
            loc_label = f"{ploc_code} - {ploc_name}".strip(" -") if (ploc_code or ploc_name) else ""

            rows.append({
                "sr": i,
                "department": (getattr(ti, "department", "") or ""),
                "category":   (getattr(ti, "category", "") or ""),
                "subCategory": "",
                "brand": "B4L",
                "subBrand": "",
                "itemcode": ln.barcode,
                "product": prod_name,
                "lastPurchaseDate": sdate_str,
                "lastPurchaseQty": 0,
                "lastSalesDate": sdate_str,
                "location": loc_label,  # ✅ changed
                "qtySold": int(getattr(ln, "qty", 1) or 1),
                "customerName": (getattr(cust, "name", "") or ""),
                "mobile": (getattr(cust, "phone", "") or ""),
            })

        return Response(
            {"results": rows, "total": total, "page": page, "page_size": page_size},
            status=status.HTTP_200_OK
        )


class CategoryWiseSalesSummary(APIView):
    def get(self, request):
        df = _parse_date(request.GET.get("date_from", ""))
        dt = _parse_date(request.GET.get("date_to", ""))
        if not df or not dt or df > dt:
            return Response(
                {"detail": "Provide valid date_from and date_to (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = (
            SaleLine.objects
            .select_related("sale", "product", "product__task_item")
            .filter(
                sale__transaction_date__date__gte=df,
                sale__transaction_date__date__lte=dt,
            )
        )

        cat = (request.GET.get("category") or "").strip()
        if cat:
            qs = qs.filter(product__task_item__category=cat)

        locs = [s.strip() for s in request.GET.getlist("location") if s.strip()]
        loc_code = _get_user_location_code(request)
        if loc_code:
            locs = [loc_code]

        if locs and "All" not in locs:
            loc_q = Q()
            for label in locs:
                loc_q |= Q(sale__store__icontains=label)
            qs = qs.filter(loc_q)

        qs = qs.annotate(
            line_amount=ExpressionWrapper(
                F("sp") * F("qty"),
                output_field=DecimalField(max_digits=16, decimal_places=2)
            )
        )

        agg = (
            qs.values("product__task_item__category", "sale__store")
              .annotate(
                  qty=Coalesce(Sum("qty"), Value(0, output_field=IntegerField())),
                  total=Coalesce(
                      Sum("line_amount"),
                      Value(0, output_field=DecimalField(max_digits=16, decimal_places=2)),
                  ),
              )
              .order_by("product__task_item__category", "sale__store")
        )

        rows = []
        sr = 1
        total_qty = 0
        total_amount = Decimal("0.00")

        for rec in agg:
            category = rec["product__task_item__category"] or ""
            location = rec["sale__store"] or ""
            qty = int(rec["qty"] or 0)
            total = Decimal(rec["total"] or 0)

            rows.append({
                "sr": sr,
                "category": category,
                "location": location,
                "qty": qty,
                "taxable": "",
                "tax": "",
                "total": float(total),
            })
            sr += 1
            total_qty += qty
            total_amount += total

        return Response(
            {
                "filters": {
                    "date_from": df.isoformat(),
                    "date_to": dt.isoformat(),
                    "locations": locs,
                    "category": cat,
                },
                "rows": rows,
                "totals": {
                    "qty": total_qty,
                    "taxable": "",
                    "tax": "",
                    "total": f"{total_amount:.2f}",
                },
            },
            status=status.HTTP_200_OK
        )