# products/serializers_sales.py
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import serializers
from django.core.exceptions import FieldDoesNotExist

from .models import Customer, Product, Sale, SaleLine, SalePayment
from outlets.models import Employee
from outlets.utils_wowbill import create_wow_entry_for_sale


TWOPLACES = Decimal("0.01")


def q2(x):
    return (Decimal(x or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _sale_has_created_by():
    try:
        Sale._meta.get_field("created_by")
        return True
    except FieldDoesNotExist:
        return False


# ✅ ADDON: Compute "actual paid" price per sale line including BILL discount allocation
def compute_net_paid_map(sale: Sale, lines):
    """
    Returns:
      net_unit_by_id: { line.id: Decimal(net_unit_paid) }
      net_line_by_id: { line.id: Decimal(net_line_total) }

    Steps:
      1) base_unit = sp - per_line_discount
      2) base_line_total = base_unit * qty
      3) base_total = sum(base_line_total)
      4) bill_discount_total = base_total - sale.grand_total  (>=0)
      5) allocate bill_discount proportionally across lines by base_line_total share
      6) net_line_total = base_line_total - allocated_bill_discount
      7) net_unit_paid = net_line_total / qty
    """
    # build base totals after per-line discount (but before bill discount)
    base_total = Decimal("0.00")
    base_by_id = {}  # id -> (qty, base_unit, base_line_total)

    for ln in lines:
        sp = q2(getattr(ln, "sp", 0) or 0)
        qty = int(getattr(ln, "qty", 1) or 1)
        if qty < 1:
            qty = 1

        dp = q2(getattr(ln, "discount_percent", 0) or 0)
        da = q2(getattr(ln, "discount_amount", 0) or 0)  # per-unit in DB

        if dp > 0:
            per_unit_disc = (sp * dp / Decimal("100")).quantize(
                TWOPLACES, rounding=ROUND_HALF_UP
            )
        else:
            per_unit_disc = da

        per_unit_disc = min(sp, max(Decimal("0.00"), per_unit_disc))
        base_unit = (sp - per_unit_disc).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        if base_unit < 0:
            base_unit = Decimal("0.00")

        base_line = (base_unit * Decimal(qty)).quantize(
            TWOPLACES, rounding=ROUND_HALF_UP
        )

        base_total += base_line
        base_by_id[ln.id] = (qty, base_unit, base_line)

    paid_total = q2(getattr(sale, "grand_total", 0) or 0)

    bill_disc_total = (base_total - paid_total).quantize(
        TWOPLACES, rounding=ROUND_HALF_UP
    )
    if bill_disc_total < 0:
        bill_disc_total = Decimal("0.00")

    net_unit_by_id = {}
    net_line_by_id = {}

    for lid, (qty, base_unit, base_line) in base_by_id.items():
        if base_total > 0:
            share = (base_line / base_total)
        else:
            share = Decimal("0.00")

        alloc = (bill_disc_total * share).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        net_line = (base_line - alloc).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        if net_line < 0:
            net_line = Decimal("0.00")

        net_unit = (net_line / Decimal(qty)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        net_unit_by_id[lid] = net_unit
        net_line_by_id[lid] = net_line

    return net_unit_by_id, net_line_by_id


class CustomerInSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=20, allow_blank=True, required=False)
    email = serializers.EmailField(allow_blank=True, required=False)


class SaleLineInSerializer(serializers.Serializer):
    barcode = serializers.CharField(max_length=64)
    qty = serializers.IntegerField(min_value=1)

    # percent discount (optional)
    discount_percent = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, default=0
    )

    # ✅ IMPORTANT (FIXED):
    # Frontend sends discount_amount as "₹ DISCOUNT PER UNIT"
    # So total line discount = discount_amount * qty
    discount_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, default=0
    )


class PaymentInSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=[m[0] for m in Sale.PAYMENT_METHODS])
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reference = serializers.CharField(required=False, allow_blank=True)
    card_holder = serializers.CharField(required=False, allow_blank=True)
    card_holder_phone = serializers.CharField(required=False, allow_blank=True)
    customer_bank = serializers.CharField(required=False, allow_blank=True)
    account = serializers.CharField(required=False, allow_blank=True)


