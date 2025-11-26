from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_datetime, parse_date
from django.db.models import Prefetch, Sum, F, DecimalField, ExpressionWrapper, Value
from django.db.models.functions import Coalesce
from django.views.decorators.csrf import csrf_exempt

from .services import create_transfer_for_print
from .models import StockTransfer, StockTransferLine
from .serializers_transfer import StockTransferSerializer
from outlets.utils import get_user_location_code

from decimal import Decimal

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def print_and_transfer(request):
    """
    POST /api/products/print-barcodes/
    Manager can only create transfers TO their own location.
    """
    data = request.data
    try:
        loc_code = get_user_location_code(request.user)
        if loc_code:
            to_code = data.get("to_location_code")
            if to_code != loc_code:
                return Response(
                    {"detail": "You are not allowed to create transfers for another branch."},
                    status=status.HTTP_403_FORBIDDEN,
                )

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

@csrf_exempt
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def transfer_list(request):
    """
    GET /api/products/transfers/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&to=CODE
    
    MANAGER: Only sees transfers TO their location.
    ADMIN: Can filter by any location using ?to=CODE
    """
    try:
        qs = StockTransfer.objects.select_related("from_location", "to_location")

        df = request.query_params.get("date_from")
        dt = request.query_params.get("date_to")
        to_code = request.query_params.get("to")

        if df:
            qs = qs.filter(created_at__date__gte=parse_date(df))
        if dt:
            qs = qs.filter(created_at__date__lte=parse_date(dt))

        # ✅ Location enforcement
        loc_code = get_user_location_code(request.user)
        if loc_code:
            # Manager: force their location, ignore ?to parameter
            qs = qs.filter(to_location__code=loc_code)
        elif to_code:
            # Admin: can filter by any location
            qs = qs.filter(to_location__code=to_code)

        amount_expr = ExpressionWrapper(
            F("lines__sp") * F("lines__qty"),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )

        qs = qs.annotate(
            qty=Coalesce(Sum("lines__qty"), Value(0)),
            net_amount=Coalesce(
                Sum(amount_expr),
                Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2)),
            ),
        ).order_by("-created_at", "number")

        data = [
            {
                "number": t.number,
                "created_at": t.created_at,
                "from": t.from_location.code,
                "to": t.to_location.code,
                "qty": t.qty,
                "net_amount": str(t.net_amount),
            }
            for t in qs
        ]
        return Response(data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"detail": str(e), "error_type": type(e).__name__}, status=500)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def transfer_details(request, number: str):
    """
    GET /api/products/transfers/<number>/
    Manager can ONLY see transfers whose to_location matches their outlet.
    """
    try:
        stf = (
            StockTransfer.objects
            .prefetch_related(Prefetch("lines", queryset=StockTransferLine.objects.order_by("barcode")))
            .select_related("from_location", "to_location")
            .get(number=number)
        )
    except StockTransfer.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)

    loc_code = get_user_location_code(request.user)
    if loc_code and stf.to_location.code != loc_code:
        return Response(
            {"detail": "You are not allowed to view this transfer."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return Response(StockTransferSerializer(stf).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def barcode_last_transfer(request, barcode: str):
    """
    GET /api/products/barcodes/<barcode>/transfer/
    """
    l = (
        StockTransferLine.objects
        .select_related("transfer", "transfer__from_location", "transfer__to_location")
        .filter(barcode=barcode)
        .order_by("-transfer__created_at")
        .first()
    )
    if not l:
        return Response({"message": "No transfer found"}, status=404)

    loc_code = get_user_location_code(request.user)
    if loc_code and l.transfer.to_location.code != loc_code:
        return Response(
            {"detail": "You are not allowed to view this transfer."},
            status=status.HTTP_403_FORBIDDEN,
        )

    t = l.transfer
    return Response({
        "barcode": barcode,
        "number": t.number,
        "date": t.created_at,
        "from": t.from_location.code,
        "to": t.to_location.code,
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_transfer(request, number: str):
    """
    DELETE /api/products/transfers/<number>/delete/
    """
    try:
        obj = StockTransfer.objects.select_related("to_location").get(number=number)
    except StockTransfer.DoesNotExist:
        return Response({"ok": False, "message": "Not found."}, status=404)

    loc_code = get_user_location_code(request.user)
    if loc_code and obj.to_location.code != loc_code:
        return Response(
            {"detail": "You are not allowed to delete this transfer."},
            status=status.HTTP_403_FORBIDDEN,
        )

    obj.delete()
    return Response({"ok": True, "message": f"{number} deleted successfully."}, status=204)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def transfer_barcodes(request, number: str):
    """
    GET /api/products/transfers/<number>/barcodes/
    Only returns barcodes if transfer's to_location matches manager's outlet.
    """
    loc_code = get_user_location_code(request.user)

    qs = StockTransferLine.objects.filter(transfer__number=number)
    if loc_code:
        qs = qs.filter(transfer__to_location__code=loc_code)

    if not qs.exists():
        exists = StockTransfer.objects.filter(number=number).exists()
        return Response(
            {"detail": "Not found." if not exists else "No lines for this transfer.", "number": number},
            status=404 if not exists else 200,
        )

    barcodes = list(qs.values_list("barcode", flat=True).order_by("barcode"))
    return Response({"number": number, "count": len(barcodes), "barcodes": barcodes})