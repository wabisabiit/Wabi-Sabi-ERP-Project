# products/views_csv_import.py
from decimal import Decimal, InvalidOperation
from collections import defaultdict

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from .models import Product
from taskmaster.models import TaskItem, Location


def _norm_barcode(v: str) -> str:
    return (v or "").replace("–", "-").replace("—", "-").strip().upper()


def _to_decimal(v, default="0"):
    try:
        s = str(v if v is not None else "").strip()
        if s == "":
            s = default
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _chunked(seq, n=800):
    seq = list(seq)
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def _build_locations_index():
    """
    Build a lookup index for locations by both code and name (case-insensitive).
    """
    by_key = {}
    for loc in Location.objects.all():
        if loc.code:
            by_key[str(loc.code).strip().lower()] = loc
        if loc.name:
            by_key[str(loc.name).strip().lower()] = loc
    return by_key


class ProductCsvPreflight(APIView):
    """
    POST: { rows: [ {barcode, item_code, mrp, selling_price, hsn, location, size, ...}, ... ] }
    """

    def post(self, request):
        rows = request.data.get("rows") or []
        if not isinstance(rows, list) or not rows:
            return Response({"detail": "rows is required"}, status=status.HTTP_400_BAD_REQUEST)

        errors = []
        to_create = []
        conflicts = []

        # ✅ normalize incoming rows once
        normalized_rows = []
        barcodes = set()
        item_codes = set()
        location_values = set()

        for idx, r in enumerate(rows):
            incoming = {
                "name": (r.get("name") or r.get("Name") or "").strip(),
                "barcode": _norm_barcode(
                    r.get("barcode")
                    or r.get("Barcode")
                    or r.get("Barcode number")
                    or r.get("barcodeNumber")
                    or ""
                ),
                "item_code": (r.get("item_code") or r.get("Item code") or r.get("itemCode") or "").strip(),
                "category": (r.get("category") or r.get("Category") or "").strip(),
                "hsn": (r.get("hsn") or r.get("HSN") or r.get("HSN number") or "").strip(),
                "mrp": str(_to_decimal(r.get("mrp") or r.get("MRP") or "0")),
                "selling_price": str(_to_decimal(r.get("selling_price") or r.get("Selling price") or r.get("sp") or "0")),
                "location": (r.get("location") or r.get("Location") or "").strip(),
                "size": (r.get("size") or r.get("Size") or "").strip(),
                "_rowIndex": idx,
            }

            if not incoming["barcode"]:
                errors.append({"rowIndex": idx, "barcode": "", "error": "Barcode is required"})
                continue
            if not incoming["item_code"]:
                errors.append({"rowIndex": idx, "barcode": incoming["barcode"], "error": "Item code is required"})
                continue
            if not incoming["location"]:
                errors.append({"rowIndex": idx, "barcode": incoming["barcode"], "error": "Location is required"})
                continue

            normalized_rows.append(incoming)
            barcodes.add(incoming["barcode"])
            item_codes.add(incoming["item_code"])
            location_values.add(incoming["location"].strip().lower())

        # ✅ bulk load taskitems + locations + existing products
        task_map = {t.item_code: t for t in TaskItem.objects.filter(item_code__in=list(item_codes))}
        loc_index = _build_locations_index()

        existing_map = {}
        for chunk in _chunked(list(barcodes), 800):
            for p in Product.objects.select_related("task_item", "location").filter(barcode__in=chunk):
                existing_map[p.barcode.upper()] = p

        for inc in normalized_rows:
            idx = inc["_rowIndex"]

            loc = loc_index.get(inc["location"].strip().lower())
            if not loc:
                errors.append({
                    "rowIndex": idx,
                    "barcode": inc["barcode"],
                    "error": f"Unknown location: '{inc['location']}'"
                })
                continue

            ti = task_map.get(inc["item_code"])
            if not ti:
                errors.append({
                    "rowIndex": idx,
                    "barcode": inc["barcode"],
                    "error": f"TaskItem not found for item_code: {inc['item_code']}"
                })
                continue

            ex = existing_map.get(inc["barcode"].upper())
            if not ex:
                to_create.append(inc)
                continue

            existing_payload = {
                "barcode": ex.barcode,
                "task_item_code": getattr(ex.task_item, "item_code", ""),
                "name": getattr(ex.task_item, "item_vasy_name", "") or getattr(ex.task_item, "item_full_name", "") or "",
                "category": getattr(ex.task_item, "category", "") or "",
                "mrp": str(ex.mrp or 0),
                "selling_price": str(ex.selling_price or 0),
                "hsn": getattr(ex.task_item, "hsn_code", "") or "",
                "location": (ex.location.name or ex.location.code) if ex.location else "",
                "size": ex.size or "",
            }

            conflicts.append({
                "barcode": inc["barcode"],
                "existing": existing_payload,
                "incoming": inc,
            })

        return Response({
            "to_create": to_create,
            "conflicts": conflicts,
            "errors": errors,
            "summary": {
                "rows_received": len(rows),
                "usable_rows": len(normalized_rows),
                "to_create": len(to_create),
                "conflicts": len(conflicts),
                "errors": len(errors),
            }
        }, status=status.HTTP_200_OK)


