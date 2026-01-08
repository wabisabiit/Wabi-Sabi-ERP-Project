# products/views_register.py
from decimal import Decimal

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.db.models import Sum

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import RegisterClosing, Sale, Expense, SalePayment
from .serializers_register import RegisterClosingSerializer


class RegisterClosingView(generics.ListCreateAPIView):
    """
    GET  /api/register-closes/   -> list closings (scoped to user's outlet if not superuser)
    POST /api/register-closes/   -> create one closing entry
    """

    serializer_class = RegisterClosingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = RegisterClosing.objects.select_related("location")

        user = self.request.user
        emp = getattr(user, "employee", None) if user and user.is_authenticated else None
        outlet = getattr(emp, "outlet", None) if emp else None
        loc = getattr(outlet, "location", None) if outlet else None

        # Manager/staff → only their own outlet
        if not user.is_superuser and loc is not None:
            qs = qs.filter(location=loc)

        # optional date range filters on closed_at.date
        df = self.request.query_params.get("date_from")
        dt = self.request.query_params.get("date_to")
        if df:
            dfrom = parse_datetime(df) or parse_date(df)
            if dfrom:
                qs = qs.filter(
                    closed_at__date__gte=getattr(dfrom, "date", lambda: dfrom)()
                )
        if dt:
            dto = parse_datetime(dt) or parse_date(dt)
            if dto:
                qs = qs.filter(
                    closed_at__date__lte=getattr(dto, "date", lambda: dto)()
                )

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        emp = getattr(user, "employee", None) if user and user.is_authenticated else None
        outlet = getattr(emp, "outlet", None) if emp else None
        loc = getattr(outlet, "location", None) if outlet else None

        serializer.save(
            location=loc,
            created_by=emp,
        )


class RegisterClosingSummaryView(APIView):
    """
    GET /api/register-closes/today-summary/
      -> returns today's total sales & expenses for current outlet.

    Response:
    {
      "date": "2025-12-06",
      "total_sales": "24000.00",
      "expense": "500.00",
      "cash_payment": "10000.00",
      "card_payment": "8000.00",
      "upi_payment": "6000.00"
    }
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        emp = getattr(user, "employee", None) if user and user.is_authenticated else None
        outlet = getattr(emp, "outlet", None) if emp else None
        loc = getattr(outlet, "location", None) if outlet else None

        today = timezone.localdate()

        # --- Sales for today (this outlet only) ---
        sales_qs = Sale.objects.filter(transaction_date__date=today)
        if loc is not None and loc.code:
            sales_qs = sales_qs.filter(store__icontains=loc.code)

        # overall total
        sales_total = sales_qs.aggregate(total=Sum("grand_total"))["total"] or Decimal("0.00")

        # ✅ Per payment method (supports MULTIPAY via SalePayment)
        pay_qs = SalePayment.objects.filter(sale__in=sales_qs)

        cash_total = (
            pay_qs.filter(method=Sale.PAYMENT_CASH)
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )
        card_total = (
            pay_qs.filter(method=Sale.PAYMENT_CARD)
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )
        upi_total = (
            pay_qs.filter(method=Sale.PAYMENT_UPI)
            .aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        # ✅ Fallback for older sales (before SalePayment existed)
        legacy_sales = sales_qs.filter(payments__isnull=True)

        cash_total += (
            legacy_sales.filter(payment_method=Sale.PAYMENT_CASH)
            .aggregate(total=Sum("grand_total"))["total"]
            or Decimal("0.00")
        )
        card_total += (
            legacy_sales.filter(payment_method=Sale.PAYMENT_CARD)
            .aggregate(total=Sum("grand_total"))["total"]
            or Decimal("0.00")
        )
        upi_total += (
            legacy_sales.filter(payment_method=Sale.PAYMENT_UPI)
            .aggregate(total=Sum("grand_total"))["total"]
            or Decimal("0.00")
        )

        # --- Expenses for today (this outlet only) ---
        exp_qs = Expense.objects.filter(date_time__date=today)
        if loc is not None:
            exp_qs = exp_qs.filter(created_by__outlet__location=loc)

        expense_total = exp_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        return Response(
            {
                "date": str(today),
                "total_sales": str(sales_total),
                "expense": str(expense_total),
                "cash_payment": str(cash_total),
                "card_payment": str(card_total),
                "upi_payment": str(upi_total),
            },
            status=status.HTTP_200_OK,
        )
