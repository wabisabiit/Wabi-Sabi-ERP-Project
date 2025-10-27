from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .models import CreditNote
from .serializers_credit import CreditNoteListSerializer

class CreditNoteView(APIView):
    """
    GET /api/credit-notes/?query=&page=&page_size= or ?all=1
    """
    def get(self, request):
        qs = CreditNote.objects.select_related("customer").order_by("-date", "-id")

        q = (request.GET.get("query") or "").strip()
        if q and q.lower() not in ("undefined", "null"):
            qs = qs.filter(
                Q(note_no__icontains=q) |
                Q(customer__name__icontains=q) |
                Q(barcode__icontains=q)
            )

        want_all = (request.GET.get("all") or "").lower() in ("1", "true", "yes", "on") \
                   or (request.GET.get("page_size") or "").lower() == "all"
        if want_all:
            data = CreditNoteListSerializer(qs, many=True).data
            return Response({"results": data, "total": len(data), "page": 1, "page_size": len(data)}, status=status.HTTP_200_OK)

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

        data = CreditNoteListSerializer(items, many=True).data
        return Response({"results": data, "total": total, "page": page, "page_size": page_size}, status=status.HTTP_200_OK)
