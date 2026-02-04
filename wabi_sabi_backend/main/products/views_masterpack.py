# products/views_masterpack.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from django.db.models import Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from datetime import datetime, time

from taskmaster.models import Location
from .models import MasterPack, MasterPackLine, Product
from .serializers import MasterPackCreateSerializer, MasterPackOutSerializer


def _user_location(user):
    """Get user's location from employee -> outlet -> location chain"""
    emp = getattr(user, "employee", None)
    outlet = getattr(emp, "outlet", None) if emp else None
    loc = getattr(outlet, "location", None) if outlet else None
    return loc, emp


def _is_admin(user):
    """Check if user is admin (superuser or employee with ADMIN role)"""
    emp = getattr(user, "employee", None)
    role = getattr(emp, "role", "") if emp else ""
    return bool(getattr(user, "is_superuser", False) or role == "ADMIN")


def _hq_location():
    """
    ✅ FIXED: Get WS headquarters location instead of searching for 'HQ'
    WS = WABI SABI SUSTAINABILITY LLP (code: WS)
    """
    # First try exact code match for WS
    hq = Location.objects.filter(code__iexact="WS").first()
    if hq:
        return hq

    # Fallback: search by name containing "WABI SABI" or "Head Office"
    hq = Location.objects.filter(
        Q(name__icontains="WABI SABI") | Q(name__icontains="Head Office")
    ).first()
    return hq


def _parse_range(request):
    """Parse date range from query params"""
    df = parse_date((request.query_params.get("date_from") or "").strip())
    dt = parse_date((request.query_params.get("date_to") or "").strip())
    if not df or not dt:
        return None, None, None, None

    if dt < df:
        df, dt = dt, df

    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(df, time.min), tz)
    end_dt = timezone.make_aware(datetime.combine(dt, time.max), tz)
    return df, dt, start_dt, end_dt


