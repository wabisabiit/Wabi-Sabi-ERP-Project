# products/views_customers.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.db.models import Q
from .models import Customer
from .serializers_customers import CustomerSerializer

class CustomerListCreate(APIView):
    """
    GET /api/customers/?q=ish  -> search by name/phone (top 25)
    POST /api/customers/       -> create or fetch by phone (name+phone required)
      { "name":"Ishika", "phone":"9131054736", "email":"" }
    
    ✅ FIX: No location restrictions - all authenticated users can search ALL customers
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        q = (request.GET.get("q") or "").strip()
        
        # ✅ Start with ALL customers (no location filter)
        qs = Customer.objects.all().order_by("name")
        
        if q:
            # Search by name OR phone
            qs = qs.filter(Q(name__icontains=q) | Q(phone__icontains=q))
        
        # Return top 25 matches
        data = CustomerSerializer(qs[:25], many=True).data
        
        # ✅ Return in expected format with "results" key
        return Response({"results": data}, status=status.HTTP_200_OK)

    def post(self, request):
        # If phone exists, re-use that customer
        phone = (request.data.get("phone") or "").strip()
        name  = (request.data.get("name") or "").strip()
        
        if not name or not phone:
            return Response(
                {"detail": "Name and Mobile are mandatory."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if customer with this phone already exists
        cust = Customer.objects.filter(phone__iexact=phone).first()
        
        if cust:
            # Update name if it's different
            if name and cust.name != name:
                cust.name = name
                cust.save(update_fields=["name"])
            
            ser = CustomerSerializer(cust)
            return Response(
                {"ok": True, "created": False, "customer": ser.data},
                status=status.HTTP_200_OK
            )

        # Create new customer
        ser = CustomerSerializer(data={
            "name": name,
            "phone": phone,
            "email": request.data.get("email", "")
        })
        
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        
        cust = ser.save()
        return Response(
            {"ok": True, "created": True, "customer": CustomerSerializer(cust).data},
            status=status.HTTP_201_CREATED
        )