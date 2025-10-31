# products/views_masterpack.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Prefetch
from .models import MasterPack, MasterPackLine
from .serializers import MasterPackCreateSerializer, MasterPackOutSerializer

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
