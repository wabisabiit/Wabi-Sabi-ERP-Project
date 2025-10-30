# outlets/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OutletViewSet, EmployeeViewSet

router = DefaultRouter()
router.register(r'outlets', OutletViewSet, basename='outlets')
router.register(r'employees', EmployeeViewSet, basename='employees')

urlpatterns = [path("", include(router.urls))]
