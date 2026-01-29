# products/views_dashboard.py
from datetime import datetime, time

from django.db.models import Sum, F, Q, DecimalField, ExpressionWrapper
from django.utils.dateparse import parse_date
from django.core.exceptions import FieldDoesNotExist
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


def _has_created_by_field():
    try:
        Sale._meta.get_field("created_by")
        return True
    except FieldDoesNotExist:
        return False


def _user_outlet_id(user):
    emp = getattr(user, "employee", None)
    return getattr(emp, "outlet_id", None) if emp else None


def _sale_scope_q_for_user(user):
    """
    Same scoping as Sales list:
      - salesman outlet
      - OR created_by user's employee outlet (if created_by exists)
    """
    outlet_id = _user_outlet_id(user)
    if not outlet_id:
        return Q(pk__in=[])  # none

    q = Q(salesman__outlet_id=outlet_id)
    if _has_created_by_field():
        q = q | Q(created_by__employee__outlet_id=outlet_id)
    return q


def _parse_dates(request):
    df = (request.GET.get("date_from") or "").strip()
    dt = (request.GET.get("date_to") or "").strip()

    dfrom = parse_date(df)
    dto = parse_date(dt)

    # ✅ allow DD/MM/YYYY too (frontend picker sometimes sends this)
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
      - Manager/outlet: only their outlet

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
        mp_qs = MasterPack.objects.filter(created_at__range=(start_dt, end_dt))

        if loc:
            mp_qs = mp_qs.filter(lines__location=loc).distinct()

        total_sales_return = mp_qs.aggregate(x=Sum("amount_total"))["x"] or 0
        total_purchase = total_sales_return
        purchase_qty = (
            MasterPackLine.objects.filter(pack__in=mp_qs).aggregate(x=Sum("qty"))["x"] or 0
        )

        # ---------- Total Receive ----------
        cn_qs = CreditNote.objects.filter(date__range=(start_dt, end_dt))
        if loc:
            cn_qs = cn_qs.filter(Q(location=loc) | Q(location__isnull=True))
        total_receive = cn_qs.aggregate(x=Sum("amount"))["x"] or 0

        # ---------- Total Bills / Total Sales ----------
        sales_qs = Sale.objects.filter(transaction_date__range=(start_dt, end_dt))

        # ✅ FIX: manager scope by outlet (NOT store__icontains)
        if not is_admin:
            sales_qs = sales_qs.filter(_sale_scope_q_for_user(user))

        total_bills = sales_qs.count()
        total_sales = sales_qs.aggregate(x=Sum("grand_total"))["x"] or 0

        # ---------- Total Suppliers ----------
        total_suppliers = 0
        try:
            from outlets.models import Outlet
            qs_out = Outlet.objects.select_related("location").all()
            qs_out = qs_out.exclude(
                Q(location__code__iexact="HQ")
                | Q(location__name__icontains="head")
                | Q(display_name__icontains="head")
            )
            total_suppliers = qs_out.count()
        except Exception:
            qs_loc = Location.objects.all().exclude(
                Q(code__iexact="HQ") | Q(name__icontains="head")
            )
            total_suppliers = qs_loc.count()

        # ---------- Total Products (inventory amount) ----------
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

        # ✅ NEW (DO NOT DELETE): Stock Qty = total remaining units where qty > 0 (scoped by location)
        # Admin sees total stock across all locations
        # Outlet user sees only their location stock
        stock_qty = prod_qs.aggregate(x=Sum("qty"))["x"] or 0

        # ---------- Cash in hand ----------
        cash_qs = SalePayment.objects.filter(
            sale__transaction_date__range=(start_dt, end_dt),
            method__iexact="cash",
        )
        if not is_admin:
            cash_qs = cash_qs.filter(sale__in=sales_qs)

        cash_in_hand = cash_qs.aggregate(x=Sum("amount"))["x"] or 0

        if not cash_in_hand:
            fallback_sales = sales_qs.filter(payment_method__iexact="cash")
            cash_in_hand = fallback_sales.aggregate(x=Sum("grand_total"))["x"] or 0

        # ---------- Sold Qty ----------
        sl_qs = SaleLine.objects.filter(
            sale__transaction_date__range=(start_dt, end_dt)
        )
        if not is_admin:
            sl_qs = sl_qs.filter(sale__in=sales_qs)

        sold_qs = sl_qs.filter(product__qty=0)
        if loc:
            sold_qs = sold_qs.filter(product__location=loc)

        sold_qty = sold_qs.aggregate(x=Sum("qty"))["x"] or 0

        # ---------- Gross Profit ----------
        gross_profit = total_sales

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

                # ✅ NEW (DO NOT DELETE): returned for dashboard "Stock Qty" card
                "stock_qty": stock_qty,

                "cash_in_hand": cash_in_hand,
                "gross_profit": gross_profit,

                "purchase_qty": purchase_qty,
                "sold_qty": sold_qty,
            },
            status=status.HTTP_200_OK,
        )
