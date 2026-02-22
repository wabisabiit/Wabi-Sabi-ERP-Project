# taskmaster/views_filters.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from .models import TaskItem


class DepartmentListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = (
            TaskItem.objects.exclude(department__isnull=True)
            .exclude(department__exact="")
            .values_list("department", flat=True)
            .distinct()
            .order_by("department")
        )
        return Response([d.strip() for d in qs if str(d).strip()])


class CategoryListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        dept = (request.query_params.get("department") or "").strip()

        q = TaskItem.objects.exclude(category__isnull=True).exclude(category__exact="")
        if dept:
            q = q.filter(department__iexact=dept)

        qs = q.values_list("category", flat=True).distinct().order_by("category")
        return Response([c.strip() for c in qs if str(c).strip()])