# outlets/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Outlet, Employee
from .serializers import OutletSerializer, EmployeeSerializer
from .permissions import IsHQOrOutletScoped, is_hq

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
    queryset = Employee.objects.select_related("user", "outlet", "outlet__location").all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsHQOrOutletScoped]

    def get_queryset(self):
        qs = super().get_queryset()
        if is_hq(self.request):
            return qs
        emp = getattr(self.request.user, "employee", None)
        return qs.filter(outlet_id=getattr(emp, "outlet_id", None) or -1)

    def perform_create(self, serializer):
        # Only HQ can choose any outlet; non-HQ managers auto-bound to their own outlet
        if is_hq(self.request):
            serializer.save()
        else:
            manager = getattr(self.request.user, "employee", None)
            serializer.save(outlet=manager.outlet)

    # ==== NEW: hard-delete employee + auth user (HQ only) ====
    def destroy(self, request, *args, **kwargs):
        if not is_hq(request):
            return Response({"detail": "Only Head Office can delete employees."}, status=status.HTTP_403_FORBIDDEN)

        emp = self.get_object()
        # Delete the auth user; this cascades and removes the Employee via on_delete=CASCADE
        user = emp.user
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
