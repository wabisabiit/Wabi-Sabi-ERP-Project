from rest_framework import serializers
from .models import Product
from .models import MasterPack, MasterPackLine,MaterialConsumption, MaterialConsumptionLine, MaterialConsumptionSequence
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
    category     = serializers.SerializerMethodField()   # null-safe
    brand        = serializers.SerializerMethodField()   # null-safe
    hsn          = serializers.SerializerMethodField()   # null-safe
    mrp          = serializers.DecimalField(max_digits=12, decimal_places=2)
    sellingPrice = serializers.DecimalField(
        source="selling_price", max_digits=12, decimal_places=2
    )
    image        = serializers.CharField(
        source="image_url", allow_blank=True, allow_null=True, default=""
    )
    qty          = serializers.SerializerMethodField()   # robust int
    size         = serializers.CharField(allow_blank=True, default="")

    # actual Taskmaster item code (FK raw value)
    taskItemCode = serializers.SerializerMethodField()

    # ✅ NEW: destination location (from latest MasterPackLine for this product)
    location     = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "itemCode",
            "name",
            "taskItemCode",
            "category",
            "brand",
            "mrp",
            "sellingPrice",
            "hsn",
            "qty",
            "image",
            "size",
            "location",      # 👈 include here
        ]

    def get_taskItemCode(self, obj):
        ti = getattr(obj, "task_item", None)
        return getattr(ti, "item_code", "") if ti else ""

    def get_name(self, obj):
        ti = getattr(obj, "task_item", None)
        if not ti:
            return ""
        return (
            ti.item_vasy_name
            or ti.item_full_name
            or ti.item_print_friendly_name
            or ""
        )

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

    def get_location(self, obj):
        """
        Pick the MOST RECENT MasterPackLine for this product (i.e. last time
        it was packed and destined to a location) and return that location name.
        If never packed, return empty string.
        """
        line = (
            MasterPackLine.objects
            .filter(product=obj)
            .select_related("location", "pack")
            .order_by("-pack__created_at", "-id")
            .first()
        )
        if not line or not line.location:
            return ""
        # You can choose `.code` instead if you want WSLLP / TN / etc.
        return line.location.name or line.location.code or ""    

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


class MCLineInSerializer(serializers.Serializer):
    barcode = serializers.CharField()
    qty     = serializers.IntegerField(min_value=1, default=1)
    price   = serializers.DecimalField(max_digits=12, decimal_places=2)  # selling price snap


class MaterialConsumptionCreateSerializer(serializers.Serializer):
    date            = serializers.DateField()
    location_code   = serializers.CharField()
    consumption_type= serializers.ChoiceField(choices=["Production", "Scrap/Wastage", "Expired"])
    remark          = serializers.CharField(allow_blank=True, required=False)
    rows            = MCLineInSerializer(many=True)

    def validate(self, data):
        if not data.get("rows"):
            raise serializers.ValidationError({"rows": "At least one barcode row is required."})
        return data

    def create(self, validated):
        loc_code = validated["location_code"]
        try:
            loc = Location.objects.get(code=loc_code)
        except Location.DoesNotExist:
            raise serializers.ValidationError({"location_code": f"Unknown location: {loc_code}"})

        rows = validated["rows"]
        # fetch products by barcode
        barcodes = [r["barcode"].replace("–","-").replace("—","-").strip().upper() for r in rows]
        prows = {p.barcode.upper(): p for p in Product.objects.select_related("task_item").filter(barcode__in=barcodes)}
        missing = [b for b in barcodes if b not in prows]
        if missing:
            raise serializers.ValidationError({"barcodes": f"Not found: {', '.join(missing)}"})

        mc = MaterialConsumption.objects.create(
            location=loc,
            consumption_type=validated["consumption_type"],
            remark=validated.get("remark",""),
            date=validated["date"],
        )

        total_amount = 0
        for r in rows:
            b = r["barcode"].replace("–","-").replace("—","-").strip().upper()
            p = prows[b]
            ti = getattr(p, "task_item", None)
            name = (getattr(ti, "item_print_friendly_name", "") or
                    getattr(ti, "item_vasy_name", "") or
                    getattr(ti, "item_full_name", "") or "")

            qty   = int(r.get("qty", 1) or 1)
            price = r["price"]
            total = price * qty

            MaterialConsumptionLine.objects.create(
                consumption=mc,
                product=p,
                barcode=p.barcode,
                name=name,
                qty=qty,
                price=price,
                total=total,
            )
            total_amount += total

        mc.total_amount = total_amount
        mc.save(update_fields=["total_amount"])
        return mc


class MaterialConsumptionOutLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialConsumptionLine
        fields = ["barcode", "name", "qty", "price", "total"]


class MaterialConsumptionOutSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    lines    = MaterialConsumptionOutLineSerializer(many=True, read_only=True)

    class Meta:
        model  = MaterialConsumption
        fields = ["number","date","consumption_type","remark","total_amount","location","lines"]

    def get_location(self, obj):
        return {"code": obj.location.code, "name": obj.location.name}


class NextMCNumberSerializer(serializers.Serializer):
    """
    Read-only serializer to expose next number without incrementing the counter.
    """
    prefix = serializers.CharField()
    next   = serializers.IntegerField()
    preview= serializers.CharField()

    @staticmethod
    def build(prefix="CONWS"):
        seq, _ = MaterialConsumptionSequence.objects.get_or_create(prefix=prefix, defaults={"next_number": 1})
        nxt = seq.next_number
        preview = f"{prefix}{nxt}" if (seq.pad_width or 0) == 0 else f"{prefix}{str(nxt).zfill(seq.pad_width)}"
        return {"prefix": prefix, "next": nxt, "preview": preview}