// src/App.jsx
import React, { Suspense, lazy, useMemo, useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

/* ---------- Eager core (POS shell + sidebar) ---------- */
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CartTable from "./components/CartTable";
import RightPanel from "./components/RightPanel";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import PosPage from "./components/PosPage";
import Dashboard from "./components/Dashboard"; // 🔹 from partner co

import ReceiptPdfPage from "./components/ReceiptPdfPage";


/* Keep base styles LAST so they win the cascade */
import "./App.css";

/* ---------- Auth ---------- */
import { AuthProvider } from "./auth/AuthContext";
import RoleRoute from "./auth/RoleRoute";

/* 🔹 API helper (for restoring hold bills) */
import { getProductByBarcode } from "./api/client";

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
const NewExpensePage = lazy(() => import("./components/NewExpense")); // ✅ ADDED
const NewBankPage = lazy(() => import("./components/NewBankPage"));
const PaymentCreatePage = lazy(() => import("./components/PaymentCreatePage"));
const BankDetailPage = lazy(() => import("./components/BankDetailPage"));
const BankEditPage = lazy(() => import("./components/BankEditPage"));

// Inventory core
const ProductsPage = lazy(() => import("./components/InventoryProductsPage"));
const NewInventoryProductPage = lazy(() =>
  import("./components/NewInventoryProductPage")
);
const InventoryProductDetailPage = lazy(() =>
  import("./components/InventoryProductDetailPage")
);

// Stock Transfer
const StockTransferPage = lazy(() => import("./components/StockTransferPage"));
const MasterPackagingPage = lazy(() => import("./components/MasterPackagingPage"));

// Inventory -> report
const InvMasterPackingItemWiseSummary = lazy(() =>
  import("./components/InvMasterPackingItemWiseSummary")
);
const InvSalesRegister = lazy(() => import("./components/InvSalesRegister"));
const InvInventoryReport = lazy(() => import("./components/InvInventoryReport"));
const InvStockSummary = lazy(() => import("./components/InvStockSummary"));

// Reports
const ReportsPage = lazy(() => import("./components/ReportsPage"));
const DayWiseSalesSummaryPage = lazy(() =>
  import("./components/ReportsPage").then((m) => ({
    default: m.DayWiseSalesSummaryPage,
  }))
);
const ReportSalesRegister = lazy(() =>
  import("./components/ReportSalesRegister")
);
const ReportCategoryWiseSales = lazy(() =>
  import("./components/ReportCategoryWiseSales")
);
const ReportSalesMan = lazy(() => import("./components/ReportSalesMan"));
const ReportCreditNoteItemRegister = lazy(() =>
  import("./components/ReportCreditNoteItemRegister")
);
const ReportProductWiseSales = lazy(() =>
  import("./components/ReportProductWiseSales")
);
const WowBillReport = lazy(() => import("./components/WowBillReport"));
const WowBillSlab = lazy(() => import("./components/WowBillSlab"));
const TaxWiseSalesSummaryPage = lazy(() =>
  import("./components/TaxWiseSalesSummaryPage")
);
const ReportSalesSummary = lazy(() => import("./components/ReportSalesSummary"));
const ReportCustomerWiseSalesOrder = lazy(() =>
  import("./components/ReportCustomerWiseSalesOrder")
);

const InvoiceViewPage = lazy(() => import("./components/InvoiceViewPage"));


// Settings
const SettingsHome = lazy(() => import("./components/SettingsHome"));
const GeneralSettingsPage = lazy(() =>
  import("./components/GeneralSettingsPage")
);
const EditProfilePage = lazy(() => import("./components/EditProfilePage"));
const NewUserRolePage = lazy(() => import("./components/NewUserRolePage"));
const PosSettingPage = lazy(() => import("./components/PosSettingPage"));
const NotificationSettingsPage = lazy(() =>
  import("./components/NotificationSettingsPage")
);
const IntegrationPage = lazy(() => import("./components/IntegrationPage"));

// Accounting
const AccountPage = lazy(() => import("./components/AccountPage"));
const OpeningBalancePage = lazy(() =>
  import("./components/OpeningBalancePage")
);

const InvoiceCustomerDetailPage = React.lazy(() =>
  import("./components/InvoiceCustomerDetailPage")
);

/* 🔹 Cash payment screen */
const CashPayment = lazy(() => import("./components/CashPayment"));

/* 🔹 NEW: Material Consumption */
const MaterialConsumptionListPage = lazy(() =>
  import("./components/MaterialConsumptionListPage")
);
const NewMaterialConsumptionPage = lazy(() =>
  import("./components/NewMaterialConsumptionPage")
);
const MaterialConsumptionDetailPage = lazy(() =>
  import("./components/MaterialConsumptionDetailPage")
);

import RegisterSessionGate from "./components/RegisterSessionGate";

/* 🔹 Auth pages from partner code */
const Login = lazy(() => import("./components/Login"));
// const Signup = lazy(() => import("./components/Signup"));

/* ---------- Layouts ---------- */
// POS layout with cart state (kept from YOUR code)
function POSLayout() {
  const [items, setItems] = useState([]);

  // debug: har render pe items length dekho
  console.log("POSLayout render, items length =", items.length);

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

  // 🔄 yahi parent ko CartTable se updates milenge
  const handleRowsChange = (nextRows) => {
    console.log(
      "POSLayout.handleRowsChange called, new length =",
      nextRows.length,
      nextRows
    );
    setItems(nextRows);
  };

  const totals = useMemo(() => {
    const totalQty = items.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const amount = items.reduce(
      (s, r) => s + (Number(r.netAmount) || 0) * (Number(r.qty) || 0),
      0
    );
    return { totalQty, amount };
  }, [items]);

  const handleReset = (res) => {
    if (res?.invoice_no) {
      try {
        alert(`Payment successful.\nInvoice: ${res.invoice_no}`);
      } catch (_) { }
    }
    setItems([]); // clear cart for next customer
  };

  // 🔁 Listen for restored hold bills (from HoldBillPanel)
  useEffect(() => {
    const handler = (e) => {
      const payload = e.detail || {};
      const lines = Array.isArray(payload.lines) ? payload.lines : [];
      if (!lines.length) return;

      (async () => {
        const rebuilt = [];
        for (const ln of lines) {
          const barcode = (ln.barcode || "").trim();
          if (!barcode) continue;

          try {
            const p = await getProductByBarcode(barcode);
            const qty = Number(ln.qty || 1) || 1;

            rebuilt.push({
              id:
                crypto.randomUUID?.() ||
                `${p.id || barcode}-${Date.now()}-${Math.random()}`,
              itemcode: p.barcode,
              product: p.vasyName || "",
              qty,
              mrp: p.mrp,
              discount: undefined,
              addDisc: undefined,
              unitCost: undefined,
              netAmount: p.sellingPrice ?? 0,
            });
          } catch (err) {
            console.error("Failed to restore hold line", barcode, err);
          }
        }

        if (rebuilt.length) {
          setItems(rebuilt);
          try {
            alert(
              payload.message ||
              `${payload.number || "Hold bill"} restored into cart.`
            );
          } catch (_) { }
        }
      })();
    };

    window.addEventListener("pos:hold-loaded", handler);
    return () => window.removeEventListener("pos:hold-loaded", handler);
  }, []);

  return (
    <div className="app">
      <Header />
      <SearchBar onAddItem={handleAddItem} />
      <main className="main">
        <div className="left-section">
          <div className="table-wrap">
            {/* 🔧 yaha onRowsChange pass karo */}
            <CartTable items={items} onRowsChange={handleRowsChange} />
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
      <div className="with-sb" style={{ marginLeft: ICON_RAIL }}>
        {children}
      </div>
    </>
  );
}

/* ---------- App ---------- */
export default function App() {
  const navigate = useNavigate();

  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          {/* <Route path="/signup" element={<Signup />} /> */}

          {/* Root → Login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 🔹 Dashboard: ADMIN only */}
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <Dashboard />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          <Route
            path="/sales/invoice-view/:invNo"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <InvoiceViewPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />


          {/* 🔹 POS ROUTES — Admin + Manager */}
          <Route
            path="/new"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <RegisterSessionGate>
                  <POSLayout />
                </RegisterSessionGate>
              </RoleRoute>
            }
          />

          <Route
            path="/pos"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <PosPage />
              </RoleRoute>
            }
          />
          <Route
            path="/multiple-pay"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <MultiplePay
                  cart={{
                    customerType: "Walk In Customer",
                    items: [
                      {
                        id: 1,
                        name: "(120)(G) Shirt & Blouse",
                        qty: 1,
                        price: 285,
                        tax: 14.29,
                      },
                    ],
                    roundoff: 0,
                  }}
                  onBack={() => navigate(-1)}
                  onProceed={() => navigate("/new")}
                />
              </RoleRoute>
            }
          />
          <Route
            path="/cash-pay"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <CashPayment />
              </RoleRoute>
            }
          />
          {/* I’m assuming Credit Note screen is POS-related */}
          <Route
            path="/credit-note"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <CreditNotePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* 🔹 EVERYTHING BELOW = ADMIN ONLY 🔒 */}

          {/* Contact */}
          <Route
            path="/contact"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <ContactPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin/employee"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <EmployeePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/admin/employee/new"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <EmployeeCreatePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          <Route
            path="/admin/employee/:id"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <EmployeeCreatePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          <Route
            path="/admin/outlet"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <OutletPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/admin/outlet/new"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <OutletCreatePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Inventory -> Reports (from Inventory tab cards) */}
          <Route
            path="/inventory/master-packing-itemwise-summary"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <InvMasterPackingItemWiseSummary />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          <Route
            path="/inventory/sales-register"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <InvSalesRegister />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          <Route
            path="/inventory/inventory-report"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <InvInventoryReport />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          <Route
            path="/inventory/stock-summary"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <InvStockSummary />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* 🔹 NEW: match Inventory → Stock Register menu */}
          <Route
            path="/inventory/stock-register"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <InvStockSummary />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Inventory */}
          <Route
            path="/inventory/products"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <ProductsPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/inventory/products/new"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <NewInventoryProductPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/inventory/stock-transfer"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <StockTransferPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/inventory/products/:id"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <InventoryProductDetailPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/inventory/master-packaging"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <MasterPackagingPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Material Consumption */}
          <Route
            path="/inventory/material-consumption"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <MaterialConsumptionListPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/inventory/material-consumption/new"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <NewMaterialConsumptionPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/inventory/material-consumption/:consNo"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <MaterialConsumptionDetailPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* CRM */}
          <Route
            path="/crm/loyalty"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <LoyaltyPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/crm/loyalty/point-setup"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <PointSetupPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/crm/loyalty/campaign/new"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <CampaignCreatePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          <Route
            path="/crm/discount"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <DiscountPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/crm/discount/new"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <NewDiscountPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          <Route
            path="/crm/coupon"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <CouponPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/crm/coupon/new"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <NewCoupounPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          <Route
            path="/crm/feedback"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <FeedbackPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Sales List & Invoice screens */}
          <Route
            path="/sales/sale-list"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <SaleListPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/order-list"
            element={<Navigate to="/sales/sale-list" replace />}
          />

          <Route
            path="/sales/invoice"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <InvoicePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/sales/invoice/new"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <NewInvoicePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/sales/invoice/:invoiceNo"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <InvoiceDetailPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/customer/:slug"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <InvoiceCustomerDetailPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Sales Register (existing) */}
          <Route
            path="/sales-register"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <SalesRegisterPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Utilities */}
          <Route
            path="/utilities/barcode2"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <BarcodeUtility2Page />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/utilities/barcode2/confirm"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <BarcodePrintConfirmPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/utilities/barcode2/expanded"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <ExpandedLabelsPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Reports */}
          <Route
            path="/reports"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <ReportsPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/day-wise-sales-summary"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <DayWiseSalesSummaryPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/sales-register"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <MiniSidebarLayout>
                  <ReportSalesRegister />
                </MiniSidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/category-wise-sales-summary"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <ReportCategoryWiseSales />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/credit-note-item-register"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <MiniSidebarLayout>
                  <ReportCreditNoteItemRegister />
                </MiniSidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/product-wise-sales-summary"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <ReportProductWiseSales />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/salesman"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <ReportSalesMan />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/wow-bill-report"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <WowBillReport />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/wow-bill-slab"        // 👈 NEW ROUTE
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <WowBillSlab />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/tax-wise-sales-summary"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <TaxWiseSalesSummaryPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/sales-summary"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <SidebarLayout>
                  <ReportSalesSummary />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/reports/customer-wise-sales-order-report"
            element={
              <RoleRoute allowed={["ADMIN", "MANAGER"]}>
                <MiniSidebarLayout>
                  <ReportCustomerWiseSalesOrder />
                </MiniSidebarLayout>
              </RoleRoute>
            }
          />

          {/* Bank / Cash */}
          <Route
            path="/bank"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <BankPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/bank/:slug"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <BankDetailPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/bank/:slug/edit"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <BankEditPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/bank/transactions"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <BankTransactionPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/bank/payment"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <PaymentPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/bank/receipt"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <ReceiptPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/bank/expense"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <ExpensePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/bank/expense/new" // ✅ NEW ROUTE
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <NewExpensePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/bank/new"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <NewBankPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/bank/payment/new"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <PaymentCreatePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <SettingsHome />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/settings/general"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <GeneralSettingsPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/settings/general/profile/edit"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <EditProfilePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/settings/general/roles/new"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <NewUserRolePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/settings/pos"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <PosSettingPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/settings/notification"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <NotificationSettingsPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/settings/integration"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <IntegrationPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Accounting */}
          <Route
            path="/accounting/account"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <AccountPage />
                </SidebarLayout>
              </RoleRoute>
            }
          />
          <Route
            path="/accounting/opening-balance"
            element={
              <RoleRoute allowed={["ADMIN"]}>
                <SidebarLayout>
                  <OpeningBalancePage />
                </SidebarLayout>
              </RoleRoute>
            }
          />

          {/* Fallback → Login */}
          <Route path="/receipt/:type/:number" element={<ReceiptPdfPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
