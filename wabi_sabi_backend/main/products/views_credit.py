from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.db import transaction, DatabaseError   # ← ADD
from datetime import datetime 
from .models import CreditNote
from django.utils import timezone
from .serializers_credit import CreditNoteListSerializer

class CreditNoteView(APIView):
    """
    GET /api/credit-notes/?query=&page=&page_size=&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&customer=&status=
      - query: matches note_no, customer name, barcode
      - start_date/end_date: filter on note.date (inclusive)
      - customer: partial match on customer name
      - status: active | not_active (optional)
    """
    def get(self, request):
        qs = CreditNote.objects.select_related("customer").order_by("-date", "-id")

        # text query
        q = (request.GET.get("query") or "").strip()
        if q and q.lower() not in ("undefined", "null"):
            qs = qs.filter(
                Q(note_no__icontains=q) |
                Q(customer__name__icontains=q) |
                Q(barcode__icontains=q)
            )

        # date range (inclusive)
        def _parse(d):
            try:
                return datetime.fromisoformat(d)
            except Exception:
                return None

        start = _parse((request.GET.get("start_date") or "").strip())
        end   = _parse((request.GET.get("end_date") or "").strip())
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            # include the whole day if only a date is passed (no time)
            if end.hour == 0 and end.minute == 0 and end.second == 0:
                qs = qs.filter(date__lt=end.replace(hour=23, minute=59, second=59, microsecond=999999))
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
        want_all = (request.GET.get("all") or "").lower() in ("1", "true", "yes", "on") \
            or (request.GET.get("page_size") or "").lower() == "all"
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
        end_ix   = start_ix + page_size
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
    def get(self, request, note_no: str):
        note_no = (note_no or "").strip()
        try:
            cn = CreditNote.objects.select_related("customer").get(note_no__iexact=note_no)
        except CreditNote.DoesNotExist:
            return Response({"ok": False, "msg": "Credit note not found."}, status=status.HTTP_404_NOT_FOUND)

        data = {
            "ok": True,
            "note_no": cn.note_no,
            "date": cn.date,
            "customer": cn.customer.name,
            "amount": str(cn.amount),
            "is_redeemed": bool(cn.is_redeemed),
            "redeemed_amount": str(cn.redeemed_amount),
        }
        return Response(data, status=status.HTTP_200_OK)


class CreditNoteRedeem(APIView):
    """
    POST /api/credit-notes/<note_no>/redeem/
    body: { "invoice_no": "TRANS0007", "amount": 123.45 }
    """
    @transaction.atomic   # ← ensure select_for_update runs inside a transaction
    def post(self, request, note_no: str):
        note_no = (note_no or "").strip()

        try:
            cn = CreditNote.objects.select_for_update().get(note_no__iexact=note_no)
        except CreditNote.DoesNotExist:
            return Response({"ok": False, "msg": "Credit note not found."}, status=status.HTTP_404_NOT_FOUND)

        if cn.is_redeemed:
            return Response({"ok": False, "msg": "Credit note already redeemed."}, status=status.HTTP_409_CONFLICT)

        try:
            amt = float(request.data.get("amount", 0))
        except Exception:
            return Response({"ok": False, "msg": "Invalid amount."}, status=status.HTTP_400_BAD_REQUEST)

        if amt <= 0:
            return Response({"ok": False, "msg": "Amount must be > 0."}, status=status.HTTP_400_BAD_REQUEST)

        total = float(cn.amount or 0)
        if amt - total > 1e-6:
            return Response({"ok": False, "msg": "Amount exceeds credit note value."}, status=status.HTTP_400_BAD_REQUEST)

        # mark redeemed
        cn.is_redeemed = True
        cn.redeemed_amount = amt
        cn.redeemed_at = timezone.now()
        cn.redeemed_invoice = (request.data.get("invoice_no") or "").strip()
        cn.save(update_fields=["is_redeemed", "redeemed_amount", "redeemed_at", "redeemed_invoice"])

        return Response({"ok": True, "msg": "Credit note redeemed."}, status=status.HTTP_200_OK)
