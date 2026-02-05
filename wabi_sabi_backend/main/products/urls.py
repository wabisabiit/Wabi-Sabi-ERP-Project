# products/urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet
from .views_transfer import (
    print_and_transfer, transfer_list, transfer_details, delete_transfer,
    barcode_last_transfer, transfer_barcodes,
)
from .views_sales import SalesView, SaleLinesByInvoiceView
from .views_credit import CreditNoteView, CreditNoteDetail, CreditNoteRedeem, CreditNoteDelete
from .views_sales_return import SalesReturn
from .views_customers import CustomerListCreate
from .views_masterpack import MasterPackView, MasterPackDetail, MasterPackBulkDelete
from .views_material_consumption import (
    MaterialConsumptionView, MaterialConsumptionDetail, MaterialConsumptionNext
)
from .views_coupons import (
    CouponListCreate, CouponGenerate, GeneratedCouponList,
    CouponLookup, CouponRedeem
)
from .views_reports import  ProductWiseSalesReport, CategoryWiseSalesSummary
from .views_discounts import DiscountListCreate, DiscountDetail
from .views_reports_masterpacking import master_packing_item_wise
from .views_holdbills import HoldBillView, HoldBillRestore
from .views_supplier import SupplierListCreateView
from .views_accounts import AccountListCreateView, AccountDetailView
from .views_expenses import ExpenseListCreateView, ExpenseDetailView
from .views_register import RegisterClosingView, RegisterClosingSummaryView

# ✅ NEW
from .views_dashboard import DashboardSummaryView

# ✅ CSV Import (NEW)
from .views_csv_import import ProductCsvPreflight, ProductCsvApply

from .views_receipt import SaleReceiptPdfView,DaywiseSalesSummary
from .views_creditreceipt import CreditNoteReceiptPdfView

from .views_sales import SalesView, SaleLinesByInvoiceView, SaleDeleteView


from .views_register_session import RegisterSessionTodayView, RegisterSessionOpenView

from .views_locations import LocationListView

from .views_sales_register import SalesRegisterReportView

# ✅ NEW: Salesman report API
from .views_salesman_report import SalesmanReportView



router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="products")

