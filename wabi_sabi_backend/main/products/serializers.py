from rest_framework import serializers
from .models import Product
from .models import MasterPack, MasterPackLine
from taskmaster.models import Location

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
        

class MasterPackLineInSerializer(serializers.Serializer):
    barcode = serializers.CharField()
    qty = serializers.IntegerField(min_value=1, default=1)
    location_code = serializers.CharField()  # link to Taskmaster.Location.code

class MasterPackCreateSerializer(serializers.Serializer):
    rows = MasterPackLineInSerializer(many=True)

    def validate(self, data):
        if not data.get("rows"):
            raise serializers.ValidationError("No rows to pack.")
        return data

    def create(self, validated):
        rows = validated["rows"]

        # Build maps
        barcode_list = [r["barcode"].replace("–", "-").replace("—", "-").strip().upper() for r in rows]
        products = {p.barcode.upper(): p for p in Product.objects.select_related("task_item").filter(barcode__in=barcode_list)}
        loc_codes = {r["location_code"] for r in rows}
        locations = {l.code: l for l in Location.objects.filter(code__in=loc_codes)}

        # Validate referentials
        missing = [b for b in barcode_list if b not in products]
        if missing:
            raise serializers.ValidationError({"barcodes": [f"Not found: {', '.join(missing)}"]})
        missing_loc = [c for c in loc_codes if c not in locations]
        if missing_loc:
            raise serializers.ValidationError({"locations": [f"Unknown: {', '.join(missing_loc)}"]})

        pack = MasterPack.objects.create()  # number auto via save()

        # Build/aggregate: combine duplicate barcodes to single line with summed qty & last chosen location
        agg = {}
        for r in rows:
            b = r["barcode"].replace("–", "-").replace("—", "-").strip().upper()
            agg.setdefault(b, {"qty": 0, "location_code": r["location_code"]})
            agg[b]["qty"] += int(r.get("qty", 1) or 1)
            agg[b]["location_code"] = r["location_code"]  # latest selection wins

        items_total = 0
        qty_total = 0
        amount_total = 0

        for b, payload in agg.items():
            p = products[b]
            ti = getattr(p, "task_item", None)
            name = (getattr(ti, "item_print_friendly_name", "") or
                    getattr(ti, "item_vasy_name", "") or
                    getattr(ti, "item_full_name", "") or "")
            qty = int(payload["qty"])
            sp = p.selling_price
            loc = locations[payload["location_code"]]

            MasterPackLine.objects.create(
                pack=pack,
                product=p,
                barcode=p.barcode,
                name=name,
                brand="B4L",
                color="",
                size=(p.size or ""),
                sp=sp,
                qty=qty,
                location=loc,
            )

            items_total += 1
            qty_total += qty
            amount_total += (sp or 0) * qty

        # Save totals
        pack.items_total = items_total
        pack.qty_total = qty_total
        pack.amount_total = amount_total
        pack.save(update_fields=["items_total", "qty_total", "amount_total"])

        return pack


class MasterPackLineOutSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()

    class Meta:
        model = MasterPackLine
        fields = ["barcode", "name", "brand", "color", "size", "sp", "qty", "location"]

    def get_location(self, obj):
        return {"code": obj.location.code, "name": obj.location.name}


class MasterPackOutSerializer(serializers.ModelSerializer):
    lines = MasterPackLineOutSerializer(many=True, read_only=True)

    class Meta:
        model = MasterPack
        fields = ["number", "created_at", "items_total", "qty_total", "amount_total", "lines"]