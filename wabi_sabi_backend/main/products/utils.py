from django.db.models import Max
from .models import StockTransfer

def next_stf_number(to_location_code: str) -> str:
    prefix = f"STF/{to_location_code}/"
    last = StockTransfer.objects.filter(number__startswith=prefix).aggregate(mx=Max("number"))["mx"]
    seq = int(last.split("/")[-1]) + 1 if last else 1
    return f"{prefix}{seq:04d}"  # STF/WS/0001
