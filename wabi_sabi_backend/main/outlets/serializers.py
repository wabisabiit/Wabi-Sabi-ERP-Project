# outlets/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Outlet, Employee
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

    # KYC/bank (required)
    aadhaar = serializers.CharField(required=True, max_length=12)
    pan     = serializers.CharField(required=True, max_length=10)
    bank_name = serializers.CharField(required=True, max_length=80)
    bank_branch = serializers.CharField(required=True, max_length=120)
    account_number = serializers.CharField(required=True, max_length=18)

    outlet = serializers.PrimaryKeyRelatedField(queryset=Outlet.objects.all())

    class Meta:
        model = Employee
        fields = [
            "id", "user",
            "username", "password", "first_name", "last_name", "email",
            "outlet", "role", "is_active",
            "aadhaar", "pan", "bank_name", "bank_branch", "account_number",
        ]

    def validate(self, data):
        # Normalize PAN to uppercase; strip whitespace
        pan = data.get("pan")
        if pan:
            data["pan"] = pan.strip().upper()
        # Aadhaar must be 12 digits; account_number must be digits 9–18; patterns enforced again at model-level.
        aadhaar = data.get("aadhaar", "").strip()
        if not aadhaar.isdigit() or len(aadhaar) != 12:
            raise serializers.ValidationError({"aadhaar": "Aadhaar must be exactly 12 digits."})
        acct = data.get("account_number", "").strip()
        if not acct.isdigit() or not (9 <= len(acct) <= 18):
            raise serializers.ValidationError({"account_number": "Account number must be 9–18 digits."})
        pan = data.get("pan", "")
        if not pan.isalnum() or len(pan) != 10:
            raise serializers.ValidationError({"pan": "PAN must be exactly 10 alphanumeric characters."})
        return data

    def create(self, validated):
        uname = validated.pop("username")
        pwd   = validated.pop("password")
        first = validated.pop("first_name", "")
        last  = validated.pop("last_name", "")
        email = validated.pop("email", "")
        u = User.objects.create_user(username=uname, password=pwd, first_name=first, last_name=last, email=email)
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
