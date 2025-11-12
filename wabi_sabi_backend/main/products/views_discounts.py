from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404

from .models import Discount
from .serializers_discounts import DiscountSerializer

class DiscountListCreate(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Discount.objects.all().prefetch_related("branches")
        # optional search by title
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(title__icontains=q)
        data = DiscountSerializer(qs, many=True).data
        return Response(data)

    def post(self, request):
        ser = DiscountSerializer(data=request.data)
        if ser.is_valid():
            obj = ser.save()
            out = DiscountSerializer(obj).data
            out["message"] = "Successfully created."
            return Response(out, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

class DiscountDetail(APIView):
    permission_classes = [permissions.AllowAny]

    def delete(self, request, pk):
        obj = get_object_or_404(Discount, pk=pk)
        obj.delete()
        return Response({"message": "Deleted from database."}, status=status.HTTP_200_OK)
