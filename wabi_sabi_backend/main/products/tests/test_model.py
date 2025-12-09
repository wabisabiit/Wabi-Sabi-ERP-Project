# # wabi_sabi_backend/main/products/tests/test_models.py

# from decimal import Decimal
# from datetime import date, timedelta

# from django.test import TestCase
# from django.contrib.auth import get_user_model
# from django.utils import timezone

# from taskmaster.models import Location, TaskItem
# from outlets.models import Outlet, Employee
# from products.models import (
#     Product,
#     Customer,
#     InvoiceSequence,
#     Sale,
#     SaleLine,
#     CreditNoteSequence,
#     CreditNote,
#     MasterPack,
#     MasterPackLine,
#     MaterialConsumptionSequence,
#     MaterialConsumption,
#     MaterialConsumptionLine,
#     Coupon,
#     GeneratedCoupon,
#     Discount,
#     HoldBillSequence,
#     HoldBill,
#     HoldBillLine,
#     Supplier,
#     Account,
#     Expense,
#     RegisterClosing,
# )


# User = get_user_model()


# class BaseSetupMixin:
#     """
#     Common setup helpers reused in multiple tests.
#     """

#     def create_location(self, code="TN", name="Tilak Nagar"):
#         return Location.objects.create(code=code, name=name)

#     def create_task_item(self, code="100-W", name="Sample Item"):
#         """
#         Minimal TaskItem; assumes item_code is required and other fields
#         are optional or have defaults in your TaskItem model.
#         Adjust if your real TaskItem has extra required fields.
#         """
#         return TaskItem.objects.create(item_code=code, item_vasy_name=name)

#     def create_outlet_and_employee(self):
#         loc = self.create_location()
#         outlet = Outlet.objects.create(location=loc, display_name="TN Outlet")
#         user = User.objects.create_user(username="emp1", password="pass123")
#         emp = Employee.objects.create(user=user, outlet=outlet)
#         return loc, outlet, user, emp


# # -------------------------------------------------------------------
# # Product / Sale / SaleLine / sequences
# # -------------------------------------------------------------------
# class ProductSaleModelTests(BaseSetupMixin, TestCase):
#     def test_invoice_sequence_increments_and_pads(self):
#         """
#         InvoiceSequence.next_invoice_no should create a prefix row and increment
#         next_number, padding as per pad_width.
#         """
#         # first call: creates row with next_number=1
#         seq = InvoiceSequence.objects.create(prefix="INV", next_number=5, pad_width=3)
#         no1 = InvoiceSequence.next_invoice_no(prefix="INV")  # uses seq.pad_width
#         self.assertEqual(no1, "INV005")

#         # second call: now next_number is 6
#         no2 = InvoiceSequence.next_invoice_no(prefix="INV")
#         self.assertEqual(no2, "INV006")

#     def test_sale_auto_generates_invoice_no(self):
#         """
#         Sale.save() should auto-generate invoice_no using InvoiceSequence
#         when invoice_no is empty.
#         """
#         customer = Customer.objects.create(name="Ravi", phone="9999999999")
#         sale = Sale.objects.create(
#             invoice_no="",  # force auto-generate
#             customer=customer,
#             payment_method=Sale.PAYMENT_CASH,
#         )
#         self.assertTrue(sale.invoice_no.startswith("INV"))
#         self.assertGreater(len(sale.invoice_no), 3)  # e.g. INV01, INV1...

#     def test_product_and_saleline_denormalization(self):
#         """
#         SaleLine.save() should copy barcode, mrp, sp from Product
#         when those fields are not set.
#         """
#         # minimal product
#         task_item = self.create_task_item()
#         product = Product.objects.create(
#             barcode="ABC123",
#             task_item=task_item,
#             mrp=Decimal("1999.00"),
#             selling_price=Decimal("1499.00"),
#         )

#         customer = Customer.objects.create(name="Ravi", phone="9999999999")
#         sale = Sale.objects.create(
#             invoice_no="INV999",  # manually set, skip sequence
#             customer=customer,
#             payment_method=Sale.PAYMENT_CASH,
#         )

#         line = SaleLine.objects.create(
#             sale=sale,
#             product=product,
#             qty=2,
#             # mrp, sp, barcode left at default/empty so save() will fill them
#         )

#         self.assertEqual(line.barcode, "ABC123")
#         self.assertEqual(line.mrp, Decimal("1999.00"))
#         self.assertEqual(line.sp, Decimal("1499.00"))
#         self.assertEqual(line.qty, 2)

#         # __str__ check
#         self.assertIn("INV999", str(line))
#         self.assertIn("ABC123", str(line))


