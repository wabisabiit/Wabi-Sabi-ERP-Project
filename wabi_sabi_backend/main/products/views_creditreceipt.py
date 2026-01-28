# products/views_creditreceipt.py
from io import BytesIO
from decimal import Decimal, ROUND_HALF_UP

from django.http import FileResponse, Http404
from django.utils import timezone
from django.views import View
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode import code128

from .models import CreditNote


TWOPLACES = Decimal("0.01")


def q2(x):
    return (Decimal(x or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _user_location_code(user):
    emp = getattr(user, "employee", None)
    outlet = getattr(emp, "outlet", None) if emp else None
    loc = getattr(outlet, "location", None) if outlet else None
    return (getattr(loc, "code", "") or "").strip().upper()


def _user_location_name(user):
    emp = getattr(user, "employee", None)
    outlet = getattr(emp, "outlet", None) if emp else None
    loc = getattr(outlet, "location", None) if outlet else None
    return (getattr(loc, "name", "") or "").strip()


def _creditnote_location_code(note):
    loc = getattr(note, "location", None)
    if loc and getattr(loc, "code", None):
        return (loc.code or "").strip().upper()

    created_by = getattr(note, "created_by", None)
    outlet = getattr(created_by, "outlet", None) if created_by else None
    loc2 = getattr(outlet, "location", None) if outlet else None
    if loc2 and getattr(loc2, "code", None):
        return (loc2.code or "").strip().upper()

    store = getattr(note, "store", None)
    if store:
        return (str(store) or "").strip().upper()

    return ""


def _get_creditnote_lines(note):
    for attr in ("lines", "credit_note_lines", "items", "credit_lines"):
        rel = getattr(note, attr, None)
        if rel is None:
            continue
        try:
            return list(rel.all())
        except Exception:
            pass
    return []


@method_decorator(login_required, name="dispatch")
class CreditNoteReceiptPdfView(View):
    """
    GET /api/credit-notes/<note_no>/receipt/
      -> returns a PDF for the credit note
    """

    def get(self, request, note_no: str):
        user = request.user
        safe = (str(note_no or "").strip()) or ""
        if not safe:
            raise Http404("Missing credit note number.")

        note = CreditNote.objects.select_related("customer").filter(note_no=safe).first()
        if not note:
            raise Http404("Credit note not found.")

        # location scope
        if not user.is_superuser:
            user_loc_code = _user_location_code(user)
            note_loc_code = _creditnote_location_code(note)
            if user_loc_code and note_loc_code and (user_loc_code != note_loc_code):
                raise Http404("Credit note not found.")

        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4

        left = 40
        right = w - 40
        y = h - 50

        def draw_text(txt, x, yy, size=10, bold=False):
            c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            c.drawString(x, yy, txt)

        draw_text("CREDIT NOTE", left, y, size=16, bold=True)
        y -= 22

        cn_no = getattr(note, "note_no", safe)
        cn_date = getattr(note, "date", None) or getattr(note, "created_at", None) or timezone.now()

        loc_name = _user_location_name(user) or ""
        if loc_name:
            draw_text(loc_name, left, y, size=10, bold=True)
            y -= 14

        draw_text(f"Credit Note No: {cn_no}", left, y, size=11, bold=True)
        y -= 14
        draw_text(
            f"Date: {timezone.localtime(cn_date).strftime('%d/%m/%Y %I:%M %p')}",
            left,
            y,
            size=10,
        )
        y -= 18

        try:
            bc = code128.Code128(str(cn_no), barHeight=22, barWidth=0.75)
            bc.drawOn(c, right - 220, h - 90)
        except Exception:
            pass

        cust = getattr(note, "customer", None)
        cust_name = getattr(note, "customer_name", None) or getattr(cust, "name", None) or ""
        cust_phone = getattr(cust, "phone", "") if cust else ""
        cust_addr = getattr(cust, "address", "") if cust else ""

        draw_text("Customer:", left, y, bold=True)
        y -= 14
        if cust_name:
            draw_text(cust_name, left, y, size=10)
            y -= 14
        if cust_phone:
            draw_text(f"Phone: {cust_phone}", left, y, size=10)
            y -= 14
        if cust_addr:
            draw_text(f"Address: {cust_addr}", left, y, size=10)
            y -= 14

        y -= 8
        c.line(left, y, right, y)
        y -= 18

        draw_text("Item", left, y, bold=True)
        draw_text("Qty", left + 280, y, bold=True)
        draw_text("Rate", left + 330, y, bold=True)
        draw_text("Amount", left + 420, y, bold=True)
        y -= 10
        c.line(left, y, right, y)
        y -= 16

        lines = _get_creditnote_lines(note)

        total = Decimal("0.00")
        for ln in lines:
            name = (
                getattr(ln, "product_name", None)
                or getattr(getattr(ln, "product", None), "barcode", None)
                or getattr(getattr(ln, "task_item", None), "item_print_friendly_name", None)
                or getattr(getattr(ln, "task_item", None), "item_vasy_name", None)
                or getattr(ln, "barcode", None)
                or "Item"
            )

            qty = Decimal(str(getattr(ln, "qty", 1) or 1))
            rate = Decimal(str(getattr(ln, "price", None) or getattr(ln, "rate", None) or getattr(ln, "unit_price", None) or 0))
            amt = Decimal(str(getattr(ln, "line_total", None) or getattr(ln, "amount", None) or (qty * rate)))

            total += amt

            if y < 120:
                c.showPage()
                y = h - 60

            c.setFont("Helvetica", 10)
            c.drawString(left, y, str(name)[:45])
            c.drawRightString(left + 310, y, str(q2(qty)))
            c.drawRightString(left + 390, y, str(q2(rate)))
            c.drawRightString(right, y, str(q2(amt)))
            y -= 16

        stored_total = getattr(note, "amount", None) or getattr(note, "total_amount", None) or getattr(note, "total", None)
        if stored_total is not None:
            try:
                total = Decimal(str(stored_total))
            except Exception:
                pass

        y -= 8
        c.line(left, y, right, y)
        y -= 18

        draw_text("Total Credit:", left + 300, y, bold=True)
        c.setFont("Helvetica-Bold", 11)
        c.drawRightString(right, y, str(q2(total)))

        c.showPage()
        c.save()
        buf.seek(0)

        filename = f"credit_note_{cn_no}.pdf"
        return FileResponse(buf, as_attachment=True, filename=filename, content_type="application/pdf")
