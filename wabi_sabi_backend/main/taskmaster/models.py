from django.db import models
from django.db.models import JSONField

class TaskItem(models.Model):
    # Core/Key fields from your Excel
    item_code = models.CharField(max_length=64, unique=True, db_index=True)   # Item_Code
    category = models.CharField(max_length=128, blank=True)
    department = models.CharField(max_length=128, blank=True)
    item_full_name = models.CharField(max_length=512, blank=True)
    item_vasy_name = models.CharField(max_length=512, blank=True)
    item_print_friendly_name = models.CharField(max_length=512, blank=True)
    item_active = models.BooleanField(default=True)
    hsn_code = models.CharField(max_length=32, blank=True)
    gst = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    # Keep every other column safely in JSON
    attributes = models.JSONField(default=dict, blank=True)

    # For traceability
    source_sheet = models.CharField(max_length=64, default="Item List")
    source_row = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["department"]),
        ]
        ordering = ["item_code"]

    def __str__(self):
        return f"{self.item_code} — {self.item_full_name or 'Unnamed'}"


# --- ADD: Location master (append, do not modify TaskItem) ---
class Location(models.Model):
    code = models.CharField(max_length=16, unique=True)   # e.g. "HQ", "WS"
    name = models.CharField(max_length=64)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"
