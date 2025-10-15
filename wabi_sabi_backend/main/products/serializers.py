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
    """Joined fields for Image-2 grid."""
    itemCode = serializers.CharField(source="barcode")
    name = serializers.SerializerMethodField()
    category = serializers.CharField(source="task_item.category")
    brand = serializers.SerializerMethodField()
    hsn = serializers.CharField(source="task_item.hsn_code")
    mrp = serializers.DecimalField(max_digits=12, decimal_places=2)
    sellingPrice = serializers.DecimalField(source="selling_price", max_digits=12, decimal_places=2)
    image = serializers.CharField(source="image_url", allow_blank=True)

    class Meta:
        model = Product
        fields = ["id", "itemCode", "category", "brand", "name", "mrp", "sellingPrice", "hsn", "image"]

    def get_name(self, obj):
        return obj.task_item.item_vasy_name or obj.task_item.item_full_name or obj.task_item.item_print_friendly_name

    def get_brand(self, obj):
        # brand may be inside TaskItem.attributes (e.g., {"brand":"B4L"})
        attrs = obj.task_item.attributes or {}
        return attrs.get("brand", "")
