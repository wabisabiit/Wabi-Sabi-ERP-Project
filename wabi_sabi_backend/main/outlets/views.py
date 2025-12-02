# outlets/views.py
from rest_framework import viewsets, status, permissions, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Outlet, Employee
from .serializers import OutletSerializer, EmployeeSerializer
from .permissions import IsHQOrOutletScoped, is_hq   # still used by OutletViewSet


# 🔹 Helper: get current user's outlet_id (for MANAGER/STAff scoping)
def _get_user_outlet_id(request):
  """
  Returns outlet_id for non-superuser users that have an Employee record.
  For superuser / unauthenticated / users without Employee -> returns None
  so that they are treated as HQ (see-all).
  """
  user = getattr(request, "user", None)
  if not user or not user.is_authenticated or user.is_superuser:
      return None

  emp = getattr(user, "employee", None)
  return getattr(emp, "outlet_id", None) or None


class OutletViewSet(viewsets.ModelViewSet):
    queryset = Outlet.objects.select_related("location").all()
    serializer_class = OutletSerializer
    permission_classes = [IsHQOrOutletScoped]

    def get_queryset(self):
        qs = super().get_queryset()
        if is_hq(self.request):
            return qs
        emp = getattr(self.request.user, "employee", None)
        return qs.filter(id=getattr(emp, "outlet_id", None) or -1)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = (
        Employee.objects
        .select_related("user", "outlet", "outlet__location")
        .all()
    )
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["outlet"]
    search_fields = [
        "user__username",
        "user__first_name",
        "user__last_name",
        "mobile",
    ]

    def get_queryset(self):
        """
        Admin / superuser -> all employees
        Manager / Staff   -> only employees from *their* outlet
        """
        qs = super().get_queryset()

        outlet_id = _get_user_outlet_id(self.request)

        # 🔵 Admin / superuser (or users without Employee) -> see all
        if outlet_id is None:
            return qs

        # 🔵 Branch users -> only their outlet's employees
        return qs.filter(outlet_id=outlet_id)
