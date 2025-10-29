# serializer_credit.py
from rest_framework import serializers
from .models import CreditNote

class CreditNoteListSerializer(serializers.ModelSerializer):
    customer_name   = serializers.CharField(source="customer.name")
    is_redeemed     = serializers.BooleanField()
    redeemed_amount = serializers.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        model  = CreditNote
        fields = [
            "id", "note_no", "date", "customer_name",
            "barcode", "amount", "qty",
            "is_redeemed", "redeemed_amount",
        ]
