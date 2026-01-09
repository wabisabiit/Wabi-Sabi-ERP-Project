# products/views_expenses.py
from rest_framework import generics, permissions, serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.company_name", read_only=True)
    branch = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    created_from = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "account",
            "amount",
            "non_gst",
            "remark",
            "date_time",
            "branch",
            "created_by_name",
            "created_from",
        ]

    def _loc(self, obj):
        try:
            return obj.created_by_location()
        except Exception:
            return "HQ"

    def get_branch(self, obj):
        return self._loc(obj)

    def get_created_by_name(self, obj):
        return self._loc(obj)

    def get_created_from(self, obj):
        return self._loc(obj)


class ExpenseListCreateView(generics.ListCreateAPIView):
    """
    /api/expenses/
      GET  -> list expenses
      POST -> create a new expense row
    """
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            Expense.objects
            .select_related("supplier", "created_by__outlet__location")
            .order_by("-date_time", "-id")
        )

        user = self.request.user
        if getattr(user, "is_superuser", False):
            return qs

        emp = getattr(user, "employee", None)
        outlet = getattr(emp, "outlet", None) if emp else None
        loc = getattr(outlet, "location", None) if outlet else None

        if not loc:
            return qs.none()

        return qs.filter(created_by__outlet__location=loc)

    def perform_create(self, serializer):
        employee = getattr(self.request.user, "employee", None) if hasattr(
            self.request.user, "employee"
        ) else None
        serializer.save(created_by=employee)


class ExpenseDetailView(generics.DestroyAPIView):
    """
    /api/expenses/<pk>/  -> DELETE = delete one expense
    """
    queryset = Expense.objects.all()
    permission_classes = [permissions.IsAuthenticated]
