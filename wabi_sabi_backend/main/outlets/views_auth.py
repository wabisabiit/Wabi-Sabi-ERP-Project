# outlets/views_auth.py
from django.contrib.auth import authenticate, login as dj_login, logout as dj_logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from django.contrib.auth.models import User
from .models import Employee


def _serialize_user(user: User):
    emp = getattr(user, "employee", None)

    full_name = (user.get_full_name() or user.username).strip()
    role_code = None
    role_label = None

    if emp:
        role_code = emp.role
        role_label = dict(Employee.ROLE_CHOICES).get(emp.role, emp.role)
    elif user.is_superuser:
        role_code = "ADMIN"
        role_label = "Admin"

    outlet_id = None
    outlet_name = None
    outlet_code = None
    if emp and emp.outlet:
        outlet = emp.outlet
        outlet_id = outlet.id
        outlet_name = outlet.display_name or outlet.location.name
        outlet_code = outlet.location.code

    return {
        "id": user.id,
        "username": user.username,
        "full_name": full_name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": role_code,
        "role_label": role_label,
        "is_superuser": user.is_superuser,
        "outlet_id": outlet_id,
        "outlet_name": outlet_name,
        "outlet_code": outlet_code,
    }


@method_decorator(csrf_exempt, name="dispatch")  # simple JSON login (you can remove if you prefer CSRF)
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        if not username or not password:
            return Response(
                {"detail": "Username and password required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if user is None or not user.is_active:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 🔴 IMPORTANT: only Admin (superuser) or MANAGER can use this POS app
        emp = getattr(user, "employee", None)
        if not (user.is_superuser or (emp and emp.role == "MANAGER")):
            return Response(
                {"detail": "You are not allowed to login to this application."},
                status=status.HTTP_403_FORBIDDEN,
            )

        dj_login(request, user)
        return Response(_serialize_user(user))


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response(_serialize_user(request.user))


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        dj_logout(request)
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)
