# products/serializers_reports.py
from rest_framework import serializers
from .models import SaleLine

class ProductWiseSalesRowSerializer(serializers.ModelSerializer):
    # Joins
    department       = serializers.SerializerMethodField()
    category         = serializers.SerializerMethodField()
    subCategory      = serializers.SerializerMethodField()
    brand            = serializers.SerializerMethodField()
    subBrand         = serializers.SerializerMethodField()
    itemcode         = serializers.CharField(source="barcode")
    product          = serializers.SerializerMethodField()
    lastPurchaseDate = serializers.SerializerMethodField()
    lastPurchaseQty  = serializers.SerializerMethodField()
    lastSalesDate    = serializers.SerializerMethodField()
    location         = serializers.SerializerMethodField()
    qtySold          = serializers.SerializerMethodField()
    customerName     = serializers.SerializerMethodField()
    mobile           = serializers.SerializerMethodField()

    class Meta:
        model  = SaleLine
        fields = [
            "department","category","subCategory","brand","subBrand",
            "itemcode","product","lastPurchaseDate","lastPurchaseQty",
            "lastSalesDate","location","qtySold","customerName","mobile"
        ]

    # ----- Mappers / defaults -----
    def _ti(self, obj):
        return getattr(getattr(obj, "product", None), "task_item", None)

    def get_department(self, obj):
        ti = self._ti(obj)
        return (ti.department if ti and ti.department is not None else "") or ""

    def get_category(self, obj):
        # as requested: category == department
        return self.get_department(obj)

    def get_subCategory(self, obj):
        return ""  # leave blank

    def get_brand(self, obj):
        return "B4L"  # default

    def get_subBrand(self, obj):
        return ""  # leave blank

    def get_product(self, obj):
        ti = self._ti(obj)
        # Prefer print-friendly -> vasy -> full
        name = (
            getattr(ti, "item_print_friendly_name", "") or
            getattr(ti, "item_vasy_name", "") or
            getattr(ti, "item_full_name", "") or
            ""
        )
        return name

    def get_lastPurchaseDate(self, obj):
        # same as sale date
        d = getattr(getattr(obj, "sale", None), "transaction_date", None)
        return d.date().isoformat() if d else ""

    def get_lastPurchaseQty(self, obj):
        return 0  # fixed as per requirement

    def get_lastSalesDate(self, obj):
        d = getattr(getattr(obj, "sale", None), "transaction_date", None)
        return d.date().isoformat() if d else ""

    def get_location(self, obj):
        store = getattr(getattr(obj, "sale", None), "store", "") or ""
        return store  # mirrors your previous location labels

    def get_qtySold(self, obj):
        return 1  # fixed (do not use obj.qty)

    def get_customerName(self, obj):
        cust = getattr(getattr(obj, "sale", None), "customer", None)
        return (getattr(cust, "name", "") or "") if cust else ""

    def get_mobile(self, obj):
        cust = getattr(getattr(obj, "sale", None), "customer", None)
        return (getattr(cust, "phone", "") or "") if cust else ""
