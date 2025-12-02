# products/views_accounts.py
from rest_framework import generics, permissions, serializers
from .models import Account


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "group_name",
            "group_nature",
            "account_type",
            "opening_debit",
            "opening_credit",
            "location_name",
            "created_at",
            "created_by",
        ]
        read_only_fields = ["id", "created_at", "created_by", "location_name", "group_nature"]

    def _derive_group_nature(self, group_name: str) -> str:
        g = (group_name or "").lower()
        if "asset" in g:
            return Account.NATURE_ASSETS
        if "liabilit" in g or "loan" in g or "creditor" in g:
            return Account.NATURE_LIABILITIES
        if "expense" in g:
            return Account.NATURE_EXPENSES
        if "income" in g:
            return Account.NATURE_INCOME
        # safe default
        return Account.NATURE_ASSETS

    def create(self, validated_data):
        # derive group_nature from group_name if not sent
        if not validated_data.get("group_nature"):
            validated_data["group_nature"] = self._derive_group_nature(
                validated_data.get("group_name", "")
            )

        # default location text (same as JSX)
        if not validated_data.get("location_name"):
            validated_data["location_name"] = "Brands 4 less - IFFCO Chowk"

        # created_by from request user (fallback username)
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            full = request.user.get_full_name() or ""
            validated_data["created_by"] = full or request.user.username or ""

        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "group_name" in validated_data and "group_nature" not in validated_data:
            validated_data["group_nature"] = self._derive_group_nature(
                validated_data.get("group_name", instance.group_name)
            )
        return super().update(instance, validated_data)


class AccountListCreateView(generics.ListCreateAPIView):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]


class AccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]
