# products/views_coupons.py  (new)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics, permissions, status
from django.shortcuts import get_object_or_404
from .models import Coupon, GeneratedCoupon
from .serializers_coupons import CouponSerializer, GeneratedCouponSerializer
from .models import Customer, Sale

# ---- Coupon master ----
class CouponListCreate(generics.ListCreateAPIView):
    """
    POST: name (alnum, unique), price
    GET : list for the Coupons tab
    """
    queryset = Coupon.objects.all().order_by("-created_at")
    serializer_class = CouponSerializer
    permission_classes = [permissions.AllowAny]


# ---- Generate instances ----
class CouponGenerate(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """
        body: { "coupon_id" | "coupon_name", "qty": 4 }
        """
        qty = int(request.data.get("qty") or 0)
        if qty <= 0:
            return Response({"ok": False, "msg": "Quantity must be > 0"}, status=400)

        coupon = None
        cid = request.data.get("coupon_id")
        cname = (request.data.get("coupon_name") or "").strip()
        if cid:
            coupon = get_object_or_404(Coupon, pk=cid)
        elif cname:
            coupon = get_object_or_404(Coupon, name__iexact=cname)
        else:
            return Response({"ok": False, "msg": "Coupon not specified"}, status=400)

        created = GeneratedCoupon.bulk_generate(coupon, qty)
        return Response(
            {"ok": True, "count": len(created), "codes": [g.code for g in created]},
            status=201
        )


# ---- List generated coupons ----
class GeneratedCouponList(generics.ListAPIView):
    serializer_class = GeneratedCouponSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = GeneratedCoupon.objects.select_related("coupon", "assigned_to")
        coupon_name = self.request.query_params.get("coupon")
        assign_type = self.request.query_params.get("assign")  # "Assigned" | "UnAssigned"
        if coupon_name:
            qs = qs.filter(coupon__name__iexact=coupon_name)
        if assign_type == "Assigned":
            qs = qs.exclude(assigned_to__isnull=True)
        elif assign_type == "UnAssigned":
            qs = qs.filter(assigned_to__isnull=True)
        return qs.order_by("-created_date", "-id")


# ---- Lookup (for POS redeem) ----
class CouponLookup(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request, code):
        g = get_object_or_404(GeneratedCoupon, code__iexact=(code or "").strip())
        return Response({
            "ok": True,
            "code": g.code,
            "price": str(g.price),
            "status": g.status,
            "coupon_name": g.coupon.name,
            "created_date": g.created_date,
            "redemption_date": g.redemption_date,
            "assigned_to": (g.assigned_to.name if g.assigned_to else ""),
            "customer_no": g.customer_no,
        })


# ---- Mark redeemed (called AFTER successful sale) ----
class CouponRedeem(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, code):
        """
        body: { "invoice_no": "...", "customer": { "id"? name, phone, email? } }
        """
        g = get_object_or_404(GeneratedCoupon, code__iexact=(code or "").strip())
        if g.status == GeneratedCoupon.STATUS_REDEEMED:
            return Response({"ok": False, "msg": "Coupon already redeemed."}, status=400)

        invoice_no = (request.data.get("invoice_no") or "").strip()
        sale = get_object_or_404(Sale, invoice_no=invoice_no)

        cust = request.data.get("customer") or {}
        cust_obj = None
        if cust.get("id"):
            cust_obj = Customer.objects.filter(id=cust["id"]).first()
        if not cust_obj:
            # resolve or create by phone if given
            phone = (cust.get("phone") or "").strip()
            if phone:
                cust_obj, _ = Customer.objects.get_or_create(
                    phone=phone, defaults={"name": cust.get("name") or "Guest"}
                )
            else:
                cust_obj = sale.customer  # fallback

        try:
            g.redeem(sale=sale, customer=cust_obj)
        except ValueError as e:
            return Response({"ok": False, "msg": str(e)}, status=400)

        return Response({"ok": True, "code": g.code, "status": g.status})
