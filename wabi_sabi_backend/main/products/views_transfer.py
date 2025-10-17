from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_datetime, parse_date
from django.db.models import Prefetch, Sum, Count, F, DecimalField
from django.db.models.functions import Coalesce

from .services import create_transfer_for_print
from .models import StockTransfer, StockTransferLine
from .serializers_transfer import StockTransferSerializer

from decimal import Decimal
from django.db.models import Prefetch, Sum, Count, F, DecimalField, ExpressionWrapper, Value
from django.db.models.functions import Coalesce

@api_view(["POST"])
@permission_classes([AllowAny])
def print_and_transfer(request):
    """
    POST /api/products/print-barcodes/
    {
      "to_location_code": "RJO",
      "barcodes": ["WS-100-01","WS-100-02"],
      "created_at": "2025-10-17T12:30:00+05:30",
      "note": "Diwali batch"
    }
    """
    data = request.data
    try:
        ts = parse_datetime(data.get("created_at")) if data.get("created_at") else None
        stf = create_transfer_for_print(
            barcodes=data.get("barcodes", []),
            to_location_code=data["to_location_code"],
            created_at=ts,
            note=data.get("note", ""),
        )
        return Response(
            {
                "stf_number": stf.number,
                "created_at": stf.created_at,
                "from": stf.from_location.code,
                "to": stf.to_location.code,
                "count": stf.lines.count(),
            },
            status=status.HTTP_201_CREATED,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([AllowAny])
def transfer_list(request):
    """
    GET /api/products/transfers/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&to=CODE
    Returns list with qty and net_amount (sum of line.sp * qty).
    """
    qs = StockTransfer.objects.select_related("from_location", "to_location")

    df = request.query_params.get("date_from")
    dt = request.query_params.get("date_to")
    to_code = request.query_params.get("to")

    if df:
        qs = qs.filter(created_at__date__gte=parse_date(df))
    if dt:
        qs = qs.filter(created_at__date__lte=parse_date(dt))
    if to_code:
        qs = qs.filter(to_location__code=to_code)

    amount_expr = ExpressionWrapper(
        F("lines__sp") * F("lines__qty"),
        output_field=DecimalField(max_digits=14, decimal_places=2),
    )

    qs = qs.annotate(
        qty=Count("lines"),
        net_amount=Coalesce(
            Sum(amount_expr),
            Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2)),
        ),
    ).order_by("-created_at", "number")

    data = [{
        "number": t.number,
        "created_at": t.created_at,
        "from": t.from_location.code,
        "to": t.to_location.code,
        "qty": t.qty,
        "net_amount": str(t.net_amount),
    } for t in qs]

    return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def transfer_details(request, number: str):
    """
    GET /api/products/transfers/<number>/
    """
    stf = (StockTransfer.objects
           .prefetch_related(Prefetch("lines", queryset=StockTransferLine.objects.order_by("barcode")))
           .select_related("from_location", "to_location")
           .get(number=number))
    return Response(StockTransferSerializer(stf).data)


@api_view(["GET"])
@permission_classes([AllowAny])
def barcode_last_transfer(request, barcode: str):
    """
    GET /api/products/barcodes/<barcode>/transfer/
    """
    l = (StockTransferLine.objects
         .select_related("transfer", "transfer__from_location", "transfer__to_location")
         .filter(barcode=barcode)
         .order_by("-transfer__created_at")
         .first())
    if not l:
        return Response({"message": "No transfer found"}, status=404)
    t = l.transfer
    return Response({
        "barcode": barcode,
        "number": t.number,
        "date": t.created_at,
        "from": t.from_location.code,
        "to": t.to_location.code,
    })


@api_view(["DELETE"])
@permission_classes([AllowAny])
def delete_transfer(request, number: str):
    """
    DELETE /api/products/transfers/<number>/delete/
    """
    try:
        obj = StockTransfer.objects.get(number=number)
        obj.delete()  # CASCADE deletes lines
        return Response({"ok": True, "message": f"{number} deleted successfully."}, status=204)
    except StockTransfer.DoesNotExist:
        return Response({"ok": False, "message": "Not found."}, status=404)