urlpatterns = [
    path("products/print-barcodes/", print_and_transfer, name="print-and-transfer"),
    path("products/transfers/", transfer_list, name="transfer-list"),
    path("products/transfers/<path:number>/barcodes/", transfer_barcodes, name="transfer-barcodes"),
    path("products/transfers/<path:number>/delete/", delete_transfer, name="transfer-delete"),
    path("products/transfers/<path:number>/", transfer_details, name="transfer-details"),
    path("products/barcodes/<str:barcode>/transfer/", barcode_last_transfer, name="barcode-last-transfer"),

    # ✅ CSV Import
    path("products/import-csv/preflight/", ProductCsvPreflight.as_view(), name="products-import-csv-preflight"),
    path("products/import-csv/apply/", ProductCsvApply.as_view(), name="products-import-csv-apply"),

    # Sales
    path("sales/", SalesView.as_view(), name="sales"),

    # Credit Notes
    path("credit-notes/", CreditNoteView.as_view(), name="credit-notes"),
    path("credit-notes/<str:note_no>/", CreditNoteDetail.as_view(), name="credit-note-detail"),
    path("credit-notes/<str:note_no>/redeem/", CreditNoteRedeem.as_view(), name="credit-note-redeem"),
    path("credit-notes/<str:note_no>/delete/", CreditNoteDelete.as_view(), name="credit-note-delete"),

    # Sales Return
    # ✅ FIXED: lines endpoint now returns sale-time prices (SaleLine.mrp/sp)
    path("sales/<str:invoice_no>/lines/", SaleLinesByInvoiceView.as_view(), name="sale-lines-by-invoice"),
    path("sales/<str:invoice_no>/return/", SalesReturn.as_view(), name="sales-return"),

    # Customers
    path("customers/", CustomerListCreate.as_view(), name="customers"),

    # Master Pack
    path("master-packs/", MasterPackView.as_view(), name="master-pack-create"),
    path("master-packs/bulk-delete/", MasterPackBulkDelete.as_view(), name="master-pack-bulk-delete"),
    # ✅ IMPORTANT: MasterPack number contains "/" like MP/HR-UV/0001
    path("master-packs/<path:number>/", MasterPackDetail.as_view(), name="master-pack-detail"),

    # Material Consumption
    path("material-consumptions/", MaterialConsumptionView.as_view(), name="material-consumption-create"),
    path("material-consumptions/next/", MaterialConsumptionNext.as_view(), name="material-consumption-next"),
    path("material-consumptions/<str:number>/", MaterialConsumptionDetail.as_view(), name="material-consumption-detail"),

    # Coupons
    path("coupons/", CouponListCreate.as_view(), name="coupon-list-create"),
    path("coupons/generate/", CouponGenerate.as_view(), name="coupon-generate"),
    path("coupons/instances/", GeneratedCouponList.as_view(), name="generated-coupons"),
    path("coupons/instances/<str:code>/", CouponLookup.as_view(), name="coupon-lookup"),
    path("coupons/instances/<str:code>/redeem/", CouponRedeem.as_view(), name="coupon-redeem"),

    # Reports
    path("reports/daywise-sales/", DaywiseSalesSummary.as_view(), name="daywise-sales-summary"),
    path("reports/product-wise-sales/", ProductWiseSalesReport.as_view(), name="report-product-wise-sales"),
    path("reports/category-wise-sales/", CategoryWiseSalesSummary.as_view(), name="report-category-wise-sales"),

    # ✅ NEW: Salesman report
    path("reports/salesman-report/", SalesmanReportView.as_view(), name="salesman-report"),

    # Discount
    path("discounts/", DiscountListCreate.as_view(), name="discount-list-create"),
    path("discounts/<int:pk>/", DiscountDetail.as_view(), name="discount-detail"),

    # Master packing report
    path("reports/master-packing-item-wise/", master_packing_item_wise, name="master-packing-item-wise"),

    # Hold Bills
    path("hold-bills/", HoldBillView.as_view(), name="hold-bill-list-create"),
    path("hold-bills/<str:number>/restore/", HoldBillRestore.as_view(), name="hold-bill-restore"),

    # Supplier
    path("suppliers/", SupplierListCreateView.as_view(), name="supplier-list-create"),

    # Chart of Account
    path("accounts/", AccountListCreateView.as_view(), name="account-list-create"),
    path("accounts/<int:pk>/", AccountDetailView.as_view(), name="account-detail"),

    # Expenses
    path("expenses/", ExpenseListCreateView.as_view(), name="expense-list-create"),
    path("expenses/<int:pk>/", ExpenseDetailView.as_view(), name="expense-detail"),

    # Register close
    path("register-closes/", RegisterClosingView.as_view(), name="register-close-list-create"),
    path("register-closes/today-summary/", RegisterClosingSummaryView.as_view(), name="register-close-today-summary"),

    # Register session (opening cash)
    path("register-sessions/today/", RegisterSessionTodayView.as_view(), name="register-session-today"),
    path("register-sessions/open/", RegisterSessionOpenView.as_view(), name="register-session-open"),


    # ✅ NEW Dashboard KPI summary (date filter required)
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),

    path("sales/<str:invoice_no>/receipt/", SaleReceiptPdfView.as_view(), name="sale-receipt-pdf"),
    path("credit-notes/<str:note_no>/receipt/", CreditNoteReceiptPdfView.as_view(), name="creditnote-receipt-pdf"),

    path("sales/<str:invoice_no>/delete/", SaleDeleteView.as_view(), name="sale-delete"),

    path("locations/", LocationListView.as_view(), name="locations"),

    path("reports/sales-register/", SalesRegisterReportView.as_view(), name="sales-register-report"),
]

urlpatterns += router.urls
