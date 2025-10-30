# taskmaster/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskItemViewSet, locations_list  # keep existing views

router = DefaultRouter()
router.register(r"taskitems", TaskItemViewSet, basename="taskitems")

urlpatterns = [
    path("", include(router.urls)),                    # /api/taskitems/...
    path("locations/", locations_list, name="locations-list"),  # /api/locations/
]
