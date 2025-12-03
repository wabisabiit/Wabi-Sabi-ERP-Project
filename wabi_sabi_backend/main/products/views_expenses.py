# products/views_expenses.py
from rest_framework import generics, permissions, serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    # Party name = supplier name
    supplier_name = serializers.CharField(
        source="supplier.company_name", read_only=True
    )
    # Location fields – all same for now
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

    # All three use the same location logic
    def _loc(self, obj):
        # uses your model helper; fallback "HQ"
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
    queryset = (
        Expense.objects
        .select_related("supplier", "created_by__outlet__location")
        .order_by("-date_time", "-id")
    )
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Try to attach logged-in employee / manager if available
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
