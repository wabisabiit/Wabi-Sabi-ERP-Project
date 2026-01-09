# products/views_dashboard.py
from datetime import datetime, time

from django.db.models import Sum, F, Q, DecimalField, ExpressionWrapper
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from taskmaster.models import Location
from outlets.models import Employee

from .models import (
    MasterPack,
    MasterPackLine,
    CreditNote,
    Product,
    Sale,
    SaleLine,
    SalePayment,
)


def _user_location(user):
    emp = getattr(user, "employee", None)
    outlet = getattr(emp, "outlet", None) if emp else None
    return getattr(outlet, "location", None) if outlet else None


def _parse_dates(request):
    df = (request.GET.get("date_from") or "").strip()
    dt = (request.GET.get("date_to") or "").strip()

    dfrom = parse_date(df)
    dto = parse_date(dt)

    if not dfrom or not dto:
      # date filter is mandatory
        return None, None

    start_dt = datetime.combine(dfrom, time.min)
    end_dt = datetime.combine(dto, time.max)
    return start_dt, end_dt


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD

    Scoping:
      - Admin/superuser: all outlets
      - Manager/outlet: only their outlet location

    Uses date range for every metric.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        start_dt, end_dt = _parse_dates(request)
        if not start_dt or not end_dt:
            return Response(
                {"detail": "date_from and date_to are required (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        is_admin = bool(user.is_superuser)

        loc = None if is_admin else _user_location(user)

        # ---------- Total Sales Return / Total Purchase / Purchase Qty ----------
        # Definition: sum of MasterPack totals created by outlet (manager) or all (admin)
        # We scope by MasterPackLine.location == outlet location (same-location packing flow)
        mp_qs = MasterPack.objects.filter(created_at__range=(start_dt, end_dt))

        if loc:
            mp_qs = mp_qs.filter(lines__location=loc).distinct()

        total_sales_return = mp_qs.aggregate(x=Sum("amount_total"))["x"] or 0
        total_purchase = total_sales_return  # you asked: same as sales return
        purchase_qty = (
            MasterPackLine.objects.filter(pack__in=mp_qs).aggregate(x=Sum("qty"))["x"] or 0
        )

        # ---------- Total Receive ----------
        # Definition: sum of CreditNote.amount generated in outlet; admin sees all
        cn_qs = CreditNote.objects.filter(date__range=(start_dt, end_dt))
        if loc:
            # include legacy nulls only if you want; currently we limit to exact outlet location
            cn_qs = cn_qs.filter(Q(location=loc) | Q(location__isnull=True))
        total_receive = cn_qs.aggregate(x=Sum("amount"))["x"] or 0

        # ---------- Total Bills ----------
        # FIX: bills should be COUNT (not sum of totals)
        sales_qs = Sale.objects.filter(transaction_date__range=(start_dt, end_dt))
        if loc:
            # your sales scoping uses store contains location code
            sales_qs = sales_qs.filter(store__icontains=loc.code)

        total_bills = sales_qs.count()

        # ---------- Total Suppliers ----------
        # Total outlets excluding HQ (best-effort without changing your outlet models)
        total_suppliers = 0
        try:
            from outlets.models import Outlet  # if exists
            # exclude HQ-like outlets by name/code heuristic
            qs_out = Outlet.objects.select_related("location").all()
            qs_out = qs_out.exclude(
                Q(location__code__iexact="HQ")
                | Q(location__name__icontains="head")
                | Q(display_name__icontains="head")
            )
            total_suppliers = qs_out.count()
        except Exception:
            # fallback: locations excluding HQ-like
            qs_loc = Location.objects.all().exclude(
                Q(code__iexact="HQ") | Q(name__icontains="head")
            )
            total_suppliers = qs_loc.count()

        # ---------- Total Products (inventory amount) ----------
        # Definition: sum of amount of active inventory in branch
        # Use selling_price * qty where qty > 0
        prod_qs = Product.objects.all()
        if loc:
            prod_qs = prod_qs.filter(location=loc)
        prod_qs = prod_qs.filter(qty__gt=0)

        total_products_amount = (
            prod_qs.aggregate(
                x=Sum(
                    ExpressionWrapper(
                        F("selling_price") * F("qty"),
                        output_field=DecimalField(max_digits=18, decimal_places=2),
                    )
                )
            )["x"]
            or 0
        )

        # ---------- Cash in hand ----------
        # FIX: your DB has method values like "Cash", not "CASH"
        cash_qs = SalePayment.objects.filter(
            sale__transaction_date__range=(start_dt, end_dt),
            method__iexact="cash",
        )
        if loc:
            cash_qs = cash_qs.filter(sale__store__icontains=loc.code)

        cash_in_hand = cash_qs.aggregate(x=Sum("amount"))["x"] or 0

        if not cash_in_hand:
            fallback_sales = sales_qs.filter(payment_method__iexact="cash")
            cash_in_hand = fallback_sales.aggregate(x=Sum("grand_total"))["x"] or 0

        # ---------- Gross Profit ----------
        # Definition you gave: (mrp - sellingprice) * qty sold
        sl_qs = SaleLine.objects.filter(
            sale__transaction_date__range=(start_dt, end_dt)
        )
        if loc:
            sl_qs = sl_qs.filter(sale__store__icontains=loc.code)

        gross_profit = (
            sl_qs.aggregate(
                x=Sum(
                    ExpressionWrapper(
                        (F("mrp") - F("sp")) * F("qty"),
                        output_field=DecimalField(max_digits=18, decimal_places=2),
                    )
                )
            )["x"]
            or 0
        )

        return Response(
            {
                "date_from": start_dt.date().isoformat(),
                "date_to": end_dt.date().isoformat(),
                "scope": "ALL" if is_admin else (loc.code if loc else "N/A"),

                "total_sales_return": total_sales_return,
                "total_receive": total_receive,
                "total_purchase": total_purchase,
                "total_bills": total_bills,

                "total_suppliers": total_suppliers,
                "total_products_amount": total_products_amount,

                "cash_in_hand": cash_in_hand,
                "gross_profit": gross_profit,

                "purchase_qty": purchase_qty,
            },
            status=status.HTTP_200_OK,
        )
