# products/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet
from .views_transfer import (
    print_and_transfer, transfer_list, transfer_details, delete_transfer,
    barcode_last_transfer, transfer_barcodes,
)
from .views_sales import SalesView   # <-- add this
from .views_credit import CreditNoteView,CreditNoteDetail,CreditNoteRedeem
from .views_sales_return import SaleLinesByInvoice, SalesReturn
from .views_customers import CustomerListCreate 
from .views_masterpack import MasterPackView

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="products")

urlpatterns = [
    path("products/print-barcodes/", print_and_transfer, name="print-and-transfer"),
    path("products/transfers/", transfer_list, name="transfer-list"),
    path("products/transfers/<path:number>/barcodes/", transfer_barcodes, name="transfer-barcodes"),
    path("products/transfers/<path:number>/delete/", delete_transfer, name="transfer-delete"),
    path("products/transfers/<path:number>/", transfer_details, name="transfer-details"),
    path("products/barcodes/<str:barcode>/transfer/", barcode_last_transfer, name="barcode-last-transfer"),

    # NEW
    path("sales/", SalesView.as_view(), name="sales"),
    path("credit-notes/", CreditNoteView.as_view(), name="credit-notes"),
    path("credit-notes/<str:note_no>/", CreditNoteDetail.as_view(), name="credit-note-detail"),      # ⬅️ NEW
    path("credit-notes/<str:note_no>/redeem/", CreditNoteRedeem.as_view(), name="credit-note-redeem"),# ⬅️ NEW

    # NEW for returns
    path("sales/<str:invoice_no>/lines/", SaleLinesByInvoice.as_view(), name="sale-lines-by-invoice"),
    path("sales/<str:invoice_no>/return/", SalesReturn.as_view(), name="sales-return"),
    path("customers/", CustomerListCreate.as_view(), name="customers"),

    #for Master Packing
    path("master-packs/", MasterPackView.as_view(), name="master-pack-create"),
]

urlpatterns += router.urls
