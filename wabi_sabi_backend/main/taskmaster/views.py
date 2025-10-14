from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import TaskItem
from .serializers import TaskItemSerializer

class TaskItemViewSet(viewsets.ModelViewSet):
    queryset = TaskItem.objects.all()
    serializer_class = TaskItemSerializer
    permission_classes = [AllowAny]

    # Filters you can use from Postman/query string
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "department", "item_active", "gst"]  # exact match filters
    search_fields = ["item_code", "item_full_name", "item_vasy_name", "item_print_friendly_name"]  # icontains
    ordering_fields = ["item_code", "category", "department", "gst", "created_at"]
    ordering = ["item_code"]
