# products/views_masterpack.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Prefetch
from .models import MasterPack, MasterPackLine
from .serializers import MasterPackCreateSerializer, MasterPackOutSerializer
from django.shortcuts import get_object_or_404

class MasterPackView(APIView):
    """
    POST /api/master-packs/  -> create (already added)
    GET  /api/master-packs/  -> list packs for Invoice page
    """
    def get(self, request):
        packs = (MasterPack.objects
                 .prefetch_related(Prefetch("lines", queryset=MasterPackLine.objects.select_related("location")))
                 .order_by("-created_at", "-id"))

        out = []
        for p in packs:
            # Pick first line’s location (all rows use same location per your flow)
            loc = p.lines.all()[0].location if p.lines.exists() else None
            out.append({
                "number": p.number,
                "created_at": p.created_at,            # ISO; format on FE
                "amount_total": str(p.amount_total),   # decimals -> strings
                "location": {
                    "code": getattr(loc, "code", "") or "",
                    "name": getattr(loc, "name", "") or "",
                }
            })
        return Response(out, status=status.HTTP_200_OK)

    def post(self, request):
        ser = MasterPackCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        pack = ser.save()
        out = MasterPackOutSerializer(pack).data
        return Response({"status": "ok", "pack": out}, status=status.HTTP_201_CREATED)

class MasterPackDetail(APIView):
    """
    GET    /api/master-packs/<number>/  -> detail (with lines)
    DELETE /api/master-packs/<number>/  -> delete
    """
    def get(self, request, number):
        pack = get_object_or_404(
            MasterPack.objects.prefetch_related(
                Prefetch("lines", queryset=MasterPackLine.objects.select_related("location"))
            ),
            number=number,
        )
        data = MasterPackOutSerializer(pack).data
        return Response(data, status=status.HTTP_200_OK)

    def delete(self, request, number):
        pack = get_object_or_404(MasterPack, number=number)
        pack.delete()
        return Response({"status": "ok", "deleted": number}, status=status.HTTP_200_OK)

class MasterPackBulkDelete(APIView):
    """
    POST /api/master-packs/bulk-delete/
    body: { "numbers": ["INV1","INV2", ...] }
    """
    def post(self, request):
        numbers = request.data.get("numbers", [])
        if not isinstance(numbers, list) or not numbers:
            return Response({"status": "error", "detail": "numbers[] required"}, status=status.HTTP_400_BAD_REQUEST)

        qs = MasterPack.objects.filter(number__in=numbers)
        found = list(qs.values_list("number", flat=True))
        deleted_count, _ = qs.delete()
        return Response({"status": "ok", "requested": numbers, "deleted": found, "deleted_count": deleted_count}, status=status.HTTP_200_OK)