# products/views_material_consumption.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.utils.dateformat import format as dj_format
from django.db.models import F

from .serializers import (
    MaterialConsumptionCreateSerializer,
    MaterialConsumptionOutSerializer,
    NextMCNumberSerializer,
)
from .models import MaterialConsumption

class MaterialConsumptionView(APIView):
    """
    POST /api/material-consumptions/        -> create
    GET  /api/material-consumptions/        -> list (for index page)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """
        Returns a lightweight list:
        [
          { "number": "CONWS58", "date": "2025-10-23", "user": "Krishna Pandit",
            "type": "Scrap/Wastage", "location": "WABI SABI SUSTAINABILITY LLP", "amount": "2080.00" },
          ...
        ]
        """
        qs = (MaterialConsumption.objects
              .select_related("location")
              .order_by("-date", "-id"))

        # (Optional) server-side filters; FE can still filter client-side
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
            qs = qs.filter(date__gte=d1)   # expect YYYY-MM-DD
        if d2:
            qs = qs.filter(date__lte=d2)
        rows = []
        for mc in qs:
            # your UI shows a name; since model doesn’t store user we keep a fixed label
            rows.append({
                "number": mc.number,
                "date": mc.date.isoformat(),
                "user": "Krishna Pandit",
                "type": mc.consumption_type,
                "location": mc.location.name,
                "amount": str(mc.total_amount),
            })
        return Response(rows, status=status.HTTP_200_OK)

    def post(self, request):
        ser = MaterialConsumptionCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"status":"error", "errors":ser.errors}, status=status.HTTP_400_BAD_REQUEST)
        mc = ser.save()
        out = MaterialConsumptionOutSerializer(mc).data
        return Response({"status":"ok","message":"Material Consumption saved successfully.","consumption":out},
                        status=status.HTTP_201_CREATED)
    """
    POST /api/material-consumptions/        -> create from scanned rows
    GET  /api/material-consumptions/<no>/   -> detail (for later use)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        ser = MaterialConsumptionCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"status":"error", "errors":ser.errors}, status=status.HTTP_400_BAD_REQUEST)
        mc = ser.save()
        out = MaterialConsumptionOutSerializer(mc).data
        return Response({"status":"ok","message":"Material Consumption saved successfully.","consumption":out},
                        status=status.HTTP_201_CREATED)


class MaterialConsumptionDetail(APIView):
    permission_classes = [AllowAny]
    def get(self, request, number):
        mc = get_object_or_404(MaterialConsumption, number=number)
        return Response(MaterialConsumptionOutSerializer(mc).data, status=status.HTTP_200_OK)


class MaterialConsumptionNext(APIView):
    """
    GET /api/material-consumptions/next/
    Returns { prefix, next, preview }
    """
    permission_classes = [AllowAny]
    def get(self, request):
        data = NextMCNumberSerializer.build(prefix="CONWS")
        return Response(data, status=status.HTTP_200_OK)
