# Create your models here. 
from django.db import models, transaction
from taskmaster.models import TaskItem, Location   # <-- your TaskItem
from django.utils import timezone
from django.core.validators import RegexValidator, MinValueValidator
from django.contrib.auth.models import User


alnum_validator = RegexValidator(
    regex=r"^[A-Za-z0-9]+$",
    message="Coupon name must be alphanumeric (A–Z, a–z, 0–9) without spaces.",
)

discount_code_validator = RegexValidator(
    regex=r"^[A-Z0-9]{6}$",
    message="Discount Code must be 6 characters, capital letters & digits (e.g. RDF214).",
)


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

    # inside class Product(models.Model):
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="products",
        null=True,
        blank=True,
    )

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

    # ✅ NEW: location scoping
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="customers",
        null=True,
        blank=True,
    )

    # ✅ NEW: created_by (so frontend can show manager name)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers_created",
    )

    class Meta:
        ordering = ["name"]
        indexes  = [models.Index(fields=["phone"])]

    def __str__(self):
        return f"{self.name} ({self.phone})" if self.phone else self.name


class InvoiceSequence(models.Model):
    """
    Concurrency-safe sequence for invoice numbers. One row per prefix.
    """
    prefix       = models.CharField(max_length=16, unique=True, default="INV")
    next_number  = models.PositiveIntegerField(default=1)
    pad_width    = models.PositiveSmallIntegerField(default=2)

    def __str__(self):
        return f"{self.prefix} next={self.next_number}"

    @classmethod
    def next_invoice_no(cls, prefix="INV"):
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
    PAYMENT_CREDIT    = "CREDIT"
    PAYMENT_COUPON    = "COUPON"

    PAYMENT_METHODS = [
        (PAYMENT_UPI, "UPI"),
        (PAYMENT_CARD, "Card"),
        (PAYMENT_CASH, "Cash"),
        (PAYMENT_MULTIPAY, "Multipay"),
        (PAYMENT_CREDIT, "Credit Note"),
        (PAYMENT_COUPON, "Coupon"),
    ]

    # 🔵 NEW: salesman (must be STAFF, enforced in serializer)
    salesman = models.ForeignKey(
        "outlets.Employee",
        on_delete=models.PROTECT,
        related_name="sales",
        null=True,
        blank=True,
    )

    # ✅ NEW: created_by (Admin / Outlet Manager)
    # (unique related_name to avoid clash with HoldBill.created_by which already uses "sales_created")
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pos_sales_created",
    )

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
            self.invoice_no = InvoiceSequence.next_invoice_no(prefix="INV")
        super().save(*args, **kwargs)


