# products/views_customers.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Q

from .models import Customer
from .serializers_customers import CustomerSerializer


class CustomerListCreate(APIView):
    """
    GET  /api/customers/?q=ranjit  -> search by name/phone (ALL matches returned)
    GET  /api/customers/           -> all customers (frontend paginates)
    POST /api/customers/           -> create or fetch by phone (name+phone required)

    ✅ No location restriction for SEARCH/LIST (everyone logged-in can see all)
    ✅ created_by + location are stored from logged-in user when creating
    """
    permission_classes = [permissions.IsAuthenticated]

    def _user_location(self, user):
        """
        Best-effort: customer's location should be same as manager/staff location.
        Looks for: user.employee.outlet.location
        """
        try:
            emp = getattr(user, "employee", None)
            outlet = getattr(emp, "outlet", None) if emp else None
            loc = getattr(outlet, "location", None) if outlet else None
            return loc
        except Exception:
            return None

    def get(self, request):
        q = (request.GET.get("q") or "").strip()

        qs = Customer.objects.all().order_by("name")

        # ✅ IMPORTANT: filter when q exists (fix “ranjit still shows all”)
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(phone__icontains=q))

        data = CustomerSerializer(qs, many=True).data
        return Response({"results": data}, status=status.HTTP_200_OK)

    def post(self, request):
        phone = (request.data.get("phone") or "").strip()
        name  = (request.data.get("name") or "").strip()

        if not name or not phone:
            return Response(
                {"detail": "Name and Mobile are mandatory."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        user_loc = self._user_location(user)

        cust = Customer.objects.filter(phone__iexact=phone).first()

        if cust:
            update_fields = []

            if name and cust.name != name:
                cust.name = name
                update_fields.append("name")

            # ✅ only set if missing
            if not getattr(cust, "created_by_id", None):
                cust.created_by = user
                update_fields.append("created_by")

            if user_loc and not getattr(cust, "location_id", None):
                cust.location = user_loc
                update_fields.append("location")

            if update_fields:
                cust.save(update_fields=update_fields)

            ser = CustomerSerializer(cust)
            return Response(
                {"ok": True, "created": False, "customer": ser.data},
                status=status.HTTP_200_OK
            )

        ser = CustomerSerializer(data={
            "name": name,
            "phone": phone,
            "email": request.data.get("email", "")
        })

        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        save_kwargs = {"created_by": user}
        if user_loc:
            save_kwargs["location"] = user_loc

        cust = ser.save(**save_kwargs)

        return Response(
            {"ok": True, "created": True, "customer": CustomerSerializer(cust).data},
            status=status.HTTP_201_CREATED
        )
