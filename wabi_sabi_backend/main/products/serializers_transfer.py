from rest_framework import serializers
from .models import StockTransfer, StockTransferLine

class StockTransferLineDetailSerializer(serializers.ModelSerializer):
    # pull some useful fields from Product + TaskItem
    item_code   = serializers.CharField(source="product.task_item.item_code")
    name        = serializers.SerializerMethodField()
    category    = serializers.CharField(source="product.task_item.category")
    hsn         = serializers.CharField(source="product.task_item.hsn_code")
    size        = serializers.CharField(source="product.size")
    discount    = serializers.DecimalField(source="product.discount_percent", max_digits=6, decimal_places=2)

    class Meta:
        model = StockTransferLine
        fields = ("barcode", "qty", "mrp", "sp",
                  "item_code", "name", "category", "hsn", "size", "discount")

    def get_name(self, obj):
        ti = obj.product.task_item
        return ti.item_print_friendly_name or ti.item_vasy_name or ti.item_full_name or ""

class StockTransferLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockTransferLine
        fields = ("barcode", "qty", "mrp", "sp")

class StockTransferSerializer(serializers.ModelSerializer):
    from_loc = serializers.CharField(source="from_location.code")
    to_loc   = serializers.CharField(source="to_location.code")
    lines    = StockTransferLineDetailSerializer(many=True, read_only=True)  # <-- detail lines

    class Meta:
        model = StockTransfer
        fields = ("number", "created_at", "from_loc", "to_loc", "note", "lines")
