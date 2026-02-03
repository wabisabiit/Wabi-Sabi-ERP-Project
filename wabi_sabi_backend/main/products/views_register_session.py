# products/views_register_session.py
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from .models import RegisterSession
from .serializers_register_session import RegisterSessionSerializer, RegisterOpenSerializer


def _user_location(user):
    emp = getattr(user, "employee", None) if user and user.is_authenticated else None
    outlet = getattr(emp, "outlet", None) if emp else None
    loc = getattr(outlet, "location", None) if outlet else None
    return loc, emp


class RegisterSessionTodayView(APIView):
    """
    GET /api/register-sessions/today/
    Returns today's session for logged-in user's location.
    If none -> is_open = False (frontend shows popup).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        loc, emp = _user_location(request.user)
        today = timezone.localdate()

        # If manager has no location, force popup
        if loc is None:
            return Response(
                {
                    "is_open": False,
                    "opening_cash": "0.00",
                    "business_date": str(today),
                    "range_label": today.strftime("%d %b %Y"),
                },
                status=status.HTTP_200_OK,
            )

        sess = RegisterSession.objects.filter(location=loc, business_date=today).first()
        if not sess:
            return Response(
                {
                    "is_open": False,
                    "opening_cash": "0.00",
                    "business_date": str(today),
                    "range_label": today.strftime("%d %b %Y"),
                },
                status=status.HTTP_200_OK,
            )

        return Response(RegisterSessionSerializer(sess).data, status=status.HTTP_200_OK)


class RegisterSessionOpenView(APIView):
    """
    POST /api/register-sessions/open/
    Body: { opening_cash }
    Creates/opens today's session (only once per day per location).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        loc, emp = _user_location(request.user)
        today = timezone.localdate()

        ser = RegisterOpenSerializer(data=request.data or {})
        ser.is_valid(raise_exception=True)
        opening_cash = ser.validated_data.get("opening_cash", 0)

        if loc is None:
            # no location -> still allow, but session can't be unique by location
            created = RegisterSession.objects.create(
                location=None,
                business_date=today,
                opening_cash=opening_cash,
                is_open=True,
                created_by=emp,
                opened_at=timezone.now(),
            )
            return Response(RegisterSessionSerializer(created).data, status=status.HTTP_201_CREATED)

        sess = RegisterSession.objects.filter(location=loc, business_date=today).first()

        if sess and sess.is_open:
            # already open -> return it (popup won't re-open)
            return Response(RegisterSessionSerializer(sess).data, status=status.HTTP_200_OK)

        if sess and not sess.is_open:
            # session exists but closed (you wanted popup after closing)
            # reopen same record (unique constraint prevents creating another row)
            sess.is_open = True
            sess.closed_at = None
            sess.opened_at = timezone.now()
            sess.opening_cash = opening_cash
            sess.created_by = emp
            sess.save(update_fields=["is_open", "closed_at", "opened_at", "opening_cash", "created_by"])
            return Response(RegisterSessionSerializer(sess).data, status=status.HTTP_200_OK)

        # create new session for today
        created = RegisterSession.objects.create(
            location=loc,
            business_date=today,
            opening_cash=opening_cash,
            is_open=True,
            created_by=emp,
            opened_at=timezone.now(),
        )   
        return Response(RegisterSessionSerializer(created).data, status=status.HTTP_201_CREATED)
 