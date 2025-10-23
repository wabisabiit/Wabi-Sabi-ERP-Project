# products/views_sales.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .serializers_sales import SaleCreateSerializer

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
    def post(self, request):
        ser = SaleCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            result = ser.save()
        return Response(result, status=status.HTTP_201_CREATED)
