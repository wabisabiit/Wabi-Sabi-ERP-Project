# products/views_receipt.py
from io import BytesIO
from decimal import Decimal, ROUND_HALF_UP

from django.http import FileResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views import View
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator

from reportlab.pdfgen import canvas
from reportlab.graphics.barcode import code128

from .models import Sale, SaleLine


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
    name = (getattr(loc, "name", "") or "").strip()
    code = (getattr(loc, "code", "") or "").strip()
    return name or code or ""


def _can_view_sale(user, sale: Sale) -> bool:
    # Admin/superuser can view everything
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True

    # Manager/staff should only see their location (best-effort)
    user_loc = _user_location_code(user)
    if not user_loc:
        return True  # if user has no outlet mapping, don't block

    created_by = getattr(sale, "created_by", None)
    emp = getattr(created_by, "employee", None) if created_by else None
    outlet = getattr(emp, "outlet", None) if emp else None
    loc = getattr(outlet, "location", None) if outlet else None
    sale_loc = (getattr(loc, "code", "") or "").strip().upper()

    # if sale has no created_by/location info, allow
    if not sale_loc:
        return True

    return sale_loc == user_loc


def _inr_words(amount: Decimal) -> str:
    n = int(q2(amount))
    if n == 0:
        return "Rupees Zero Only"

    ones = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
        "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def two(num):
        if num < 20:
            return ones[num]
        return (tens[num // 10] + (" " + ones[num % 10] if num % 10 else "")).strip()

    def three(num):
        h = num // 100
        r = num % 100
        if h and r:
            return f"{ones[h]} Hundred {two(r)}".strip()
        if h:
            return f"{ones[h]} Hundred".strip()
        return two(r).strip()

    parts = []
    crore = n // 10000000
    n %= 10000000
    lakh = n // 100000
    n %= 100000
    thousand = n // 1000
    n %= 1000
    hundred = n

    if crore:
        parts.append(f"{three(crore)} Crore")
    if lakh:
        parts.append(f"{three(lakh)} Lakh")
    if thousand:
        parts.append(f"{three(thousand)} Thousand")
    if hundred:
        parts.append(three(hundred))

    return "Rupees " + " ".join([p for p in parts if p]).strip() + " Only"


@method_decorator(login_required, name="dispatch")
class SaleReceiptPdfView(View):
    def get(self, request, invoice_no: str):
        sale = get_object_or_404(Sale, invoice_no=invoice_no)

        if not _can_view_sale(request.user, sale):
            return JsonResponse({"detail": "Not allowed."}, status=403)

        loc_code = _user_location_code(request.user)
        loc_name = _user_location_name(request.user)

        if loc_code == "UV":
            shop_at = "SHOP AT"
            shop_domain = "Brands4Less"
            gstin = "06AADFW9945P1ZB"
            address_line = "268, Rao Gajraj Road, Phase IV, Gurugram 122015"
            place_supply = "Haryana"
            customer_address = "Gurugram"
        else:
            shop_at = "SHOP AT"
            shop_domain = ""
            gstin = ""
            address_line = ""
            place_supply = ""
            customer_address = ""

        now = timezone.localtime(timezone.now())
        date_str = now.strftime("%d/%m/%Y")
        time_str = now.strftime("%I:%M:%S %p")

        cust = getattr(sale, "customer", None)
        cust_name = (getattr(cust, "name", "") or "").strip()
        cust_phone = (getattr(cust, "phone", "") or "").strip()

        salesman = getattr(sale, "salesman", None)
        salesman_name = ""
        if salesman:
            u = getattr(salesman, "user", None)
            if u:
                salesman_name = (u.get_full_name() or "").strip() or (u.username or "")
            else:
                salesman_name = (getattr(salesman, "name", "") or "").strip()

        lines = list(SaleLine.objects.filter(sale=sale).order_by("id"))

        total_qty = Decimal("0.00")
        total_disc = Decimal("0.00")
        total_net = Decimal("0.00")

        def per_unit_disc(ln: SaleLine) -> Decimal:
            # ✅ Discount is calculated on SP (selling price) now
            sp = q2(getattr(ln, "sp", 0) or 0)
            dp = q2(getattr(ln, "discount_percent", 0) or 0)
            da = q2(getattr(ln, "discount_amount", 0) or 0)  # per-unit stored
            if dp > 0:
                d = (sp * dp / Decimal("100")).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            else:
                d = da
            if d < 0:
                d = Decimal("0.00")
            if d > sp:
                d = sp
            return d

        # ---------------- THERMAL RECEIPT PAGE (prints like machine) ----------------
        # 80mm roll width -> ~226.77 points (72pt/in). Keep small margins.
        PAGE_W = 226.8
        M = 8.0

        # Dynamic height so printer doesn't scale to A4 (main reason your print was blank/huge).
        # Height estimate in points; we add enough space for lines + footer.
        est_h = 520 + (len(lines) * 14)
        PAGE_H = max(600, est_h)

        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H))

        y = PAGE_H - 18

        def txt(x, y, s, size=8, bold=False):
            c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            c.drawString(x, y, s or "")

        def rtxt(x, y, s, size=8, bold=False):
            c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            c.drawRightString(x, y, s or "")

        def center(y, s, size=9, bold=False):
            c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            c.drawCentredString(PAGE_W / 2, y, s or "")

        def dashline(y):
            c.saveState()
            c.setDash(2, 2)
            c.line(M, y, PAGE_W - M, y)
            c.restoreState()

        def _tax_rate_for_total(total: Decimal) -> Decimal:
            # <= 2500 => 15%, else 18%
            return Decimal("0.15") if q2(total) <= Decimal("2500.00") else Decimal("0.18")

        def _calc_tax_summary(total: Decimal):
            """
            Rules (as requested):
            - rate = 15% if total <= 2500 else 18%
            - taxable_value = total - (total * rate)
            - cgst = taxable_value - (taxable_value * rate)
            - sgst = taxable_value - (taxable_value * rate)
            - cess, igst = 0.00
            """
            rate = _tax_rate_for_total(total)
            taxable_value = q2(total - (total * rate))
            cgst = q2(taxable_value - (taxable_value * rate))
            sgst = q2(taxable_value - (taxable_value * rate))
            cess = Decimal("0.00")
            igst = Decimal("0.00")
            return taxable_value, cgst, sgst, cess, igst

        # Header (no "DUPLICATE")
        center(y, (loc_code or "OUTLET")[:12], 9, True)
        y -= 14
        center(y, "Receipt", 10, True)
        y -= 12

        if address_line:
            center(y, address_line, 7, False)
            y -= 10

        if gstin:
            center(y, f"GSTIN NO : {gstin}", 7, False)
        else:
            center(y, "GSTIN NO : ", 7, False)
        y -= 10

        # Shop at (keep same placement style, just fit roll width)
        if shop_domain:
            center(y, f"{shop_at}", 7, True)
            y -= 10
            center(y, f"{shop_domain}", 8, True)
            y -= 9
            center(y, "A unit of Wabi-Sabi", 7, False)
            y -= 10

        # Customer + meta
        txt(M, y, f"Name   : {cust_name}", 8, False)
        y -= 11
        txt(M, y, f"Mobile : {cust_phone}", 8, False)
        y -= 11

        # Receipt No (not Credit Note)
        txt(M, y, f"Receipt No : {sale.invoice_no}", 8, False)
        y -= 11

        txt(M, y, f"Date : {date_str}", 7, False)
        y -= 10
        txt(M, y, f"Time : {time_str}", 7, False)
        y -= 10
        txt(M, y, f"Salesman : {salesman_name}", 7, False)
        y -= 10

        dashline(y)
        y -= 12

        # Table header (reduced gap so right columns sit under the horizontal line)
        # Columns tuned for 80mm:
        # Item (left), Qty, SP, Disc, Net (right aligned)
        item_x = M
        qty_x = 118
        sp_x = 148
        disc_x = 178
        net_x = PAGE_W - M

        txt(item_x, y, "Item", 8, True)
        rtxt(qty_x, y, "Qty", 8, True)
        rtxt(sp_x, y, "SP", 8, True)      # MRP -> SP
        rtxt(disc_x, y, "Disc", 8, True)
        rtxt(net_x, y, "Net", 8, True)
        y -= 9

        dashline(y)
        y -= 12

        # Lines
        for ln in lines:
            qty = Decimal(int(getattr(ln, "qty", 0) or 0))
            sp = q2(getattr(ln, "sp", 0) or 0)

            dpu = per_unit_disc(ln)
            disc_line = q2(dpu * qty)

            net_unit = q2(sp - dpu)
            net_line = q2(net_unit * qty)

            total_qty += qty
            total_disc += disc_line
            total_net += net_line

            pname = ""
            prod = getattr(ln, "product", None)
            ti = getattr(prod, "task_item", None) if prod else None
            if ti:
                pname = (
                    getattr(ti, "item_print_friendly_name", None)
                    or getattr(ti, "item_vasy_name", None)
                    or getattr(ti, "item_full_name", None)
                    or ""
                )
            if not pname:
                pname = (getattr(ln, "barcode", "") or "")

            # 2-line item name if long (thermal friendly)
            name = (pname or "").strip()
            if len(name) > 22:
                txt(item_x, y, name[:22], 7, False)
                y -= 10
                txt(item_x, y, name[22:44], 7, False)
            else:
                txt(item_x, y, name, 7, False)

            rtxt(qty_x, y, f"{qty:.1f}", 7, False)
            rtxt(sp_x, y, f"{sp:.2f}", 7, False)
            rtxt(disc_x, y, f"{disc_line:.2f}", 7, False)
            rtxt(net_x, y, f"{net_line:.2f}", 7, False)

            y -= 14

            # If height ever goes too low, extend page (avoid cutting on roll)
            if y < 140:
                c.showPage()
                c.setPageSize((PAGE_W, PAGE_H))
                y = PAGE_H - 18

        dashline(y)
        y -= 14

        txt(M, y, "TOTAL", 9, True)
        rtxt(net_x, y, f"{total_net:.2f}", 9, True)
        y -= 12

        txt(M, y, "ROUND OFF", 8, False)
        rtxt(net_x, y, "0.00", 8, False)
        y -= 12

        dashline(y)
        y -= 14

        txt(M, y, f"NO OF QTY : {total_qty:.2f}", 8, False)
        y -= 16

        txt(M, y, f"You Saved Rs. : {total_disc:.2f}", 9, True)
        y -= 14

        txt(M, y, _inr_words(total_net), 7, False)
        y -= 14

        txt(M, y, "Prices are inclusive of all taxes - Place of Supply :", 6, False)
        y -= 9
        txt(M, y, place_supply, 6, False)
        y -= 14

        # TAX SUMMARY (table like your image)
        center(y, "TAX SUMMARY", 8, True)
        y -= 10

        taxable_value, cgst, sgst, cess, igst = _calc_tax_summary(total_net)

        # Table geometry (fit roll width)
        table_left = M
        table_right = PAGE_W - M
        table_w = table_right - table_left

        cols = 5
        col_w = table_w / cols
        table_top = y
        row_h1 = 18
        row_h2 = 16

        # Draw outer box
        c.rect(table_left, table_top - (row_h1 + row_h2), table_w, (row_h1 + row_h2), stroke=1, fill=0)

        # Vertical lines
        for i in range(1, cols):
            x = table_left + (col_w * i)
            c.line(x, table_top, x, table_top - (row_h1 + row_h2))

        # Horizontal split between header and values
        c.line(table_left, table_top - row_h1, table_right, table_top - row_h1)

        # Header labels
        headers = ["TAXABLE\nVALUE", "CGST", "SGST", "Cess", "IGST"]
        for i, htxt in enumerate(headers):
            cx = table_left + col_w * i + col_w / 2
            # multi-line only for TAXABLE VALUE
            c.setFont("Helvetica-Bold", 7)
            if "\n" in htxt:
                a, b = htxt.split("\n", 1)
                c.drawCentredString(cx, table_top - 10, a)
                c.drawCentredString(cx, table_top - 18, b)
            else:
                c.drawCentredString(cx, table_top - 14, htxt)

        # Values
        vals = [
            f"{taxable_value:.2f}",
            f"{cgst:.2f}",
            f"{sgst:.2f}",
            f"{cess:.2f}",
            f"{igst:.2f}",
        ]
        c.setFont("Helvetica", 7)
        for i, v in enumerate(vals):
            cx = table_left + col_w * i + col_w / 2
            c.drawCentredString(cx, table_top - row_h1 - 12, v)

        y = table_top - (row_h1 + row_h2) - 12

        txt(M, y, "Customer Details :", 8, False)
        y -= 10

        if customer_address:
            txt(M, y, f"Address : {customer_address}", 8, False)
        else:
            txt(M, y, "Address : ", 8, False)

        # ✅ extra space between Gurugram and barcode
        y -= 40

        # Barcode (centered on roll)
        bc_val = sale.invoice_no
        barcode_obj = code128.Code128(bc_val, barHeight=34, barWidth=0.8)
        bw = barcode_obj.width
        barcode_obj.drawOn(c, (PAGE_W - bw) / 2, y)

        y -= 48
        center(y, "Thank you for shopping with us", 8, True)
        y -= 12
        center(y, "For Home Delivery", 8, False)
        y -= 12
        center(y, "7303467070", 10, True)
        y -= 16

        printed = timezone.localtime(timezone.now()).strftime("%d/%m/%Y %I:%M:%S %p")
        txt(M, y, f"Printed On : {printed}", 7, False)
        y -= 10
        txt(M, y, "Printed By : ", 7, False)

        c.showPage()
        c.save()

        buf.seek(0)
        return FileResponse(
            buf,
            as_attachment=False,
            filename=f"{sale.invoice_no}.pdf",
            content_type="application/pdf",
        )
