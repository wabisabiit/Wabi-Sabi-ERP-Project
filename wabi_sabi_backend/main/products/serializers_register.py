# products/serializers_register.py
from rest_framework import serializers
from .models import RegisterClosing


class RegisterClosingSerializer(serializers.ModelSerializer):
    location_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = RegisterClosing
        fields = [
            "id",
            "location",
            "location_name",
            "closed_at",

            # left panel
            "opening_cash",
            "cash_payment",
            "cheque_payment",
            "card_payment",
            "bank_transfer_payment",
            "upi_payment",
            "wallet_payment",
            "sales_return",
            "cash_refund",
            "bank_refund",
            "credit_applied",
            "pay_later",
            "expense",
            "purchase_payment",
            "total_sales",

            # right panel
            "bank_account",
            "bank_transfer_register",
            "cash_flow",
            "total_cash_left",
            "physical_drawer",
            "closing_note",

            "created_at",
        ]
        read_only_fields = ["location", "created_at"]

    def get_location_name(self, obj):
        loc = getattr(obj, "location", None)
        if not loc:
            return ""
        return loc.name or loc.code or ""