class SaleCreateSerializer(serializers.Serializer):
    customer = CustomerInSerializer()
    lines = SaleLineInSerializer(many=True)
    payments = PaymentInSerializer(many=True)
    store = serializers.CharField(max_length=64, required=False, default="Wabi - Sabi")
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)
    salesman_id = serializers.IntegerField(required=False, allow_null=True)

    bill_discount_value = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, default=0
    )
    bill_discount_is_percent = serializers.BooleanField(required=False, default=True)

    def validate(self, data):
        if not data["lines"]:
            raise serializers.ValidationError("At least one line is required.")

        want = {}
        for ln in data["lines"]:
            code = str(ln["barcode"]).strip()
            qty = int(ln["qty"])
            if qty < 1:
                raise serializers.ValidationError(f"Invalid qty for {code}.")
            want[code] = want.get(code, 0) + qty

        products = {
            p.barcode: p
            for p in Product.objects.select_related("task_item").filter(
                barcode__in=want.keys()
            )
        }

        missing = [bc for bc in want.keys() if bc not in products]
        if missing:
            raise serializers.ValidationError(f"Products not found: {', '.join(missing)}")

        subtotal = Decimal("0.00")
        item_discount_total = Decimal("0.00")

        for ln in data["lines"]:
            bc = str(ln["barcode"]).strip()
            qty = int(ln["qty"])
            p = products[bc]

            if (p.qty or 0) < qty:
                raise serializers.ValidationError(
                    f"{bc} not available (stock {p.qty}, need {qty})."
                )

            unit = q2(p.selling_price)
            line_base = unit * qty
            subtotal += line_base

            dp = q2(ln.get("discount_percent", 0))

            # ✅ FIX: incoming discount_amount is PER-UNIT discount
            da_per_unit = q2(ln.get("discount_amount", 0))
            da_total = (da_per_unit * Decimal(qty)).quantize(
                TWOPLACES, rounding=ROUND_HALF_UP
            )

            if dp > 0:
                disc = (line_base * dp / Decimal("100")).quantize(
                    TWOPLACES, rounding=ROUND_HALF_UP
                )
            else:
                disc = da_total

            disc = min(line_base, max(Decimal("0.00"), disc))
            item_discount_total += disc

        base_after_item = max(Decimal("0.00"), subtotal - item_discount_total)

        bill_val = q2(data.get("bill_discount_value", 0))
        bill_is_pct = bool(data.get("bill_discount_is_percent", True))

        if bill_is_pct:
            bill_disc = (base_after_item * bill_val / Decimal("100")).quantize(
                TWOPLACES, rounding=ROUND_HALF_UP
            )
        else:
            bill_disc = bill_val

        bill_disc = min(base_after_item, max(Decimal("0.00"), bill_disc))

        grand_total = (base_after_item - bill_disc).quantize(
            TWOPLACES, rounding=ROUND_HALF_UP
        )

        pay_total = sum([q2(p["amount"]) for p in data["payments"]]).quantize(TWOPLACES)

        if pay_total != grand_total:
            raise serializers.ValidationError(
                f"Payments total ({pay_total}) must equal payable amount ({grand_total})."
            )

        data["_computed"] = {
            "subtotal": subtotal,
            "item_discount_total": item_discount_total,
            "bill_discount": bill_disc,
            "grand_total": grand_total,
        }
        return data

    def create(self, validated):
        comp = validated.pop("_computed", None) or {}

        cust_in = validated["customer"]
        lines_in = validated["lines"]
        pays_in = validated["payments"]
        note = validated.get("note", "")
        store = validated.get("store", "Wabi - Sabi")
        salesman_id = validated.get("salesman_id")

        created_by = validated.pop("created_by", None)

        salesman = None
        if salesman_id:
            try:
                salesman = Employee.objects.get(
                    pk=salesman_id,
                    role="STAFF",
                    is_active=True,
                )
            except Employee.DoesNotExist:
                raise serializers.ValidationError("Invalid salesman selected.")

        phone = (cust_in.get("phone") or "").strip()
        name = (cust_in.get("name") or "").strip() or "Guest"
        email = cust_in.get("email", "")
        if phone:
            customer, _ = Customer.objects.get_or_create(
                phone=phone, defaults={"name": name, "email": email}
            )
            if customer.name != name or (email and customer.email != email):
                customer.name = name
                if email:
                    customer.email = email
                customer.save(update_fields=["name", "email"])
        else:
            customer = Customer.objects.create(name=name, email=email)

        method = Sale.PAYMENT_MULTIPAY if len(pays_in) > 1 else pays_in[0]["method"]

        with transaction.atomic():
            sale_kwargs = dict(
                customer=customer,
                store=store,
                payment_method=method,
                transaction_date=timezone.now(),
                note=note,
                salesman=salesman,
            )

            if _sale_has_created_by():
                sale_kwargs["created_by"] = created_by

            sale = Sale.objects.create(**sale_kwargs)

            # lock & reduce stock
            want = {}
            for ln in lines_in:
                bc = str(ln["barcode"]).strip()
                want[bc] = want.get(bc, 0) + int(ln["qty"])

            for bc, need in want.items():
                updated = (
                    Product.objects.select_for_update()
                    .filter(barcode=bc, qty__gte=need)
                    .update(qty=F("qty") - need)
                )
                if updated == 0:
                    raise serializers.ValidationError(f"{bc} not available anymore.")

            subtotal = Decimal("0.00")
            for ln in lines_in:
                p = Product.objects.get(barcode=ln["barcode"])
                qty = int(ln["qty"])

                dp = q2(ln.get("discount_percent", 0))

                # ✅ FIX: incoming discount_amount is PER-UNIT discount
                da_per_unit = q2(ln.get("discount_amount", 0))

                # store line
                SaleLine.objects.create(
                    sale=sale,
                    product=p,
                    qty=qty,
                    barcode=p.barcode,
                    mrp=p.mrp or 0,
                    sp=p.selling_price or 0,
                    discount_percent=dp,
                    discount_amount=da_per_unit,  # ✅ per unit in DB
                )

                subtotal += q2(p.selling_price) * qty

            sale.subtotal = q2(comp.get("subtotal", subtotal))
            sale.discount_total = q2(
                q2(comp.get("item_discount_total", 0)) + q2(comp.get("bill_discount", 0))
            )
            sale.grand_total = q2(comp.get("grand_total", sale.subtotal))
            sale.save(update_fields=["subtotal", "discount_total", "grand_total"])

            pay_rows = []
            for p in pays_in:
                pay_rows.append(
                    SalePayment(
                        sale=sale,
                        method=str(p.get("method") or "").upper(),
                        amount=p.get("amount") or 0,
                        reference=p.get("reference", "") or "",
                        card_holder=p.get("card_holder", "") or "",
                        card_holder_phone=p.get("card_holder_phone", "") or "",
                        customer_bank=p.get("customer_bank", "") or "",
                        account=p.get("account", "") or "",
                    )
                )
            SalePayment.objects.bulk_create(pay_rows)

            if salesman is not None:
                create_wow_entry_for_sale(sale)

        return {
            "invoice_no": sale.invoice_no,
            "transaction_date": sale.transaction_date,
            "payment_method": sale.payment_method,
            "store": sale.store,
            "customer": {
                "id": customer.id,
                "name": customer.name,
                "phone": customer.phone,
                "email": customer.email,
            },
            "totals": {
                "subtotal": str(sale.subtotal),
                "discount": str(sale.discount_total),
                "grand_total": str(sale.grand_total),
            },
            "payments": pays_in,
        }


class SaleListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name")
    customer_phone = serializers.CharField(source="customer.phone", allow_null=True)
    total_amount = serializers.DecimalField(source="grand_total", max_digits=12, decimal_places=2)
    due_amount = serializers.SerializerMethodField()
    credit_applied = serializers.SerializerMethodField()
    order_type = serializers.SerializerMethodField()
    feedback = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    created_by = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            "id",
            "invoice_no",
            "transaction_date",
            "customer_name",
            "customer_phone",
            "total_amount",
            "due_amount",
            "payment_method",
            "payment_status",
            "credit_applied",
            "order_type",
            "feedback",
            "created_by",
        ]

    def get_due_amount(self, obj):
        return "0.00"

    def get_credit_applied(self, obj):
        return "0.00"

    def get_order_type(self, obj):
        return "In-Store"

    def get_feedback(self, obj):
        return None

    def get_payment_status(self, obj):
        return "Paid"

    def get_created_by(self, obj):
        u = getattr(obj, "created_by", None)
        if not u:
            return "-"
        full = (u.get_full_name() or "").strip()
        return full or (u.username or "-")


class SaleLineOutSerializer(serializers.ModelSerializer):
    # existing
    product_name = serializers.SerializerMethodField()
    itemcode = serializers.SerializerMethodField()
    unit_cost_after_disc = serializers.SerializerMethodField()

    # ✅ NEW: frontend-friendly aliases for invoice restore
    sellingPrice = serializers.SerializerMethodField()       # ✅ net price after discount (includes bill discount)
    lineDiscountAmount = serializers.SerializerMethodField() # per-unit discount including bill share
    unitCost = serializers.SerializerMethodField()           # after discount (includes bill discount)
    netAmount = serializers.SerializerMethodField()          # unitCost * qty (includes bill discount)

    class Meta:
        model = SaleLine
        fields = [
            "id",
            "barcode",
            "qty",
            "mrp",
            "sp",
            "discount_percent",
            "discount_amount",          # per-unit in DB
            "unit_cost_after_disc",     # existing
            "product_name",
            "itemcode",

            # ✅ NEW
            "sellingPrice",
            "lineDiscountAmount",
            "unitCost",
            "netAmount",
        ]

    def get_product_name(self, obj):
        ti = getattr(getattr(obj, "product", None), "task_item", None)
        if not ti:
            return ""
        return (
            getattr(ti, "item_print_friendly_name", None)
            or getattr(ti, "item_vasy_name", None)
            or getattr(ti, "item_full_name", None)
            or ""
        )

    def get_itemcode(self, obj):
        ti = getattr(getattr(obj, "product", None), "task_item", None)
        if not ti:
            return obj.barcode or ""
        return getattr(ti, "code", None) or getattr(ti, "item_code", None) or (obj.barcode or "")

    def _per_unit_discount(self, obj) -> Decimal:
        sp = q2(getattr(obj, "sp", 0) or 0)
        dp = q2(getattr(obj, "discount_percent", 0) or 0)
        da = q2(getattr(obj, "discount_amount", 0) or 0)  # per unit stored

        if dp > 0:
            disc = (sp * dp / Decimal("100")).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        else:
            disc = da

        disc = min(sp, max(Decimal("0.00"), disc))
        return disc

    def _net_unit_paid(self, obj) -> Decimal:
        """
        ✅ ACTUAL paid per unit including bill discount allocation.
        Set by view in serializer context: net_unit_by_id
        """
        m = (self.context or {}).get("net_unit_by_id") or {}
        v = m.get(getattr(obj, "id", None))
        if v is not None:
            return q2(v)

        # fallback old behavior
        sp = q2(getattr(obj, "sp", 0) or 0)
        disc = self._per_unit_discount(obj)
        return (sp - disc).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

    def get_unit_cost_after_disc(self, obj):
        return str(self._net_unit_paid(obj))

    def get_sellingPrice(self, obj):
        return str(self._net_unit_paid(obj))

    def get_unitCost(self, obj):
        return str(self._net_unit_paid(obj))

    def get_netAmount(self, obj):
        qty = int(getattr(obj, "qty", 0) or 0)
        if qty < 1:
            qty = 1
        net_unit = self._net_unit_paid(obj)
        return str((net_unit * Decimal(qty)).quantize(TWOPLACES, rounding=ROUND_HALF_UP))

    def get_lineDiscountAmount(self, obj):
        """
        per-unit discount including bill share:
          sp - net_unit_paid
        """
        sp = q2(getattr(obj, "sp", 0) or 0)
        net_unit = self._net_unit_paid(obj)
        disc = (sp - net_unit).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        if disc < 0:
            disc = Decimal("0.00")
        return str(disc)
