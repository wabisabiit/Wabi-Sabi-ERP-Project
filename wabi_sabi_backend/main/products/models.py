# Create your models here.
from django.db import models
from taskmaster.models import TaskItem,Location   # <-- your TaskItem

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

class StockTransfer(models.Model):
    number = models.CharField(max_length=32, unique=True, db_index=True)  # e.g. STF/WS/0001
    from_location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="stf_out")
    to_location   = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="stf_in")
    created_at    = models.DateTimeField()
    note          = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-created_at", "number"]

    def __str__(self):
        return self.number


class StockTransferLine(models.Model):
    transfer = models.ForeignKey(StockTransfer, on_delete=models.CASCADE, related_name="lines")
    product  = models.ForeignKey('Product', on_delete=models.PROTECT)
    qty      = models.PositiveIntegerField(default=1)

    # denormalized for fast reporting
    barcode  = models.CharField(max_length=64, db_index=True)
    mrp      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sp       = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        indexes = [models.Index(fields=["barcode"])]
        ordering = ["barcode"]


# -------------------- Sales / Customers --------------------
from django.db import models, transaction
from django.utils import timezone

class Customer(models.Model):
    """
    Basic customer master. Keep it minimal; extend later if needed.
    """
    name        = models.CharField(max_length=120)
    phone       = models.CharField(max_length=20, blank=True, db_index=True)
    email       = models.EmailField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        indexes  = [models.Index(fields=["phone"])]

    def __str__(self):
        return f"{self.name} ({self.phone})" if self.phone else self.name


class InvoiceSequence(models.Model):
    """
    Concurrency-safe sequence for invoice numbers. One row per prefix.
    """
    prefix       = models.CharField(max_length=16, unique=True, default="TRANS")
    next_number  = models.PositiveIntegerField(default=1)
    pad_width    = models.PositiveSmallIntegerField(default=2)  # TRANS01, TRANS02... change to 4 for TRANS0001

    def __str__(self):
        return f"{self.prefix} next={self.next_number}"

    @classmethod
    def next_invoice_no(cls, prefix="TRANS"):
        with transaction.atomic():
            seq, _ = cls.objects.select_for_update().get_or_create(prefix=prefix, defaults={"next_number": 1})
            num = seq.next_number
            seq.next_number = num + 1
            seq.save(update_fields=["next_number"])
            return f"{prefix}{str(num).zfill(seq.pad_width)}"


class Sale(models.Model):
    """
    Invoice / Bill header.
    """
    PAYMENT_UPI       = "UPI"
    PAYMENT_CARD      = "CARD"
    PAYMENT_CASH      = "CASH"
    PAYMENT_MULTIPAY  = "MULTIPAY"

    PAYMENT_METHODS = [
        (PAYMENT_UPI, "UPI"),
        (PAYMENT_CARD, "Card"),
        (PAYMENT_CASH, "Cash"),
        (PAYMENT_MULTIPAY, "Multipay"),
    ]

    invoice_no       = models.CharField(max_length=32, unique=True, db_index=True)
    customer         = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="sales")
    store            = models.CharField(max_length=64, default="Wabi - Sabi")
    payment_method   = models.CharField(max_length=16, choices=PAYMENT_METHODS)
    transaction_date = models.DateTimeField(default=timezone.now)

    # optional totals (fill from lines in your service/view)
    subtotal         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_total   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total      = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    note             = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["-transaction_date", "-id"]

    def __str__(self):
        return self.invoice_no

    def save(self, *args, **kwargs):
        # Auto-generate invoice number once per new record
        if not self.invoice_no:
            self.invoice_no = InvoiceSequence.next_invoice_no(prefix="TRANS")
        super().save(*args, **kwargs)


class SaleLine(models.Model):
    """
    Invoice lines mapped to your existing Product (by FK) and denormalized barcode.
    This ensures: one customer can have many barcodes (via many lines), not vice versa.
    """
    sale     = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="lines")
    product  = models.ForeignKey('Product', on_delete=models.PROTECT)
    qty      = models.PositiveIntegerField(default=1)

    # Denormalized for speed / safety if product changes later
    barcode  = models.CharField(max_length=64, db_index=True)
    mrp      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sp       = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["barcode"]
        indexes  = [models.Index(fields=["barcode"])]

    def __str__(self):
        return f"{self.sale.invoice_no} - {self.barcode} x{self.qty}"

    def save(self, *args, **kwargs):
        # Auto-fill denormalized fields from product
        if self.product_id:
            self.barcode = self.product.barcode
            if not self.mrp:
                self.mrp = self.product.mrp
            if not self.sp:
                self.sp = self.product.selling_price
        super().save(*args, **kwargs)



#Credit Note
# ========= Credit Notes =========
class CreditNoteSequence(models.Model):
    prefix       = models.CharField(max_length=16, unique=True, default="CRN")  # CRN
    next_number  = models.PositiveIntegerField(default=1)
    pad_width    = models.PositiveSmallIntegerField(default=2)  # CRN01

    def __str__(self):
        return f"{self.prefix} next={self.next_number}"

    @classmethod
    def next_no(cls, prefix="CRN"):
        with transaction.atomic():
            seq, _ = cls.objects.select_for_update().get_or_create(prefix=prefix, defaults={"next_number": 1})
            num = seq.next_number
            seq.next_number = num + 1
            seq.save(update_fields=["next_number"])
            return f"{prefix}{str(num).zfill(seq.pad_width)}"


class CreditNote(models.Model):
    """
    One row per product that reached qty==0 due to a successful sale.
    """
    note_no         = models.CharField(max_length=32, unique=True, db_index=True)
    sale            = models.ForeignKey('Sale', on_delete=models.PROTECT, related_name='credit_notes')
    customer        = models.ForeignKey('Customer', on_delete=models.PROTECT, related_name='credit_notes')
    date = models.DateTimeField(default=timezone.now) 
    product         = models.ForeignKey('Product', on_delete=models.PROTECT)
    barcode         = models.CharField(max_length=64, db_index=True)
    qty             = models.PositiveIntegerField(default=1)  # always 1 as requested
    amount          = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # product.selling_price
    created_at      = models.DateTimeField(auto_now_add=True)
    note_date       = models.DateTimeField()  # equal to sale.transaction_date

    class Meta:
        ordering = ["-note_date", "-id"]
        indexes  = [models.Index(fields=["barcode"])]

    def __str__(self):
        return self.note_no

    def save(self, *args, **kwargs):
        if not self.note_no:
            self.note_no = CreditNoteSequence.next_no(prefix="CRN")
        super().save(*args, **kwargs)
