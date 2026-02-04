# products/views_material_consumption.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.db import transaction

from .serializers import (
    MaterialConsumptionCreateSerializer,
    MaterialConsumptionOutSerializer,
    NextMCNumberSerializer,
)
from .models import MaterialConsumption, Product


class MaterialConsumptionView(APIView):
    """
    POST /api/material-consumptions/        -> create
    GET  /api/material-consumptions/        -> list (for index page)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        qs = (MaterialConsumption.objects
              .select_related("location", "created_by")
              .order_by("-date", "-id"))

        q   = (request.GET.get("q") or "").strip().lower()
        typ = (request.GET.get("type") or "").strip()
        loc = (request.GET.get("location") or "").strip()
        d1  = request.GET.get("from")
        d2  = request.GET.get("to")

        if typ:
            qs = qs.filter(consumption_type=typ)
        if loc:
            qs = qs.filter(location__code=loc)
        if d1:
            qs = qs.filter(date__gte=d1)
        if d2:
            qs = qs.filter(date__lte=d2)

        rows = []
        for mc in qs:
            username = ""
            if getattr(mc, "created_by", None):
                username = mc.created_by.username or ""
            if not username:
                # fallback when older rows had no created_by
                username = "Admin" if getattr(request.user, "is_authenticated", False) else "Admin"

            rows.append({
                "number": mc.number,
                "date": mc.date.isoformat(),
                "user": username,
                "type": mc.consumption_type,
                "location": mc.location.name,
                "amount": str(mc.total_amount),
            })
        return Response(rows, status=status.HTTP_200_OK)

    def post(self, request):
        ser = MaterialConsumptionCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"status": "error", "errors": ser.errors}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            mc = ser.save()

            # ✅ save created_by if user is logged in
            if getattr(request.user, "is_authenticated", False):
                if hasattr(mc, "created_by_id") and not mc.created_by_id:
                    mc.created_by = request.user
                    mc.save(update_fields=["created_by"])

            # ✅ DELETE barcodes from backend (products table) after successful save
            rows = request.data.get("rows") or []
            barcodes = []
            for r in rows:
                b = (r.get("barcode") or "").strip()
                if b:
                    barcodes.append(b)

            if barcodes:
                Product.objects.filter(barcode__in=barcodes).delete()

        out = MaterialConsumptionOutSerializer(mc).data
        return Response(
            {"status": "ok", "message": "Material Consumption saved successfully.", "consumption": out},
            status=status.HTTP_201_CREATED
        )


class MaterialConsumptionDetail(APIView):
    permission_classes = [AllowAny]

    def get(self, request, number):
        mc = get_object_or_404(MaterialConsumption, number=number)
        return Response(MaterialConsumptionOutSerializer(mc).data, status=status.HTTP_200_OK)

    # ✅ NEW: delete consumption row (and lines via cascade)
    def delete(self, request, number):
        mc = get_object_or_404(MaterialConsumption, number=number)
        mc.delete()
        return Response({"status": "ok", "message": "Deleted successfully."}, status=status.HTTP_200_OK)


class MaterialConsumptionNext(APIView):
    """
    GET /api/material-consumptions/next/
    Returns { prefix, next, preview }
    """
    permission_classes = [AllowAny]

    def get(self, request):
        data = NextMCNumberSerializer.build(prefix="CONWS")
        return Response(data, status=status.HTTP_200_OK)
