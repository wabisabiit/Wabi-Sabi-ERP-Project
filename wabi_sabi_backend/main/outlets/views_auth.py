# outlets/views_auth.py
from django.contrib.auth import authenticate, login as dj_login, logout as dj_logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authentication import SessionAuthentication, BasicAuthentication  # ⬅️ नया

from django.contrib.auth.models import User
from .models import Employee, LoginLog
from .serializers import LoginLogSerializer
from django.utils import timezone



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
@method_decorator(csrf_exempt, name="dispatch")
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

        emp = getattr(user, "employee", None)
        if not (user.is_superuser or (emp and emp.role == "MANAGER")):
            return Response(
                {"detail": "You are not allowed to login to this application."},
                status=status.HTTP_403_FORBIDDEN,
            )

        dj_login(request, user)

        # 🔵 यहां login log save करें
        ip = _get_client_ip(request)
        ua = request.META.get("HTTP_USER_AGENT", "") or ""
        system_details = _build_system_details(ua)

        outlet = getattr(emp, "outlet", None) if emp else None
        outlet_code = ""
        outlet_name = ""
        if outlet:
            loc = getattr(outlet, "location", None)
            outlet_code = getattr(loc, "code", "") or ""
            outlet_name = outlet.display_name or getattr(loc, "name", "") or ""

        LoginLog.objects.create(
            user=user,
            username=user.username,
            ip_address=ip,
            user_agent=ua,
            system_details=system_details,
            outlet=outlet,
            outlet_code=outlet_code,
            outlet_name=outlet_name,
        )

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

def _get_client_ip(request):
    """X-Forwarded-For को भी handle करे."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or ""


def _build_system_details(user_agent: str) -> str:
    """बहुत simple UA parsing – Windows/Mac/Android + Chrome/Edge/Firefox वगैरह."""
    ua = (user_agent or "").lower()

    os = "Desktop"
    if "windows nt 10" in ua:
        os = "Desktop Win10"
    elif "windows nt 11" in ua:
        os = "Desktop Win11"
    elif "mac os" in ua or "macintosh" in ua:
        os = "MacOS"
    elif "android" in ua:
        os = "Android"
    elif "iphone" in ua or "ipad" in ua:
        os = "iOS"

    browser = "Browser"
    if "edg/" in ua:
        browser = "Edge"
    elif "chrome/" in ua:
        browser = "Chrome"
    elif "firefox/" in ua:
        browser = "Firefox"
    elif "safari/" in ua:
        browser = "Safari"

    return f"{os} {browser}"

@method_decorator(csrf_exempt, name="dispatch")
@method_decorator(csrf_exempt, name="dispatch")
class LoginLogListView(APIView):
    """
    GET /api/login-logs/?location=TN&location=UV&limit=100
    """

    # ❌ IsAuthenticated हटाकर…
    permission_classes = [permissions.AllowAny]   # ✅ अब auth की जरूरत नहीं

    def get(self, request, *args, **kwargs):
        qs = LoginLog.objects.select_related("user", "outlet").all()

        loc_codes = request.query_params.getlist("location")
        if loc_codes:
            qs = qs.filter(outlet_code__in=loc_codes)

        limit_raw = request.query_params.get("limit")
        try:
            limit = int(limit_raw)
        except (TypeError, ValueError):
            limit = 200

        qs = qs.order_by("-login_time")[:limit]
        ser = LoginLogSerializer(qs, many=True)
        return Response(ser.data)