class ProductCsvApply(APIView):
    """
    POST:
      {
        to_create: [...],
        decisions: [{ barcode, action: "update"|"skip" }],
        incomingByBarcode: { "BARCODE": {...incoming...}, ... }
      }
    """

    def post(self, request):
        to_create = request.data.get("to_create") or []
        decisions = request.data.get("decisions") or []
        incoming_by_barcode = request.data.get("incomingByBarcode") or {}

        if not isinstance(to_create, list):
            to_create = []
        if not isinstance(decisions, list):
            decisions = []
        if not isinstance(incoming_by_barcode, dict):
            incoming_by_barcode = {}

        update_barcodes = {
            _norm_barcode(d.get("barcode"))
            for d in decisions
            if (d.get("action") == "update") and d.get("barcode")
        }
        skip_barcodes = {
            _norm_barcode(d.get("barcode"))
            for d in decisions
            if (d.get("action") == "skip") and d.get("barcode")
        }

        created = 0
        updated = 0
        skipped = 0
        errors = []

        # ✅ pre-load everything needed for bulk operations
        loc_index = _build_locations_index()

        create_item_codes = {str(r.get("item_code") or "").strip() for r in to_create if str(r.get("item_code") or "").strip()}
        update_item_codes = set()
        for b in update_barcodes:
            inc = incoming_by_barcode.get(b) or incoming_by_barcode.get(b.upper()) or incoming_by_barcode.get(b.lower())
            if inc:
                update_item_codes.add(str(inc.get("item_code") or "").strip())

        task_map = {t.item_code: t for t in TaskItem.objects.filter(item_code__in=list(create_item_codes | update_item_codes))}

        with transaction.atomic():
            # ✅ CREATE in bulk
            to_insert = []
            for r in to_create:
                barcode = _norm_barcode(r.get("barcode"))
                if not barcode:
                    errors.append({"barcode": "", "error": "Missing barcode in to_create"})
                    continue

                if Product.objects.filter(barcode=barcode).exists():
                    skipped += 1
                    continue

                loc = loc_index.get(str(r.get("location") or "").strip().lower())
                if not loc:
                    errors.append({"barcode": barcode, "error": f"Unknown location: '{r.get('location')}'"})
                    continue

                item_code = str(r.get("item_code") or "").strip()
                ti = task_map.get(item_code)
                if not ti:
                    errors.append({"barcode": barcode, "error": f"TaskItem not found for item_code: {item_code}"})
                    continue

                to_insert.append(Product(
                    barcode=barcode,
                    task_item=ti,
                    mrp=_to_decimal(r.get("mrp"), "0"),
                    selling_price=_to_decimal(r.get("selling_price"), "0"),
                    location=loc,
                    size=str(r.get("size") or "").strip(),
                ))

            if to_insert:
                Product.objects.bulk_create(to_insert, batch_size=800)
                created += len(to_insert)

            # ✅ UPDATE in bulk
            if update_barcodes:
                existing = {}
                for chunk in _chunked(list(update_barcodes), 800):
                    for p in Product.objects.select_related("task_item", "location").filter(barcode__in=chunk):
                        existing[p.barcode.upper()] = p

                to_update = []
                for b in update_barcodes:
                    inc = (
                        incoming_by_barcode.get(b)
                        or incoming_by_barcode.get(b.upper())
                        or incoming_by_barcode.get(b.lower())
                    )
                    if not inc:
                        errors.append({"barcode": b, "error": "Missing incoming row for update"})
                        continue

                    p = existing.get(b.upper())
                    if not p:
                        errors.append({"barcode": b, "error": "Product not found for update"})
                        continue

                    loc = loc_index.get(str(inc.get("location") or "").strip().lower())
                    if not loc:
                        errors.append({"barcode": b, "error": f"Unknown location: '{inc.get('location')}'"})
                        continue

                    item_code = str(inc.get("item_code") or "").strip()
                    ti = task_map.get(item_code)
                    if not ti:
                        errors.append({"barcode": b, "error": f"TaskItem not found for item_code: {item_code}"})
                        continue

                    p.task_item = ti
                    p.mrp = _to_decimal(inc.get("mrp"), "0")
                    p.selling_price = _to_decimal(inc.get("selling_price"), "0")
                    p.location = loc
                    p.size = str(inc.get("size") or "").strip()

                    to_update.append(p)

                if to_update:
                    Product.objects.bulk_update(
                        to_update,
                        fields=["task_item", "mrp", "selling_price", "location", "size", "updated_at"],
                        batch_size=800
                    )
                    updated += len(to_update)

            skipped = skipped + len(skip_barcodes)

        return Response({
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "errors": errors,
        }, status=status.HTTP_200_OK)
