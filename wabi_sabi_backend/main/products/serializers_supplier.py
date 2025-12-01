# products/serializers_supplier.py
from rest_framework import serializers
from .models import Supplier

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            "id",
            "company_name",
            "gstin",
            "contact_name",
            "phone",
            "email",
            "address1",
            "address2",
            "city",
            "state",
            "pin",
            "created_at",
        ]
