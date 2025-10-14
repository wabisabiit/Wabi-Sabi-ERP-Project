import math
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from taskmaster.models import TaskItem

CORE_MAP = {
    "Item_Code": "item_code",
    "Category": "category",
    "Department": "department",
    "Item_Full_Name": "item_full_name",
    "Item_Vasy_Name": "item_vasy_name",
    "Item_Print_Friendly_Name": "item_print_friendly_name",
    "Item_Active": "item_active",
    "Hsn_Code": "hsn_code",
    "GST": "gst",
}

TRUE_SET = {"1","true","yes","y","on","active"}

def as_bool(v):
    if pd.isna(v):
        return None
    s = str(v).strip().lower()
    if s in TRUE_SET:
        return True
    if s in {"0","false","no","n","off","inactive"}:
        return False
    return None

def as_decimal(v):
    if pd.isna(v) or v == "":
        return None
    try:
        return float(v)
    except Exception:
        try:
            return float(str(v).replace(",",""))
        except Exception:
            return None

class Command(BaseCommand):
    help = "Import 'Item List' sheet from the Excel file into TaskItem"

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Path to the Excel file")
        parser.add_argument("--sheet", default="Item List", help="Sheet name (default: Item List)")
        parser.add_argument("--truncate", action="store_true", help="Delete existing TaskItem rows before import")

    def handle(self, *args, **opts):
        path = opts["file"]
        sheet = opts["sheet"]

        if opts["truncate"]:
            self.stdout.write(self.style.WARNING("Truncating TaskItem..."))
            TaskItem.objects.all().delete()

        try:
            df = pd.read_excel(path, sheet_name=sheet, engine="openpyxl")
        except Exception as e:
            raise CommandError(f"Failed to read Excel: {e}")

        # Normalize column names (match Excel headers exactly as seen)
        cols = [str(c).strip().replace(" ", "_") for c in df.columns]
        df.columns = cols

        created, updated, skipped = 0, 0, 0

        for idx, row in df.iterrows():
            data = row.to_dict()

            # Build core fields
            core = {}
            for xls_key, model_key in CORE_MAP.items():
                if xls_key in data:
                    val = data.get(xls_key)
                else:
                    # since we normalized headers with underscores already:
                    val = data.get(xls_key.replace(" ", "_"))
                if model_key == "item_active":
                    val = as_bool(val)
                    if val is None:
                        val = True  # default
                elif model_key == "gst":
                    val = as_decimal(val)
                core[model_key] = val

            item_code = core.get("item_code")
            if not item_code:
                skipped += 1
                continue

            # Attributes = all non-core columns (keep non-empty values)
            attr = {}
            for k, v in data.items():
                if k in CORE_MAP or k.replace("_", " ") in CORE_MAP:
                    continue
                if pd.isna(v) or v == "":
                    continue
                # Cast numpy types to native
                if isinstance(v, (float, int)) and (isinstance(v, float) and math.isnan(v)):
                    continue
                attr[k] = v

            obj, is_created = TaskItem.objects.update_or_create(
                item_code=item_code,
                defaults={
                    **core,
                    "attributes": attr,
                    "source_sheet": sheet,
                    "source_row": int(idx) + 2,  # +2 for header + 1-based Excel row
                },
            )
            created += 1 if is_created else 0
            updated += 0 if is_created else 1

        self.stdout.write(self.style.SUCCESS(f"Done. created={created}, updated={updated}, skipped={skipped}"))
