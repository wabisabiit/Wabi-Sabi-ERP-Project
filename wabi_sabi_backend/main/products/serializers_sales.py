# products/serializers_sales.py
from django.db import transaction
from django.db.models import F
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


class PaymentInSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=[m[0] for m in Sale.PAYMENT_METHODS])
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reference         = serializers.CharField(required=False, allow_blank=True)
    card_holder       = serializers.CharField(required=False, allow_blank=True)
    card_holder_phone = serializers.CharField(required=False, allow_blank=True)
    customer_bank     = serializers.CharField(required=False, allow_blank=True)
    account           = serializers.CharField(required=False, allow_blank=True)


class SaleCreateSerializer(serializers.Serializer):
    customer = CustomerInSerializer()
    lines    = SaleLineInSerializer(many=True)
    payments = PaymentInSerializer(many=True)  # for MULTIPAY: 2+ rows, else 1 row
    store    = serializers.CharField(max_length=64, required=False, default="Wabi - Sabi")
    note     = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, data):
        if not data["lines"]:
            raise serializers.ValidationError("At least one line is required.")

        # quantity per barcode requested (aggregate duplicates)
        want = {}
        total = 0
        for ln in data["lines"]:
            code = str(ln["barcode"]).strip()
            qty  = int(ln["qty"])
            if qty < 1:
                raise serializers.ValidationError(f"Invalid qty for {code}.")
            want[code] = want.get(code, 0) + qty

        # fetch all required products at once
        products = {p.barcode: p for p in Product.objects.select_related("task_item").filter(barcode__in=want.keys())}

        # existence + availability + total
        missing = [bc for bc in want.keys() if bc not in products]
        if missing:
            raise serializers.ValidationError(f"Products not found: {', '.join(missing)}")

        for bc, need in want.items():
            p = products[bc]
            if (p.qty or 0) < need:
                raise serializers.ValidationError(f"{bc} not available (stock {p.qty}, need {need}).")
            total += (p.selling_price or 0) * need

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

        # --- customer upsert (same as before) ---
        phone = (cust_in.get("phone") or "").strip()
        name  = (cust_in.get("name") or "").strip() or "Guest"
        email = cust_in.get("email", "")
        if phone:
            customer, _ = Customer.objects.get_or_create(phone=phone, defaults={"name": name, "email": email})
            if customer.name != name or (email and customer.email != email):
                customer.name = name
                if email:
                    customer.email = email
                customer.save(update_fields=["name", "email"])
        else:
            customer = Customer.objects.create(name=name, email=email)

        method = Sale.PAYMENT_MULTIPAY if len(pays_in) > 1 else pays_in[0]["method"]

        with transaction.atomic():
            sale = Sale.objects.create(
                customer=customer,
                store=store,
                payment_method=method,
                transaction_date=timezone.now(),
                note=note,
            )

            subtotal = 0

            # Group requested qty per barcode to do atomic decrements
            want = {}
            for ln in lines_in:
                bc = str(ln["barcode"]).strip()
                want[bc] = want.get(bc, 0) + int(ln["qty"])

            # Atomic decrement per barcode (protect against race)
            for bc, need in want.items():
                updated = Product.objects.select_for_update().filter(barcode=bc, qty__gte=need).update(qty=F("qty") - need)
                if updated == 0:
                    # if someone else sold it just now
                    raise serializers.ValidationError(f"{bc} not available anymore.")

            # Now create sale lines (denormalize)
            for ln in lines_in:
                p = Product.objects.get(barcode=ln["barcode"])  # locked by select_for_update above
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