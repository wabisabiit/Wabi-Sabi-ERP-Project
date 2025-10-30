from rest_framework import viewsets, permissions
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from .models import Location
from .serializers import LocationSerializer



from .models import TaskItem,Location
from .serializers import TaskItemSerializer

class TaskItemViewSet(viewsets.ModelViewSet):
    queryset = TaskItem.objects.all()
    serializer_class = TaskItemSerializer
    permission_classes = [AllowAny]

    # 👉 use item_code in URLs (not pk)
    lookup_field = "item_code"
    # allow codes like 100-W (hyphen), underscores, letters, digits; or just use r"[^/]+"
    lookup_value_regex = r"[-\w]+"

    # Filters/search/order (unchanged)
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "department", "item_active", "gst"]
    search_fields = ["item_code", "item_full_name", "item_vasy_name", "item_print_friendly_name"]
    ordering_fields = ["item_code", "category", "department", "gst", "created_at"]
    ordering = ["item_code"]

@api_view(["GET"])
@permission_classes([AllowAny])
def locations_list(request):
    """
    GET /api/locations/
    Returns [{code, name}, ...]
    """
    rows = list(Location.objects.order_by("code").values("code","name"))
    return Response(rows)

class LocationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Location.objects.all().order_by("code")
    serializer_class = LocationSerializer
    permission_classes = [permissions.AllowAny] 