# products/views.py
from rest_framework import permissions
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q

from .models import Product
from .serializers import ProductSerializer, ProductGridSerializer
from taskmaster.models import TaskItem


# ------------------ BARCODE GENERATOR HELPERS (local) ------------------
import re

_BAR_RE = re.compile(r'^[A-Z]-\d{3}$')  # e.g., A-001


def _fmt(letter: str, num: int) -> str:
    return f"{letter}-{num:03d}"


def _bump(letter: str, num: int):
    """A-001..A-999, then B-001..Z-999, wrap to A-001."""
    letter = (letter or "A").upper()
    if not ("A" <= letter <= "Z"):
        letter = "A"
    num = int(num or 0) + 1
    if num <= 999:
        return letter, num
    # carry to next letter
    num = 1
    idx = (ord(letter) - ord('A') + 1) % 26
    return chr(ord('A') + idx), num


def _parse(code: str):
    if not code or not _BAR_RE.match(code):
        return None
    try:
        return code[0], int(code[2:])
    except Exception:
        return None


def _last_seen_letter_num():
    """
    Get the last LETTER-NNN based on creation order.
    If none found, return ('A', 0) so next is A-001.
    """
    last = (
        Product.objects
        .filter(barcode__regex=r'^[A-Z]-\d{3}$')
        .order_by('-created_at', '-id')
        .values_list('barcode', flat=True)
        .first()
    )
    parsed = _parse(last) if last else None
    return parsed if parsed else ("A", 0)


def _next_available(letter: str, num: int):
    """
    From the given (letter,num) cursor, find the next free code.
    Returns (new_letter, new_num, code).
    """
    for _ in range(26 * 999 + 5):
        letter, num = _bump(letter, num)
        candidate = _fmt(letter, num)
        if not Product.objects.filter(barcode=candidate).exists():
            return letter, num, candidate
    raise RuntimeError("Exhausted barcode space unexpectedly")


# ---- helper: current user's outlet location (for MANAGER) --------
def _get_user_location(request):
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated or user.is_superuser:
        return None
    emp = getattr(user, "employee", None)
    outlet = getattr(emp, "outlet", None) if emp else None
    loc = getattr(outlet, "location", None) if outlet else None
    return loc
# ------------------------------------------------------------------