# # -------------------------------------------------------------------
# # Credit Note / sequences
# # -------------------------------------------------------------------
# class CreditNoteModelTests(BaseSetupMixin, TestCase):
#     def test_credit_note_sequence_and_save(self):
#         """
#         CreditNote.save() must auto-generate note_no using CreditNoteSequence
#         once per new record.
#         """
#         # base objects
#         task_item = self.create_task_item()
#         product = Product.objects.create(
#             barcode="CRED123",
#             task_item=task_item,
#             mrp=Decimal("1000.00"),
#             selling_price=Decimal("800.00"),
#         )
#         customer = Customer.objects.create(name="Amit", phone="8888888888")
#         sale = Sale.objects.create(
#             invoice_no="INV100",
#             customer=customer,
#             payment_method=Sale.PAYMENT_CASH,
#         )

#         cn = CreditNote.objects.create(
#             note_no="",  # force auto-generate
#             sale=sale,
#             customer=customer,
#             product=product,
#             barcode=product.barcode,
#             qty=1,
#             amount=Decimal("800.00"),
#             note_date=timezone.now(),
#         )

#         self.assertTrue(cn.note_no.startswith("CRN"))
#         self.assertEqual(cn.qty, 1)
#         self.assertEqual(cn.amount, Decimal("800.00"))
#         self.assertEqual(str(cn), cn.note_no)


# # -------------------------------------------------------------------
# # MasterPack / MaterialConsumption
# # -------------------------------------------------------------------
# class PackingAndConsumptionTests(BaseSetupMixin, TestCase):
#     def test_master_pack_auto_number_and_line_str(self):
#         """
#         MasterPack.save() should auto-generate number using InvoiceSequence,
#         and MasterPackLine.__str__ should include pack number and barcode.
#         """
#         task_item = self.create_task_item()
#         product = Product.objects.create(
#             barcode="PK123",
#             task_item=task_item,
#             mrp=Decimal("500.00"),
#             selling_price=Decimal("400.00"),
#         )

#         pack = MasterPack.objects.create(number="")  # trigger auto-number
#         self.assertTrue(pack.number.startswith("INV"))  # uses InvoiceSequence

#         line = MasterPackLine.objects.create(
#             pack=pack,
#             product=product,
#             barcode=product.barcode,
#             name="Sample",
#             sp=product.selling_price,
#             qty=3,
#             location=self.create_location(),
#         )

#         text = str(line)
#         self.assertIn(pack.number, text)
#         self.assertIn(product.barcode, text)
#         self.assertIn("x3", text)

#     def test_material_consumption_sequence_and_line(self):
#         """
#         MaterialConsumption.save() should auto-generate number using
#         MaterialConsumptionSequence, and lines should store totals.
#         """
#         loc = self.create_location()
#         mc = MaterialConsumption.objects.create(
#             number="",  # auto
#             location=loc,
#             consumption_type="Production",
#             remark="Test",
#             total_amount=Decimal("0.00"),
#         )
#         self.assertTrue(mc.number.startswith("CONWS"))

#         task_item = self.create_task_item(code="MC1")
#         product = Product.objects.create(
#             barcode="MC123",
#             task_item=task_item,
#             mrp=Decimal("100.00"),
#             selling_price=Decimal("80.00"),
#         )

#         line = MaterialConsumptionLine.objects.create(
#             consumption=mc,
#             product=product,
#             barcode=product.barcode,
#             name="MC Item",
#             qty=2,
#             price=Decimal("80.00"),
#             total=Decimal("160.00"),
#         )

#         self.assertEqual(line.total, Decimal("160.00"))
#         self.assertEqual(line.qty, 2)
#         self.assertEqual(line.barcode, "MC123")


# # -------------------------------------------------------------------
# # Coupons / Discounts
# # -------------------------------------------------------------------
# class CouponAndDiscountTests(BaseSetupMixin, TestCase):
#     def test_coupon_ci_unique_name_and_str(self):
#         """
#         Coupon name must be unique case-insensitive, and __str__ returns name.
#         """
#         c1 = Coupon.objects.create(name="HELLO123", price=Decimal("500.00"))
#         self.assertEqual(str(c1), "HELLO123")

#         # trying to create same name with different case should fail
#         with self.assertRaises(Exception):
#             Coupon.objects.create(name="hello123", price=Decimal("400.00"))

#     def test_generated_coupon_bulk_generate_and_redeem(self):
#         """
#         bulk_generate should allocate serial numbers and codes correctly,
#         and redeem() should update status and redemption fields.
#         """
#         coupon = Coupon.objects.create(name="RANJIT", price=Decimal("1000.00"))

#         created = GeneratedCoupon.bulk_generate(coupon, qty=3)
#         self.assertEqual(len(created), 3)

#         codes = [g.code for g in created]
#         self.assertIn("RANJIT_01", codes)
#         self.assertIn("RANJIT_02", codes)
#         self.assertIn("RANJIT_03", codes)

