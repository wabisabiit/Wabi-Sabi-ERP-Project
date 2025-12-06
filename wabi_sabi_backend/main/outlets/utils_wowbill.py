# outlets/utils_wowbill.py
from decimal import Decimal
from django.db import transaction
from .models import WowBillEntry, WowBillSlab

def create_wow_entry_for_sale(sale):
    """
    Create/update WOW entry for a Sale based on the salesman’s outlet slabs.
    - Uses sale.salesman.outlet to pick slabs
    - Picks the highest min_amount <= sale.grand_total
    """
    emp = getattr(sale, "salesman", None)
    if not emp or not getattr(emp, "outlet", None):
        return  # no salesman or outlet → no WOW

    outlet = emp.outlet
    customer = sale.customer
    bill_date = sale.transaction_date.date()
    sale_amount = Decimal(sale.grand_total or 0)

    # 🔴 BUG BEFORE (do NOT do this):
    # slab = (
    #    WowBillSlab.objects.filter(active=True, min_amount__lte=sale_amount)
    #    .order_by("-min_amount")
    #    .first()
    # )

    # ✅ FIXED: filter by outlet first, then take best matching slab
    slab = (
        WowBillSlab.objects.filter(
            outlet=outlet,
            active=True,
            min_amount__lte=sale_amount,
        )
        .order_by("-min_amount")   # highest min_amount first
        .first()
    )

    if not slab:
        return  # no slab for this outlet / amount

    wow_min_value = slab.min_amount
    payout_per_wow = slab.payout_per_wow

    if wow_min_value <= 0:
        return

    wow_count = int(sale_amount // wow_min_value)
    total_payout = payout_per_wow * wow_count

    if wow_count <= 0:
        return  # below smallest slab → no WOW entry

    # One WOW row per (employee, customer, bill_date)
    with transaction.atomic():
        WowBillEntry.objects.update_or_create(
            outlet=outlet,
            employee=emp,
            customer=customer,
            bill_date=bill_date,
            defaults={
                "sale_amount": sale_amount,
                "wow_min_value": wow_min_value,
                "payout_per_wow": payout_per_wow,
                "wow_count": wow_count,
                "total_payout": total_payout,
                "exclude_returns": True,
                # created_by is filled only when first created;
                # update_or_create keeps original created_by
            },
        )
