# products/serializers_customers.py
from rest_framework import serializers
from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    created_by_display = serializers.SerializerMethodField()
    location_display = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "created_at",
            "created_by_display",
            "location_display",
        ]

    def get_location_display(self, obj):
        loc = getattr(obj, "location", None)
        if not loc:
            return ""
        return getattr(loc, "code", "") or getattr(loc, "name", "") or str(loc)

    def get_created_by_display(self, obj):
        """
        Example format required:
          "Sandeep, manager of UV"
        """
        user = getattr(obj, "created_by", None)
        if not user:
            return ""

        emp = getattr(user, "employee", None)
        if not emp:
            # fallback: username / full name
            return user.get_full_name() or user.username or ""

        # try best-effort to get a name
        emp_name = (
            getattr(emp, "name", None)
            or getattr(emp, "full_name", None)
            or getattr(user, "get_full_name", lambda: "")()
            or user.username
            or ""
        )

        # outlet/location label
        loc_label = ""
        outlet = getattr(emp, "outlet", None)
        if outlet and getattr(outlet, "location", None):
            loc = outlet.location
            loc_label = getattr(loc, "code", "") or getattr(loc, "name", "") or ""

        if loc_label:
            return f"{emp_name}, manager of {loc_label}"
        return emp_name

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
