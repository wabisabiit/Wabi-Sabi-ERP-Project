from rest_framework import serializers
from .models import CreditNote

class CreditNoteListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name")
    class Meta:
        model = CreditNote
        fields = [
            "id",
            "note_no",
            "date",
            "customer_name",
            "barcode",
            "amount",
            "qty",
        ]
