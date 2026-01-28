# products/views_creditreceipt.py
from io import BytesIO
from decimal import Decimal, ROUND_HALF_UP

from django.http import FileResponse, Http404
from django.utils import timezone
from django.views import View
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator

from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
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
    # 1) try relations (future proof)
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
                    out.append({"name": str(name) or "Item", "qty": qty, "rate": rate, "amount": amt})
                return out
        except Exception:
            pass

    # 2) fallback: YOUR CURRENT MODEL (barcode+qty on CreditNote)
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
        return []

    barcodes = [b.strip() for b in barcode.split(",") if b.strip()]
    if len(barcodes) <= 1:
        name = _resolve_item_name_from_barcode(barcode)
        rate = (total_amt / qty) if qty else Decimal("0.00")
        return [{"name": name, "qty": qty, "rate": rate, "amount": total_amt}]

    per_amt = (total_amt / Decimal(str(len(barcodes)))) if barcodes else Decimal("0.00")
    out = []
    for b in barcodes:
        name = _resolve_item_name_from_barcode(b)
        out.append({"name": name, "qty": Decimal("1"), "rate": per_amt, "amount": per_amt})
    return out


@method_decorator(login_required, name="dispatch")
class CreditNoteReceiptPdfView(View):
    """
    GET /api/credit-notes/<note_no>/receipt/
      -> thermal receipt-like PDF (retsol printer friendly)
    """

    def get(self, request, note_no: str):
        user = request.user
        safe = (str(note_no or "").strip()) or ""
        if not safe:
            raise Http404("Missing credit note number.")

        note = (
            CreditNote.objects.select_related("customer", "sale", "sale__salesman")
            .filter(note_no=safe)
            .first()
        )
        if not note:
            raise Http404("Credit note not found.")

        # location scope
        if not user.is_superuser:
            user_loc_code = _user_location_code(user)
            note_loc_code = _creditnote_location_code(note)
            if user_loc_code and note_loc_code and (user_loc_code != note_loc_code):
                raise Http404("Credit note not found.")

        # ---- DATA ----
        cn_no = getattr(note, "note_no", safe)

        cn_dt = getattr(note, "note_date", None) or getattr(note, "date", None) or getattr(note, "created_at", None) or timezone.now()
        cn_dt = timezone.localtime(cn_dt)

        cust = getattr(note, "customer", None)
        cust_name = getattr(note, "customer_name", None) or getattr(cust, "name", None) or ""
        cust_phone = getattr(cust, "phone", "") if cust else ""

        sale = getattr(note, "sale", None)
        salesman_emp = getattr(sale, "salesman", None) if sale else None
        salesman_name = (
            getattr(salesman_emp, "name", None)
            or getattr(getattr(salesman_emp, "user", None), "username", None)
            or ""
        )

        # items
        items = _get_creditnote_items(note)

        # totals
        stored_total = getattr(note, "amount", None) or getattr(note, "total_amount", None) or getattr(note, "total", None)
        try:
            total_credit = Decimal(str(stored_total if stored_total is not None else 0))
        except Exception:
            total_credit = Decimal("0.00")

        # --- THERMAL PAGE SIZE (80mm width, dynamic height) ---
        width = 80 * mm
        line_h = 4.2 * mm  # close to your receipt look
        base_lines = 44  # header + footer blocks
        item_lines = max(1, len(items))
        height = (base_lines + (item_lines * 2)) * line_h + (10 * mm)

        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=(width, height))

        x_pad = 4 * mm
        y = height - 6 * mm

        def txt(s, bold=False, size=9, align="left", x=None):
            nonlocal y
            font = "Helvetica-Bold" if bold else "Helvetica"
            c.setFont(font, size)
            s = "" if s is None else str(s)

            if x is None:
                x = x_pad

            if align == "center":
                c.drawCentredString(width / 2, y, s)
            elif align == "right":
                c.drawRightString(width - x_pad, y, s)
            else:
                c.drawString(x, y, s)
            y -= line_h

        def dash():
            nonlocal y
            c.setFont("Helvetica", 9)
            c.drawString(x_pad, y, "-" * 42)
            y -= line_h

        # ---- HEADER (like receipt) ----
        # keep outlet name similar to your receipt
        loc_name = _user_location_name(user) or ""
        if loc_name:
            txt(loc_name, bold=True, size=11, align="center")
        txt("CREDIT NOTE", bold=True, size=12, align="center")
        txt("", size=9)

        # barcode (optional)
        try:
            bc = code128.Code128(str(cn_no), barHeight=10 * mm, barWidth=0.9)
            bc.drawOn(c, x_pad, y - (12 * mm))
            y -= (14 * mm)
        except Exception:
            pass

        # customer block
        if cust_name:
            txt(f"Name  : {cust_name}", size=9)
        if cust_phone:
            txt(f"Mobile: {cust_phone}", size=9)

        txt(f"Credit Note No : {cn_no}", size=9)
        txt(f"Date : {cn_dt.strftime('%d/%m/%Y')}", size=9)
        txt(f"Time : {cn_dt.strftime('%I:%M:%S %p')}", size=9)
        txt(f"Salesman : {salesman_name}", size=9)

        dash()

        # ---- TABLE HEAD ----
        # columns like your receipt: Item | Qty | SP | Disc | Net
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x_pad, y, "Item")
        c.drawRightString(width - (52 * mm), y, "Qty")
        c.drawRightString(width - (36 * mm), y, "SP")
        c.drawRightString(width - (20 * mm), y, "Disc")
        c.drawRightString(width - x_pad, y, "Net")
        y -= line_h

        dash()

        # ---- ITEMS ----
        total_qty = Decimal("0")
        for it in items:
            name = (it.get("name") or "Item").strip()
            qty = Decimal(str(it.get("qty") or 1))
            rate = Decimal(str(it.get("rate") or 0))
            amt = Decimal(str(it.get("amount") or (qty * rate)))

            total_qty += qty

            # split long names into two lines (receipt style)
            name1 = name[:22]
            name2 = name[22:44].strip()

            c.setFont("Helvetica", 9)
            c.drawString(x_pad, y, name1)
            y -= line_h
            if name2:
                c.drawString(x_pad, y, name2)
                y -= line_h

            # numeric row (single line)
            disc = Decimal("0.00")  # credit note line discount not stored; keep 0 like your receipt image
            c.drawRightString(width - (52 * mm), y, str(q2(qty)))
            c.drawRightString(width - (36 * mm), y, str(q2(rate)))
            c.drawRightString(width - (20 * mm), y, str(q2(disc)))
            c.drawRightString(width - x_pad, y, str(q2(amt)))
            y -= line_h

            dash()

        # ---- TOTALS ----
        # Keep same structure blocks you have in receipt
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x_pad, y, "TOTAL")
        c.drawRightString(width - x_pad, y, str(q2(total_credit)))
        y -= line_h

        c.setFont("Helvetica", 9)
        c.drawString(x_pad, y, "ROUND OFF")
        c.drawRightString(width - x_pad, y, str(q2(Decimal("0.00"))))
        y -= line_h

        dash()

        c.setFont("Helvetica", 9)
        c.drawString(x_pad, y, f"NO OF QTY : {q2(total_qty)}")
        y -= line_h

        c.setFont("Helvetica-Bold", 9)
        c.drawString(x_pad, y, f"You Saved Rs. : {q2(Decimal('0.00'))}")
        y -= line_h

        c.setFont("Helvetica", 9)
        # simple amount-in-words line to match receipt placement
        try:
            amt_int = int(total_credit.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
            txt(f"Rupees {amt_int} Only", size=9)
        except Exception:
            txt("Rupees Only", size=9)

        txt("", size=9)
        txt("Prices are inclusive of all taxes - Place of Supply :", size=8)
        txt("Haryana", size=8)

        txt("", size=9)
        txt("TAX SUMMARY", bold=True, size=10, align="center")

        # (Your current models do not store GST breakup;
        # we still print the section so layout matches your receipt.)
        txt("", size=8)
        c.setFont("Helvetica", 8)
        c.drawString(x_pad, y, "GST%   Taxable    CGST    SGST    IGST")
        y -= line_h
        c.drawString(x_pad, y, "0.00   0.00       0.00    0.00    0.00")
        y -= line_h

        c.showPage()
        c.save()
        buf.seek(0)

        filename = f"credit_note_{cn_no}.pdf"
        return FileResponse(buf, as_attachment=True, filename=filename, content_type="application/pdf")
