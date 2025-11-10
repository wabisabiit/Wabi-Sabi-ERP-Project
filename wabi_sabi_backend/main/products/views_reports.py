# products/views_reports.py
from datetime import date, datetime
from decimal import Decimal

from django.db.models import Sum, F, DecimalField, ExpressionWrapper, Count
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import SaleLine, CreditNote


def _parse_date(s: str):
    if not s:
        return None
    try:
        # accepts YYYY-MM-DD or full ISO
        if "T" in s:
            return datetime.fromisoformat(s).date()
        return date.fromisoformat(s)
    except Exception:
        return None


class DaywiseSalesSummary(APIView):
    """
    GET /api/reports/daywise-sales/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&location=<text>
    - Groups by calendar day
    - cash = sum(SaleLine.sp * qty) for that day (any payment method)
    - credit_notes = count of CreditNote created that day
    - total = cash + credit_notes (per your spec)
    - location filters by Sale.store/CreditNote.sale.store (icontains)
    """

    def get(self, request):
        df = _parse_date(request.GET.get("date_from", ""))
        dt = _parse_date(request.GET.get("date_to", ""))
        if not df or not dt or df > dt:
            return Response(
                {"detail": "Provide valid date_from and date_to (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        loc = (request.GET.get("location") or "").strip()

        # ---- CASH (sum of line amounts per day) ----
        line_amount = ExpressionWrapper(
            F("sp") * F("qty"),
            output_field=DecimalField(max_digits=16, decimal_places=2),
        )
        sl_qs = (
            SaleLine.objects
            .select_related("sale")
            .filter(sale__transaction_date__date__gte=df,
                    sale__transaction_date__date__lte=dt)
        )
        if loc:
            sl_qs = sl_qs.filter(sale__store__icontains=loc)

        cash_rows = (
            sl_qs.annotate(sday=TruncDate("sale__transaction_date"))
                 .values("sday")
                 .annotate(cash=Sum(line_amount))
        )
        cash_by_day = {r["sday"]: (r["cash"] or Decimal("0.00")) for r in cash_rows}

        # ---- CREDIT NOTE count per day (using note_date) ----
        cn_qs = CreditNote.objects.select_related("sale").filter(
            note_date__date__gte=df,
            note_date__date__lte=dt,
        )
        if loc:
            cn_qs = cn_qs.filter(sale__store__icontains=loc)

        cn_rows = (
            cn_qs.annotate(sday=TruncDate("note_date"))
                 .values("sday")
                 .annotate(cnt=Count("id"))
        )
        cn_by_day = {r["sday"]: int(r["cnt"] or 0) for r in cn_rows}

        # ---- Build continuous day rows ----
        rows = []
        sr = 1
        cur = df
        total_cash = Decimal("0.00")
        total_cn = 0

        while cur <= dt:
            cash = cash_by_day.get(cur, Decimal("0.00"))
            cnotes = cn_by_day.get(cur, 0)
            total_val = cash + Decimal(cnotes)
            rows.append({
                "sr_no": sr,
                "sales_date": cur.isoformat(),
                "cash": f"{cash:.2f}",
                "credit_notes": cnotes,
                "total": f"{total_val:.2f}",
            })
            total_cash += cash
            total_cn += cnotes
            sr += 1
            cur = date.fromordinal(cur.toordinal() + 1)

        return Response({
            "filters": {
                "date_from": df.isoformat(),
                "date_to": dt.isoformat(),
                "location": loc,
            },
            "rows": rows,
            "totals": {
                "cash": f"{total_cash:.2f}",
                "credit_notes": total_cn,
                "total": f"{(total_cash + Decimal(total_cn)):.2f}",
            },
        }, status=status.HTTP_200_OK)
