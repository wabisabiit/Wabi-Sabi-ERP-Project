# main/products/admin.py
from django.contrib import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "barcode",               # shown as Item Code in UI
        "task_item",             # FK -> TaskItem (displays its __str__)
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
