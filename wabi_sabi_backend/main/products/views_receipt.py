# products/views_reports.py
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO

from django.db.models import Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.http import FileResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas

from openpyxl import Workbook

from .models import Sale, SaleLine, SalePayment, CreditNote


TWOPLACES = Decimal("0.01")


def q2(x):
    return (Decimal(x or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _date_range(d1, d2):
    cur = d1
    while cur <= d2:
        yield cur
        cur = cur + timedelta(days=1)


def _sale_location_obj(sale: Sale):
    """
    Best-effort location from:
    Sale.created_by -> User.employee -> outlet -> location
    """
    created_by = getattr(sale, "created_by", None)
    emp = getattr(created_by, "employee", None) if created_by else None
    outlet = getattr(emp, "outlet", None) if emp else None
    loc = getattr(outlet, "location", None) if outlet else None
    return loc


def _sale_matches_location(sale: Sale, location_q: str) -> bool:
    if not location_q:
        return True
    loc = _sale_location_obj(sale)
    if not loc:
        return False
    q = (location_q or "").strip().lower()
    code = (getattr(loc, "code", "") or "").strip().lower()
    name = (getattr(loc, "name", "") or "").strip().lower()
    return (q in code) or (q in name)


def _tax_rate_for_unit_price(unit_price: Decimal) -> Decimal:
    """
    ✅ Your requirement:
    - if amount <= 2500 => 5%
    - if amount > 2500 => 18%   (table has 18%, so we use 18% not 8%)
    NOTE: change 0.18 to 0.08 later if you REALLY meant 8%.
    """
    return Decimal("0.05") if q2(unit_price) <= Decimal("2500.00") else Decimal("0.18")


def _is_admin(user) -> bool:
    return bool(getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))


def _user_location_query(user) -> str:
    """
    For outlet users: force location scoping automatically.
    Admin can see all.
    """
    if _is_admin(user):
        return ""
    emp = getattr(user, "employee", None)
    outlet = getattr(emp, "outlet", None) if emp else None
    loc = getattr(outlet, "location", None) if outlet else None
    # Prefer code; fallback to name
    return (getattr(loc, "code", "") or getattr(loc, "name", "") or "").strip()


class DaywiseSalesSummary(APIView):
    """
    GET /api/reports/daywise-sales/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&location=...
    Optional exports:
      - &export=pdf
      - &export=excel
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        date_from = parse_date(request.query_params.get("date_from") or "")
        date_to = parse_date(request.query_params.get("date_to") or "")

        if not date_from or not date_to:
            return Response({"detail": "date_from and date_to are required."}, status=400)

        # location filter:
        # - outlet users: forced to their own location
        # - admin: can pass ?location=
        forced_loc = _user_location_query(request.user)
        location_q = forced_loc or (request.query_params.get("location") or "").strip()

        export = (request.query_params.get("export") or "").strip().lower()  # pdf/excel

        # fetch sales in date range (local time)
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(datetime.combine(date_from, datetime.min.time()), tz)
        end_dt = timezone.make_aware(datetime.combine(date_to, datetime.max.time()), tz)

        sales_qs = (
            Sale.objects
            .filter(transaction_date__gte=start_dt, transaction_date__lte=end_dt)
            .select_related("created_by", "customer", "salesman")
            .prefetch_related("lines", "payments")
            .order_by("transaction_date", "id")
        )

        # We'll compute day-wise by iterating & grouping in Python (safe & exact).
        day_map = {}  # date -> accum dict

        def ensure_day(d):
            if d not in day_map:
                day_map[d] = {
                    "gross_amount": Decimal("0.00"),
                    "tax_amount": Decimal("0.00"),
                    "cgst": Decimal("0.00"),
                    "sgst": Decimal("0.00"),
                    "igst": Decimal("0.00"),           # keep 0 (placeholder)
                    "tax_5": Decimal("0.00"),
                    "tax_12": Decimal("0.00"),         # keep 0 (placeholder)
                    "tax_18": Decimal("0.00"),
                    "tax_28": Decimal("0.00"),         # keep 0 (placeholder)
                    "cess": Decimal("0.00"),           # keep 0 (placeholder)
                    "discount": Decimal("0.00"),
                    "bank": Decimal("0.00"),
                    "cash": Decimal("0.00"),
                    "credit_notes": Decimal("0.00"),
                    "coupon_discount": Decimal("0.00"),
                    "additional_charge": Decimal("0.00"),  # keep 0 (placeholder)
                }

        # ---------- SALES + PAYMENTS + LINE TAX ----------
        for sale in sales_qs:
            if location_q and not _sale_matches_location(sale, location_q):
                continue

            d = timezone.localtime(sale.transaction_date).date()
            ensure_day(d)

            # lines
            lines = list(getattr(sale, "lines", []).all()) if hasattr(sale, "lines") else list(
                SaleLine.objects.filter(sale=sale)
            )

            for ln in lines:
                qty = Decimal(int(getattr(ln, "qty", 0) or 0))
                if qty <= 0:
                    continue

                sp = q2(getattr(ln, "sp", 0) or 0)

                # discount per-unit (stored as discount_amount per unit)
                disc_unit = q2(getattr(ln, "discount_amount", 0) or 0)
                if disc_unit < 0:
                    disc_unit = Decimal("0.00")
                if disc_unit > sp:
                    disc_unit = sp

                net_unit = q2(sp - disc_unit)
                net_line = q2(net_unit * qty)
                disc_line = q2(disc_unit * qty)

                rate = _tax_rate_for_unit_price(sp)
                tax_line = q2(net_line * rate)

                day_map[d]["gross_amount"] += net_line
                day_map[d]["discount"] += disc_line
                day_map[d]["tax_amount"] += tax_line

                # CGST/SGST split
                half = q2(tax_line / Decimal("2"))
                day_map[d]["cgst"] += half
                day_map[d]["sgst"] += half

                # slab totals
                if rate == Decimal("0.05"):
                    day_map[d]["tax_5"] += tax_line
                elif rate == Decimal("0.18"):
                    day_map[d]["tax_18"] += tax_line
                # 12/28 kept 0 by design

            # payments
            pays = list(getattr(sale, "payments", []).all()) if hasattr(sale, "payments") else list(
                SalePayment.objects.filter(sale=sale)
            )

            for p in pays:
                method = (getattr(p, "method", "") or "").upper()
                amt = q2(getattr(p, "amount", 0) or 0)

                if method in ("UPI", "CARD"):
                    day_map[d]["bank"] += amt
                elif method == "CASH":
                    day_map[d]["cash"] += amt
                elif method == "COUPON":
                    # coupon discount total (amount paid via coupon)
                    day_map[d]["coupon_discount"] += amt
                # credit note redemption can be tracked later if you add method rows

        # ---------- CREDIT NOTES CREATED THAT DAY ----------
        # credit notes "created on that day" => use note_date (your ordering uses note_date)
        cn_qs = CreditNote.objects.filter(note_date__gte=start_dt, note_date__lte=end_dt)

        for cn in cn_qs:
            if location_q:
                # credit note has direct location FK, so filter by code/name like UI
                loc = getattr(cn, "location", None)
                if not loc:
                    continue
                q = location_q.strip().lower()
                code = (getattr(loc, "code", "") or "").strip().lower()
                name = (getattr(loc, "name", "") or "").strip().lower()
                if (q not in code) and (q not in name):
                    continue

            d = timezone.localtime(cn.note_date).date()
            ensure_day(d)
            day_map[d]["credit_notes"] += q2(getattr(cn, "amount", 0) or 0)

        # Build rows for every day in range (even if 0)
        rows = []
        totals = {
            "gross_amount": Decimal("0.00"),
            "tax_amount": Decimal("0.00"),
            "cgst": Decimal("0.00"),
            "sgst": Decimal("0.00"),
            "igst": Decimal("0.00"),
            "tax_5": Decimal("0.00"),
            "tax_12": Decimal("0.00"),
            "tax_18": Decimal("0.00"),
            "tax_28": Decimal("0.00"),
            "cess": Decimal("0.00"),
            "discount": Decimal("0.00"),
            "bank": Decimal("0.00"),
            "cash": Decimal("0.00"),
            "credit_notes": Decimal("0.00"),
            "coupon_discount": Decimal("0.00"),
            "additional_charge": Decimal("0.00"),
            "total": Decimal("0.00"),
        }

        sr = 1
        for d in _date_range(date_from, date_to):
            ensure_day(d)
            it = day_map[d]

            gross = q2(it["gross_amount"])
            tax = q2(it["tax_amount"])
            total_amt = q2(gross + tax)  # ✅ total = gross + tax

            row = {
                "sr_no": sr,
                "sales_date": d.isoformat(),
                "gross_amount": f"{gross:.2f}",
                "tax_amount": f"{tax:.2f}",
                "cgst": f"{q2(it['cgst']):.2f}",
                "sgst": f"{q2(it['sgst']):.2f}",
                "igst": "0.00",  # placeholder
                "tax_5": f"{q2(it['tax_5']):.2f}",
                "tax_12": "0.00",  # placeholder (removed later if you want)
                "tax_18": f"{q2(it['tax_18']):.2f}",
                "tax_28": "0.00",  # placeholder
                "cess": "0.00",    # placeholder
                "discount": f"{q2(it['discount']):.2f}",
                "bank": f"{q2(it['bank']):.2f}",
                "cash": f"{q2(it['cash']):.2f}",
                "credit_notes": f"{q2(it['credit_notes']):.2f}",
                "coupon_discount": f"{q2(it['coupon_discount']):.2f}",
                "additional_charge": "0.00",  # placeholder
                "total": f"{total_amt:.2f}",
            }
            rows.append(row)
            sr += 1

            # totals
            totals["gross_amount"] += gross
            totals["tax_amount"] += tax
            totals["cgst"] += q2(it["cgst"])
            totals["sgst"] += q2(it["sgst"])
            totals["tax_5"] += q2(it["tax_5"])
            totals["tax_18"] += q2(it["tax_18"])
            totals["discount"] += q2(it["discount"])
            totals["bank"] += q2(it["bank"])
            totals["cash"] += q2(it["cash"])
            totals["credit_notes"] += q2(it["credit_notes"])
            totals["coupon_discount"] += q2(it["coupon_discount"])
            totals["total"] += total_amt

        totals_out = {
            "gross_amount": f"{q2(totals['gross_amount']):.2f}",
            "tax_amount": f"{q2(totals['tax_amount']):.2f}",
            "cgst": f"{q2(totals['cgst']):.2f}",
            "sgst": f"{q2(totals['sgst']):.2f}",
            "igst": "0.00",
            "tax_5": f"{q2(totals['tax_5']):.2f}",
            "tax_12": "0.00",
            "tax_18": f"{q2(totals['tax_18']):.2f}",
            "tax_28": "0.00",
            "cess": "0.00",
            "discount": f"{q2(totals['discount']):.2f}",
            "bank": f"{q2(totals['bank']):.2f}",
            "cash": f"{q2(totals['cash']):.2f}",
            "credit_notes": f"{q2(totals['credit_notes']):.2f}",
            "coupon_discount": f"{q2(totals['coupon_discount']):.2f}",
            "additional_charge": "0.00",
            "total": f"{q2(totals['total']):.2f}",
        }

        payload = {"rows": rows, "totals": totals_out}

        # ---------- EXPORTS ----------
        if export == "excel":
            return self._export_excel(payload, date_from, date_to)
        if export == "pdf":
            return self._export_pdf(payload, date_from, date_to)

        return Response(payload)

    def _export_excel(self, payload, date_from, date_to):
        wb = Workbook()
        ws = wb.active
        ws.title = "Daywise Sales"

        headers = [
            "Sr.No", "Sales Date", "Gross Amount", "Tax Amount",
            "CGST", "SGST", "IGST", "5%", "12%", "18%", "28%", "CESS",
            "Discount", "Bank", "Cash", "Credit Note", "Coupon Discount",
            "Additional Charge", "Total"
        ]
        ws.append(headers)

        for r in payload["rows"]:
            ws.append([
                r["sr_no"], r["sales_date"], r["gross_amount"], r["tax_amount"],
                r["cgst"], r["sgst"], r["igst"], r["tax_5"], r["tax_12"], r["tax_18"],
                r["tax_28"], r["cess"], r["discount"], r["bank"], r["cash"],
                r["credit_notes"], r["coupon_discount"], r["additional_charge"], r["total"]
            ])

        t = payload["totals"]
        ws.append([
            "", "TOTAL", t["gross_amount"], t["tax_amount"],
            t["cgst"], t["sgst"], t["igst"], t["tax_5"], t["tax_12"], t["tax_18"],
            t["tax_28"], t["cess"], t["discount"], t["bank"], t["cash"],
            t["credit_notes"], t["coupon_discount"], t["additional_charge"], t["total"]
        ])

        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)
        fn = f"daywise_sales_{date_from.isoformat()}_{date_to.isoformat()}.xlsx"
        return FileResponse(
            buf,
            as_attachment=True,
            filename=fn,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    def _export_pdf(self, payload, date_from, date_to):
        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=landscape(A4))
        W, H = landscape(A4)

        y = H - 30
        c.setFont("Helvetica-Bold", 14)
        c.drawString(30, y, "Daily Sales Summary")
        y -= 18
        c.setFont("Helvetica", 10)
        c.drawString(30, y, f"{date_from.strftime('%d/%m/%Y')} to {date_to.strftime('%d/%m/%Y')}")
        y -= 20

        # Minimal table (fits landscape). Columns same as UI.
        cols = [
            "Sr", "Date", "Gross", "Tax", "CGST", "SGST", "IGST",
            "5%", "12%", "18%", "28%", "CESS",
            "Disc", "Bank", "Cash", "CN", "Coupon", "Add", "Total"
        ]

        x0 = 20
        col_w = (W - 40) / len(cols)
        row_h = 14

        def cell(x, y, txt, bold=False):
            c.setFont("Helvetica-Bold" if bold else "Helvetica", 7)
            c.drawString(x + 2, y - 10, str(txt or ""))

        # header row
        for i, h in enumerate(cols):
            cell(x0 + i * col_w, y, h, bold=True)
        y -= row_h

        for r in payload["rows"]:
            if y < 40:
                c.showPage()
                c.setPageSize(landscape(A4))
                y = H - 30
            vals = [
                r["sr_no"], r["sales_date"],
                r["gross_amount"], r["tax_amount"],
                r["cgst"], r["sgst"], r["igst"],
                r["tax_5"], r["tax_12"], r["tax_18"], r["tax_28"], r["cess"],
                r["discount"], r["bank"], r["cash"], r["credit_notes"],
                r["coupon_discount"], r["additional_charge"], r["total"]
            ]
            for i, v in enumerate(vals):
                cell(x0 + i * col_w, y, v, bold=False)
            y -= row_h

        # totals
        t = payload["totals"]
        if y < 60:
            c.showPage()
            c.setPageSize(landscape(A4))
            y = H - 30

        c.setFont("Helvetica-Bold", 8)
        c.drawString(30, y - 10, "TOTAL")
        vals = [
            "", "",
            t["gross_amount"], t["tax_amount"],
            t["cgst"], t["sgst"], t["igst"],
            t["tax_5"], t["tax_12"], t["tax_18"], t["tax_28"], t["cess"],
            t["discount"], t["bank"], t["cash"], t["credit_notes"],
            t["coupon_discount"], t["additional_charge"], t["total"]
        ]
        for i, v in enumerate(vals):
            if i < 2:
                continue
            cell(x0 + i * col_w, y, v, bold=True)

        c.showPage()
        c.save()
        buf.seek(0)

        fn = f"daywise_sales_{date_from.isoformat()}_{date_to.isoformat()}.pdf"
        return FileResponse(buf, as_attachment=True, filename=fn, content_type="application/pdf")