class SalePayment(models.Model):
    """
    Stores actual payment breakup for a sale.
    Needed for register closing summary (cash/card/upi totals), especially for MULTIPAY.
    """
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name="payments",
    )

    # store the actual method used for THIS payment row (CASH / CARD / UPI / etc.)
    method = models.CharField(max_length=16, choices=Sale.PAYMENT_METHODS)

    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    reference = models.CharField(max_length=120, blank=True, default="")
    card_holder = models.CharField(max_length=120, blank=True, default="")
    card_holder_phone = models.CharField(max_length=20, blank=True, default="")
    customer_bank = models.CharField(max_length=120, blank=True, default="")
    account = models.CharField(max_length=120, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        indexes = [
            models.Index(fields=["method"]),
        ]

    def __str__(self):
        return f"{self.sale.invoice_no} {self.method} {self.amount}"


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

    discount_percent = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    discount_amount  = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # ₹ per unit

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
    Credit note that can be redeemed partially or fully.
    UI expects:
      - total amount = amount
      - credits used = redeemed_amount
      - remaining = amount - redeemed_amount
      - status = AVAILABLE / USED
      - created_by shown as username
    """
    note_no = models.CharField(max_length=32, unique=True, db_index=True)
    sale = models.ForeignKey("Sale", on_delete=models.PROTECT, related_name="credit_notes")
    customer = models.ForeignKey("Customer", on_delete=models.PROTECT, related_name="credit_notes")

    # location scoping
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="credit_notes",
        null=True,
        blank=True,
    )

    date = models.DateTimeField(default=timezone.now)

    product = models.ForeignKey("Product", on_delete=models.PROTECT)
    barcode = models.CharField(max_length=64, db_index=True)
    qty = models.PositiveIntegerField(default=1)

    # total credit value
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    note_date = models.DateTimeField()

    # redemption tracking (supports partial usage)
    is_redeemed = models.BooleanField(default=False)
    redeemed_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    redeemed_at = models.DateTimeField(null=True, blank=True)
    redeemed_invoice = models.CharField(max_length=32, blank=True, default="")

    # ✅ created by (same as Sale.created_by)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_notes_created",
    )

    class Meta:
        ordering = ["-note_date", "-id"]
        indexes = [models.Index(fields=["barcode"])]

    def __str__(self):
        return self.note_no

    @property
    def credits_remaining(self):
        rem = (self.amount or 0) - (self.redeemed_amount or 0)
        return rem if rem > 0 else 0

    @property
    def status(self):
        return "USED" if self.credits_remaining <= 0 else "AVAILABLE"

    def save(self, *args, **kwargs):
        if not self.note_no:
            self.note_no = CreditNoteSequence.next_no(prefix="CRN")

        # ensure barcode snapshot
        if self.product_id and not self.barcode:
            self.barcode = self.product.barcode

        # ✅ auto fill created_by from sale if missing
        if not self.created_by_id and self.sale_id and getattr(self.sale, "created_by_id", None):
            self.created_by_id = self.sale.created_by_id

        # ✅ FIX: credit note amount must match customer's net paid price (after discount)
        # amount = (SaleLine.sp - SaleLine.discount_amount) * qty
        if self.sale_id and self.barcode:
            ln = (
                SaleLine.objects
                .filter(sale_id=self.sale_id, barcode=self.barcode)
                .order_by("id")
                .first()
            )
            if ln:
                from decimal import Decimal, ROUND_HALF_UP
                TWOPLACES = Decimal("0.01")

                net_unit = (ln.sp or 0) - (ln.discount_amount or 0)
                if net_unit < 0:
                    net_unit = 0

                q = Decimal(int(self.qty or 1))
                self.amount = (Decimal(net_unit) * q).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        super().save(*args, **kwargs)




# ===========================
# ✅ NEW: MasterPack sequence
# ===========================
class MasterPackSequence(models.Model):
    """
    Concurrency-safe sequence for MasterPack numbers.
    One row per segment (HR-UV / WS / DL-RGR etc.)
    """
    segment      = models.CharField(max_length=24, unique=True, db_index=True)  # e.g. HR-UV, WS
    next_number  = models.PositiveIntegerField(default=1)
    pad_width    = models.PositiveSmallIntegerField(default=4)  # 0001

    def __str__(self):
        return f"MP/{self.segment} next={self.next_number}"

    @classmethod
    def next_no(cls, segment: str):
        seg = (segment or "").strip().upper()
        if not seg:
            seg = "WS"
        with transaction.atomic():
            seq, _ = cls.objects.select_for_update().get_or_create(
                segment=seg, defaults={"next_number": 1, "pad_width": 4}
            )
            num = seq.next_number
            seq.next_number = num + 1
            seq.save(update_fields=["next_number"])
            return f"MP/{seg}/{str(num).zfill(int(seq.pad_width or 4))}"


class MasterPack(models.Model):
    """
    Master packing header.
    """

    from_location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="master_packs_from",
        null=True,
        blank=True,
    )
    to_location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="master_packs_to",
        null=True,
        blank=True,
    )

    # ✅ NEW: sender (admin / manager)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="master_packs_created",
    )

    number = models.CharField(max_length=32, unique=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)

    items_total = models.PositiveIntegerField(default=0)
    qty_total = models.PositiveIntegerField(default=0)
    amount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.number

    # ✅ NEW: location->segment mapping as per your requirement
    @staticmethod
    def _mp_segment_from_location_code(code: str) -> str:
        c = (code or "").strip().upper()
        c_norm = c.replace(" ", "")

        # support both "UPAP" and "UP-AP"
        if c_norm == "UPAP":
            c = "UP-AP"

        # Your requested mapping:
        # HR prefix -> UV, IC, M3M
        # WS -> WS
        # UP prefix -> AP (UP-AP)
        # DL prefix -> RGR (inside), RGO (outside), TN
        mapping = {
            "UV":   "HR-UV",
            "IC":   "HR-IC",
            "M3M":  "HR-M3M",
            "UP-AP":"UP-AP",
            "WS":   "WS",
            # DB codes are RJR/RJO, but you want RGR/RGO in MP number
            "RJR":  "DL-RGR",
            "RJO":  "DL-RGO",
            "TN":   "DL-TN",
        }
        return mapping.get(c, c or "WS")

    def save(self, *args, **kwargs):
        # ✅ Auto-generate MP number if not set
        if not self.number:
            from_code = getattr(self.from_location, "code", "") if self.from_location_id else ""
            segment = self._mp_segment_from_location_code(from_code)
            self.number = MasterPackSequence.next_no(segment)
        super().save(*args, **kwargs)


class MasterPackLine(models.Model):
    """
    One barcode row in the packing sheet.
    Location is chosen per row (linked to Taskmaster.Location).
    """
    pack = models.ForeignKey(MasterPack, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey('Product', on_delete=models.PROTECT)
    barcode = models.CharField(max_length=64, db_index=True)

    # Snapshots for traceability
    name = models.CharField(max_length=512, blank=True, default="")
    brand = models.CharField(max_length=64, blank=True, default="B4L")
    color = models.CharField(max_length=64, blank=True, default="")  # left empty
    size = models.CharField(max_length=32, blank=True, default="")
    sp = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # selling price

    qty = models.PositiveIntegerField(default=1)
    location = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="master_pack_lines")

    class Meta:
        ordering = ["barcode"]
        indexes = [models.Index(fields=["barcode"])]

    def __str__(self):
        return f"{self.pack.number} • {self.barcode} x{self.qty}"


class MaterialConsumptionSequence(models.Model):
    prefix      = models.CharField(max_length=16, unique=True, default="CONWS")
    next_number = models.PositiveIntegerField(default=1)
    pad_width   = models.PositiveSmallIntegerField(default=0)  # no padding like CONWS58

    def __str__(self):
        return f"{self.prefix} next={self.next_number}"

    @classmethod
    def next_no(cls, prefix="CONWS"):
        # concurrency-safe counter
        with transaction.atomic():
            seq, _ = cls.objects.select_for_update().get_or_create(
                prefix=prefix, defaults={"next_number": 1}
            )
            num = seq.next_number
            seq.next_number = num + 1
            seq.save(update_fields=["next_number"])
            # No zero-padding in your screenshots (CONWS58)
            if (seq.pad_width or 0) > 0:
                return f"{prefix}{str(num).zfill(seq.pad_width)}"
            return f"{prefix}{num}"


class MaterialConsumption(models.Model):
    """
    Header for a consumption entry.
    """
    number          = models.CharField(max_length=32, unique=True, db_index=True)  # e.g. CONWS59
    location        = models.ForeignKey(Location, on_delete=models.PROTECT, related_name="material_consumptions")
    consumption_type= models.CharField(max_length=32, default="Production")  # Production / Scrap/Wastage / Expired
    remark          = models.TextField(blank=True, default="")
    date            = models.DateField(default=timezone.now)

    total_amount    = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.number

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = MaterialConsumptionSequence.next_no(prefix="CONWS")
        super().save(*args, **kwargs)


class MaterialConsumptionLine(models.Model):
    """
    Lines added by scanning / typing barcode.
    """
    consumption = models.ForeignKey(MaterialConsumption, on_delete=models.CASCADE, related_name="lines")
    product     = models.ForeignKey(Product, on_delete=models.PROTECT)
    barcode     = models.CharField(max_length=64, db_index=True)

    name        = models.CharField(max_length=512, blank=True, default="")
    qty         = models.PositiveIntegerField(default=1)
    price       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total       = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["barcode"]
        indexes  = [models.Index(fields=["barcode"])]


class Coupon(models.Model):
    """
    Master coupon (template). Single price; redeem value always equals price.
    Name must be unique (case-insensitive).
    """
    name = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        validators=[alnum_validator],
    )
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    # redeem_value mirrors price per requirement
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                models.functions.Lower("name"),
                name="coupon_name_unique_ci",
            )
        ]

    def __str__(self):
        return self.name


class GeneratedCoupon(models.Model):
    """
    One physical/usable coupon code created from a Coupon.
    Code is like <COUPONNAME>_01, _02, ...
    """
    STATUS_AVAILABLE = "AVAILABLE"
    STATUS_REDEEMED  = "REDEEMED"
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Available"),
        (STATUS_REDEEMED,  "Redeemed"),
    ]

    coupon      = models.ForeignKey(Coupon, on_delete=models.PROTECT, related_name="instances")
    serial_no   = models.PositiveIntegerField()                         # 1,2,3... within coupon
    code        = models.CharField(max_length=80, unique=True, db_index=True)  # ex: Ranjit342_01
    price       = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # “Generated table” fields you asked to persist/show
    issued_by   = models.CharField(max_length=64, default="Vishnu")     # default Vishnu
    assigned_to = models.ForeignKey(Customer, null=True, blank=True, on_delete=models.SET_NULL)
    customer_no = models.CharField(max_length=20, blank=True, default="")  # phone snapshot

    created_date    = models.DateTimeField(auto_now_add=True)
    redemption_date = models.DateTimeField(null=True, blank=True)

    status      = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    redeemed_invoice_no = models.CharField(max_length=32, blank=True, default="")

    class Meta:
        ordering  = ["-created_date", "-id"]
        indexes   = [models.Index(fields=["code"]), models.Index(fields=["coupon", "serial_no"])]

    def __str__(self):
        return self.code

    @classmethod
    def bulk_generate(cls, coupon: Coupon, qty: int):
        """Concurrency-safe serial allocation + code building."""
        qty = max(0, int(qty or 0))
        if qty == 0:
            return []

        with transaction.atomic():
            # find current max serial for this coupon
            last = (
                cls.objects.select_for_update()
                .filter(coupon=coupon)
                .order_by("-serial_no")
                .first()
            )
            start = (last.serial_no if last else 0) + 1
            rows = []
            for i in range(qty):
                sn = start + i
                code = f"{coupon.name}_{str(sn).zfill(2)}"
                rows.append(
                    cls(
                        coupon=coupon,
                        serial_no=sn,
                        code=code,
                        price=coupon.price,
                    )
                )
            created = cls.objects.bulk_create(rows, ignore_conflicts=False)
            return created

    def redeem(self, *, sale: Sale, customer: Customer):
        if self.status == self.STATUS_REDEEMED:
            raise ValueError("Coupon already redeemed.")
        self.status = self.STATUS_REDEEMED
        self.redemption_date = timezone.now()
        self.redeemed_invoice_no = sale.invoice_no
        self.assigned_to = customer
        self.customer_no = (customer.phone or "")
        self.save(update_fields=[
            "status", "redemption_date", "redeemed_invoice_no",
            "assigned_to", "customer_no"
        ])


class Discount(models.Model):
    """
    Custom discount master. Ignores the UI's 'dummy' fields by design.
    Applies to a category (TaskItem.category text) and selected branches.
    """
    # Basic
    title = models.CharField(max_length=120)
    code  = models.CharField(
        max_length=6, unique=True, db_index=True, validators=[discount_code_validator]
    )

    # Where applied
    APPLICABLE_PRODUCT = "PRODUCT"
    APPLICABLE_BILL    = "BILL"
    APPLICABLE_CHOICES = [
        (APPLICABLE_PRODUCT, "Product wise"),
        (APPLICABLE_BILL, "Entire bill"),
    ]
    applicable = models.CharField(max_length=16, choices=APPLICABLE_CHOICES, default=APPLICABLE_PRODUCT)

    # Discount modes
    MODE_NORMAL   = "NORMAL"     # percent/fixed off
    MODE_RANGE    = "RANGE"      # active when amount in [min,max]
    MODE_BUYGET   = "BUYXGETY"   # buy X get Y free
    MODE_FIXPRICE = "FIXPRICE"   # product at fixed/min amount if threshold reached
    MODE_CHOICES  = [
        (MODE_NORMAL,   "Normal"),
        (MODE_RANGE,    "Range wise"),
        (MODE_BUYGET,   "Buy X Get Y"),
        (MODE_FIXPRICE, "Product at Fix Amount"),
    ]
    mode = models.CharField(max_length=16, choices=MODE_CHOICES, default=MODE_NORMAL)

    # Value type
    VAL_PERCENT = "PERCENT"
    VAL_AMOUNT  = "AMOUNT"
    VAL_CHOICES = [(VAL_PERCENT, "%"), (VAL_AMOUNT, "₹")]
    value_type  = models.CharField(max_length=8, choices=VAL_CHOICES, default=VAL_PERCENT)
    value       = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])

    # Range-wise guard
    range_min_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    range_max_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Buy X Get Y
    x_qty = models.PositiveIntegerField(default=0)  # “Buy X”
    y_qty = models.PositiveIntegerField(default=0)  # “Get Y”

    # Product at fixed amount — activates when >= threshold
    min_amount_for_fix = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Applies to category text (TaskItem.category). Leave blank to apply to all.
    applies_category = models.CharField(max_length=128, blank=True, default="")

    # Branch scope
    branches = models.ManyToManyField(Location, related_name="discounts")

    # Validity (MANDATORY)
    start_date = models.DateField()
    end_date   = models.DateField()

    # Meta
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    @property
    def is_active(self):
        today = timezone.localdate()
        return self.start_date <= today <= self.end_date

    @property
    def validity_days(self):
        return (self.end_date - self.start_date).days + 1  # inclusive

    def __str__(self):
        return f"{self.title} [{self.code}]"


# --- Hold Bill Sequence & Models ---

class HoldBillSequence(models.Model):
    prefix = models.CharField(max_length=16, unique=True, default="HB")
    next_number = models.PositiveIntegerField(default=1)
    pad_width = models.PositiveSmallIntegerField(default=0)  # no padding by default

    def __str__(self):
        return f"{self.prefix} next={self.next_number}"

    @classmethod
    def next_no(cls, prefix="HB"):
        """
        Concurrency-safe number generator: HB1, HB2, HB3...
        """
        with transaction.atomic():
            seq, _ = cls.objects.select_for_update().get_or_create(
                prefix=prefix, defaults={"next_number": 1}
            )
            num = seq.next_number
            seq.next_number = num + 1
            seq.save(update_fields=["next_number"])

            if (seq.pad_width or 0) > 0:
                return f"{prefix}{str(num).zfill(seq.pad_width)}"
            return f"{prefix}{num}"


class HoldBill(models.Model):
    """
    POS Hold Bill header.
    """
    number = models.CharField(max_length=32, unique=True, db_index=True)  # HB1, HB2...
    customer = models.ForeignKey(
        Customer, null=True, blank=True, on_delete=models.SET_NULL, related_name="hold_bills"
    )
    customer_name = models.CharField(max_length=120, blank=True, default="")
    customer_phone = models.CharField(max_length=20, blank=True, default="")

    location = models.ForeignKey(
        Location, on_delete=models.PROTECT, related_name="hold_bills"
    )

    # only active ones will be shown in JSX
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_created",
    )

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.number

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = HoldBillSequence.next_no(prefix="HB")
        super().save(*args, **kwargs)


class HoldBillLine(models.Model):
    """
    Lines on a hold bill. Used to restore cart later.
    """
    bill = models.ForeignKey(
        HoldBill, on_delete=models.CASCADE, related_name="lines"
    )
    product = models.ForeignKey("Product", on_delete=models.PROTECT)
    barcode = models.CharField(max_length=64, db_index=True)
    qty = models.PositiveIntegerField(default=1)

    # snapshot for info (not used in JSX now, but useful later)
    mrp = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sp = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["id"]
        indexes = [models.Index(fields=["barcode"])]

    def __str__(self):
        return f"{self.bill.number} - {self.barcode} x{self.qty}"

    def save(self, *args, **kwargs):
        if self.product_id:
            self.barcode = self.product.barcode
            if not self.mrp:
                self.mrp = self.product.mrp
            if not self.sp:
                self.sp = self.product.selling_price
        super().save(*args, **kwargs)


class Supplier(models.Model):
    """
    Supplier / Vendor master.
    Only company_name and gstin are mandatory as per requirement.
    """
    company_name = models.CharField(max_length=255)
    gstin        = models.CharField(max_length=15, unique=True)

    contact_name = models.CharField(max_length=120, blank=True)
    phone        = models.CharField(max_length=20, blank=True)
    email        = models.EmailField(blank=True)

    address1     = models.CharField(max_length=255, blank=True)
    address2     = models.CharField(max_length=255, blank=True)
    city         = models.CharField(max_length=64, blank=True)
    state        = models.CharField(max_length=64, blank=True)
    pin          = models.CharField(max_length=12, blank=True)

    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["company_name"]

    def __str__(self):
        return f"{self.company_name} ({self.gstin})"


# -------------------- Chart of Account --------------------

class Account(models.Model):
    """
    Simple ledger account used in 'Chart of Account' screen.
    Only text fields + opening balance, with default location name.
    """

    NATURE_ASSETS      = "Assets"
    NATURE_LIABILITIES = "Liabilities"
    NATURE_EXPENSES    = "Expenses"
    NATURE_INCOME      = "Income"

    NATURE_CHOICES = [
        (NATURE_ASSETS, "Assets"),
        (NATURE_LIABILITIES, "Liabilities"),
        (NATURE_EXPENSES, "Expenses"),
        (NATURE_INCOME, "Income"),
    ]

    name          = models.CharField(max_length=255)  # "Account Name"
    group_name    = models.CharField(max_length=120)  # "Sundry Debtors"
    group_nature  = models.CharField(
        max_length=32, choices=NATURE_CHOICES, default=NATURE_ASSETS
    )  # Assets / Liabilities / Expenses / Income
    account_type  = models.CharField(max_length=32, default="customers")

    opening_debit  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    opening_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # we keep this as TEXT with the same default shown in JSX
    location_name = models.CharField(
        max_length=255,
        default="Brands 4 less - IFFCO Chowk",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Expense(models.Model):
    """
    Simple expense voucher raised from the Payment > Expense modal.
    """
    supplier   = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="expenses")
    account    = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="expenses")
    amount     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    non_gst    = models.BooleanField(default=False)
    remark     = models.CharField(max_length=255, blank=True, default="")
    date_time  = models.DateTimeField(default=timezone.now)

    # who created this expense (manager / employee)
    created_by = models.ForeignKey(
        "outlets.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="expenses",
    )

    class Meta:
        ordering = ["-date_time", "-id"]

    def __str__(self):
        return f"Expense {self.id} - {self.supplier}"

    # 🔹 NEW: show location / HQ in admin
    def created_by_location(self):
        """
        For admin list: show manager's location name,
        or 'HQ' when no employee/outlet/location is attached.
        """
        emp = self.created_by
        if emp and getattr(emp, "outlet", None):
            loc = emp.outlet.location
            if loc:
                # use location name; change to loc.code if you prefer code
                return loc.name or loc.code
        return "HQ"

    created_by_location.short_description = "Created By"


class RegisterClosing(models.Model):
    """
    One 'Close Register' submission per outlet (location).
    Currency/denomination breakdown is NOT stored – only summary fields.
    """

    DRAWER_TOTAL = "TOTAL_CASH"
    DRAWER_SHORT = "SHORT"
    DRAWER_EXCESS = "EXCESS"

    DRAWER_CHOICES = [
        (DRAWER_TOTAL, "Total Cash"),
        (DRAWER_SHORT, "Short"),
        (DRAWER_EXCESS, "Excess"),
    ]

    # Which outlet / location this closing belongs to
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="register_closings",
        null=True,
        blank=True,
    )

    # Closing date + time (what you select in the modal)
    closed_at = models.DateTimeField(default=timezone.now)

    # LEFT PANEL AMOUNTS (all decimals)
    opening_cash       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cash_payment       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cheque_payment     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    card_payment       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bank_transfer_payment = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    upi_payment        = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    wallet_payment     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sales_return       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cash_refund        = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bank_refund        = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit_applied     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pay_later          = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expense            = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    purchase_payment   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_sales        = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # RIGHT PANEL FIELDS (no currency rows here)
    bank_account           = models.CharField(max_length=120, blank=True, default="")
    bank_transfer_register = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cash_flow              = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cash_left        = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    physical_drawer = models.CharField(
        max_length=16,
        choices=DRAWER_CHOICES,
        default=DRAWER_TOTAL,
    )
    closing_note = models.TextField(blank=True, default="")

    # Who submitted this closing
    created_by = models.ForeignKey(
        "outlets.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="register_closings",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-closed_at", "-id"]

    def __str__(self):
        loc = getattr(self.location, "code", None) or getattr(self.location, "name", "") or "N/A"
        return f"{loc} @ {self.closed_at:%Y-%m-%d %H:%M}"
    
    
    @property
    def closing_amount(self):
        """
        Closing Amount shown in Sales Register report.
        Must be the manager-entered 'Total Cash Left In Drawer'.
        """
        return self.total_cash_left or 0



class RegisterSession(models.Model):
    """
    Keeps track of daily opening cash per location.
    - One row per (location, business_date)
    - Opened once per day (or reopened after close, if you want)
    - When RegisterClosing is created, session becomes closed.
    """

    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="register_sessions",
        null=True,
        blank=True,
    )

    business_date = models.DateField(default=timezone.localdate, db_index=True)

    opened_at = models.DateTimeField(default=timezone.now)
    opening_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    is_open = models.BooleanField(default=True, db_index=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        "outlets.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="register_sessions",
    )

    class Meta:
        ordering = ["-business_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["location", "business_date"],
                name="uniq_register_session_location_day",
            )
        ]

    def __str__(self):
        loc = getattr(self.location, "code", None) or getattr(self.location, "name", "") or "N/A"
        return f"{loc} • {self.business_date} • {'OPEN' if self.is_open else 'CLOSED'}"