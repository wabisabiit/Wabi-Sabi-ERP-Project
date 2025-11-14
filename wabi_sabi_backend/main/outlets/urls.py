# outlets/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OutletViewSet, EmployeeViewSet
from .views_auth import LoginView, LogoutView, MeView   # ⬅️ import auth views

router = DefaultRouter()
router.register(r"outlets", OutletViewSet, basename="outlets")
router.register(r"employees", EmployeeViewSet, basename="employees")

urlpatterns = [
    # Auth endpoints -> /api/auth/login/, /api/auth/logout/, /api/auth/me/
    path("auth/login/",  LoginView.as_view(),  name="api-login"),
    path("auth/logout/", LogoutView.as_view(), name="api-logout"),
    path("auth/me/",     MeView.as_view(),     name="api-me"),

    # Existing router endpoints
    path("", include(router.urls)),
]
