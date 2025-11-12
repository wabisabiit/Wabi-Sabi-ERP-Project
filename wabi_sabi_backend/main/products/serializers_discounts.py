from rest_framework import serializers
from .models import Discount  # now lives in the same models.py
from taskmaster.models import Location

class DiscountSerializer(serializers.ModelSerializer):
    # write: list of location IDs; read: expanded list
    branch_ids = serializers.PrimaryKeyRelatedField(
        source="branches", many=True, queryset=Location.objects.all(), write_only=True
    )
    branches = serializers.SerializerMethodField(read_only=True)
    status   = serializers.SerializerMethodField(read_only=True)
    validity = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Discount
        fields = [
            "id","title","code",
            "applicable","mode","value_type","value",
            "range_min_amount","range_max_amount","x_qty","y_qty","min_amount_for_fix",
            "applies_category","start_date","end_date","created_at",
            "branch_ids","branches","status","validity",
        ]

    def get_branches(self, obj):
        return [{"id": b.id, "code": b.code, "name": b.name} for b in obj.branches.all()]

    def get_status(self, obj):
        return "Active" if obj.is_active else "Expired"

    def get_validity(self, obj):
        return obj.validity_days

    def validate(self, data):
        sd = data.get("start_date") or getattr(self.instance, "start_date", None)
        ed = data.get("end_date")   or getattr(self.instance, "end_date", None)
        if not sd or not ed:
            raise serializers.ValidationError({"date": "Start Date and End Date are required."})
        if ed < sd:
            raise serializers.ValidationError({"date": "End Date must be on/after Start Date."})

        mode = data.get("mode") or getattr(self.instance, "mode", None)
        vt   = data.get("value_type") or getattr(self.instance, "value_type", None)

        if mode == Discount.MODE_RANGE:
            if (data.get("range_min_amount") is None) or (data.get("range_max_amount") is None):
                raise serializers.ValidationError({"range": "Both minimum and maximum amounts are required."})
        if mode == Discount.MODE_BUYGET:
            if (data.get("x_qty", 0) or 0) <= 0 or (data.get("y_qty", 0) or 0) <= 0:
                raise serializers.ValidationError({"x_qty": "X and Y quantities must be > 0."})
        if mode == Discount.MODE_FIXPRICE:
            if data.get("min_amount_for_fix") is None:
                raise serializers.ValidationError({"min_amount_for_fix": "Minimum amount is required."})

        if vt == Discount.VAL_PERCENT and (data.get("value", 0) or 0) > 100:
            raise serializers.ValidationError({"value": "Percent cannot exceed 100."})

        # normalize code
        if "code" in data and data["code"]:
            data["code"] = data["code"].upper()
        return data
