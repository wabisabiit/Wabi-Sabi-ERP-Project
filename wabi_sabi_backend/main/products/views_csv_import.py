# products/views_csv_import.py
from decimal import Decimal, InvalidOperation

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


def _find_location(loc_value: str):
    val = (loc_value or "").strip()
    if not val:
        return None

    loc = Location.objects.filter(code__iexact=val).first()
    if loc:
        return loc

    loc = Location.objects.filter(name__iexact=val).first()
    return loc


class ProductCsvPreflight(APIView):
    def post(self, request):
        rows = request.data.get("rows") or []
        if not isinstance(rows, list) or not rows:
            return Response({"detail": "rows is required"}, status=status.HTTP_400_BAD_REQUEST)

        errors = []
        to_create = []
        conflicts = []

        barcodes = [
            _norm_barcode(
                r.get("barcode")
                or r.get("Barcode")
                or r.get("Barcode number")
                or r.get("barcodeNumber")
                or ""
            )
            for r in rows
        ]
        existing_map = {
            p.barcode.upper(): p
            for p in Product.objects.select_related("task_item", "location").filter(barcode__in=barcodes)
        }

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
            }

            if not incoming["barcode"]:
                errors.append({"rowIndex": idx, "barcode": "", "error": "Barcode is required"})
                continue
            if not incoming["item_code"]:
                errors.append({"rowIndex": idx, "barcode": incoming["barcode"], "error": "Item code is required"})
                continue

            loc = _find_location(incoming["location"])
            if not loc:
                errors.append({
                    "rowIndex": idx,
                    "barcode": incoming["barcode"],
                    "error": f"Unknown / empty location: '{incoming['location']}'"
                })
                continue

            ti = TaskItem.objects.filter(item_code=incoming["item_code"]).first()
            if not ti:
                errors.append({
                    "rowIndex": idx,
                    "barcode": incoming["barcode"],
                    "error": f"TaskItem not found for item_code: {incoming['item_code']}"
                })
                continue

            # ✅ NEW: Always prefer TaskMaster category/hsn for UI
            incoming["category"] = (ti.category or incoming["category"] or "").strip()
            incoming["hsn"] = (ti.hsn_code or incoming["hsn"] or "").strip()

            incoming["_location_id"] = loc.id
            incoming["_task_item_code"] = ti.item_code

            ex = existing_map.get(incoming["barcode"].upper())
            if not ex:
                to_create.append(incoming)
                continue

            loc_name = ""
            if ex.location:
                loc_name = (ex.location.name or ex.location.code or "")

            existing_payload = {
                "barcode": ex.barcode,
                "task_item_code": getattr(ex.task_item, "item_code", ""),
                "name": getattr(ex.task_item, "item_vasy_name", "") or getattr(ex.task_item, "item_full_name", "") or "",
                "category": getattr(ex.task_item, "category", "") or "",
                "mrp": str(ex.mrp or 0),
                "selling_price": str(ex.selling_price or 0),
                "hsn": getattr(ex.task_item, "hsn_code", "") or "",
                "location": loc_name,
                "size": ex.size or "",
            }

            conflicts.append({
                "barcode": incoming["barcode"],
                "existing": existing_payload,
                "incoming": incoming,
            })

        return Response({
            "to_create": to_create,
            "conflicts": conflicts,
            "errors": errors,
            "summary": {
                "rows_received": len(rows),
                "to_create": len(to_create),
                "conflicts": len(conflicts),
                "errors": len(errors),
            }
        }, status=status.HTTP_200_OK)


class ProductCsvApply(APIView):
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

        with transaction.atomic():
            for r in to_create:
                barcode = _norm_barcode(r.get("barcode"))
                if not barcode:
                    errors.append({"barcode": "", "error": "Missing barcode in to_create"})
                    continue

                if Product.objects.filter(barcode=barcode).exists():
                    skipped += 1
                    continue

                loc = _find_location(r.get("location"))
                if not loc:
                    errors.append({"barcode": barcode, "error": f"Unknown location: '{r.get('location')}'"})
                    continue

                item_code = (r.get("item_code") or "").strip()
                ti = TaskItem.objects.filter(item_code=item_code).first()
                if not ti:
                    errors.append({"barcode": barcode, "error": f"TaskItem not found for item_code: {item_code}"})
                    continue

                Product.objects.create(
                    barcode=barcode,
                    task_item=ti,
                    mrp=_to_decimal(r.get("mrp"), "0"),
                    selling_price=_to_decimal(r.get("selling_price"), "0"),
                    location=loc,
                    size=(r.get("size") or "").strip(),
                )
                created += 1

            if update_barcodes:
                existing = {
                    p.barcode.upper(): p
                    for p in Product.objects.select_related("task_item", "location").filter(barcode__in=list(update_barcodes))
                }

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

                    loc = _find_location(inc.get("location"))
                    if not loc:
                        errors.append({"barcode": b, "error": f"Unknown location: '{inc.get('location')}'"})
                        continue

                    item_code = (inc.get("item_code") or "").strip()
                    ti = TaskItem.objects.filter(item_code=item_code).first()
                    if not ti:
                        errors.append({"barcode": b, "error": f"TaskItem not found for item_code: {item_code}"})
                        continue

                    p.task_item = ti
                    p.mrp = _to_decimal(inc.get("mrp"), "0")
                    p.selling_price = _to_decimal(inc.get("selling_price"), "0")
                    p.location = loc
                    p.size = (inc.get("size") or "").strip()

                    p.save(update_fields=["task_item", "mrp", "selling_price", "location", "size", "updated_at"])
                    updated += 1

            skipped = skipped + len(skip_barcodes)

        return Response({
            "created": created,
            "updated": updated,
            "skipped": skipped,
            "errors": errors,
        }, status=status.HTTP_200_OK)
