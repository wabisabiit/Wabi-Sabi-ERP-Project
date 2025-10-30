# outlets/permissions.py
from rest_framework import permissions
from django.conf import settings

def bypass_open():
    # If OPEN_EMP_API is True (or you prefer, also allow when DEBUG=True), bypass all checks
    return bool(getattr(settings, "OPEN_EMP_API", False))

def is_hq(request):
    # If bypass flag is on, treat caller as HQ
    if bypass_open():
        return True

    emp = getattr(request.user, "employee", None)
    if request.user.is_superuser:
        return True
    if not emp:
        return False
    # HQ if their outlet's location code == DEFAULT_HQ_CODE
    return getattr(emp.outlet.location, "code", "") == getattr(settings, "DEFAULT_HQ_CODE", "WS")

class IsHQOrOutletScoped(permissions.BasePermission):
    """
    - TEMP: if OPEN_EMP_API=True -> allow everything (read/write)
    - HQ/superuser: full access
    - Managers/Staff: only within their outlet
    - POST: managers can create only inside their outlet
    """
    def has_permission(self, request, view):
        if bypass_open():
            return True

        if not request.user.is_authenticated:
            return False
        if is_hq(request):
            return True
        # non-HQ: allow safe methods; allow POST only if they are manager
        if request.method in permissions.SAFE_METHODS:
            return True
        emp = getattr(request.user, "employee", None)
        return bool(emp and emp.role == "MANAGER")

    def has_object_permission(self, request, view, obj):
        if bypass_open():
            return True

        if is_hq(request):
            return True
        emp = getattr(request.user, "employee", None)
        if not emp:
            return False
        # obj can be Employee or Outlet
        if hasattr(obj, "outlet"):  # Employee
            return obj.outlet_id == emp.outlet_id
        if hasattr(obj, "location"):  # Outlet
            return obj.id == emp.outlet_id
        return False
