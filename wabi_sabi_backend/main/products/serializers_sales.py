# products/serializers_sales.py
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from outlets.models import Employee
from taskmaster.models import Location

from .models import (
    Sale,
    SaleLine,
    SalePayment,
    Customer,
    Product,
    CreditNote,
)


def _to_decimal(v, default="0"):
    if v is None:
        return Decimal(default)
    try:
        s = str(v).strip()
        if s == "":
            return Decimal(default)
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _to_int(v, default=0):
    try:
        return int(v)
    except Exception:
        return int(default)


class SaleLineInputSerializer(serializers.Serializer):
    """
    Flexible line input:
      - barcode (required)
      - qty
      - sp / sellingPrice / price (any one)
      - mrp (optional)
    """
    barcode = serializers.CharField()
    qty = serializers.IntegerField(required=False, default=1)

    # allow any of these names from frontend
    sp = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    sellingPrice = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    mrp = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


class SaleCreateSerializer(serializers.Serializer):
    """
    Creates Sale + SaleLine(s) + optional SalePayment(s)
    Also creates CreditNote when a product's qty reaches 0 after sale.

    IMPORTANT FIX:
      - CreditNote.amount must use the ACTUAL billed price (SaleLine.sp),
        not Product.mrp.
    """
    customer_id = serializers.IntegerField(required=False)
    customer = serializers.DictField(required=False)  # optional fallback
    store = serializers.CharField(required=False, allow_blank=True, default="Wabi - Sabi")
    payment_method = serializers.CharField()
    transaction_date = serializers.DateTimeField(required=False)

    # totals (optional; if provided we keep them)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    discount_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    grand_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)

    note = serializers.CharField(required=False, allow_blank=True, default="")

    # salesman
    salesman_id = serializers.IntegerField(required=False)

    # line items
    lines = SaleLineInputSerializer(many=True)

    # optional payments list (for MULTIPAY etc.)
    payments = serializers.ListField(required=False, child=serializers.DictField())

    def validate(self, attrs):
        lines = attrs.get("lines") or []
        if not lines:
            raise serializers.ValidationError({"lines": "At least 1 line is required."})
        return attrs

    def _get_salesman(self, request, attrs):
        # If frontend sends salesman_id use it; else fallback to request.user.employee
        sid = attrs.get("salesman_id")
        if sid:
            try:
                return Employee.objects.get(id=sid)
            except Employee.DoesNotExist:
                raise serializers.ValidationError({"salesman_id": "Invalid salesman."})

        user = getattr(request, "user", None)
        emp = getattr(user, "employee", None)
        return emp

    def _get_customer(self, attrs):
        cid = attrs.get("customer_id")
        if cid:
            try:
                return Customer.objects.get(id=cid)
            except Customer.DoesNotExist:
                raise serializers.ValidationError({"customer_id": "Customer not found."})

        # fallback: accept dict
        c = attrs.get("customer") or {}
        name = (c.get("name") or "").strip()
        phone = (c.get("phone") or "").strip()
        if not name:
            raise serializers.ValidationError({"customer": "Customer name required."})

        # create minimal customer record
        obj = Customer.objects.create(name=name, phone=phone, email=(c.get("email") or "").strip())
        return obj

    def create(self, validated_data):
        request = self.context.get("request")

        customer = self._get_customer(validated_data)
        salesman = self._get_salesman(request, validated_data)

        tx_date = validated_data.get("transaction_date") or timezone.now()

        # Keep provided totals if present; else compute from lines using billed prices
        provided_subtotal = validated_data.get("subtotal", None)
        provided_discount = validated_data.get("discount_total", None)
        provided_grand = validated_data.get("grand_total", None)

        # create sale header
        sale = Sale.objects.create(
            customer=customer,
            store=validated_data.get("store") or "Wabi - Sabi",
            payment_method=(validated_data.get("payment_method") or "").strip().upper(),
            transaction_date=tx_date,
            note=validated_data.get("note") or "",
            salesman=salesman if salesman else None,
            subtotal=_to_decimal(provided_subtotal, "0") if provided_subtotal is not None else Decimal("0"),
            discount_total=_to_decimal(provided_discount, "0") if provided_discount is not None else Decimal("0"),
            grand_total=_to_decimal(provided_grand, "0") if provided_grand is not None else Decimal("0"),
        )

        # derive a location (for credit note scoping)
        sale_location = None
        if salesman and getattr(salesman, "outlet", None) and getattr(salesman.outlet, "location", None):
            sale_location = salesman.outlet.location

        # create lines
        computed_grand = Decimal("0")
        for line in validated_data.get("lines") or []:
            barcode = (line.get("barcode") or "").strip()
            qty = max(1, _to_int(line.get("qty", 1), 1))

            # product
            try:
                product = Product.objects.select_for_update().get(barcode=barcode)
            except Product.DoesNotExist:
                raise serializers.ValidationError({"lines": f"Product not found for barcode: {barcode}"})

            # billed price (discounted) — accept multiple keys
            sp = (
                line.get("sp")
                if line.get("sp") is not None
                else line.get("sellingPrice")
                if line.get("sellingPrice") is not None
                else line.get("price")
            )
            sp = _to_decimal(sp, str(product.selling_price or 0))

            # mrp snapshot
            mrp = _to_decimal(line.get("mrp"), str(product.mrp or 0))

            # create sale line (store actual billed price in sp)
            line_obj = SaleLine.objects.create(
                sale=sale,
                product=product,
                qty=qty,
                barcode=product.barcode,
                mrp=mrp,
                sp=sp,  # ✅ this is the billed price you want to preserve
            )

            computed_grand += (sp * Decimal(qty))

            # decrement product stock
            # (keep existing behavior: just reduce qty safely)
            product.qty = max(0, int(product.qty or 0) - qty)
            product.save(update_fields=["qty"])

            # create credit note ONLY when qty becomes 0
            if int(product.qty or 0) == 0:
                # ✅ FIX: credit note amount must match billed price (line_obj.sp), not MRP
                CreditNote.objects.create(
                    sale=sale,
                    customer=customer,
                    location=(product.location or sale_location),
                    date=timezone.now(),
                    note_date=sale.transaction_date,
                    product=product,
                    barcode=product.barcode,
                    qty=1,  # keep as your model expectation
                    amount=line_obj.sp,  # ✅ IMPORTANT: actual billed price
                )

        # if totals were not provided, set from computed
        if provided_grand is None:
            sale.grand_total = computed_grand
            sale.subtotal = computed_grand  # keep simple if not provided
            sale.discount_total = Decimal("0")
            sale.save(update_fields=["grand_total", "subtotal", "discount_total"])

        # optional payments
        payments = validated_data.get("payments") or []
        for p in payments:
            method = (p.get("method") or "").strip().upper()
            amt = _to_decimal(p.get("amount"), "0")
            if not method or amt <= 0:
                continue
            SalePayment.objects.create(
                sale=sale,
                method=method,
                amount=amt,
                reference=(p.get("reference") or "").strip(),
                card_holder=(p.get("card_holder") or "").strip(),
                card_holder_phone=(p.get("card_holder_phone") or "").strip(),
                customer_bank=(p.get("customer_bank") or "").strip(),
                account=(p.get("account") or "").strip(),
            )

        return {
            "ok": True,
            "invoice_no": sale.invoice_no,
            "grand_total": str(sale.grand_total),
        }


class SaleListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name")
    customer_phone = serializers.CharField(source="customer.phone", allow_blank=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "invoice_no",
            "customer_name",
            "customer_phone",
            "store",
            "payment_method",
            "transaction_date",
            "subtotal",
            "discount_total",
            "grand_total",
        ]
