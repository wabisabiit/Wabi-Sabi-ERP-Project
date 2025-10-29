from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    """Basic CRUD serializer (used for create/retrieve/update/delete)."""
    class Meta:
        model = Product
        fields = [
            "id", "barcode", "task_item", "size", "image_url",
            "mrp", "selling_price", "qty", "discount_percent",
            "created_at", "updated_at",
        ]
        extra_kwargs = {
            "task_item": {"help_text": "TaskItem.item_code this barcode belongs to"}
        }

class ProductGridSerializer(serializers.ModelSerializer):
    # UI field names
    itemCode     = serializers.CharField(source="barcode")
    name         = serializers.SerializerMethodField()
    category     = serializers.SerializerMethodField()  # null-safe
    brand        = serializers.SerializerMethodField()  # null-safe
    hsn          = serializers.SerializerMethodField()  # null-safe
    mrp          = serializers.DecimalField(max_digits=12, decimal_places=2)
    sellingPrice = serializers.DecimalField(source="selling_price", max_digits=12, decimal_places=2)
    image        = serializers.CharField(source="image_url", allow_blank=True, allow_null=True, default="")
    qty          = serializers.SerializerMethodField()  # robust int

    class Meta:
        model = Product
        fields = [
            "id", "itemCode", "category", "brand", "name",
            "mrp", "sellingPrice", "hsn", "qty", "image"
        ]

    def get_name(self, obj):
        ti = getattr(obj, "task_item", None)
        if not ti:
            return ""
        return ti.item_vasy_name or ti.item_full_name or ti.item_print_friendly_name or ""

    def get_category(self, obj):
        ti = getattr(obj, "task_item", None)
        return (ti.category if ti and ti.category is not None else "") or ""

    def get_brand(self, obj):
        ti = getattr(obj, "task_item", None)
        attrs = getattr(ti, "attributes", None) if ti else None
        if isinstance(attrs, dict):
            return attrs.get("brand", "") or ""
        return ""

    def get_hsn(self, obj):
        ti = getattr(obj, "task_item", None)
        code = getattr(ti, "hsn_code", None) if ti else None
        return code or ""

    def get_qty(self, obj):
        try:
            return int(obj.qty or 0)
        except Exception:
            return 0