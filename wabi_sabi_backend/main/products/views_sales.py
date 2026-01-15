# products/views_sales.py
from django.db.models import Q
from django.core.exceptions import FieldDoesNotExist
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.pagination import PageNumberPagination

from outlets.models import Employee
from .models import Sale
from .serializers_sales import SaleCreateSerializer, SaleListSerializer


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
        """
        qs = Sale.objects.select_related("customer")

        # ✅ only add created_by if field exists in DB/model
        if _has_created_by_field():
            qs = qs.select_related("created_by")

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

        # pass created_by into serializer.create()
        payload = ser.save(created_by=created_by_user)
        return Response(payload, status=status.HTTP_201_CREATED)
