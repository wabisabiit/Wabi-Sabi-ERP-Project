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


def _parse_multi_barcode_string(raw: str):
    """
    Supports:
      - "A,B,C"
      - "A,A,B" (duplicates = qty)
      - "A*2,B*1"
      - "A:2,B:1"
      - "A x2, B x1"
    Returns dict { barcode: qty(int) }
    """
    s = (raw or "").strip()
    if not s:
        return {}

    out = {}
    parts = [p.strip() for p in s.split(",") if p.strip()]
    for p in parts:
        bc = p
        qty = 1

        # normalize separators
        p_norm = p.replace("×", "x").replace("X", "x")

        # patterns like "ABC*2" / "ABC:2" / "ABC x2"
        for sep in ("*", ":", " x", "x"):
            if sep in p_norm:
                left, right = p_norm.split(sep, 1)
                left = (left or "").strip()
                right = (right or "").strip()
                if left and right:
                    bc = left
                    try:
                        qty = int(str(right).strip())
                    except Exception:
                        qty = 1
                break

        bc = (bc or "").strip()
        if not bc:
            continue

        if qty <= 0:
            qty = 1

        out[bc] = out.get(bc, 0) + qty

    return out


def _net_unit_paid_map_from_sale(sale):
    """
    Best-effort: compute net paid per unit per barcode using the SAME logic you used in CreditNote.save:
      - base_unit = sp - discount_amount
      - base_total = sum(base_line)
      - paid_total = sum(payments.amount)
      - bill_disc_total = base_total - paid_total (>=0)
      - allocate bill_disc_total proportionally by base_line share
      - net_unit_paid = (base_line - alloc) / qty_sold
    Returns dict: { barcode: Decimal(net_unit_paid) }
    """
    if not sale:
        return {}

    try:
        from django.db.models import Sum
    except Exception:
        Sum = None

    def d(x):
        try:
            return Decimal(str(x or 0))
        except Exception:
            return Decimal("0")

    # sale lines
    try:
        lines = list(
            sale.lines.all().values("barcode", "qty", "sp", "discount_amount")
        )
    except Exception:
        return {}

    if not lines:
        return {}

    base_total = Decimal("0")
    rows = []
    for r in lines:
        bc = str(r.get("barcode") or "").strip()
        qty_sold = max(1, int(r.get("qty") or 1))
        sp = d(r.get("sp"))
        row_disc = d(r.get("discount_amount"))
        base_unit = sp - row_disc
        if base_unit < 0:
            base_unit = Decimal("0")
        base_line = base_unit * Decimal(qty_sold)
        base_total += base_line
        rows.append((bc, qty_sold, base_unit, base_line))

    paid_total = Decimal("0")
    try:
        if Sum is not None:
            paid_total = d(sale.payments.aggregate(s=Sum("amount")).get("s") or 0)
        else:
            paid_total = d(sum([getattr(p, "amount", 0) or 0 for p in sale.payments.all()]))
    except Exception:
        paid_total = Decimal("0")

    bill_disc_total = base_total - paid_total
    if bill_disc_total < 0:
        bill_disc_total = Decimal("0")

    out = {}
    for (bc, qty_sold, base_unit, base_line) in rows:
        share = (base_line / base_total) if base_total > 0 else Decimal("0")
        alloc_bill_disc_line = (bill_disc_total * share)

        net_line_total = base_line - alloc_bill_disc_line
        if net_line_total < 0:
            net_line_total = Decimal("0")

        net_unit_paid = (net_line_total / Decimal(qty_sold)) if qty_sold > 0 else Decimal("0")
        out[bc] = q2(net_unit_paid)

    return out


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

    # 2) fallback: YOUR CURRENT MODEL (barcode+qty+amount on CreditNote)
    barcode = (getattr(note, "barcode", None) or "").strip()
    qty_raw = getattr(note, "qty", None)

    try:
        qty_total = Decimal(str(qty_raw if qty_raw is not None else 1))
    except Exception:
        qty_total = Decimal("1")

    if qty_total <= 0:
        qty_total = Decimal("1")

    total_amt = getattr(note, "amount", None) or getattr(note, "total_amount", None) or getattr(note, "total", None) or 0
    try:
        total_amt = Decimal(str(total_amt))
    except Exception:
        total_amt = Decimal("0.00")

    if not barcode:
        return []

    # Parse barcode string into per-barcode quantities
    bc_qty = _parse_multi_barcode_string(barcode)

    # Single barcode behavior (old)
    if len(bc_qty) <= 1:
        only_bc = barcode if len(bc_qty) == 0 else list(bc_qty.keys())[0]
        name = _resolve_item_name_from_barcode(only_bc)
        rate = (total_amt / qty_total) if qty_total else Decimal("0.00")
        return [{"name": name, "qty": qty_total, "rate": rate, "amount": total_amt}]

    # Multi-barcode: compute correct per-item amount using sale net-paid map (best-effort)
    sale = getattr(note, "sale", None)
    net_map = _net_unit_paid_map_from_sale(sale) if sale else {}

    # build items with computed totals
    items = []
    running = Decimal("0.00")

    # stable order based on barcode string order (keeps receipt predictable)
    ordered_barcodes = []
    for part in [p.strip() for p in barcode.split(",") if p.strip()]:
        # keep the "base" barcode part (strip qty markers)
        base = part.strip()
        base_norm = base.replace("×", "x").replace("X", "x")
        # split patterns
        for sep in ("*", ":", " x", "x"):
            if sep in base_norm:
                base_norm = (base_norm.split(sep, 1)[0] or "").strip()
                break
        if base_norm and base_norm not in ordered_barcodes:
            ordered_barcodes.append(base_norm)

    # add any missing keys (just in case)
    for k in bc_qty.keys():
        if k not in ordered_barcodes:
            ordered_barcodes.append(k)

    # compute per-barcode lines
    for i, bc in enumerate(ordered_barcodes):
        q = int(bc_qty.get(bc, 0) or 0)
        if q <= 0:
            continue

        qty_d = Decimal(str(q))
        name = _resolve_item_name_from_barcode(bc)

        # best-effort net unit from sale; fallback to equal split if missing
        net_unit = net_map.get(bc, None)

        if net_unit is None:
            # fallback equal split across distinct barcodes (keeps layout readable)
            # distribute total_amt proportionally by qty counts if possible
            total_units = sum(int(v or 0) for v in bc_qty.values()) or len(bc_qty)
            per_unit = (total_amt / Decimal(str(total_units))) if total_units else Decimal("0.00")
            amt = q2(per_unit * qty_d)
            rate = q2(per_unit)
        else:
            rate = q2(net_unit)
            amt = q2(rate * qty_d)

        items.append({"name": name, "qty": qty_d, "rate": rate, "amount": amt})
        running = q2(running + amt)

    # rounding fix: adjust last item so totals match stored note.amount
    if items:
        diff = q2(total_amt - running)
        if diff != Decimal("0.00"):
            items[-1]["amount"] = q2(Decimal(str(items[-1]["amount"])) + diff)
            q = Decimal(str(items[-1]["qty"] or 1))
            if q > 0:
                items[-1]["rate"] = q2(Decimal(str(items[-1]["amount"])) / q)

    return items


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