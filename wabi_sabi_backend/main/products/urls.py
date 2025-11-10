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
from .views_masterpack import MasterPackView,MasterPackDetail, MasterPackBulkDelete
from .views_material_consumption import (
    MaterialConsumptionView, MaterialConsumptionDetail, MaterialConsumptionNext
)

from .views_coupons import (
    CouponListCreate, CouponGenerate, GeneratedCouponList,
    CouponLookup, CouponRedeem
)
from .views_reports import DaywiseSalesSummary

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
    path("master-packs/bulk-delete/", MasterPackBulkDelete.as_view(), name="master-pack-bulk-delete"),  # ⬅️ NEW
    path("master-packs/<str:number>/", MasterPackDetail.as_view(), name="master-pack-detail"),

    path("material-consumptions/", MaterialConsumptionView.as_view(), name="material-consumption-create"),
    path("material-consumptions/next/", MaterialConsumptionNext.as_view(), name="material-consumption-next"),
    path("material-consumptions/<str:number>/", MaterialConsumptionDetail.as_view(), name="material-consumption-detail"),


    # Coupons
    path("coupons/", CouponListCreate.as_view(), name="coupon-list-create"),
    path("coupons/generate/", CouponGenerate.as_view(), name="coupon-generate"),
    path("coupons/instances/", GeneratedCouponList.as_view(), name="generated-coupons"),
    path("coupons/instances/<str:code>/", CouponLookup.as_view(), name="coupon-lookup"),
    path("coupons/instances/<str:code>/redeem/", CouponRedeem.as_view(), name="coupon-redeem"),

    #Summary
    path("reports/daywise-sales/", DaywiseSalesSummary.as_view(), name="daywise-sales-summary"),
]

urlpatterns += router.urls
