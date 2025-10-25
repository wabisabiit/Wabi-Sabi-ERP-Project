# products/serializers_sales.py
from rest_framework import serializers
from django.utils import timezone
from .models import Customer, Product, Sale, SaleLine

class CustomerInSerializer(serializers.Serializer):
    name  = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=20, allow_blank=True, required=False)
    email = serializers.EmailField(allow_blank=True, required=False)

class SaleLineInSerializer(serializers.Serializer):
    # coming from POS cart rows
    barcode = serializers.CharField(max_length=64)
    qty     = serializers.IntegerField(min_value=1)

# products/serializers_sales.py  (PaymentInSerializer)
class PaymentInSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=[m[0] for m in Sale.PAYMENT_METHODS])
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reference       = serializers.CharField(required=False, allow_blank=True)
    card_holder     = serializers.CharField(required=False, allow_blank=True)
    card_holder_phone = serializers.CharField(required=False, allow_blank=True)  # <-- NEW
    customer_bank   = serializers.CharField(required=False, allow_blank=True)
    account         = serializers.CharField(required=False, allow_blank=True)
   # POS terminal/account used

class SaleCreateSerializer(serializers.Serializer):
    customer = CustomerInSerializer()
    lines    = SaleLineInSerializer(many=True)
    payments = PaymentInSerializer(many=True)  # for MULTIPAY: 2+ rows, else 1 row
    store    = serializers.CharField(max_length=64, required=False, default="Wabi - Sabi")
    note     = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, data):
        if not data["lines"]:
            raise serializers.ValidationError("At least one line is required.")
        total = 0
        for ln in data["lines"]:
            # check product existence and denormalized price
            try:
                p = Product.objects.select_related("task_item").get(barcode=ln["barcode"])
            except Product.DoesNotExist:
                raise serializers.ValidationError(f"Product with barcode {ln['barcode']} not found.")
            total += (p.selling_price or 0) * ln["qty"]
        pay_total = sum([float(p["amount"]) for p in data["payments"]])
        if round(pay_total, 2) != round(float(total), 2):
            raise serializers.ValidationError(f"Payments total ({pay_total}) must equal cart total ({total}).")
        return data

    def create(self, validated):
        cust_in = validated["customer"]
        lines_in = validated["lines"]
        pays_in  = validated["payments"]
        note     = validated.get("note", "")
        store    = validated.get("store", "Wabi - Sabi")

        # Upsert customer (phone is the easiest dedupe key)
        phone = (cust_in.get("phone") or "").strip()
        name  = (cust_in.get("name") or "").strip() or "Guest"
        email = cust_in.get("email", "")
        if phone:
            customer, _ = Customer.objects.get_or_create(phone=phone, defaults={"name": name, "email": email})
            # keep latest name/email up to date
            if customer.name != name or (email and customer.email != email):
                customer.name = name
                if email:
                    customer.email = email
                customer.save(update_fields=["name", "email"])
        else:
            customer = Customer.objects.create(name=name, email=email)

        # Decide payment method value
        method = Sale.PAYMENT_MULTIPAY if len(pays_in) > 1 else pays_in[0]["method"]

        # Create Sale header (invoice_no auto-fills in model.save())
        sale = Sale.objects.create(
            customer=customer,
            store=store,
            payment_method=method,
            transaction_date=timezone.now(),
            note=note,
        )

        # Lines (denormalize prices from Product)
        subtotal = 0
        for ln in lines_in:
            p = Product.objects.select_related("task_item").get(barcode=ln["barcode"])
            qty = int(ln["qty"])
            SaleLine.objects.create(
                sale=sale,
                product=p,
                qty=qty,
                barcode=p.barcode,
                mrp=p.mrp or 0,
                sp=p.selling_price or 0,
            )
            subtotal += (p.selling_price or 0) * qty

        sale.subtotal = subtotal
        sale.discount_total = 0
        sale.grand_total = subtotal
        sale.save(update_fields=["subtotal", "discount_total", "grand_total"])

        # You can persist payment rows in a separate table if you add a model,
        # or just include in Sale.note / external gateway logs. For now we
        # return payment details in the response to render a receipt.

        return {
            "invoice_no": sale.invoice_no,
            "transaction_date": sale.transaction_date,
            "payment_method": sale.payment_method,
            "store": sale.store,
            "customer": {"id": customer.id, "name": customer.name, "phone": customer.phone, "email": customer.email},
            "totals": {"subtotal": str(sale.subtotal), "discount": str(sale.discount_total), "grand_total": str(sale.grand_total)},
            "payments": pays_in,
        }

# ---- List / table serializer (read-only) ----
class SaleListSerializer(serializers.ModelSerializer):
    customer_name   = serializers.CharField(source="customer.name")
    customer_phone  = serializers.CharField(source="customer.phone", allow_null=True)
    total_amount    = serializers.DecimalField(source="grand_total", max_digits=12, decimal_places=2)
    due_amount      = serializers.SerializerMethodField()
    credit_applied  = serializers.SerializerMethodField()
    order_type      = serializers.SerializerMethodField()
    feedback        = serializers.SerializerMethodField()
    payment_status  = serializers.SerializerMethodField()

    class Meta:
        model  = Sale
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
        ]

    def get_due_amount(self, obj):       # default 0
        return "0.00"

    def get_credit_applied(self, obj):   # default 0
        return "0.00"

    def get_order_type(self, obj):       # In-Store
        return "In-Store"

    def get_feedback(self, obj):         # NaN/blank
        return None

    def get_payment_status(self, obj):   # all paid since due = 0
        return "Paid"