#         # redeem the first one
#         gc = created[0]
#         customer = Customer.objects.create(name="Ravi", phone="99999")
#         sale = Sale.objects.create(
#             invoice_no="INV777",
#             customer=customer,
#             payment_method=Sale.PAYMENT_COUPON,
#         )

#         gc.redeem(sale=sale, customer=customer)
#         gc.refresh_from_db()

#         self.assertEqual(gc.status, GeneratedCoupon.STATUS_REDEEMED)
#         self.assertEqual(gc.redeemed_invoice_no, "INV777")
#         self.assertEqual(gc.assigned_to, customer)
#         self.assertEqual(gc.customer_no, "99999")
#         self.assertIsNotNone(gc.redemption_date)

#     def test_discount_is_active_and_validity_days(self):
#         """
#         Discount.is_active should be True when today is between start_date
#         and end_date (inclusive). validity_days should be inclusive diff.
#         """
#         today = timezone.localdate()
#         start = today - timedelta(days=1)
#         end = today + timedelta(days=1)

#         d = Discount.objects.create(
#             title="Test Discount",
#             code="ABC123",
#             applicable=Discount.APPLICABLE_PRODUCT,
#             mode=Discount.MODE_NORMAL,
#             value_type=Discount.VAL_PERCENT,
#             value=Decimal("10.00"),
#             start_date=start,
#             end_date=end,
#         )
#         # M2M branches is optional: we can attach later if needed

#         self.assertTrue(d.is_active)
#         self.assertEqual(d.validity_days, (end - start).days + 1)


# # -------------------------------------------------------------------
# # Hold Bill
# # -------------------------------------------------------------------
# class HoldBillTests(BaseSetupMixin, TestCase):
#     def test_hold_bill_sequence_and_line_denormalization(self):
#         """
#         HoldBill.save() should auto generate number, and HoldBillLine.save()
#         should denormalize barcode, mrp, sp from Product.
#         """
#         loc, outlet, user, emp = self.create_outlet_and_employee()

#         customer = Customer.objects.create(name="Temp Cust", phone="12345")

#         hb = HoldBill.objects.create(
#             number="",  # auto
#             customer=customer,
#             customer_name=customer.name,
#             customer_phone=customer.phone,
#             location=loc,
#             created_by=emp,
#         )
#         self.assertTrue(hb.number.startswith("HB"))

#         task_item = self.create_task_item()
#         product = Product.objects.create(
#             barcode="HB123",
#             task_item=task_item,
#             mrp=Decimal("700.00"),
#             selling_price=Decimal("500.00"),
#         )

#         line = HoldBillLine.objects.create(
#             bill=hb,
#             product=product,
#             qty=2,
#             # mrp/sp/barcode will be filled by save()
#         )
#         self.assertEqual(line.barcode, "HB123")
#         self.assertEqual(line.mrp, Decimal("700.00"))
#         self.assertEqual(line.sp, Decimal("500.00"))
#         self.assertEqual(line.qty, 2)


# # -------------------------------------------------------------------
# # Supplier / Account / Expense / RegisterClosing
# # -------------------------------------------------------------------
# class ExpenseAndClosingTests(BaseSetupMixin, TestCase):
#     def test_supplier_and_account_and_expense(self):
#         """
#         Basic relation: Supplier + Account + Expense, and created_by_location()
#         should return location name when employee has outlet/location.
#         """
#         loc, outlet, user, emp = self.create_outlet_and_employee()

#         supplier = Supplier.objects.create(
#             company_name="ABC Textiles",
#             gstin="22AAAAA0000A1Z5",
#         )

#         acct = Account.objects.create(
#             name="Rent Expense",
#             group_name="Indirect Expenses",
#             group_nature=Account.NATURE_EXPENSES,
#             account_type="expenses",
#         )

#         exp = Expense.objects.create(
#             supplier=supplier,
#             account=acct,
#             amount=Decimal("5000.00"),
#             created_by=emp,
#         )

#         self.assertEqual(str(supplier), "ABC Textiles (22AAAAA0000A1Z5)")
#         self.assertEqual(str(acct), "Rent Expense")
#         self.assertEqual(str(exp), f"Expense {exp.id} - {supplier}")
#         self.assertEqual(exp.created_by_location(), loc.name)

#     def test_register_closing_str(self):
#         """
#         RegisterClosing.__str__ should include location code/name and closed_at.
#         """
#         loc = self.create_location(code="M3M", name="M3M Urbana")
#         rc = RegisterClosing.objects.create(
#             location=loc,
#             opening_cash=Decimal("1000.00"),
#             cash_payment=Decimal("2000.00"),
#         )

#         text = str(rc)
#         self.assertIn("M3M", text)
#         self.assertIn(str(rc.closed_at.year), text)
