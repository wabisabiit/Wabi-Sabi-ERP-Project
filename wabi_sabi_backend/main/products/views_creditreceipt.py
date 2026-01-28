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

from .models import CreditNote, Product


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


def _resolve_item_name_from_barcode(barcode: str) -> str:
    """
    Best-effort: Product.barcode -> TaskItem names
    """
    safe = (barcode or "").strip()
    if not safe:
        return "Item"

    p = (
        Product.objects.select_related("task_item")
        .filter(barcode__iexact=safe)
        .first()
    )
    if not p:
        return safe

    ti = getattr(p, "task_item", None)
    name = (
        getattr(ti, "item_print_friendly_name", None)
        or getattr(ti, "item_vasy_name", None)
        or getattr(ti, "item_full_name", None)
        or ""
    )
    return (name or safe).strip()


def _get_creditnote_items(note):
    """
    Credit notes in your project (per serializer) store barcode+qty on CreditNote itself.
    Some projects store separate lines. We support BOTH:

    Returns list of dicts:
      { name, qty, rate, amount }
    """
    # 1) try relations (if your project ever adds a line model)
    for attr in ("lines", "credit_note_lines", "items", "credit_lines"):
        rel = getattr(note, attr, None)
        if rel is None:
            continue
        try:
            lines = list(rel.all())
            if lines:
                out = []
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
                    rate = Decimal(str(
                        getattr(ln, "price", None)
                        or getattr(ln, "rate", None)
                        or getattr(ln, "unit_price", None)
                        or 0
                    ))
                    amt = Decimal(str(
                        getattr(ln, "line_total", None)
                        or getattr(ln, "amount", None)
                        or (qty * rate)
                    ))
                    out.append(
                        {
                            "name": str(name) or "Item",
                            "qty": qty,
                            "rate": rate,
                            "amount": amt,
                        }
                    )
                return out
        except Exception:
            pass

    # 2) fallback: barcode & qty stored on CreditNote (YOUR CURRENT MODEL/SERIALIZER)
    barcode = (getattr(note, "barcode", None) or "").strip()
    qty_raw = getattr(note, "qty", None)

    try:
        qty = Decimal(str(qty_raw if qty_raw is not None else 1))
    except Exception:
        qty = Decimal("1")

    if qty <= 0:
        qty = Decimal("1")

    total_amt = getattr(note, "amount", None) or getattr(note, "total_amount", None) or getattr(note, "total", None) or 0
    try:
        total_amt = Decimal(str(total_amt))
    except Exception:
        total_amt = Decimal("0.00")

    if not barcode:
        # nothing to show
        return []

    # If barcode contains multiple values separated by comma, show each (best effort)
    barcodes = [b.strip() for b in barcode.split(",") if b.strip()]
    if len(barcodes) <= 1:
        name = _resolve_item_name_from_barcode(barcode)
        rate = (total_amt / qty) if qty else Decimal("0.00")
        return [
            {
                "name": name,
                "qty": qty,
                "rate": rate,
                "amount": total_amt,
            }
        ]

    # multiple barcodes -> split total equally (best-effort)
    per_amt = (total_amt / Decimal(str(len(barcodes)))) if barcodes else Decimal("0.00")
    out = []
    for b in barcodes:
        name = _resolve_item_name_from_barcode(b)
        out.append(
            {
                "name": name,
                "qty": Decimal("1"),
                "rate": per_amt,
                "amount": per_amt,
            }
        )
    return out


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

        # --- Prepare PDF ---
        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4

        left = 40
        right = w - 40
        y = h - 50

        def draw_text(txt, x, yy, size=10, bold=False):
            c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            c.drawString(x, yy, txt)

        # Header
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

        # Barcode
        try:
            bc = code128.Code128(str(cn_no), barHeight=22, barWidth=0.75)
            bc.drawOn(c, right - 220, h - 90)
        except Exception:
            pass

        # Customer
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

        # Table header
        draw_text("Item", left, y, bold=True)
        draw_text("Qty", left + 280, y, bold=True)
        draw_text("Rate", left + 330, y, bold=True)
        draw_text("Amount", left + 420, y, bold=True)
        y -= 10
        c.line(left, y, right, y)
        y -= 16

        # ✅ Items
        items = _get_creditnote_items(note)

        total = Decimal("0.00")

        for it in items:
            name = it.get("name") or "Item"
            qty = Decimal(str(it.get("qty") or 1))
            rate = Decimal(str(it.get("rate") or 0))
            amt = Decimal(str(it.get("amount") or (qty * rate)))

            total += amt

            # page break safety
            if y < 120:
                c.showPage()
                y = h - 60
                draw_text("CREDIT NOTE (cont.)", left, y, size=14, bold=True)
                y -= 26
                draw_text("Item", left, y, bold=True)
                draw_text("Qty", left + 280, y, bold=True)
                draw_text("Rate", left + 330, y, bold=True)
                draw_text("Amount", left + 420, y, bold=True)
                y -= 10
                c.line(left, y, right, y)
                y -= 16

            c.setFont("Helvetica", 10)
            c.drawString(left, y, str(name)[:45])
            c.drawRightString(left + 310, y, str(q2(qty)))
            c.drawRightString(left + 390, y, str(q2(rate)))
            c.drawRightString(right, y, str(q2(amt)))
            y -= 16

        # If CreditNote already stores amount, prefer it as final total
        stored_total = getattr(note, "amount", None) or getattr(note, "total_amount", None) or getattr(note, "total", None)
        if stored_total is not None:
            try:
                total = Decimal(str(stored_total))
            except Exception:
                pass

        y -= 8
        c.line(left, y, right, y)
        y -= 18

        # Totals
        draw_text("Total Credit:", left + 300, y, bold=True)
        c.setFont("Helvetica-Bold", 11)
        c.drawRightString(right, y, str(q2(total)))

        c.showPage()
        c.save()
        buf.seek(0)

        filename = f"credit_note_{cn_no}.pdf"
        return FileResponse(buf, as_attachment=True, filename=filename, content_type="application/pdf")
