# outlets/utils.py
from typing import Optional
from django.contrib.auth.models import User
from .models import Employee, Outlet

def get_user_employee(user: User) -> Optional[Employee]:
    if not user or not user.is_authenticated:
        return None
    return getattr(user, "employee", None)

def get_user_outlet(user: User) -> Optional[Outlet]:
    emp = get_user_employee(user)
    if not emp:
        return None
    return getattr(emp, "outlet", None)

def get_user_location_code(user: User) -> Optional[str]:
    """
    Returns current outlet's location.code for MANAGER / staff.
    Returns None for superuser/HQ (means: no outlet restriction).
    """
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return None

    emp = getattr(user, "employee", None)
    if not emp:
        return None
    outlet = getattr(emp, "outlet", None)
    if not outlet or not outlet.location:
        return None
    return outlet.location.code
