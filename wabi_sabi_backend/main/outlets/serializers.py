# outlets/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Outlet, Employee , LoginLog, WowBillEntry, WowBillSlab
from taskmaster.models import Location



class OutletSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source="location.code", read_only=True)
    name = serializers.CharField(source="location.name", read_only=True)
    location_id = serializers.PrimaryKeyRelatedField(source="location", queryset=Location.objects.all(), write_only=True)

    class Meta:
        model = Outlet
        fields = ["id", "code", "name", "location_id", "display_name", "contact_no", "opening_date", "active"]

class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email"]

class EmployeeSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    # write-only auth/user fields
    username    = serializers.CharField(write_only=True)
    password    = serializers.CharField(write_only=True, required=True)
    first_name  = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name   = serializers.CharField(write_only=True, required=False, allow_blank=True)
    email       = serializers.EmailField(write_only=True, required=False, allow_blank=True)

    # 🔹 KYC/bank now OPTIONAL
    aadhaar = serializers.CharField(required=False, allow_blank=True, max_length=12)
    pan     = serializers.CharField(required=False, allow_blank=True, max_length=10)
    bank_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    bank_branch = serializers.CharField(required=False, allow_blank=True, max_length=120)
    account_number = serializers.CharField(required=False, allow_blank=True, max_length=18)

    outlet = serializers.PrimaryKeyRelatedField(queryset=Outlet.objects.all())

    class Meta:
        model = Employee
        fields = [
            "id", "user",
            "username", "password", "first_name", "last_name", "email",
            "outlet", "role", "is_active",
            "mobile",
            "aadhaar", "pan", "bank_name", "bank_branch", "account_number",
        ]

    def validate(self, data):
        # Normalize PAN to uppercase; strip whitespace
        pan = (data.get("pan") or "").strip()
        if pan:
            if not pan.isalnum() or len(pan) != 10:
                raise serializers.ValidationError(
                    {"pan": "PAN must be exactly 10 alphanumeric characters."}
                )
            data["pan"] = pan.upper()

        # Aadhaar: only if provided
        aadhaar = (data.get("aadhaar") or "").strip()
        if aadhaar:
            if (not aadhaar.isdigit()) or len(aadhaar) != 12:
                raise serializers.ValidationError(
                    {"aadhaar": "Aadhaar must be exactly 12 digits."}
                )
            data["aadhaar"] = aadhaar

        # Account number: only if provided
        acct = (data.get("account_number") or "").strip()
        if acct:
            if (not acct.isdigit()) or not (9 <= len(acct) <= 18):
                raise serializers.ValidationError(
                    {"account_number": "Account number must be 9–18 digits."}
                )
            data["account_number"] = acct

        # Bank name/branch – optional, no strict validation
        return data

    def create(self, validated):
        uname = validated.pop("username")
        pwd   = validated.pop("password")
        first = validated.pop("first_name", "")
        last  = validated.pop("last_name", "")
        email = validated.pop("email", "")
        u = User.objects.create_user(
            username=uname,
            password=pwd,
            first_name=first,
            last_name=last,
            email=email,
        )
        return Employee.objects.create(user=u, **validated)

    def update(self, instance, validated):
        user = instance.user
        for k in ("first_name", "last_name", "email"):
            if k in validated:
                setattr(user, k, validated.pop(k))
        if "password" in validated:
            user.set_password(validated.pop("password"))
        user.save()
        return super().update(instance, validated)



class LoginLogSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()

    class Meta:
        model = LoginLog
        fields = [
            "id",
            "user_display",
            "username",
            "login_time",
            "ip_address",
            "system_details",
            "outlet_code",
            "outlet_name",
        ]

    def get_user_display(self, obj):
        if obj.user and obj.user.get_full_name():
            return obj.user.get_full_name()
        return obj.username


class WowBillEntrySerializer(serializers.ModelSerializer):
    outlet_name = serializers.SerializerMethodField(read_only=True)
    employee_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = WowBillEntry
        fields = [
            "id",
            "outlet",
            "outlet_name",
            "employee",
            "employee_name",
            "customer",       # 👈 NEW
            "bill_date",      # 👈 NEW
            "sale_amount",
            "wow_min_value",
            "payout_per_wow",
            "wow_count",
            "total_payout",
            "exclude_returns",
            "created_at",
        ]
        read_only_fields = ["wow_count", "total_payout", "created_at"]

    def get_outlet_name(self, obj):
        if obj.outlet.display_name:
            return obj.outlet.display_name
        loc = getattr(obj.outlet, "location", None)
        if loc and loc.name:
            return loc.name
        if loc and loc.code:
            return loc.code
        return ""

    def get_employee_name(self, obj):
        user = getattr(obj.employee, "user", None)
        if not user:
            return ""
        full = (user.get_full_name() or "").strip()
        return full or user.username
class WowBillSlabSerializer(serializers.ModelSerializer):
    outlet_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = WowBillSlab
        fields = [
            "id",
            "outlet",
            "outlet_name",
            "min_amount",
            "payout_per_wow",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_outlet_name(self, obj):
        if obj.outlet.display_name:
            return obj.outlet.display_name
        loc = getattr(obj.outlet, "location", None)
        if loc and loc.name:
            return loc.name
        if loc and loc.code:
            return loc.code
        return ""
