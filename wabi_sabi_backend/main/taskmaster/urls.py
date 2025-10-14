from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskItemViewSet

router = DefaultRouter()
router.register(r"taskitems", TaskItemViewSet, basename="taskitems")

urlpatterns = [
    path("", include(router.urls)),
]
