# products/views_credit.py
from datetime import datetime

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CreditNote
from .serializers_credit import CreditNoteListSerializer


class CreditNoteView(APIView):
    """
    GET /api/credit-notes/?query=&page=&page_size=&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&customer=&status=
      - query: matches note_no, customer name, barcode
      - start_date/end_date: filter on note.date (inclusive)
      - customer: partial match on customer name
      - status: active | not_active (optional)

    Location scoping:
      - HQ (superuser or role=ADMIN) can see all locations
      - Others (e.g. MANAGER) are auto-limited to their own location.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _user_location(self, user):
        """
        Helper: returns Location instance for the current user via Employee → Outlet → Location,
        or None if not mapped.
        """
        emp = getattr(user, "employee", None)
        if emp and getattr(emp, "outlet", None):
            return getattr(emp.outlet, "location", None)
        return None

    def get(self, request):
        # ✅ include created_by for Created By column
        qs = CreditNote.objects.select_related("customer", "created_by").order_by("-date", "-id")

        user = request.user
        emp = getattr(user, "employee", None)
        role = getattr(emp, "role", "") if emp else ""

        # HQ / Admin see all locations
        # Others are restricted to their own location (+ legacy notes without location)
        if not user.is_superuser and role != "ADMIN":
            loc = self._user_location(user)
            if loc:
                qs = qs.filter(Q(location=loc) | Q(location__isnull=True))

        # text query
        q = (request.GET.get("query") or "").strip()
        if q and q.lower() not in ("undefined", "null"):
            qs = qs.filter(
                Q(note_no__icontains=q)
                | Q(customer__name__icontains=q)
                | Q(barcode__icontains=q)
            )

        # date range (inclusive)
        def _parse(d):
            try:
                return datetime.fromisoformat(d)
            except Exception:
                return None

        start = _parse((request.GET.get("start_date") or "").strip())
        end = _parse((request.GET.get("end_date") or "").strip())
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            if end.hour == 0 and end.minute == 0 and end.second == 0:
                qs = qs.filter(
                    date__lt=end.replace(hour=23, minute=59, second=59, microsecond=999999)
                )
            else:
                qs = qs.filter(date__lte=end)

        # customer filter
        customer = (request.GET.get("customer") or "").strip()
        if customer:
            qs = qs.filter(customer__name__icontains=customer)

        # status filter (optional)
        st = (request.GET.get("status") or "").strip().lower()
        if st in ("active", "not_active"):
            qs = qs.filter(is_redeemed=(st == "not_active"))

        # all=1 support
        want_all = (
            (request.GET.get("all") or "").lower() in ("1", "true", "yes", "on")
            or (request.GET.get("page_size") or "").lower() == "all"
        )
        if want_all:
            data = CreditNoteListSerializer(qs, many=True).data
            return Response(
                {"results": data, "total": len(data), "page": 1, "page_size": len(data)},
                status=status.HTTP_200_OK,
            )

        # pagination
        try:
            page_size = max(1, min(1000, int(request.GET.get("page_size", 100))))
        except ValueError:
            page_size = 100
        try:
            page = max(1, int(request.GET.get("page", 1)))
        except ValueError:
            page = 1

        total = qs.count()
        start_ix = (page - 1) * page_size
        end_ix = start_ix + page_size
        items = qs[start_ix:end_ix]

        data = CreditNoteListSerializer(items, many=True).data
        return Response(
            {"results": data, "total": total, "page": page, "page_size": page_size},
            status=status.HTTP_200_OK,
        )


class CreditNoteDetail(APIView):
    """
    GET /api/credit-notes/<note_no>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, note_no: str):
        note_no = (note_no or "").strip()
        try:
            cn = CreditNote.objects.select_related("customer", "created_by").get(note_no__iexact=note_no)
        except CreditNote.DoesNotExist:
            return Response(
                {"ok": False, "msg": "Credit note not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = {
            "ok": True,
            "note_no": cn.note_no,
            "date": cn.date,
            "customer": cn.customer.name,
            "amount": str(cn.amount),
            "is_redeemed": bool(cn.is_redeemed),
            "redeemed_amount": str(cn.redeemed_amount),
            "credits_remaining": str(cn.credits_remaining),
            "status": cn.status,
            "created_by": getattr(cn.created_by, "username", "") if cn.created_by_id else "",
        }
        return Response(data, status=status.HTTP_200_OK)


class CreditNoteRedeem(APIView):
    """
    POST /api/credit-notes/<note_no>/redeem/
    body: { "invoice_no": "INV82", "amount": 123.45 }
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, note_no: str):
        note_no = (note_no or "").strip()

        try:
            cn = CreditNote.objects.select_for_update().get(note_no__iexact=note_no)
        except CreditNote.DoesNotExist:
            return Response(
                {"ok": False, "msg": "Credit note not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            amt = float(request.data.get("amount", 0))
        except Exception:
            return Response(
                {"ok": False, "msg": "Invalid amount."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if amt <= 0:
            return Response(
                {"ok": False, "msg": "Amount must be > 0."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total = float(cn.amount or 0)
        used = float(cn.redeemed_amount or 0)
        remaining = total - used

        if remaining <= 0:
            return Response(
                {"ok": False, "msg": "Credit note already fully used."},
                status=status.HTTP_409_CONFLICT,
            )

        if amt - remaining > 1e-6:
            return Response(
                {"ok": False, "msg": "Amount exceeds remaining credit note value."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ accumulate redemption (partial allowed)
        cn.redeemed_amount = (cn.redeemed_amount or 0) + amt
        cn.redeemed_at = timezone.now()
        cn.redeemed_invoice = (request.data.get("invoice_no") or "").strip()

        # ✅ mark fully redeemed only when remaining becomes 0
        cn.is_redeemed = (float(cn.amount or 0) - float(cn.redeemed_amount or 0)) <= 1e-6

        cn.save(update_fields=["is_redeemed", "redeemed_amount", "redeemed_at", "redeemed_invoice"])

        return Response(
            {"ok": True, "msg": "Credit note redeemed.", "remaining": str(cn.credits_remaining), "status": cn.status},
            status=status.HTTP_200_OK,
        )


class CreditNoteDelete(APIView):
    """
    DELETE /api/credit-notes/<note_no>/delete/

    - HQ (superuser / ADMIN) can delete any credit note
    - Manager / other roles can delete only notes belonging to their own location
    """
    permission_classes = [permissions.IsAuthenticated]

    def _user_location(self, user):
        emp = getattr(user, "employee", None)
        if emp and getattr(emp, "outlet", None):
            return getattr(emp.outlet, "location", None)
        return None

    def delete(self, request, note_no: str):
        note_no = (note_no or "").strip()

        try:
            cn = CreditNote.objects.get(note_no__iexact=note_no)
        except CreditNote.DoesNotExist:
            return Response(
                {"ok": False, "msg": "Credit note not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user
        emp = getattr(user, "employee", None)
        role = getattr(emp, "role", "") if emp else ""

        # HQ (superuser / ADMIN) -> can delete anything
        if not user.is_superuser and role != "ADMIN":
            loc = self._user_location(user)
            if cn.location_id and loc and cn.location_id != loc.id:
                return Response(
                    {"ok": False, "msg": "Not allowed to delete this credit note."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        cn.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
