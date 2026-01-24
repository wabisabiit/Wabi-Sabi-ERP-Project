# products/serializers_customers.py
from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    # ✅ keep display fields
    created_by_display = serializers.SerializerMethodField()
    location_display = serializers.SerializerMethodField()

    # ✅ ALSO expose fields with the names most frontends use
    created_by = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "created_at",

            # common names (so frontend table shows values)
            "created_by",
            "location",

            # keep your display fields too (POS dropdown uses these)
            "created_by_display",
            "location_display",
        ]

    def _loc_label(self, obj):
        loc = getattr(obj, "location", None)
        if not loc:
            return ""
        return getattr(loc, "code", "") or getattr(loc, "name", "") or str(loc)

    def _created_by_label(self, obj):
        """
        Example format:
          "Sandeep, manager of UV"
        """
        user = getattr(obj, "created_by", None)
        if not user:
            return ""

        emp = getattr(user, "employee", None)
        if not emp:
            return user.get_full_name() or user.username or ""

        emp_name = (
            getattr(emp, "name", None)
            or getattr(emp, "full_name", None)
            or (user.get_full_name() if hasattr(user, "get_full_name") else "")
            or user.username
            or ""
        )

        loc_label = ""
        outlet = getattr(emp, "outlet", None)
        if outlet and getattr(outlet, "location", None):
            loc = outlet.location
            loc_label = getattr(loc, "code", "") or getattr(loc, "name", "") or ""

        if loc_label:
            return f"{emp_name}, manager of {loc_label}"
        return emp_name

    # ✅ “created_by” field (frontend table usually uses this)
    def get_created_by(self, obj):
        return self._created_by_label(obj)

    # ✅ “location” field (frontend table usually uses this)
    def get_location(self, obj):
        return self._loc_label(obj)

    # ✅ keep existing display fields (used by SearchBar dropdown)
    def get_location_display(self, obj):
        return self._loc_label(obj)

    def get_created_by_display(self, obj):
        return self._created_by_label(obj)

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
