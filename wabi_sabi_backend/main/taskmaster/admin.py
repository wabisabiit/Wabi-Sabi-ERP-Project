# taskmaster/admin.py
from django.contrib import admin
from .models import TaskItem,Location

@admin.register(TaskItem)
class TaskItemAdmin(admin.ModelAdmin):
    list_display = ("item_code", "category", "department", "item_active", "gst", "updated_at")
    list_filter  = ("category", "department", "item_active")
    search_fields = ("item_code", "item_full_name", "item_vasy_name", "item_print_friendly_name")


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("code", "name")
    search_fields = ("code", "name")