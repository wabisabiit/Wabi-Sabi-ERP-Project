# products/views_locations.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from taskmaster.models import Location


class LocationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Location.objects.all().order_by("code")
        data = [
            {
                "id": x.id,
                "code": (x.code or "").strip(),
                "name": (x.name or "").strip(),
            }
            for x in qs
        ]
        return Response(data)
