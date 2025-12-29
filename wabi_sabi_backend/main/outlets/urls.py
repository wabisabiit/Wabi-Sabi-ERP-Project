# outlets/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OutletViewSet, EmployeeViewSet
from .views_auth import LoginView, LogoutView, MeView, LoginLogListView
from .views_wowbill import WowBillEntryListCreateView, WowBillEntryDetailView, WowBillSlabViewSet


router = DefaultRouter()
router.register(r"outlets", OutletViewSet, basename="outlets")
router.register(r"employees", EmployeeViewSet, basename="employees")
router.register(r"wow-slabs", WowBillSlabViewSet, basename="wow-slabs") 

urlpatterns = [
    path("auth/login/",  LoginView.as_view(),  name="api-login"),
    path("auth/logout/", LogoutView.as_view(), name="api-logout"),
    path("auth/me/",     MeView.as_view(),     name="api-me"),

    # 🔵 नया endpoint
    path("login-logs/", LoginLogListView.as_view(), name="login-log-list"),

     # 🔵 WOW Bill entries
    #path("wow-bills/", WowBillEntryListCreateView.as_view(), name="wowbill-list-create"),

    # WOW entries
    path("wow-bills/", WowBillEntryListCreateView.as_view(), name="wowbill-list-create"),
    path("wow-bills/<int:pk>/", WowBillEntryDetailView.as_view(), name="wowbill-detail"),

    path("", include(router.urls)),
]
