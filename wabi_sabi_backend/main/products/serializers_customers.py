# products/serializers_customers.py
from rest_framework import serializers
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "name", "phone", "email", "created_at"]

    # POS rule: require name + phone on create
    def validate(self, data):
        if self.instance is None:  # create
            name = (data.get("name") or "").strip()
            phone = (data.get("phone") or "").strip()
            if not name:
                raise serializers.ValidationError({"name": "Name is required."})
            if not phone:
                raise serializers.ValidationError({"phone": "Mobile number is required."})
        return data
