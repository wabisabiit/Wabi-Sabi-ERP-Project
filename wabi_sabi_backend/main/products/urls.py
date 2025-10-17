from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProductViewSet
from .views_transfer import (
    print_and_transfer,
    transfer_list,
    transfer_details,
    delete_transfer,
    barcode_last_transfer,
)

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="products")

urlpatterns = [
    # custom endpoints BEFORE the router URLs
    path("products/print-barcodes/", print_and_transfer, name="print-and-transfer"),
    path("products/transfers/", transfer_list, name="transfer-list"),
    path("products/transfers/<path:number>/", transfer_details, name="transfer-details"),        # <-- path
    path("products/transfers/<path:number>/delete/", delete_transfer, name="transfer-delete"),  # <-- path
    path("products/barcodes/<str:barcode>/transfer/", barcode_last_transfer, name="barcode-last-transfer"),
]

# append router-generated endpoints
urlpatterns += router.urls
