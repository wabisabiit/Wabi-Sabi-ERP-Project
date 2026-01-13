# products/views_csv_import.py
from decimal import Decimal, InvalidOperation
import re

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction, IntegrityError

from .models import Product
from taskmaster.models import TaskItem, Location


# ---------------- helpers ----------------

def _norm_barcode(v: str) -> str:
    return (v or "").replace("–", "-").replace("—", "-").replace("−", "-").strip().upper()


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
    Lookup index for locations by BOTH code and name (case-insensitive).
    """
    by_key = {}
    for loc in Location.objects.all():
        if loc.code:
            by_key[str(loc.code).strip().lower()] = loc
        if loc.name:
            by_key[str(loc.name).strip().lower()] = loc
    return by_key


_CODE_RE = re.compile(r"\(([^)]+)\)")
def _extract_item_code_from_name(name: str) -> str:
    """
    From " (252) (L) Long Skirt " => "252"
    From "Something (100-W) ..."  => "100-W"
    """
    s = (name or "").strip()
    m = _CODE_RE.search(s)
    if not m:
        return ""
    raw = (m.group(1) or "").strip().upper()

    # allow: digits OR digits-W
    if re.fullmatch(r"\d+(-W)?", raw):
        return raw

    # try to pull digits(-W) from inside raw
    m2 = re.search(r"(\d+)(-W)?", raw)
    if not m2:
        return ""
    return f"{m2.group(1)}{m2.group(2) or ''}"


def _get_first(d: dict, keys, default=""):
    for k in keys:
        if k in d and d.get(k) not in (None, ""):
            return d.get(k)
    return default


# ---------------- views ----------------

class ProductCsvPreflight(APIView):
    """
    POST: { rows: [ {barcode, item_code, mrp, selling_price, location, size, name/product_name...}, ... ] }
    """

    def post(self, request):
        rows = request.data.get("rows") or []
        if not isinstance(rows, list) or not rows:
            return Response({"detail": "rows is required"}, status=status.HTTP_400_BAD_REQUEST)

        errors = []
        to_create = []
        conflicts = []

        loc_index = _build_locations_index()

        normalized_rows = []
        barcodes = []
        item_codes = []

        # ✅ de-dupe within upload (important to prevent 500 later)
        seen_barcodes_in_upload = set()

        for idx, r in enumerate(rows):
            if not isinstance(r, dict):
                errors.append({"rowIndex": idx, "barcode": "", "error": "Row must be an object/dict"})
                continue

            # Accept many possible CSV key names
            name = str(_get_first(r, ["name", "Name", "product_name", "Product Name", "productName"], "")).strip()

            barcode = _norm_barcode(_get_first(
                r,
                ["barcode", "Barcode", "Barcode number", "Barcode Number", "barcodeNumber"],
                ""
            ))

            item_code = str(_get_first(
                r,
                ["item_code", "Item code", "Item Code", "itemCode", "code", "sku", "SKU"],
                ""
            )).strip().upper()

            # ✅ if missing, derive from Product Name "(100)" or "(100-W)"
            if not item_code and name:
                item_code = _extract_item_code_from_name(name)

            # ✅ barcode = item_code if barcode missing
            if not barcode and item_code:
                barcode = _norm_barcode(item_code)

            # ✅ default UV if missing
            location = str(_get_first(r, ["location", "Location", "outlet", "branch"], "UV")).strip()
            if not location:
                location = "UV"

            size = str(_get_first(r, ["size", "Size"], "")).strip()

            mrp = _to_decimal(_get_first(r, ["mrp", "MRP"], "0"), "0")
            sp = _to_decimal(_get_first(r, ["selling_price", "Selling price", "Selling Price", "sp"], ""), "")

            # ✅ if selling missing, copy from MRP
            if sp == Decimal(""):  # never happens because _to_decimal returns Decimal always
                sp = mrp

            # Better: treat empty selling price as mrp
            # (we detect if raw field missing/empty)
            raw_sp = _get_first(r, ["selling_price", "Selling price", "Selling Price", "sp"], None)
            if raw_sp is None or str(raw_sp).strip() == "":
                sp = mrp

            if not barcode:
                errors.append({"rowIndex": idx, "barcode": "", "error": "Barcode is required (or derivable from Product Name)"})
                continue
            if not item_code:
                errors.append({"rowIndex": idx, "barcode": barcode, "error": "Item code is required (or derivable from Product Name)"})
                continue

            # ✅ de-dupe inside CSV upload
            bkey = barcode.upper()
            if bkey in seen_barcodes_in_upload:
                errors.append({"rowIndex": idx, "barcode": barcode, "error": "Duplicate barcode inside uploaded file"})
                continue
            seen_barcodes_in_upload.add(bkey)

            normalized_rows.append({
                "name": name,
                "barcode": barcode,
                "item_code": item_code,
                "mrp": str(mrp),
                "selling_price": str(sp),
                "location": location,
                "size": size,
                "_rowIndex": idx,
            })
            barcodes.append(barcode)
            item_codes.append(item_code)

        if not normalized_rows:
            return Response({
                "to_create": [],
                "conflicts": [],
                "errors": errors,
                "summary": {"rows_received": len(rows), "usable_rows": 0, "to_create": 0, "conflicts": 0, "errors": len(errors)}
            }, status=status.HTTP_200_OK)

        # bulk load taskitems + existing products
        task_map = {t.item_code: t for t in TaskItem.objects.filter(item_code__in=list(set(item_codes)))}

        existing_map = {}
        for chunk in _chunked(list(set([b.upper() for b in barcodes])), 800):
            qs = Product.objects.select_related("task_item", "location").filter(barcode__in=chunk)
            for p in qs:
                existing_map[p.barcode.upper()] = p

        for inc in normalized_rows:
            idx = inc["_rowIndex"]

            loc = loc_index.get(inc["location"].strip().lower())
            if not loc:
                errors.append({"rowIndex": idx, "barcode": inc["barcode"], "error": f"Unknown location: '{inc['location']}'"})
                continue

            ti = task_map.get(inc["item_code"])
            if not ti:
                errors.append({"rowIndex": idx, "barcode": inc["barcode"], "error": f"TaskItem not found for item_code: {inc['item_code']}"})
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
                "qty": ex.qty if ex.qty is not None else 0,
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

        loc_index = _build_locations_index()

        # ✅ de-dupe to_create by barcode to avoid IntegrityError
        deduped_to_create = []
        seen = set()
        for r in to_create:
            b = _norm_barcode((r or {}).get("barcode"))
            if not b:
                continue
            if b in seen:
                skipped += 1
                continue
            seen.add(b)
            deduped_to_create.append(r)
        to_create = deduped_to_create

        create_item_codes = set()
        for r in to_create:
            name = str((r or {}).get("name") or "").strip()
            ic = str((r or {}).get("item_code") or "").strip().upper()
            if not ic and name:
                ic = _extract_item_code_from_name(name)
            if ic:
                create_item_codes.add(ic)

        update_item_codes = set()
        for b in update_barcodes:
            inc = incoming_by_barcode.get(b) or incoming_by_barcode.get(b.upper()) or incoming_by_barcode.get(b.lower())
            if inc:
                name = str((inc or {}).get("name") or "").strip()
                ic = str((inc or {}).get("item_code") or "").strip().upper()
                if not ic and name:
                    ic = _extract_item_code_from_name(name)
                if ic:
                    update_item_codes.add(ic)

        task_map = {t.item_code: t for t in TaskItem.objects.filter(item_code__in=list(create_item_codes | update_item_codes))}

        with transaction.atomic():
            # ✅ CREATE
            to_insert = []
            for r in to_create:
                r = r or {}
                name = str(r.get("name") or "").strip()

                item_code = str(r.get("item_code") or "").strip().upper()
                if not item_code and name:
                    item_code = _extract_item_code_from_name(name)

                barcode = _norm_barcode(r.get("barcode") or item_code)
                if not barcode:
                    errors.append({"barcode": "", "error": "Missing barcode"})
                    continue
                if not item_code:
                    errors.append({"barcode": barcode, "error": "Missing item_code"})
                    continue

                # default UV if missing
                loc_value = str(r.get("location") or "UV").strip() or "UV"
                loc = loc_index.get(loc_value.lower())
                if not loc:
                    errors.append({"barcode": barcode, "error": f"Unknown location: '{loc_value}'"})
                    continue

                ti = task_map.get(item_code)
                if not ti:
                    errors.append({"barcode": barcode, "error": f"TaskItem not found for item_code: {item_code}"})
                    continue

                mrp = _to_decimal(r.get("mrp"), "0")
                sp_raw = r.get("selling_price")
                sp = _to_decimal(sp_raw, "0")
                if sp_raw is None or str(sp_raw).strip() == "":
                    sp = mrp

                # if already exists, skip safely (no crash)
                if Product.objects.filter(barcode=barcode).exists():
                    skipped += 1
                    continue

                to_insert.append(Product(
                    barcode=barcode,
                    task_item=ti,
                    mrp=mrp,
                    selling_price=sp,
                    location=loc,
                    size=str(r.get("size") or "").strip(),
                    qty=1,                 # ✅ as you requested
                    discount_percent=0,     # default
                    image_url="",           # default
                ))

            if to_insert:
                try:
                    Product.objects.bulk_create(to_insert, batch_size=800)
                    created += len(to_insert)
                except IntegrityError as e:
                    # fallback: insert one by one to capture duplicates instead of 500
                    for obj in to_insert:
                        try:
                            obj.save()
                            created += 1
                        except IntegrityError:
                            skipped += 1
                            errors.append({"barcode": obj.barcode, "error": "Duplicate barcode (already exists)"})

            # ✅ UPDATE
            if update_barcodes:
                existing = {}
                for chunk in _chunked(list(update_barcodes), 800):
                    for p in Product.objects.select_related("task_item", "location").filter(barcode__in=chunk):
                        existing[p.barcode.upper()] = p

                to_update = []
                for b in update_barcodes:
                    inc = incoming_by_barcode.get(b) or incoming_by_barcode.get(b.upper()) or incoming_by_barcode.get(b.lower())
                    if not inc:
                        errors.append({"barcode": b, "error": "Missing incoming row for update"})
                        continue

                    p = existing.get(b.upper())
                    if not p:
                        errors.append({"barcode": b, "error": "Product not found for update"})
                        continue

                    name = str((inc or {}).get("name") or "").strip()
                    item_code = str((inc or {}).get("item_code") or "").strip().upper()
                    if not item_code and name:
                        item_code = _extract_item_code_from_name(name)

                    if not item_code:
                        errors.append({"barcode": b, "error": "Missing item_code for update"})
                        continue

                    loc_value = str((inc or {}).get("location") or "UV").strip() or "UV"
                    loc = loc_index.get(loc_value.lower())
                    if not loc:
                        errors.append({"barcode": b, "error": f"Unknown location: '{loc_value}'"})
                        continue

                    ti = task_map.get(item_code)
                    if not ti:
                        errors.append({"barcode": b, "error": f"TaskItem not found for item_code: {item_code}"})
                        continue

                    mrp = _to_decimal((inc or {}).get("mrp"), "0")
                    sp_raw = (inc or {}).get("selling_price")
                    sp = _to_decimal(sp_raw, "0")
                    if sp_raw is None or str(sp_raw).strip() == "":
                        sp = mrp

                    p.task_item = ti
                    p.mrp = mrp
                    p.selling_price = sp
                    p.location = loc
                    p.size = str((inc or {}).get("size") or "").strip()

                    to_update.append(p)

                if to_update:
                    Product.objects.bulk_update(
                        to_update,
                        fields=["task_item", "mrp", "selling_price", "location", "size"],
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
