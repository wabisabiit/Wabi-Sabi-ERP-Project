# outlets/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OutletViewSet, EmployeeViewSet
from .views_auth import LoginView, LogoutView, MeView, LoginLogListView

router = DefaultRouter()
router.register(r"outlets", OutletViewSet, basename="outlets")
router.register(r"employees", EmployeeViewSet, basename="employees")

urlpatterns = [
    path("auth/login/",  LoginView.as_view(),  name="api-login"),
    path("auth/logout/", LogoutView.as_view(), name="api-logout"),
    path("auth/me/",     MeView.as_view(),     name="api-me"),

    # 🔵 नया endpoint
    path("login-logs/", LoginLogListView.as_view(), name="login-log-list"),

    path("", include(router.urls)),
]
