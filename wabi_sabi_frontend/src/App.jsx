// src/App.jsx
import React, { Suspense, lazy, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

/* ---------- Eager core (POS shell + sidebar) ---------- */
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CartTable from "./components/CartTable";
import RightPanel from "./components/RightPanel";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import PosPage from "./components/PosPage";

/* Keep base styles LAST so they win the cascade */
import "./App.css";

/* ---------- Lazy pages ---------- */
// CRM
const NewDiscountPage = lazy(() => import("./components/NewDiscountPage"));
const CampaignCreatePage = lazy(() => import("./components/CampaignCreatePage"));
const LoyaltyPage = lazy(() => import("./components/LoyaltyPage"));
const DiscountPage = lazy(() => import("./components/DiscountPage"));
const CouponPage = lazy(() => import("./components/CouponPage"));
const NewCoupounPage = lazy(() => import("./components/NewCoupounPage"));
const FeedbackPage = lazy(() => import("./components/FeedbackPage"));
const PointSetupPage = lazy(() => import("./components/PointSetupPage"));

// Sales / POS extras
const MultiplePay = lazy(() => import("./components/MultiplePay"));
const CreditNotePage = lazy(() => import("./components/CreditNotePage"));
/* ✅ Renamed: use SaleListPage instead of OrderListPage */
const SaleListPage = lazy(() => import("./components/SalesListPage"));
const InvoicePage = lazy(() => import("./components/InvoicePage"));
const NewInvoicePage = lazy(() => import("./components/NewInvoicePage"));
const InvoiceDetailPage = lazy(() => import("./components/InvoiceDetailPage"));
const SalesRegisterPage = lazy(() => import("./components/SalesRegisterPage"));

// Admin
const EmployeePage = lazy(() => import("./components/EmployeePage"));
const EmployeeCreatePage = lazy(() => import("./components/EmployeeCreatePage"));
const OutletPage = lazy(() => import("./components/OutletPage"));
const OutletCreatePage = lazy(() => import("./components/OutletCreatePage"));

// Utilities
const BarcodeUtility2Page = lazy(() => import("./components/BarcodeUtility2Page"));
const BarcodePrintConfirmPage = lazy(() => import("./components/BarcodePrintConfirmPage"));
const ExpandedLabelsPage = lazy(() => import("./components/ExpandedLabelsPage"));

// Contact
const ContactPage = lazy(() => import("./components/ContactPage"));

// Bank / Cash
const BankPage = lazy(() => import("./components/BankPage"));
const BankTransactionPage = lazy(() => import("./components/BankTransactionPage"));
const PaymentPage = lazy(() => import("./components/PaymentPage"));
const ReceiptPage = lazy(() => import("./components/ReceiptPage"));
const ExpensePage = lazy(() => import("./components/ExpensePage"));
const NewBankPage = lazy(() => import("./components/NewBankPage"));
const PaymentCreatePage = lazy(() => import("./components/PaymentCreatePage"));
const BankDetailPage = lazy(() => import("./components/BankDetailPage"));
const BankEditPage = lazy(() => import("./components/BankEditPage"));

// Inventory core
const ProductsPage = lazy(() => import("./components/InventoryProductsPage"));
const NewInventoryProductPage = lazy(() => import("./components/NewInventoryProductPage"));
const InventoryProductDetailPage = lazy(() => import("./components/InventoryProductDetailPage"));

// Stock Transfer
const StockTransferPage = lazy(() => import("./components/StockTransferPage"));
const MasterPackagingPage = lazy(() => import("./components/MasterPackagingPage"));

// Inventory -> report
const InvMasterPackingItemWiseSummary = lazy(() => import("./components/InvMasterPackingItemWiseSummary"));
const InvSalesRegister = lazy(() => import("./components/InvSalesRegister"));
const InvInventoryReport = lazy(() => import("./components/InvInventoryReport"));
const InvStockSummary = lazy(() => import("./components/InvStockSummary"));

// Reports
const ReportsPage = lazy(() => import("./components/ReportsPage"));
const DayWiseSalesSummaryPage = lazy(() =>
  import("./components/ReportsPage").then((m) => ({ default: m.DayWiseSalesSummaryPage }))
);
const ReportSalesRegister = lazy(() => import("./components/ReportSalesRegister"));
const ReportCategoryWiseSales = lazy(() => import("./components/ReportCategoryWiseSales"));
const ReportSalesMan = lazy(() => import("./components/ReportSalesMan"));
const ReportCreditNoteItemRegister = lazy(() => import("./components/ReportCreditNoteItemRegister"));
const ReportProductWiseSales = lazy(() => import("./components/ReportProductWiseSales"));
const WowBillReport = lazy(() => import("./components/WowBillReport"));
const TaxWiseSalesSummaryPage = lazy(() => import("./components/TaxWiseSalesSummaryPage"));
const ReportSalesSummary = lazy(() => import("./components/ReportSalesSummary"));
const ReportCustomerWiseSalesOrder = lazy(() => import("./components/ReportCustomerWiseSalesOrder"));

// Settings
const SettingsHome = lazy(() => import("./components/SettingsHome"));
const GeneralSettingsPage = lazy(() => import("./components/GeneralSettingsPage"));
const EditProfilePage = lazy(() => import("./components/EditProfilePage"));
const NewUserRolePage = lazy(() => import("./components/NewUserRolePage"));
const PosSettingPage = lazy(() => import("./components/PosSettingPage"));
const NotificationSettingsPage = lazy(() => import("./components/NotificationSettingsPage"));
const IntegrationPage = lazy(() => import("./components/IntegrationPage"));

// Accounting
const AccountPage = lazy(() => import("./components/AccountPage"));
const OpeningBalancePage = lazy(() => import("./components/OpeningBalancePage"));

const InvoiceCustomerDetailPage = React.lazy(() => import("./components/InvoiceCustomerDetailPage"));

/* ---------- Layouts ---------- */
// POS layout with cart state (kept from Code1)
function POSLayout() {
  const [items, setItems] = useState([]);

  const handleAddItem = (p) => {
    // p => { id, barcode, mrp, sellingPrice, vasyName }
    const row = {
      id: crypto.randomUUID?.() || `${p.id}-${Date.now()}`,
      itemcode: p.barcode,
      product: p.vasyName || "",
      qty: 1,
      mrp: p.mrp,
      discount: undefined,
      addDisc: undefined,
      unitCost: undefined,
      netAmount: p.sellingPrice ?? 0,
    };
    setItems((prev) => [...prev, row]);
  };

  const totals = useMemo(() => {
    const totalQty = items.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const amount = items.reduce((s, r) => s + (Number(r.netAmount) || 0) * (Number(r.qty) || 0), 0);
    return { totalQty, amount };
  }, [items]);

  const handleReset = (res) => {
    if (res?.invoice_no) {
      try { alert(`Payment successful.\nInvoice: ${res.invoice_no}`); } catch (_) { }
    }
    setItems([]); // clear cart for next customer
  };

  return (
    <div className="app">
      <Header />
      <SearchBar onAddItem={handleAddItem} />
      <main className="main">
        <div className="left-section">
          <div className="table-wrap">
            <CartTable items={items} />
          </div>
        </div>
        <RightPanel />
      </main>
      <Footer
        items={items}
        totalQty={totals.totalQty}
        amount={totals.amount}
        onReset={handleReset}
      />
    </div>
  );
}

function SidebarLayout({ children }) {
  return (
    <>
      <Sidebar open={true} persistent onClose={() => { }} />
      <div className="with-sb">{children}</div>
    </>
  );
}

function MiniSidebarLayout({ children }) {
  const ICON_RAIL = 56;
  return (
    <>
      <Sidebar open={true} persistent miniHover onClose={() => { }} />
      <div className="with-sb" style={{ marginLeft: ICON_RAIL }}>{children}</div>
    </>
  );
}

/* ---------- App ---------- */
export default function App() {
  const navigate = useNavigate();

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Navigate to="/new" replace />} />
        <Route path="/new" element={<POSLayout />} />
        <Route path="/pos" element={<PosPage />} />

        {/* Contact */}
        <Route path="/contact" element={<SidebarLayout><ContactPage /></SidebarLayout>} />

        {/* Admin */}
        <Route path="/admin/employee" element={<SidebarLayout><EmployeePage /></SidebarLayout>} />
        <Route path="/admin/employee/new" element={<SidebarLayout><EmployeeCreatePage /></SidebarLayout>} />
        <Route path="/admin/outlet" element={<SidebarLayout><OutletPage /></SidebarLayout>} />
        <Route path="/admin/outlet/new" element={<SidebarLayout><OutletCreatePage /></SidebarLayout>} />

        {/* Inventory */}
        <Route path="/inventory/products" element={<SidebarLayout><ProductsPage /></SidebarLayout>} />
        <Route path="/inventory/products/new" element={<SidebarLayout><NewInventoryProductPage /></SidebarLayout>} />
        <Route path="/inventory/stock-transfer" element={<SidebarLayout><StockTransferPage /></SidebarLayout>} />
        <Route path="/inventory/products/:id" element={<SidebarLayout><InventoryProductDetailPage /></SidebarLayout>} />
        <Route path="/inventory/master-packaging" element={<SidebarLayout><MasterPackagingPage /></SidebarLayout>} />


        {/* CRM */}
        <Route path="/crm/loyalty" element={<SidebarLayout><LoyaltyPage /></SidebarLayout>} />
        <Route path="/crm/loyalty/point-setup" element={<SidebarLayout><PointSetupPage /></SidebarLayout>} />
        <Route path="/crm/loyalty/campaign/new" element={<SidebarLayout><CampaignCreatePage /></SidebarLayout>} />

        <Route path="/crm/discount" element={<SidebarLayout><DiscountPage /></SidebarLayout>} />
        <Route path="/crm/discount/new" element={<SidebarLayout><NewDiscountPage /></SidebarLayout>} />

        <Route path="/crm/coupon" element={<SidebarLayout><CouponPage /></SidebarLayout>} />
        {/* Use whichever filename you really have (see note below) */}
        <Route path="/crm/coupon/new" element={<SidebarLayout><NewCoupounPage /></SidebarLayout>} />

        <Route path="/crm/feedback" element={<SidebarLayout><FeedbackPage /></SidebarLayout>} />


        {/* Multipay */}
        <Route
          path="/multiple-pay"
          element={
            <MultiplePay
              cart={{
                customerType: "Walk In Customer",
                items: [{ id: 1, name: "(120)(G) Shirt & Blouse", qty: 1, price: 285, tax: 14.29 }],
                roundoff: 0,
              }}
              onBack={() => navigate(-1)}
              onProceed={() => navigate("/new")}
            />
          }
        />


        {/* Inventory -> report routes */}
        <Route path="/inventory/master-packing-itemwise-summary" element={<SidebarLayout><InvMasterPackingItemWiseSummary /></SidebarLayout>} />
        <Route path="/inventory/sales-register" element={<MiniSidebarLayout><InvSalesRegister /></MiniSidebarLayout>} />
        <Route path="/inventory/inventory-report" element={<SidebarLayout><InvInventoryReport /></SidebarLayout>} />
        <Route path="/inventory/stock-summary" element={<SidebarLayout><InvStockSummary /></SidebarLayout>} />

        {/* Bank / Cash */}
        <Route path="/bank" element={<SidebarLayout><BankPage /></SidebarLayout>} />
        <Route path="/bank/:slug" element={<SidebarLayout><BankDetailPage /></SidebarLayout>} />
        <Route path="/bank/:slug/edit" element={<SidebarLayout><BankEditPage /></SidebarLayout>} />
        <Route path="/bank/transactions" element={<SidebarLayout><BankTransactionPage /></SidebarLayout>} />
        <Route path="/bank/payment" element={<SidebarLayout><PaymentPage /></SidebarLayout>} />
        <Route path="/bank/receipt" element={<SidebarLayout><ReceiptPage /></SidebarLayout>} />
        <Route path="/bank/expense" element={<SidebarLayout><ExpensePage /></SidebarLayout>} />
        <Route path="/bank/new" element={<SidebarLayout><NewBankPage /></SidebarLayout>} />
        <Route path="/bank/payment/new" element={<SidebarLayout><PaymentCreatePage /></SidebarLayout>} />

        {/* Settings */}
        <Route path="/settings" element={<SidebarLayout><SettingsHome /></SidebarLayout>} />
        <Route path="/settings/general" element={<SidebarLayout><GeneralSettingsPage /></SidebarLayout>} />
        <Route path="/settings/general/profile/edit" element={<SidebarLayout><EditProfilePage /></SidebarLayout>} />
        <Route path="/settings/general/roles/new" element={<SidebarLayout><NewUserRolePage /></SidebarLayout>} />
        <Route path="/settings/pos" element={<SidebarLayout><PosSettingPage /></SidebarLayout>} />
        <Route path="/settings/notification" element={<SidebarLayout><NotificationSettingsPage /></SidebarLayout>} />
        <Route path="/settings/integration" element={<SidebarLayout><IntegrationPage /></SidebarLayout>} />

        {/* Sales */}
        {/* ✅ Canonical Sales List path */}
        <Route path="/sales/sale-list" element={<SidebarLayout><SaleListPage /></SidebarLayout>} />
        {/* ♻️ Backward-compat: old /order-list → redirect */}
        <Route path="/order-list" element={<Navigate to="/sales/sale-list" replace />} />

        {/* Sales → Invoice */}
        <Route path="/sales/invoice" element={<SidebarLayout><InvoicePage /></SidebarLayout>} />
        <Route path="/sales/invoice/new" element={<SidebarLayout><NewInvoicePage /></SidebarLayout>} />
        <Route path="/sales/invoice/:invNo" element={<SidebarLayout><InvoiceDetailPage /></SidebarLayout>} />
        <Route path="/customer/:slug" element={<SidebarLayout><InvoiceCustomerDetailPage /></SidebarLayout>} />

        {/* Sales Register (existing) */}
        <Route path="/sales-register" element={<SidebarLayout><SalesRegisterPage /></SidebarLayout>} />

        {/* Utilities */}
        <Route path="/utilities/barcode2" element={<SidebarLayout><BarcodeUtility2Page /></SidebarLayout>} />
        <Route path="/utilities/barcode2/confirm" element={<SidebarLayout><BarcodePrintConfirmPage /></SidebarLayout>} />
        <Route path="/utilities/barcode2/expanded" element={<SidebarLayout><ExpandedLabelsPage /></SidebarLayout>} />

        {/* Reports */}
        <Route path="/reports" element={<SidebarLayout><ReportsPage /></SidebarLayout>} />
        <Route path="/reports/day-wise-sales-summary" element={<SidebarLayout><DayWiseSalesSummaryPage /></SidebarLayout>} />
        <Route path="/reports/sales-register" element={<MiniSidebarLayout><ReportSalesRegister /></MiniSidebarLayout>} />
        <Route path="/reports/category-wise-sales-summary" element={<SidebarLayout><ReportCategoryWiseSales /></SidebarLayout>} />
        <Route path="/reports/credit-note-item-register" element={<MiniSidebarLayout><ReportCreditNoteItemRegister /></MiniSidebarLayout>} />
        <Route path="/reports/product-wise-sales-summary" element={<SidebarLayout><ReportProductWiseSales /></SidebarLayout>} />
        <Route path="/reports/salesman" element={<SidebarLayout><ReportSalesMan /></SidebarLayout>} />
        <Route path="/reports/wow-bill-report" element={<SidebarLayout><WowBillReport /></SidebarLayout>} />
        <Route path="/reports/tax-wise-sales-summary" element={<SidebarLayout><TaxWiseSalesSummaryPage /></SidebarLayout>} />
        <Route path="/reports/sales-summary" element={<SidebarLayout><ReportSalesSummary /></SidebarLayout>} />
        <Route path="/reports/customer-wise-sales-order-report" element={<MiniSidebarLayout><ReportCustomerWiseSalesOrder /></MiniSidebarLayout>} />

        {/* Accounting */}
        <Route path="/accounting/account" element={<SidebarLayout><AccountPage /></SidebarLayout>} />
        <Route path="/accounting/opening-balance" element={<SidebarLayout><OpeningBalancePage /></SidebarLayout>} />

        {/* Credit Note */}
        <Route path="/credit-note" element={<SidebarLayout><CreditNotePage /></SidebarLayout>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/new" replace />} />
      </Routes>
    </Suspense>
  );
}
