# products/views_sales.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils.dateparse import parse_date, parse_datetime
from django.db.models import Q
# Assuming these imports are correct based on your snippet
from .serializers_sales import SaleCreateSerializer, SaleListSerializer 
from .models import Sale

class SalesView(APIView):
    """
    POST /api/sales/
    Body: {
      customer: { name, phone?, email? },
      lines: [{ barcode, qty }, ...],
      payments: [{ method: "CARD"| "CASH"| "UPI"| "MULTIPAY", amount, reference?, card_holder?, customer_bank?, account? }, ...],
      store?: "Wabi - Sabi",
      note?: ""
    }
    """
    def get(self, request):
        qs = Sale.objects.select_related("customer").order_by("-transaction_date", "-id")

        # --- filters (leave optional) ---
        q = (request.GET.get("query") or "").strip()
        if q.lower() in ("undefined", "null"):  # safety
            q = ""
        if q:
            qs = qs.filter(
                Q(invoice_no__icontains=q) |
                Q(customer__name__icontains=q) |
                Q(customer__phone__icontains=q)
            )

        pm = (request.GET.get("payment_method") or "").strip().upper()
        if pm in ("UNDEFINED", "NULL"):
            pm = ""
        if pm:
            qs = qs.filter(payment_method=pm)

        # Only filter by date if BOTH are provided
        df = request.GET.get("date_from")
        dt = request.GET.get("date_to")
        if df and dt:
            # Re-importing inside the method is redundant if it's imported globally, 
            # but kept for exactness to the provided code logic.
            # from django.utils.dateparse import parse_date, parse_datetime 
            dfrom = parse_datetime(df) or parse_date(df)
            dto   = parse_datetime(dt) or parse_date(dt)
            if dfrom and dto:
                qs = qs.filter(transaction_date__date__gte=getattr(dfrom, "date", lambda: dfrom)(),
                               transaction_date__date__lte=getattr(dto, "date", lambda: dto)())

        # ---- NEW: return all, no pagination ----
        want_all = (request.GET.get("all") or "").lower() in ("1", "true", "yes", "on") \
                   or (request.GET.get("page_size") or "").lower() == "all"
        if want_all:
            data = SaleListSerializer(qs, many=True).data
            return Response(
                {"results": data, "total": len(data), "page": 1, "page_size": len(data)},
                status=status.HTTP_200_OK
            )

        # ---- fallback: simple pagination ----
        try:
            page_size = max(1, min(1000, int(request.GET.get("page_size", 100))))
        except ValueError:
            page_size = 100
        try:
            page = max(1, int(request.GET.get("page", 1)))
        except ValueError:
            page = 1

        total = qs.count()
        start = (page - 1) * page_size
        end   = start + page_size
        items = qs[start:end]

        data = SaleListSerializer(items, many=True).data
        return Response(
            {"results": data, "total": total, "page": page, "page_size": page_size},
            status=status.HTTP_200_OK
        )


    def post(self, request):
        ser = SaleCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            result = ser.save()
        return Response(result, status=status.HTTP_201_CREATED)
