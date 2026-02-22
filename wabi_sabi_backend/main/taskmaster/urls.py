# taskmaster/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskItemViewSet, locations_list  # keep existing
from .views_filters import DepartmentListView, CategoryListView

router = DefaultRouter()
router.register(r"taskitems", TaskItemViewSet, basename="taskitems")

urlpatterns = [
    # ✅ put these BEFORE router.urls, otherwise "categories" becomes <pk>
    path("taskitems/departments/", DepartmentListView.as_view(), name="taskitem-departments"),
    path("taskitems/categories/", CategoryListView.as_view(), name="taskitem-categories"),

    # keep your locations API
    path("locations/", locations_list, name="locations-list"),

    # router last
    path("", include(router.urls)),  # /api/taskitems/...
]