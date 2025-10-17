# products/services.py
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from taskmaster.models import Location
from .models import Product, StockTransfer, StockTransferLine
from .utils import next_stf_number

@transaction.atomic
def create_transfer_for_print(barcodes, to_location_code, created_at=None, note=""):
    """
    Create one StockTransfer (HQ -> to_location_code) and one line per barcode.
    - HQ code comes from settings.DEFAULT_HQ_CODE (fallback "HQ")
    - created_at can be passed to match barcode creation time
    """
    if not barcodes:
        raise ValueError("No barcodes provided.")

    # Resolve locations
    hq_code = getattr(settings, "DEFAULT_HQ_CODE", "HQ")
    hq = Location.objects.get(code=hq_code)
    to = Location.objects.get(code=to_location_code)   # <-- you were missing this

    # Timestamp + STF number
    ts = created_at or timezone.now()
    stf_no = next_stf_number(to_location_code=to.code)

    # Create header
    stf = StockTransfer.objects.create(
        number=stf_no,
        from_location=hq,
        to_location=to,
        created_at=ts,
        note=note or "",
    )

    # Fetch products for the given barcodes
    products = list(Product.objects.select_related("task_item").filter(barcode__in=barcodes))
    found = {p.barcode for p in products}
    missing = [b for b in barcodes if b not in found]
    if missing:
        raise ValueError(f"Barcodes not found: {missing}")

    # Create lines (qty=1 per unique physical barcode)
    for p in products:
        StockTransferLine.objects.create(
            transfer=stf,
            product=p,
            qty=1,
            barcode=p.barcode,
            mrp=p.mrp,
            sp=p.selling_price,
        )

    return stf
