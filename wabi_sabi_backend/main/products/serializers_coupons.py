# products/serializers_coupons.py  (new)

from rest_framework import serializers
from .models import Coupon, GeneratedCoupon
from django.db.models.functions import Lower

class CouponSerializer(serializers.ModelSerializer):
    redeem_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Coupon
        fields = ["id", "name", "price", "redeem_value", "created_at"]
        read_only_fields = ["created_at", "redeem_value"]

    def validate_name(self, v):
        if not v or not v.strip():
            raise serializers.ValidationError("Coupon name is required.")
        if not v.isalnum():
            raise serializers.ValidationError("Coupon name must be alphanumeric.")
        # case-insensitive uniqueness
        exists = Coupon.objects.filter(name__iexact=v.strip()).exists()
        if exists and (not self.instance or self.instance.name.lower() != v.lower()):
            raise serializers.ValidationError("Coupon name already exists.")
        return v.strip()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["redeem_value"] = str(instance.price)
        return data


class GeneratedCouponSerializer(serializers.ModelSerializer):
    coupon_name   = serializers.CharField(source="coupon.name", read_only=True)
    total_redeem  = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = GeneratedCoupon
        fields = [
            "id", "code", "coupon", "coupon_name", "price",
            "issued_by", "assigned_to", "customer_no",
            "created_date", "redemption_date",
            "status", "redeemed_invoice_no",
            "total_redeem",
        ]
        read_only_fields = [
            "code", "price", "issued_by", "created_date",
            "redemption_date", "status", "redeemed_invoice_no",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["total_redeem"] = str(instance.price)  # equals price
        # keep blanks for not-required columns in your UI
        return data
