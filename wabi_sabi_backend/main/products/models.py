from django.db import models

# Create your models here.
from django.db import models
from taskmaster.models import TaskItem   # <-- your TaskItem

class Product(models.Model):
    """
    A sellable barcode mapped to a TaskItem (many Product rows can point to one TaskItem).
    In the grid (image-2):
      - Item Code  -> this is Product.barcode
      - Name       -> TaskItem.item_vasy_name
      - Category   -> TaskItem.category
      - Brand      -> from TaskItem.attributes.get('brand')  (fallback blank)
      - HSN        -> TaskItem.hsn_code
      - MRP        -> Product.mrp
      - Selling    -> Product.selling_price
    """
    barcode = models.CharField(max_length=64, unique=True, db_index=True)   # shown as Item Code in UI
    task_item = models.ForeignKey(
        TaskItem,
        to_field="item_code",            # link by the TaskItem.item_code (e.g. 100-W)
        db_column="task_item_code",
        on_delete=models.CASCADE,
        related_name="products",
    )
    size = models.CharField(max_length=32, blank=True)
    image_url = models.URLField(blank=True)

    mrp = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # optional inventory fields (safe defaults)
    qty = models.IntegerField(default=0)
    discount_percent = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["barcode"]

    def __str__(self):
        return f"{self.barcode} -> {self.task_item_id}"
