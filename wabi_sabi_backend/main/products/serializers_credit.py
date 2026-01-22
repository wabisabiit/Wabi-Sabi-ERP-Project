# serializer_credit.py
from rest_framework import serializers
from .models import CreditNote


class CreditNoteListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    # ✅ show who created it
    created_by_name = serializers.CharField(source="created_by.username", read_only=True)

    # ✅ computed from model properties
    credits_remaining = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = CreditNote
        fields = [
            "id",
            "note_no",
            "date",
            "customer_name",
            "amount",
            "redeemed_amount",
            "credits_remaining",
            "status",
            "created_by_name",
            "barcode",
            "qty",
            "is_redeemed",
        ]
