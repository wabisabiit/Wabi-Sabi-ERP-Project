# main/products/admin.py
from django.contrib import admin
from .models import Product, StockTransfer, StockTransferLine,Customer, Sale, SaleLine, InvoiceSequence, CreditNoteSequence, CreditNote
from taskmaster.models import TaskItem, Location
from .models import MasterPack, MasterPackLine
from .models import (
    MaterialConsumption, MaterialConsumptionLine, MaterialConsumptionSequence
)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "barcode",
        "task_item",
        "size",
        "mrp",
        "selling_price",
        "qty",
        "discount_percent",
        "updated_at",
    )
    list_select_related = ("task_item",)
    search_fields = (
        "barcode",
        "task_item__item_code",
        "task_item__item_vasy_name",
        "task_item__item_full_name",
        "task_item__hsn_code",
    )
    list_filter = ("task_item__category",)
    autocomplete_fields = ("task_item",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("barcode",)


# ---------- Inlines ----------
class StockTransferLineInline(admin.TabularInline):
    """
    Used inside StockTransfer admin to add/edit its lines.
    """
    model = StockTransferLine
    extra = 0
    autocomplete_fields = ("product",)
    readonly_fields = ("barcode", "mrp", "sp")
    fields = ("product", "qty", "barcode", "mrp", "sp")


class ProductMovementInline(admin.TabularInline):
    """
    (Optional) Show movements of this Product inside Product admin (read-only).
    """
    model = StockTransferLine
    fk_name = "product"
    extra = 0
    can_delete = False
    readonly_fields = ("transfer", "qty", "barcode", "mrp", "sp")
    fields = ("transfer", "qty", "barcode", "mrp", "sp")
    show_change_link = True


# attach the read-only inline to Product admin
ProductAdmin.inlines = [ProductMovementInline]


# ---------- StockTransfer admin ----------
@admin.register(StockTransfer)
class StockTransferAdmin(admin.ModelAdmin):
    list_display = ("number", "from_location", "to_location", "created_at", "note")
    list_select_related = ("from_location", "to_location")
    search_fields = ("number", "note")
    list_filter = ("from_location", "to_location")
    date_hierarchy = "created_at"
    autocomplete_fields = ("from_location", "to_location")
    inlines = [StockTransferLineInline]
    ordering = ("-created_at", "number")


# (Optional) also expose lines as their own changelist (handy for searches/reports)
@admin.register(StockTransferLine)
class StockTransferLineAdmin(admin.ModelAdmin):
    list_display = ("transfer", "product", "qty", "barcode", "mrp", "sp")
    list_select_related = ("transfer", "product")
    search_fields = ("barcode", "transfer__number", "product__barcode")
    list_filter = ("transfer__from_location", "transfer__to_location")
    autocomplete_fields = ("transfer", "product")
    ordering = ("transfer", "barcode")


# products/admin.py
from django.contrib import admin
from .models import Customer, Sale, SaleLine, InvoiceSequence

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "email", "created_at")
    search_fields = ("name", "phone", "email")

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display  = ("invoice_no", "customer", "store", "payment_method", "transaction_date", "grand_total")
    list_filter   = ("store", "payment_method", "transaction_date")
    search_fields = ("invoice_no", "customer__name", "customer__phone")

@admin.register(SaleLine)
class SaleLineAdmin(admin.ModelAdmin):
    list_display = ("sale", "barcode", "qty", "mrp", "sp")
    search_fields = ("barcode", "sale__invoice_no")

@admin.register(InvoiceSequence)
class InvoiceSequenceAdmin(admin.ModelAdmin):
    list_display = ("prefix", "next_number", "pad_width")


@admin.register(CreditNoteSequence)
class CreditNoteSequenceAdmin(admin.ModelAdmin):
    list_display = ("prefix", "next_number", "pad_width")
    search_fields = ("prefix",)
    # readonly_fields = ("prefix", "next_number", "pad_width")



@admin.register(CreditNote)
class CreditNoteAdmin(admin.ModelAdmin):
    list_display  = ("note_no", "date", "customer", "barcode", "amount", "qty", "sale", "status_display")
    search_fields = ("note_no", "barcode", "customer__name", "customer__phone")
    list_filter   = ("date", "customer")  # keeping your filters as-is
    ordering      = ("-date", "-id")
    date_hierarchy = "date"

    @admin.display(description="Status", ordering="is_redeemed")
    def status_display(self, obj):
        # Active if not redeemed, Not Active if already redeemed
        return "Active" if not obj.is_redeemed else "Not Active"

@admin.register(MasterPack)
class MasterPackAdmin(admin.ModelAdmin):
    list_display = ("number", "created_at", "items_total", "qty_total", "amount_total")
    search_fields = ("number",)
    date_hierarchy = "created_at"

@admin.register(MasterPackLine)
class MasterPackLineAdmin(admin.ModelAdmin):
    list_display = ("pack", "barcode", "qty", "sp", "location")
    search_fields = ("barcode", "pack__number")
    list_filter = ("location",)

@admin.register(MaterialConsumption)
class MaterialConsumptionAdmin(admin.ModelAdmin):
    list_display = ("number","date","location","consumption_type","total_amount","created_at")
    search_fields = ("number","location__code","location__name")
    list_filter = ("consumption_type","location")

@admin.register(MaterialConsumptionLine)
class MaterialConsumptionLineAdmin(admin.ModelAdmin):
    list_display = ("consumption","barcode","name","qty","price","total")
    search_fields = ("barcode","name","consumption__number")

@admin.register(MaterialConsumptionSequence)
class MaterialConsumptionSequenceAdmin(admin.ModelAdmin):
    list_display = ("prefix","next_number","pad_width")