# outlets/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from taskmaster.models import Location

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

    # ── NEW mandatory KYC/bank fields ───────────────────────────────────────────
    aadhaar = models.CharField(max_length=12, validators=[aadhaar_validator], unique=True)
    pan     = models.CharField(max_length=10, validators=[pan_validator], unique=True)
    bank_name    = models.CharField(max_length=80)
    bank_branch  = models.CharField(max_length=120)
    account_number = models.CharField(max_length=18, validators=[acct_validator])

    class Meta:
        ordering = ["user__username"]
        constraints = [
            models.UniqueConstraint(fields=["user"], name="uniq_employee_user"),
        ]

    def __str__(self):
        return f"{self.user.username} ({self.role}) - {self.outlet}"
