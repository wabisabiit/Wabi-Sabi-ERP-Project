# products/views_receipt.py
from io import BytesIO
from decimal import Decimal, ROUND_HALF_UP

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework import status

from reportlab.lib.pagesizes import A4
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
      # if you want staff restricted too, remove is_staff
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
    # Simple INR words (enough for receipts)
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


class SaleReceiptPdfView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, invoice_no: str):
        sale = get_object_or_404(Sale, invoice_no=invoice_no)

        if not _can_view_sale(request.user, sale):
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        loc_code = _user_location_code(request.user)
        loc_name = _user_location_name(request.user)

        # Header rules
        # UV: Brands4Less + gstin from your image, address Gurugram
        # Others: keep blanks (with comments)
        if loc_code == "UV":
            brand_line = "Brands4Less"
            shop_at = "SHOP AT"
            shop_domain = "Brands4Less"  # you asked BrandsLoot.in -> Brands4Less
            gstin = "06AADFW9945P1ZB"
            address_line = "268, Rao Gajraj Road, Phase IV, Gurugram 122015"
            place_supply = "Haryana"
            customer_address = "Gurugram"
        else:
            brand_line = "Brands4Less"  # keep same brand label
            shop_at = "SHOP AT"
            shop_domain = ""  # TODO: other outlets domain empty for now
            gstin = ""        # TODO: other outlets gstin empty for now
            address_line = "" # TODO: other outlets address empty for now
            place_supply = "" # TODO: other outlets place of supply empty for now
            customer_address = ""  # TODO: other outlets address empty for now

        now = timezone.localtime(timezone.now())
        date_str = now.strftime("%d/%m/%Y")
        time_str = now.strftime("%I:%M:%S %p")

        # Customer + salesman
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

        # Lines
        lines = list(SaleLine.objects.filter(sale=sale).order_by("id"))

        # compute totals
        total_qty = Decimal("0.00")
        total_disc = Decimal("0.00")
        total_net = Decimal("0.00")

        def per_unit_disc(ln: SaleLine) -> Decimal:
            mrp = q2(getattr(ln, "mrp", 0) or 0)
            dp = q2(getattr(ln, "discount_percent", 0) or 0)
            da = q2(getattr(ln, "discount_amount", 0) or 0)  # per-unit stored
            if dp > 0:
                d = (mrp * dp / Decimal("100")).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            else:
                d = da
            if d < 0:
                d = Decimal("0.00")
            if d > mrp:
                d = mrp
            return d

        # PDF build (receipt style)
        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        w, h = A4

        # narrow receipt column centered
        rx = 160
        rw = 275
        y = h - 60

        def txt(x, y, s, size=9, bold=False):
            c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            c.drawString(x, y, s or "")

        # Top header
        txt(rx + 90, y, (loc_code or "OUTLET")[:12], 10, True)
        txt(rx + 210, y, "DUPLICATE", 9, True)
        y -= 18

        txt(rx + 105, y, "Credit Note", 10, True)  # you want receipt style like image
        y -= 14

        txt(rx + 10, y, address_line, 8, False)
        y -= 12

        if gstin:
            txt(rx + 50, y, f"GSTIN NO : {gstin}", 8, False)
        else:
            txt(rx + 50, y, "GSTIN NO : ", 8, False)  # TODO: other outlets empty
        y -= 12

        txt(rx + 95, y, "Email :", 8, False)
        y -= 12

        # phone line: keep empty for now (image shows phone)
        txt(rx + 20, y, "Phone No : ", 8, False)
        y -= 14

        # shop at
        txt(rx + 180, y + 40, shop_at, 8, True)
        txt(rx + 155, y + 28, shop_domain, 9, True)

        # customer block
        txt(rx + 10, y, f"Name    : {cust_name}", 9, False)
        y -= 12
        txt(rx + 10, y, f"Mobile  : {cust_phone}", 9, False)
        y -= 12

        # Using invoice as "Credit Note No" placeholder (POS receipt style)
        txt(rx + 10, y, f"Credit Note No : {sale.invoice_no}", 8, False)
        y -= 12

        txt(rx + 170, y + 24, f"Date   : {date_str}", 8, False)
        txt(rx + 170, y + 12, f"Time   : {time_str}", 8, False)
        txt(rx + 170, y,      f"Salesman : {salesman_name}", 8, False)
        y -= 16

        # table header
        txt(rx + 10, y, "#", 8, True)
        txt(rx + 30, y, "Item", 8, True)
        txt(rx + 165, y, "Qty", 8, True)
        txt(rx + 195, y, "MRP", 8, True)
        txt(rx + 240, y, "Disc", 8, True)
        txt(rx + 270, y, "Net", 8, True)
        y -= 10
        c.line(rx + 10, y, rx + rw - 10, y)
        y -= 12

        for idx, ln in enumerate(lines, start=1):
            qty = Decimal(int(getattr(ln, "qty", 0) or 0))
            mrp = q2(getattr(ln, "mrp", 0) or 0)

            dpu = per_unit_disc(ln)
            disc_line = q2(dpu * qty)

            net_unit = q2(mrp - dpu)
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
                pname = (getattr(ln, "barcode", "") or "")[:20]

            txt(rx + 10, y, f"{idx}", 8, False)
            txt(rx + 30, y, pname[:18], 8, False)

            # Qty must show 1.0 style (per your request)
            txt(rx + 165, y, f"{qty:.1f}", 8, False)
            txt(rx + 195, y, f"{mrp:.2f}", 8, False)
            txt(rx + 240, y, f"{disc_line:.2f}", 8, False)
            txt(rx + 270, y, f"{net_line:.2f}", 8, False)

            y -= 14
            if y < 160:
                c.showPage()
                y = h - 60

        # totals
        y -= 6
        c.line(rx + 10, y, rx + rw - 10, y)
        y -= 14

        txt(rx + 10, y, "TOTAL", 9, True)
        txt(rx + 240, y, f"{total_net:.2f}", 9, True)
        y -= 12

        # leave round off as you said
        txt(rx + 10, y, "ROUND OFF", 8, False)
        txt(rx + 240, y, "0.00", 8, False)
        y -= 14

        c.line(rx + 10, y, rx + rw - 10, y)
        y -= 14

        txt(rx + 10, y, f"NO OF QTY : {total_qty:.2f}", 8, False)
        y -= 18

        txt(rx + 10, y, f"You Saved Rs. : {total_disc:.2f}", 10, True)
        y -= 16

        txt(rx + 10, y, _inr_words(total_net), 8, False)
        y -= 12

        txt(rx + 10, y, "Prices are inclusive of all taxes - Place of Supply :", 7, False)
        y -= 10
        txt(rx + 10, y, place_supply, 7, False)
        y -= 16

        # tax summary left empty (as you asked)
        txt(rx + 10, y, "TAX SUMMARY", 8, True)
        y -= 10
        txt(rx + 10, y, "(left empty for now)", 7, False)
        y -= 18

        txt(rx + 10, y, "Customer Details :", 8, False)
        y -= 12

        if customer_address:
            txt(rx + 10, y, f"Address : {customer_address}", 8, False)
        else:
            txt(rx + 10, y, "Address : ", 8, False)  # TODO: others empty
        y -= 28

        # barcode (keep)
        bc_val = sale.invoice_no
        barcode_obj = code128.Code128(bc_val, barHeight=30, barWidth=0.8)
        barcode_obj.drawOn(c, rx + 40, y)

        y -= 45
        txt(rx + 55, y, "Thank you for shopping with us", 8, True)
        y -= 12
        txt(rx + 70, y, "For Home Delivery", 8, False)
        y -= 12
        txt(rx + 85, y, "7303467070", 10, True)
        y -= 18

        printed = timezone.localtime(timezone.now()).strftime("%d/%m/%Y %I:%M:%S %p")
        txt(rx + 10, y, f"Printed On : {printed}", 7, False)
        y -= 10
        txt(rx + 10, y, "Printed By : ", 7, False)

        c.showPage()
        c.save()

        buf.seek(0)
        return FileResponse(buf, as_attachment=False, filename=f"{sale.invoice_no}.pdf", content_type="application/pdf")
