# outlets/admin.py
from django.contrib import admin
from .models import Outlet, Employee

@admin.register(Outlet)
class OutletAdmin(admin.ModelAdmin):
    list_display = ("id", "location", "display_name", "contact_no", "opening_date", "active")
    search_fields = ("location__code", "display_name")

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "outlet", "role", "is_active")
    list_filter = ("role", "outlet")
    search_fields = ("user__username", "user__first_name", "user__last_name", "outlet__location__code")
