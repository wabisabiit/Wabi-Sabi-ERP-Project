from decimal import Decimal, InvalidOperation
import re
from collections import defaultdict

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from .models import Product
from taskmaster.models import TaskItem, Location


# -------------------- helpers --------------------

def _norm_barcode(v: str) -> str:
    return (v or "").replace("–", "-").replace("—", "-").strip().upper()


def _to_decimal(v, default="0"):
    try:
        s = "" if v is None else str(v).strip()
        if s == "":
            s = default
        s = s.replace(",", "")
        return Decimal(s)
    except (InvalidOperation, ValueError, TypeError):
        return Decimal(default)


def _chunked(seq, n=800):
    seq = list(seq)
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def _build_locations_index():
    idx = {}
    for loc in Location.objects.all():
        if loc.code:
            idx[str(loc.code).strip().lower()] = loc
        if loc.name:
            idx[str(loc.name).strip().lower()] = loc
    return idx


def _extract_item_code_from_name(name: str) -> str:
    """
    Extracts (100) or (100-W) from product name
    """
    if not name:
        return ""
    m = re.search(r"\(([^)]+)\)", name)
    if not m:
        return ""
    return m.group(1).strip().upper()


# -------------------- PREFLIGHT --------------------

class ProductCsvPreflight(APIView):
    """
    Frontend sends enriched rows.
    We validate + find conflicts.
    """

    def post(self, request):
        rows = request.data.get("rows") or []
        if not isinstance(rows, list) or not rows:
            return Response({"detail": "rows is required"}, status=400)

        errors = []
        to_create = []
        conflicts = []

        barcodes = set()
        item_codes = set()

        normalized = []

        for idx, r in enumerate(rows):
            name = str(r.get("name") or "").strip()

            barcode = _norm_barcode(r.get("barcode"))
            item_code = _extract_item_code_from_name(name)

            if not barcode:
                errors.append({"rowIndex": idx, "error": "Barcode missing"})
                continue

            if not item_code:
                errors.append({
                    "rowIndex": idx,
                    "barcode": barcode,
                    "error": "Item code not found in product name"
                })
                continue

            normalized.append({
                "barcode": barcode,
                "item_code": item_code,
                "name": name,
                "mrp": _to_decimal(r.get("mrp"), "0"),
                "selling_price": _to_decimal(r.get("selling_price"), "0"),
                "size": str(r.get("size") or "").strip(),
                "location": "UV",  # ✅ FORCE UV
            })

            barcodes.add(barcode)
            item_codes.add(item_code)

        task_map = {
            t.item_code: t
            for t in TaskItem.objects.filter(item_code__in=item_codes)
        }

        existing = {
            p.barcode.upper(): p
            for p in Product.objects.filter(barcode__in=barcodes)
            .select_related("task_item", "location")
        }

        for inc in normalized:
            barcode = inc["barcode"]

            if inc["item_code"] not in task_map:
                errors.append({
                    "barcode": barcode,
                    "error": f"TaskItem not found for item_code {inc['item_code']}"
                })
                continue

            ex = existing.get(barcode)
            if not ex:
                to_create.append(inc)
            else:
                conflicts.append({
                    "barcode": barcode,
                    "existing": {
                        "barcode": ex.barcode,
                        "item_code": ex.task_item.item_code,
                        "mrp": str(ex.mrp),
                        "selling_price": str(ex.selling_price),
                        "location": ex.location.code if ex.location else "",
                        "size": ex.size,
                    },
                    "incoming": inc,
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
        })


# -------------------- APPLY --------------------

class ProductCsvApply(APIView):
    """
    Saves data into Product table
    """

    def post(self, request):
        to_create = request.data.get("to_create") or []
        decisions = request.data.get("decisions") or []
        incoming_by_barcode = request.data.get("incomingByBarcode") or {}

        update_barcodes = {
            _norm_barcode(d["barcode"])
            for d in decisions
            if d.get("action") == "update"
        }

        loc_index = _build_locations_index()
        uv = loc_index.get("uv")

        if not uv:
            return Response(
                {"detail": "Location 'UV' not found in database"},
                status=400
            )

        created = 0
        updated = 0
        errors = []

        create_item_codes = {r["item_code"] for r in to_create}
        update_item_codes = {
            incoming_by_barcode[b]["item_code"]
            for b in update_barcodes
            if b in incoming_by_barcode
        }

        task_map = {
            t.item_code: t
            for t in TaskItem.objects.filter(
                item_code__in=(create_item_codes | update_item_codes)
            )
        }

        with transaction.atomic():

            # -------- CREATE --------
            inserts = []
            for r in to_create:
                barcode = r["barcode"]
                if Product.objects.filter(barcode=barcode).exists():
                    continue

                ti = task_map.get(r["item_code"])
                if not ti:
                    errors.append({
                        "barcode": barcode,
                        "error": "TaskItem missing"
                    })
                    continue

                inserts.append(Product(
                    barcode=barcode,
                    task_item=ti,
                    mrp=r["mrp"],
                    selling_price=r["mrp"],  # ✅ MRP = SP
                    qty=1,                    # ✅ ACTIVE
                    location=uv,
                    size=r.get("size", ""),
                ))

            if inserts:
                Product.objects.bulk_create(inserts, batch_size=800)
                created = len(inserts)

            # -------- UPDATE --------
            if update_barcodes:
                existing = {
                    p.barcode.upper(): p
                    for p in Product.objects.filter(barcode__in=update_barcodes)
                }

                updates = []
                for b in update_barcodes:
                    inc = incoming_by_barcode.get(b)
                    p = existing.get(b)
                    if not inc or not p:
                        continue

                    ti = task_map.get(inc["item_code"])
                    if not ti:
                        continue

                    p.task_item = ti
                    p.mrp = inc["mrp"]
                    p.selling_price = inc["mrp"]
                    p.qty = 1
                    p.location = uv
                    p.size = inc.get("size", "")
                    updates.append(p)

                if updates:
                    Product.objects.bulk_update(
                        updates,
                        fields=[
                            "task_item",
                            "mrp",
                            "selling_price",
                            "qty",
                            "location",
                            "size",
                            "updated_at",
                        ],
                        batch_size=800
                    )
                    updated = len(updates)

        return Response({
            "created": created,
            "updated": updated,
            "errors": errors,
        })
