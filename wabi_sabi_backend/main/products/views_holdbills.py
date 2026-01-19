# products/views_holdbills.py
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .models import (
    Product,
    Customer,
    HoldBill,
    HoldBillLine,
)
from taskmaster.models import Location  # already used in models
from outlets.models import Employee     # you already have this


class HoldBillView(APIView):
    """
    GET  /api/hold-bills/          -> list ACTIVE hold bills for user (location scoped)
    POST /api/hold-bills/          -> create a new hold bill from cart
        payload:
        {
          "customer": { "id"?, "name"?, "phone"?, "email"? },
          "lines": [ { "barcode": "...", "qty": 2 }, ... ]
        }
    """
    permission_classes = [permissions.IsAuthenticated]

    def _user_location(self, user):
        emp = getattr(user, "employee", None)
        if emp and getattr(emp, "outlet", None):
            return getattr(emp.outlet, "location", None)
        return None

    def _is_admin_user(self, user):
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        emp = getattr(user, "employee", None)
        role = getattr(emp, "role", "") if emp else ""
        return role == "ADMIN"

    def get(self, request):
        user = request.user
        qs = HoldBill.objects.filter(is_active=True)

        # ✅ Admin sees all locations
        if not self._is_admin_user(user):
            # ✅ Manager/staff must have a location and only see that location
            loc = self._user_location(user)
            if not loc:
                return Response(
                    {"ok": False, "message": "No location assigned to this user."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            qs = qs.filter(location=loc)

        data = []
        for idx, hb in enumerate(qs.order_by("-created_at"), start=1):
            cname = hb.customer_name or (hb.customer.name if hb.customer_id else "")
            cphone = hb.customer_phone or (hb.customer.phone if hb.customer_id else "")
            data.append(
                {
                    "id": hb.id,
                    "serial": idx,
                    "number": hb.number,  # HB1, HB2...
                    "customer_name": cname,
                    "customer_phone": cphone,
                    "created_at": hb.created_at.isoformat(),
                    "location": getattr(hb.location, "code", str(hb.location)),
                }
            )

        return Response({"results": data}, status=status.HTTP_200_OK)

    def post(self, request):
        payload = request.data or {}
        customer_data = payload.get("customer") or {}
        lines_data = payload.get("lines") or []

        if not lines_data:
            return Response(
                {"ok": False, "message": "No items in cart."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        # ✅ Admin CAN create too, but still needs an explicit location from their profile
        # (keeping your existing behavior: uses _user_location only)
        loc = self._user_location(user)
        if not loc:
            return Response(
                {"ok": False, "message": "No location assigned to this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolve / create customer
        name = (customer_data.get("name") or "").strip() or "Walk In Customer"
        phone = (customer_data.get("phone") or "").strip()

        customer_obj = None
        if phone:
            customer_obj, _ = Customer.objects.get_or_create(
                phone=phone, defaults={"name": name}
            )
        elif name and name != "Walk In Customer":
            customer_obj = Customer.objects.create(name=name, phone="")

        bill = HoldBill.objects.create(
            customer=customer_obj,
            customer_name=name,
            customer_phone=phone,
            location=loc,
            created_by=getattr(request.user, "employee", None),
        )

        for ln in lines_data:
            barcode = (ln.get("barcode") or "").strip()
            if not barcode:
                continue
            qty = int(ln.get("qty") or 1)
            if qty <= 0:
                qty = 1

            product = get_object_or_404(Product, barcode=barcode)
            HoldBillLine.objects.create(
                bill=bill,
                product=product,
                qty=qty,
            )

        return Response(
            {
                "ok": True,
                "id": bill.id,
                "number": bill.number,
                "message": f"Bill saved on hold as {bill.number}.",
            },
            status=status.HTTP_201_CREATED,
        )


class HoldBillRestore(APIView):
    """
    POST /api/hold-bills/<number>/restore/
       -> mark is_active=False and return lines to rebuild cart
    """
    permission_classes = [permissions.IsAuthenticated]

    def _user_location(self, user):
        emp = getattr(user, "employee", None)
        if emp and getattr(emp, "outlet", None):
            return getattr(emp.outlet, "location", None)
        return None

    def _is_admin_user(self, user):
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        emp = getattr(user, "employee", None)
        role = getattr(emp, "role", "") if emp else ""
        return role == "ADMIN"

    def post(self, request, number):
        user = request.user

        # ✅ Admin can restore any hold bill (all locations)
        if self._is_admin_user(user):
            bill = get_object_or_404(HoldBill, number=number, is_active=True)
        else:
            # ✅ Manager/staff can restore only their location
            loc = self._user_location(user)
            if not loc:
                return Response(
                    {"ok": False, "message": "No location assigned to this user."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            bill = get_object_or_404(HoldBill, number=number, is_active=True, location=loc)

        bill.is_active = False
        bill.save(update_fields=["is_active"])

        lines = [
            {"barcode": ln.barcode, "qty": ln.qty}
            for ln in bill.lines.all().order_by("id")
        ]

        cust = bill.customer
        customer = {
            "id": cust.id if cust else None,
            "name": bill.customer_name or (cust.name if cust else ""),
            "phone": bill.customer_phone or (cust.phone if cust else ""),
        }

        return Response(
            {
                "ok": True,
                "number": bill.number,
                "customer": customer,
                "lines": lines,
                "message": f"{bill.number} restored.",
            },
            status=status.HTTP_200_OK,
        )
