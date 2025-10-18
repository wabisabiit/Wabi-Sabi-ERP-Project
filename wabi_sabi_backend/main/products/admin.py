# main/products/admin.py
from django.contrib import admin
from .models import Product, StockTransfer, StockTransferLine
from taskmaster.models import TaskItem, Location


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
