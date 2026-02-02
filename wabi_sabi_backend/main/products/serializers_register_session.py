# products/serializers_register_session.py
from rest_framework import serializers
from .models import RegisterSession

class RegisterSessionSerializer(serializers.ModelSerializer):
    range_label = serializers.SerializerMethodField()

    class Meta:
        model = RegisterSession
        fields = [
            "id",
            "business_date",
            "opened_at",
            "opening_cash",
            "is_open",
            "closed_at",
            "range_label",
        ]

    def get_range_label(self, obj):
        try:
            return obj.business_date.strftime("%d %b %Y")
        except Exception:
            return str(obj.business_date)

class RegisterOpenSerializer(serializers.Serializer):
    opening_cash = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)

    def validate_opening_cash(self, v):
        if v is None:
            return 0
        if v < 0:
            raise serializers.ValidationError("Opening cash cannot be negative.")
        return v
