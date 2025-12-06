# outlets/views_wowbill.py
from decimal import Decimal

from django.db import IntegrityError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics, permissions, status, viewsets, serializers
from rest_framework.response import Response

from .models import WowBillEntry, WowBillSlab
from .serializers import WowBillEntrySerializer, WowBillSlabSerializer



# ========== WOW BILL ENTRIES (per-sale) ==========

@method_decorator(csrf_exempt, name="dispatch")
class WowBillEntryListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/wow-bills/              -> list WOW entries (filter by outlet/employee/customer/date)
    POST /api/wow-bills/              -> create a WOW entry

    POST body:
    {
      "outlet": 1,
      "employee": 5,
      "customer": 12,
      "bill_date": "2025-12-04",
      "sale_amount": "2000",
      "wow_min_value": "1000",
      "payout_per_wow": "100",
      "exclude_returns": true
    }

    Server will calculate wow_count and total_payout.

    Unique customer per day per employee is enforced by the DB constraint:
      (employee, customer, bill_date)
    """

    serializer_class = WowBillEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = WowBillEntry.objects.select_related(
            "outlet__location",
            "employee__user",
            "customer",
        )

        outlet_id = self.request.query_params.get("outlet")
        employee_id = self.request.query_params.get("employee")
        customer_id = self.request.query_params.get("customer")
        bill_date = self.request.query_params.get("bill_date")
         # 🔹 NEW: range filter
        date_from   = self.request.query_params.get("date_from")
        date_to     = self.request.query_params.get("date_to")

        if outlet_id:
            qs = qs.filter(outlet_id=outlet_id)
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        if bill_date:
            qs = qs.filter(bill_date=bill_date)
         # 🔹 NEW range filters on bill_date
        if date_from:
            qs = qs.filter(bill_date__gte=date_from)
        if date_to:
            qs = qs.filter(bill_date__lte=date_to)

        return qs

    def perform_create(self, serializer):
        data = serializer.validated_data

        outlet = data.get("outlet")
        sale = data.get("sale_amount") or Decimal("0")

        # ✅ Try to derive WOW min + payout from slabs for this outlet
        slab = None
        if outlet and sale > 0:
            slab = (
                WowBillSlab.objects.filter(
                    outlet=outlet,
                    active=True,
                    min_amount__lte=sale,   # only slabs <= sale amount
                )
                .order_by("-min_amount")    # 👈 pick the highest slab
                .first()
            )

        if slab:
            # use slab config
            wow_min = slab.min_amount
            payout = slab.payout_per_wow
        else:
            # fallback: use values coming from request (for old/manual entries)
            wow_min = data.get("wow_min_value") or Decimal("1")
            payout = data.get("payout_per_wow") or Decimal("0")

        wow_count = int(sale // wow_min) if wow_min > 0 else 0
        total_payout = payout * wow_count

        try:
            serializer.save(
                wow_min_value=wow_min,
                payout_per_wow=payout,
                wow_count=wow_count,
                total_payout=total_payout,
                created_by=self.request.user
                if self.request.user.is_authenticated
                else None,
            )
        except IntegrityError:
            # violates uniq_wowbill_emp_customer_date
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "WOW bill for this employee + customer + date already exists."
                    ]
                }
            )



class WowBillEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/wow-bills/<id>/   -> detail
    PATCH  /api/wow-bills/<id>/   -> update
    DELETE /api/wow-bills/<id>/   -> delete
    """

    queryset = WowBillEntry.objects.select_related(
        "outlet__location",
        "employee__user",
        "customer",
    )
    serializer_class = WowBillEntrySerializer
    permission_classes = [permissions.IsAuthenticated]


# ========== WOW BILL SLABS (admin-defined thresholds) ==========

class WowBillSlabViewSet(viewsets.ModelViewSet):
    """
    /api/wow-slabs/           GET, POST
    /api/wow-slabs/<id>/      GET, PATCH, DELETE

    Optional filters:
      ?outlet=<id>
    """

    queryset = WowBillSlab.objects.select_related("outlet__location")
    serializer_class = WowBillSlabSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        outlet_id = self.request.query_params.get("outlet")
        if outlet_id:
            qs = qs.filter(outlet_id=outlet_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user
            if self.request.user.is_authenticated
            else None
        )
