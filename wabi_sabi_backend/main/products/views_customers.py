# products/views_customers.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from .models import Customer
from .serializers_customers import CustomerSerializer

class CustomerListCreate(APIView):
    """
    GET /api/customers/?q=ish  -> search by name/phone (top 25)
    POST /api/customers/       -> create or fetch by phone (name+phone required)
      { "name":"Ishika", "phone":"9131054736", "email":"" }
    """
    def get(self, request):
        q = (request.GET.get("q") or "").strip()
        qs = Customer.objects.all().order_by("name")
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(phone__icontains=q))
        data = CustomerSerializer(qs[:25], many=True).data
        return Response({"results": data}, status=status.HTTP_200_OK)

    def post(self, request):
        # If phone exists, re-use that customer
        phone = (request.data.get("phone") or "").strip()
        name  = (request.data.get("name") or "").strip()
        if not name or not phone:
            return Response({"detail": "Name and Mobile are mandatory."},
                            status=status.HTTP_400_BAD_REQUEST)

        cust = Customer.objects.filter(phone__iexact=phone).first()
        if cust:
            # optionally update the name if blank/placeholder
            if name and cust.name != name:
                cust.name = name
                cust.save(update_fields=["name"])
            ser = CustomerSerializer(cust)
            return Response({"ok": True, "created": False, "customer": ser.data},
                            status=status.HTTP_200_OK)

        ser = CustomerSerializer(data={"name": name, "phone": phone, "email": request.data.get("email","")})
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        cust = ser.save()
        return Response({"ok": True, "created": True, "customer": CustomerSerializer(cust).data},
                        status=status.HTTP_201_CREATED)
