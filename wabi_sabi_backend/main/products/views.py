# products/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Product
from .serializers import ProductSerializer, ProductGridSerializer
from taskmaster.models import TaskItem


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
    queryset = Product.objects.select_related("task_item")

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
            qs = qs.filter(Q(barcode__icontains=q) | Q(task_item__item_vasy_name__icontains=q))

        page = self.paginate_queryset(qs)
        ser = self.get_serializer(page or qs, many=True)
        if page is not None:
            return self.get_paginated_response(ser.data)
        return Response(ser.data)

    # ---------- BULK UPSERT ----------
    @action(detail=False, methods=["post"], url_path="bulk-upsert")
    def bulk_upsert(self, request):
        """
        Accepts a list of rows (from your Expanded/Print step), each like:
          {
            "itemCode": "100-W",            # TaskItem.item_code
            "barcodeNumber": "WS-100-W-01", # Product.barcode
            "salesPrice": 1999,
            "mrp": 3500,
            "size": "M",
            "imageUrl": "",
            "qty": 1,
            "discountPercent": 0
          }

        Creates or updates Product so your inventory list shows real data.
        """
        items = request.data if isinstance(request.data, list) else request.data.get("rows", [])
        if not isinstance(items, list):
            return Response({"detail": "Expected a list or {rows: [...]}."}, status=status.HTTP_400_BAD_REQUEST)

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
                    if is_created:
                        created += 1
                    else:
                        updated += 1

                except TaskItem.DoesNotExist:
                    errors.append(f"row {i}: TaskItem {item_code!r} not found")
                except Exception as e:
                    errors.append(f"row {i}: {e}")

        return Response({"created": created, "updated": updated, "errors": errors})

    # ---------- BY BARCODE LOOKUP ----------
    @action(
        detail=False,
        methods=["get"],
        url_path=r"by-barcode/(?P<barcode>[^/]+)"
    )
    def by_barcode(self, request, barcode=None):
        """
        GET /api/products/by-barcode/<barcode>/
        Look up a product by barcode and return minimal fields
        that the frontend needs (including TaskItem 'vasy' name).
        Also robust to unicode dashes & case.
        """
        def clean_barcode(v: str) -> str:
            if not v:
                return ""
            # normalize unicode dashes to ASCII '-', trim & upper
            v = v.replace("–", "-").replace("—", "-").replace("−", "-").replace("‐", "-")
            return v.strip().upper()

        clean = clean_barcode(barcode)
        p = Product.objects.select_related("task_item").filter(barcode__iexact=clean).first()
        if not p:
            return Response({"detail": f"Product {clean} not found."}, status=status.HTTP_404_NOT_FOUND)

        data = {
            "id": p.id,
            "barcode": p.barcode,
            # Cast Decimals to string to avoid JSON float precision issues on the client:
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
