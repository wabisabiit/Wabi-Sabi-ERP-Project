from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Prefetch

from .models import Product
from .serializers import ProductSerializer, ProductGridSerializer
from taskmaster.models import TaskItem

class ProductViewSet(viewsets.ModelViewSet):
    """
    /api/products/               GET  -> grid rows (joined)
                                 POST -> create one product
    /api/products/{id}/          GET/PATCH/DELETE -> single product
    /api/products/bulk-upsert/   POST -> create/update many from barcode payload (hook from Print)
    """
    queryset = Product.objects.select_related("task_item")

    def get_serializer_class(self):
        return ProductGridSerializer if self.action in ["list"] else ProductSerializer

    def list(self, request, *args, **kwargs):
        # optional filters: ?q=86000  (search barcode or vasy name)
        q = request.query_params.get("q", "").strip()
        qs = self.get_queryset()
        if q:
            qs = qs.filter(barcode__icontains=q) | qs.filter(task_item__item_vasy_name__icontains=q)
        page = self.paginate_queryset(qs)
        ser = self.get_serializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(ser.data)
        return Response(ser.data)

    @action(detail=False, methods=["post"], url_path="bulk-upsert")
    def bulk_upsert(self, request):
        """
        Accepts a list of rows (from your Expanded/Print step), each row like:
          {
            "itemCode": "100-W",            // TaskItem.item_code
            "barcodeNumber": "WS-100-W-01", // Product.barcode
            "salesPrice": 1999,
            "mrp": 3500,
            "size": "M",
            "imageUrl": ""
          }
        Creates or updates Product so your inventory list shows real data.
        """
        items = request.data if isinstance(request.data, list) else request.data.get("rows", [])
        if not isinstance(items, list):
            return Response({"detail": "Expected a list or {rows: [...]}."}, status=400)

        created, updated, errors = 0, 0, []
        with transaction.atomic():
            for i, row in enumerate(items, start=1):
                try:
                    item_code = str(row.get("itemCode", "")).strip()
                    barcode = str(row.get("barcodeNumber", "")).strip()
                    if not item_code or not barcode:
                        errors.append(f"row {i}: itemCode/barcodeNumber missing")
                        continue

                    ti = TaskItem.objects.get(item_code=item_code)
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
                    created += 1 if is_created else 0
                    updated += 0 if is_created else 1
                except TaskItem.DoesNotExist:
                    errors.append(f"row {i}: TaskItem {item_code!r} not found")
                except Exception as e:
                    errors.append(f"row {i}: {e}")

        return Response({"created": created, "updated": updated, "errors": errors})
