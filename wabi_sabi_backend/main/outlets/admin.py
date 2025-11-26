# outlets/admin.py
from django.contrib import admin
from .models import Outlet, Employee,LoginLog, WowBillEntry

@admin.register(Outlet)
class OutletAdmin(admin.ModelAdmin):
    list_display = ("id", "location", "display_name", "contact_no", "opening_date", "active")
    search_fields = ("location__code", "display_name")

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "outlet", "role", "is_active")
    list_filter = ("role", "outlet")
    search_fields = ("user__username", "user__first_name", "user__last_name", "outlet__location__code")

@admin.register(LoginLog)
class LoginLogAdmin(admin.ModelAdmin):
    list_display = ("username", "login_time", "ip_address", "system_details", "outlet_code")
    list_filter = ("outlet_code", "login_time")
    search_fields = ("username", "ip_address", "system_details", "user_agent")

@admin.register(WowBillEntry)
class WowBillEntryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "created_at",
        "outlet",
        "employee",
        "sale_amount",
        "wow_min_value",
        "payout_per_wow",
        "wow_count",
        "total_payout",
        "exclude_returns",
        "created_by",
    )
    list_filter = ("outlet", "employee", "exclude_returns", "created_at")
    search_fields = (
        "employee__user__username",
        "employee__user__first_name",
        "employee__user__last_name",
        "outlet__display_name",
    )
    date_hierarchy = "created_at"

    def get_queryset(self, request):
        """
        Superuser: see all entries
        Normal staff: only entries for their outlet (if Employee attached)
        """
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs

        emp = getattr(request.user, "employee", None)
        if emp and emp.outlet_id:
            return qs.filter(outlet=emp.outlet)
        return qs.none()