class ProductViewSet(viewsets.ModelViewSet):
    """
    Endpoints
    ---------
    /api/products/               GET  -> grid rows (joined)
                                 POST -> create one product
    /api/products/{id}/          GET/PATCH/DELETE -> single product
    /api/products/bulk-upsert/   POST -> create/update many (from Print step payload)
    /api/products/by-barcode/<barcode>/   GET -> fetch minimal product info by barcode
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = Product.objects.select_related("task_item")

    # ✅ Manager scoping uses Product.location ONLY (NO StockTransferLine)
    
    def get_queryset(self):
        qs = super().get_queryset().select_related("task_item", "location")

        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return qs.none()

        # ✅ ONLY superuser sees all
        if user.is_superuser:
            return qs

        # Manager: restrict to their outlet.location
        loc = _get_user_location(self.request)
        if not loc:
            return qs.none()

        return qs.filter(location=loc)



    def get_serializer_class(self):
        return ProductGridSerializer if self.action in ["list"] else ProductSerializer

    # ---------- LIST (with optional q filter) ----------
    def list(self, request, *args, **kwargs):
        """
        Optional filters: ?q=86000
        Matches on Product.barcode or TaskItem.item_vasy_name
        """
        q = request.query_params.get("q", "").strip()
        qs = self.get_queryset()
        if q:
            qs = qs.filter(
                Q(barcode__icontains=q) |
                Q(task_item__item_vasy_name__icontains=q)
            )

        page = self.paginate_queryset(qs)
        ser = self.get_serializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(ser.data)
        return Response(ser.data)

    # ---------- BULK UPSERT ----------
    @action(detail=False, methods=["post"], url_path="bulk-upsert")
    def bulk_upsert(self, request):
        items = request.data if isinstance(request.data, list) else request.data.get("rows", [])
        if not isinstance(items, list):
            return Response({"detail": "Expected a list or {rows: [...]}."},
                            status=status.HTTP_400_BAD_REQUEST)

        created, updated, errors = 0, 0, []
        results = []

        # Initialize a cursor once per request (fewer DB scans)
        cur_letter, cur_num = _last_seen_letter_num()

        with transaction.atomic():
            for i, row in enumerate(items, start=1):
                try:
                    item_code = str(row.get("itemCode", "")).strip()
                    raw_barcode = (row.get("barcodeNumber") or "").strip().upper()

                    if not item_code:
                        errors.append(f"row {i}: itemCode missing")
                        continue

                    ti = TaskItem.objects.get(item_code=item_code)

                    barcode = None
                    if _BAR_RE.match(raw_barcode):
                        if not Product.objects.filter(barcode=raw_barcode).exists():
                            barcode = raw_barcode

                    if not barcode:
                        cur_letter, cur_num, barcode = _next_available(cur_letter, cur_num)

                    discount_val = row.get("discountPercent", row.get("discount", 0)) or 0
                    qty_val = row.get("qty", 1) or 1

                    obj, is_created = Product.objects.update_or_create(
                        barcode=barcode,
                        defaults={
                            "task_item": ti,
                            "size": (row.get("size") or "")[:32],
                            "image_url": row.get("imageUrl") or "",
                            "selling_price": row.get("salesPrice") or 0,
                            "mrp": row.get("mrp") or 0,
                            "qty": int(qty_val),
                            "discount_percent": discount_val,
                        },
                    )
                    if is_created:
                        created += 1
                    else:
                        updated += 1

                    results.append({
                        "row": i,
                        "id": obj.id,
                        "itemCode": item_code,
                        "barcode": obj.barcode,
                    })

                except TaskItem.DoesNotExist:
                    errors.append(f"row {i}: TaskItem {item_code!r} not found")
                except Exception as e:
                    errors.append(f"row {i}: {e}")

        return Response({"created": created, "updated": updated, "errors": errors, "results": results})

    # ---------- BY BARCODE LOOKUP ----------
    @action(
        detail=False,
        methods=["get"],
        url_path=r"by-barcode/(?P<barcode>[^/]+)"
    )
    def by_barcode(self, request, barcode=None):
        def clean_barcode(v: str) -> str:
            if not v:
                return ""
            v = v.replace("–", "-").replace("—", "-").replace("−", "-").replace("‐", "-")
            return v.strip().upper()

        clean = clean_barcode(barcode)

        p = Product.objects.select_related("task_item", "location").filter(barcode__iexact=clean).first()
        if not p:
            return Response({"detail": f"Product {clean} not found."},
                            status=status.HTTP_404_NOT_FOUND)

        # ✅ Manager restriction uses Product.location only
        loc = _get_user_location(request)
        if loc:
            if not p.location_id or p.location_id != loc.id:
                return Response(
                    {"detail": "This barcode is not for this branch."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        data = {
            "id": p.id,
            "barcode": p.barcode,
            "mrp": str(p.mrp) if p.mrp is not None else "0",
            "selling_price": str(p.selling_price) if p.selling_price is not None else "0",
            "size": getattr(p, "size", "") or "",
            "image_url": getattr(p, "image_url", "") or "",
            "qty": getattr(p, "qty", 0) or 0,
            "available": (getattr(p, "qty", 0) or 0) > 0,
            "discount_percent": getattr(p, "discount_percent", 0) or 0,
            "task_item": {
                "item_vasy_name": getattr(p.task_item, "item_vasy_name", "") or "",
                "item_print_friendly_name": getattr(p.task_item, "item_print_friendly_name", "") or "",
                "item_full_name": getattr(p.task_item, "item_full_name", "") or "",
                "item_code": getattr(p.task_item, "item_code", "") or "",
            },
        }
        return Response(data, status=status.HTTP_200_OK)
