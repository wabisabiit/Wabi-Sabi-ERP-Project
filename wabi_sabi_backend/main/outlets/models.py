# outlets/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from taskmaster.models import Location
from django.contrib.auth.models import User

class Outlet(models.Model):
    location = models.OneToOneField(Location, on_delete=models.CASCADE, related_name="outlet")
    display_name = models.CharField(max_length=128, blank=True)
    contact_no = models.CharField(max_length=32, blank=True)
    opening_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["location__code"]

    def __str__(self):
        return f"{self.location.code} - {self.display_name or self.location.name}"

# ── NEW validators ──────────────────────────────────────────────────────────────
aadhaar_validator = RegexValidator(r"^\d{12}$", "Aadhaar must be exactly 12 digits.")
pan_validator     = RegexValidator(r"^[A-Za-z0-9]{10}$", "PAN must be exactly 10 alphanumeric characters.")
acct_validator    = RegexValidator(r"^\d{9,18}$", "Account number must be 9–18 digits.")

class Employee(models.Model):
    ROLE_CHOICES = (
        ("MANAGER", "Manager"),
        ("STAFF", "Staff"),
    )
    user   = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employee")
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name="employees")
    role   = models.CharField(max_length=16, choices=ROLE_CHOICES, default="STAFF")
    is_active = models.BooleanField(default=True)
    mobile = models.CharField(max_length=20, blank=True, default="")

    # ⬇️ NOW OPTIONAL – no unique, can be blank
    aadhaar = models.CharField(
        max_length=12,
        validators=[aadhaar_validator],
        blank=True,
        default="",
        unique=False,
    )
    pan = models.CharField(
        max_length=10,
        validators=[pan_validator],
        blank=True,
        default="",
        unique=False,
    )
    bank_name    = models.CharField(max_length=80, blank=True, default="")
    bank_branch  = models.CharField(max_length=120, blank=True, default="")
    account_number = models.CharField(
        max_length=18,
        validators=[acct_validator],
        blank=True,
        default="",
    )

    class Meta:
        ordering = ["user__username"]
        constraints = [
            models.UniqueConstraint(fields=["user"], name="uniq_employee_user"),
        ]

    def __str__(self):
        return f"{self.user.username} ({self.role}) - {self.outlet}"


class LoginLog(models.Model):
    """हर successful login का audit-log."""

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="login_logs",
    )
    # snapshot ताकि user delete/rename होने पर भी पुराना नाम बचा रहे
    username = models.CharField(max_length=150)

    login_time = models.DateTimeField(auto_now_add=True)

    # IP + port भी आ सकता है, इसलिये CharField
    ip_address = models.CharField(max_length=64, blank=True)

    # raw user-agent
    user_agent = models.TextField(blank=True)

    # nicely formatted text – table में यही दिखाएँगे
    system_details = models.CharField(max_length=255, blank=True)

    # outlet info (optional)
    outlet = models.ForeignKey(
        "outlets.Outlet",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="login_logs",
    )
    outlet_code = models.CharField(max_length=20, blank=True)
    outlet_name = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["-login_time"]

    def __str__(self):
        return f"{self.username} @ {self.login_time:%Y-%m-%d %H:%M:%S}"


class WowBillEntry(models.Model):
    """
    One WOW-Bill calculation row for a salesperson.
    We store the raw inputs (sale_amount, wow_min_value, payout_per_wow)
    plus the derived numbers (wow_count, total_payout).
    """

    outlet = models.ForeignKey(
        Outlet,
        on_delete=models.PROTECT,
        related_name="wow_entries",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="wow_entries",
    )

    # allow null for old rows, we'll always set it for new ones
    customer = models.ForeignKey(
        "products.Customer",
        on_delete=models.PROTECT,
        related_name="wow_entries",
        null=True,
        blank=True,
    )
    bill_date = models.DateField(null=True, blank=True)

    sale_amount = models.DecimalField(max_digits=12, decimal_places=2)
    wow_min_value = models.DecimalField(max_digits=12, decimal_places=2)
    payout_per_wow = models.DecimalField(max_digits=12, decimal_places=2)

    wow_count = models.PositiveIntegerField(default=0)
    total_payout = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    exclude_returns = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wowbill_entries",
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "customer", "bill_date"],
                name="uniq_wowbill_emp_customer_date",
            )
        ]

    def __str__(self):
        return f"{self.employee} – WOW {self.wow_count} – ₹{self.total_payout}"


class WowBillSlab(models.Model):
    """
    Admin-defined WOW slab for a location (outlet).
    Example rows:
      outlet = Tilak Nagar, min_amount = 8000, payout_per_wow = 100
    """

    outlet = models.ForeignKey(
        Outlet,
        on_delete=models.CASCADE,
        related_name="wow_slabs",
    )
    min_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payout_per_wow = models.DecimalField(max_digits=12, decimal_places=2)

    active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wowbill_slabs",
    )

    class Meta:
        ordering = ["outlet__location__code", "min_amount"]
        constraints = [
            # same outlet + same min_amount only once
            models.UniqueConstraint(
                fields=["outlet", "min_amount"],
                name="uniq_wowbill_slab_per_outlet_amount",
            )
        ]

    def __str__(self):
        return f"{self.outlet} ≥ {self.min_amount} → ₹{self.payout_per_wow}"
    