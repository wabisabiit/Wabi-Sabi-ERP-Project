# products/views_sales.py
from datetime import datetime, time  # ✅ NEW (needed for date range filtering)

from django.db.models import Q
from django.core.exceptions import FieldDoesNotExist
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date  # ✅ NEW (safe date parsing)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.pagination import PageNumberPagination

from outlets.models import Employee
from .models import Sale, SaleLine
from .serializers_sales import SaleCreateSerializer, SaleListSerializer, SaleLineOutSerializer


def _get_employee(user):
    if not user or not user.is_authenticated:
        return None
    return getattr(user, "employee", None)


def _has_created_by_field():
    try:
        Sale._meta.get_field("created_by")
        return True
    except FieldDoesNotExist:
        return False


# ✅ NEW: date range parser (supports YYYY-MM-DD and DD/MM/YYYY)
def _parse_dates(request):
    """
    Accepts:
      - ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
      - ?date_from=DD/MM/YYYY&date_to=DD/MM/YYYY
    Returns (start_dt, end_dt) or (None, None) if missing/invalid.
    """
    df = (request.query_params.get("date_from") or request.GET.get("date_from") or "").strip()
    dt = (request.query_params.get("date_to") or request.GET.get("date_to") or "").strip()

    dfrom = parse_date(df)
    dto = parse_date(dt)

    # ✅ allow DD/MM/YYYY too (dashboard picker sometimes sends this)
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
        return None, None

    start_dt = datetime.combine(dfrom, time.min)
    end_dt = datetime.combine(dto, time.max)
    return start_dt, end_dt


def _resolve_created_by_user(request):
    """
    ✅ RULE:
    - If superuser/admin -> created_by = request.user
    - Else (manager/staff):
        - created_by = outlet manager user (role='MANAGER') for that outlet
        - fallback: request.user
    """
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return None

    if user.is_superuser:
        return user

    emp = _get_employee(user)
    if not emp or not emp.outlet_id:
        return user

    mgr = (
        Employee.objects.select_related("user")
        .filter(outlet_id=emp.outlet_id, role="MANAGER", is_active=True)
        .first()
    )
    if mgr and mgr.user:
        return mgr.user

    return user


class _StdPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 200


class SalesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        List sales for POS details modal + sales list page.

        Supports:
        - ?q=...   (search)
        - ?all=1   (return all without pagination)

        ✅ NEW:
        - ?date_from=...&date_to=... (filters by Sale.transaction_date range)
          This is REQUIRED so Dashboard "Total Sales / Total Invoice / Total Customers"
          match the selected date filter.
        """
        qs = Sale.objects.select_related("customer")

        if _has_created_by_field():
            qs = qs.select_related("created_by")

        # ✅ FIX: manager/staff should only see their outlet sales
        user = getattr(request, "user", None)
        if user and user.is_authenticated and not user.is_superuser:
            emp = _get_employee(user)
            if emp and emp.outlet_id:
                outlet_q = Q(salesman__outlet_id=emp.outlet_id)
                if _has_created_by_field():
                    outlet_q = outlet_q | Q(created_by__employee__outlet_id=emp.outlet_id)
                qs = qs.filter(outlet_q)
            else:
                qs = qs.none()

        # ✅ NEW: apply date range filter if provided (do NOT break existing calls)
        start_dt, end_dt = _parse_dates(request)
        if start_dt and end_dt:
            qs = qs.filter(transaction_date__range=(start_dt, end_dt))

        qs = qs.order_by("-id")

        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(invoice_no__icontains=q)
                | Q(customer__name__icontains=q)
                | Q(customer__phone__icontains=q)
                | Q(payment_method__icontains=q)
            )

        all_flag = str(request.query_params.get("all") or "").strip() in ("1", "true", "True")

        if all_flag:
            ser = SaleListSerializer(qs, many=True)
            return Response({"results": ser.data}, status=status.HTTP_200_OK)

        paginator = _StdPagination()
        page = paginator.paginate_queryset(qs, request)
        ser = SaleListSerializer(page, many=True)
        return paginator.get_paginated_response(ser.data)

    def post(self, request):
        """
        ✅ Create sale:
        - created_by saved as outlet MANAGER (or admin if superuser)
        """
        created_by_user = _resolve_created_by_user(request)

        ser = SaleCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        payload = ser.save(created_by=created_by_user)
        return Response(payload, status=status.HTTP_201_CREATED)


# ✅ NEW: /api/sales/<invoice_no>/lines/ returns SaleLine.mrp & SaleLine.sp (sale-time prices)
class SaleLinesByInvoiceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, invoice_no):
        sale = get_object_or_404(Sale, invoice_no=invoice_no)

        # same outlet scoping rule as sales list
        user = getattr(request, "user", None)
        if user and user.is_authenticated and not user.is_superuser:
            emp = _get_employee(user)
            if not emp or not emp.outlet_id:
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

            allowed = Sale.objects.filter(pk=sale.pk)
            outlet_q = Q(salesman__outlet_id=emp.outlet_id)
            if _has_created_by_field():
                outlet_q = outlet_q | Q(created_by__employee__outlet_id=emp.outlet_id)
            allowed = allowed.filter(outlet_q)

            if not allowed.exists():
                return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        lines = (
            SaleLine.objects.select_related("product", "product__task_item")
            .filter(sale=sale)
            .order_by("id")
        )
        ser = SaleLineOutSerializer(lines, many=True)
        return Response({"invoice_no": sale.invoice_no, "lines": ser.data}, status=status.HTTP_200_OK)
