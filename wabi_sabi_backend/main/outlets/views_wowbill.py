# outlets/views_wowbill.py
from decimal import Decimal

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics, permissions
from rest_framework.authentication import SessionAuthentication, BasicAuthentication

from .models import WowBillEntry
from .serializers import WowBillEntrySerializer

@method_decorator(csrf_exempt, name="dispatch")
class WowBillEntryListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/wow-bills/         -> list WOW entries (optionally filter by outlet/employee)
    POST /api/wow-bills/         -> create a WOW entry

    POST body:
    {
      "outlet": 1,
      "employee": 5,
      "sale_amount": "2000",
      "wow_min_value": "1000",
      "payout_per_wow": "100",
      "exclude_returns": true
    }

    Server will calculate wow_count and total_payout.
    """

    serializer_class = WowBillEntrySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = WowBillEntry.objects.select_related(
            "outlet__location",
            "employee__user",
        )

        outlet_id = self.request.query_params.get("outlet")
        employee_id = self.request.query_params.get("employee")

        if outlet_id:
            qs = qs.filter(outlet_id=outlet_id)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        return qs

    def perform_create(self, serializer):
        data = serializer.validated_data

        sale = data.get("sale_amount") or Decimal("0")
        wow_min = data.get("wow_min_value") or Decimal("1")
        payout = data.get("payout_per_wow") or Decimal("0")

        wow_count = int(sale // wow_min) if wow_min > 0 else 0
        total_payout = payout * wow_count

        serializer.save(
          wow_count=wow_count,
          total_payout=total_payout,
          created_by=self.request.user if self.request.user.is_authenticated else None,
        )