class MasterPackView(APIView):
    """
    POST /api/master-packs/  -> create
    GET  /api/master-packs/  -> list packs for table
      filters:
        - date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
        - from_location=CODE (repeatable)   (admin only)
        - to_location=CODE   (repeatable)   (admin only)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        admin = _is_admin(user)
        user_loc, _emp = _user_location(user)

        df, dt, start_dt, end_dt = _parse_range(request)
        # allow empty date range => default to today
        if not (df and dt and start_dt and end_dt):
            tz = timezone.get_current_timezone()
            today = timezone.localdate()
            df = today
            dt = today
            start_dt = timezone.make_aware(datetime.combine(today, time.min), tz)
            end_dt = timezone.make_aware(datetime.combine(today, time.max), tz)

        from_params = [str(x).strip() for x in request.query_params.getlist("from_location") if str(x).strip()]
        to_params = [str(x).strip() for x in request.query_params.getlist("to_location") if str(x).strip()]

        qs = (
            MasterPack.objects
            .select_related("from_location", "to_location", "created_by")
            .prefetch_related(
                Prefetch("lines", queryset=MasterPackLine.objects.select_related("location"))
            )
            .filter(created_at__range=(start_dt, end_dt))
            .order_by("-created_at", "-id")
        )

        # ✅ FIXED: Manager visibility - see packs where outlet is FROM or TO
        if not admin:
            if user_loc:
                qs = qs.filter(Q(from_location=user_loc) | Q(to_location=user_loc))
            else:
                qs = qs.none()

        # Admin filtering by from/to
        if admin and from_params:
            q = Q()
            for v in from_params:
                q |= Q(from_location__code__iexact=v) | Q(from_location__name__icontains=v)
            qs = qs.filter(q).distinct()

        if admin and to_params:
            q = Q()
            for v in to_params:
                q |= Q(to_location__code__iexact=v) | Q(to_location__name__icontains=v)
            qs = qs.filter(q).distinct()

        out = []
        for idx, p in enumerate(qs, start=1):
            floc = p.from_location
            if not floc and p.lines.exists():
                floc = p.lines.all()[0].location

            tloc = p.to_location

            # ✅ NEW: Sender name
            sender_name = ""
            if getattr(p, "created_by", None):
                emp = getattr(p.created_by, "employee", None)
                sender_name = (
                    (getattr(emp, "name", "") or getattr(emp, "full_name", "") or "").strip()
                    or (getattr(p.created_by, "username", "") or "").strip()
                )

            out.append({
                "sr": idx,
                "number": p.number,
                "created_at": p.created_at,
                "sender": sender_name,
                "from_location": {
                    "code": getattr(floc, "code", "") or "",
                    "name": getattr(floc, "name", "") or "",
                } if floc else {"code": "", "name": ""},
                "to_location": {
                    "code": getattr(tloc, "code", "") or "",
                    "name": getattr(tloc, "name", "") or "",
                } if tloc else {"code": "", "name": ""},
            })

        return Response(out, status=status.HTTP_200_OK)

    def post(self, request):
        # ✅ save created_by
        ser = MasterPackCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        pack = ser.save(created_by=request.user)

        user = request.user
        admin = _is_admin(user)
        user_loc, _emp = _user_location(user)
        hq = _hq_location()

        # ✅ DIRECTION FIX
        # Manager -> HQ
        if not admin:
            from_loc = user_loc
            to_loc = hq
        else:
            # Admin -> Outlet (infer outlet from first row's location_code)
            rows = request.data.get("rows") or []
            row_loc_code = ""
            if isinstance(rows, list) and rows:
                row_loc_code = (rows[0].get("location_code") or "").strip()

            to_loc = Location.objects.filter(code__iexact=row_loc_code).first() if row_loc_code else None
            from_loc = hq

        if from_loc and not pack.from_location_id:
            pack.from_location = from_loc
        if to_loc and not pack.to_location_id:
            pack.to_location = to_loc

        pack.save(update_fields=["from_location", "to_location", "created_by"])

        # ✅ SPECIAL CASE: outlet -> WS means activate barcodes at WS
        if hq and pack.to_location_id == hq.id and pack.from_location_id and pack.from_location_id != hq.id:
            barcodes = list(pack.lines.values_list("barcode", flat=True))
            if barcodes:
                Product.objects.filter(barcode__in=barcodes).update(qty=1, location=hq)

        out = MasterPackOutSerializer(pack).data
        return Response({"status": "ok", "pack": out}, status=status.HTTP_201_CREATED)


class MasterPackDetail(APIView):
    """
    GET /api/master-packs/<number>/  -> detail (with lines)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, number):
        pack = get_object_or_404(
            MasterPack.objects
            .select_related("from_location", "to_location", "created_by")
            .prefetch_related(
                Prefetch("lines", queryset=MasterPackLine.objects.select_related("location"))
            ),
            number=number,
        )
        data = MasterPackOutSerializer(pack).data

        data["from_location"] = {
            "code": getattr(getattr(pack, "from_location", None), "code", "") or "",
            "name": getattr(getattr(pack, "from_location", None), "name", "") or "",
        } if pack.from_location_id else {"code": "", "name": ""}

        data["to_location"] = {
            "code": getattr(getattr(pack, "to_location", None), "code", "") or "",
            "name": getattr(getattr(pack, "to_location", None), "name", "") or "",
        } if pack.to_location_id else {"code": "", "name": ""}

        # ✅ optional sender for detail page (doesn't break old UI)
        sender_name = ""
        if getattr(pack, "created_by", None):
            emp = getattr(pack.created_by, "employee", None)
            sender_name = (
                (getattr(emp, "name", "") or getattr(emp, "full_name", "") or "").strip()
                or (getattr(pack.created_by, "username", "") or "").strip()
            )
        data["sender"] = sender_name

        return Response(data, status=status.HTTP_200_OK)


class MasterPackBulkDelete(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        numbers = request.data.get("numbers", [])
        if not isinstance(numbers, list) or not numbers:
            return Response({"status": "error", "detail": "numbers[] required"}, status=status.HTTP_400_BAD_REQUEST)

        qs = MasterPack.objects.filter(number__in=numbers)
        found = list(qs.values_list("number", flat=True))
        deleted_count, _ = qs.delete()
        return Response(
            {"status": "ok", "requested": numbers, "deleted": found, "deleted_count": deleted_count},
            status=status.HTTP_200_OK
        )
