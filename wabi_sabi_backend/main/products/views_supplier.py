# products/views_supplier.py
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Supplier
from .serializers_supplier import SupplierSerializer


class SupplierListCreateView(APIView):
    """
    GET  /api/suppliers/?q=
    POST /api/suppliers/

    - company_name and gstin are required
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        q = (request.GET.get("q") or "").strip()
        qs = Supplier.objects.all().order_by("company_name")
        if q:
            qs = qs.filter(
                Q(company_name__icontains=q)
                | Q(gstin__icontains=q)
                | Q(phone__icontains=q)
            )

        data = SupplierSerializer(qs, many=True).data
        return Response({"results": data}, status=status.HTTP_200_OK)

    def post(self, request):
        ser = SupplierSerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
