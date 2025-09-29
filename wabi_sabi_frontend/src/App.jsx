// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import NewDiscountPage from "./components/NewDiscountPage";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CartTable from "./components/CartTable";
import RightPanel from "./components/RightPanel";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";

import CampaignCreatePage from "./components/CampaignCreatePage";
import MultiplePay from "./components/MultiplePay";
import CreditNotePage from "./components/CreditNotePage";
import SalesRegisterPage from "./components/SalesRegisterPage";
import OrderList from "./components/OrderListPage";

import EmployeePage from "./components/EmployeePage";
import EmployeeCreatePage from "./components/EmployeeCreatePage";

import OutletPage from "./components/OutletPage";
import OutletCreatePage from "./components/OutletCreatePage";
import BarcodeUtilityPage from "./components/BarcodeUtilityPage";
import BarcodeUtility2Page from "./components/BarcodeUtility2Page";
import BarcodePrintConfirmPage from "./components/BarcodePrintConfirmPage";
import ExpandedLabelsPage from "./components/ExpandedLabelsPage";

import ContactPage from "./components/ContactPage";
import PointSetupPage from "./components/PointSetupPage";

// CRM pages
import LoyaltyPage from "./components/LoyaltyPage";
import DiscountPage from "./components/DiscountPage";
import CouponPage from "./components/CouponPage";
import NewCoupounPage from "./components/NewCoupounPage";
import FeedbackPage from "./components/FeedbackPage";

// Bank / Cash pages
import BankPage from "./components/BankPage";
import BankTransactionPage from "./components/BankTransactionPage";
import PaymentPage from "./components/PaymentPage";
import ReceiptPage from "./components/ReceiptPage";
import ExpensePage from "./components/ExpensePage";
import NewBankPage from "./components/NewBankPage";
import PaymentCreatePage from "./components/PaymentCreatePage";

// Settings pages
import SettingsHome from "./components/SettingsHome";
import GeneralSettingsPage from "./components/GeneralSettingsPage";
import EditProfilePage from "./components/EditProfilePage";
import NewUserRolePage from "./components/NewUserRolePage";
import PosSettingPage from "./components/PosSettingPage";

import ProductsPage from "./components/InventoryProductsPage";

import "./App.css";

/* ---------- Layouts ---------- */
function POSLayout() {
  return (
    <div className="app">
      <Header />
      <SearchBar />
      <main className="main">
        <div className="left-section">
          <div className="table-wrap">
            <CartTable />
          </div>
        </div>
        <RightPanel />
      </main>
      <Footer />
    </div>
  );
}

function SidebarLayout({ children }) {
  return (
    <>
      <Sidebar open={true} persistent onClose={() => {}} />
      <div className="with-sb">{children}</div>
    </>
  );
}

/* ---------- App ---------- */
export default function App() {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Home -> POS */}
      <Route path="/" element={<Navigate to="/new" replace />} />
      <Route path="/new" element={<POSLayout />} />

      {/* Contact */}
      <Route path="/contact" element={<SidebarLayout><ContactPage /></SidebarLayout>} />

      {/* Admin -> Employees */}
      <Route path="/admin/employee" element={<SidebarLayout><EmployeePage /></SidebarLayout>} />
      <Route path="/admin/employee/new" element={<SidebarLayout><EmployeeCreatePage /></SidebarLayout>} />

      {/* Admin -> Outlets */}
      <Route path="/admin/outlet" element={<SidebarLayout><OutletPage /></SidebarLayout>} />
      <Route path="/admin/outlet/new" element={<SidebarLayout><OutletCreatePage /></SidebarLayout>} />

      {/* Inventory */}
      <Route path="/inventory/products" element={<SidebarLayout><ProductsPage /></SidebarLayout>} />

      {/* Bank / Cash */}
      <Route path="/bank" element={<SidebarLayout><BankPage /></SidebarLayout>} />
      <Route path="/bank/transactions" element={<SidebarLayout><BankTransactionPage /></SidebarLayout>} />
      <Route path="/bank/payment" element={<SidebarLayout><PaymentPage /></SidebarLayout>} />
      <Route path="/bank/receipt" element={<SidebarLayout><ReceiptPage /></SidebarLayout>} />
      <Route path="/bank/expense" element={<SidebarLayout><ExpensePage /></SidebarLayout>} />
      <Route path="/bank/new" element={<SidebarLayout><NewBankPage /></SidebarLayout>} />
      <Route path="/bank/payment/new" element={<SidebarLayout><PaymentCreatePage /></SidebarLayout>} />

      {/* Sales */}
      <Route path="/sales-register" element={<SidebarLayout><SalesRegisterPage /></SidebarLayout>} />
      <Route path="/order-list" element={<SidebarLayout><OrderList /></SidebarLayout>} />

      {/* Utilities */}
      <Route path="/utilities/barcode" element={<SidebarLayout><BarcodeUtilityPage /></SidebarLayout>} />
      <Route path="/utilities/barcode2" element={<SidebarLayout><BarcodeUtility2Page /></SidebarLayout>} />
      <Route path="/utilities/barcode2/confirm" element={<SidebarLayout><BarcodePrintConfirmPage /></SidebarLayout>} />
      {/* ✅ Third page with sidebar */}
      <Route path="/utilities/barcode2/expanded" element={<SidebarLayout><ExpandedLabelsPage /></SidebarLayout>} />

      {/* Settings */}
      <Route path="/settings" element={<SidebarLayout><SettingsHome /></SidebarLayout>} />
      <Route path="/settings/general" element={<SidebarLayout><GeneralSettingsPage /></SidebarLayout>} />
      <Route path="/settings/general/profile/edit" element={<SidebarLayout><EditProfilePage /></SidebarLayout>} />
      <Route path="/settings/general/roles/new" element={<SidebarLayout><NewUserRolePage /></SidebarLayout>} />
      <Route path="/settings/pos" element={<SidebarLayout><PosSettingPage /></SidebarLayout>} />

      {/* Credit Note */}
      <Route path="/credit-note" element={<SidebarLayout><CreditNotePage /></SidebarLayout>} />

      {/* CRM */}
      <Route path="/crm/loyalty" element={<SidebarLayout><LoyaltyPage /></SidebarLayout>} />
      <Route path="/crm/loyalty/point-setup" element={<SidebarLayout><PointSetupPage /></SidebarLayout>} />
      <Route path="/crm/loyalty/campaign/new" element={<SidebarLayout><CampaignCreatePage /></SidebarLayout>} />
      <Route path="/crm/discount" element={<SidebarLayout><DiscountPage /></SidebarLayout>} />
      <Route path="/crm/discount/new" element={<SidebarLayout><NewDiscountPage /></SidebarLayout>} />
      <Route path="/crm/coupon" element={<SidebarLayout><CouponPage /></SidebarLayout>} />
      <Route path="/crm/coupon/new" element={<SidebarLayout><NewCoupounPage /></SidebarLayout>} />
      <Route path="/crm/feedback" element={<SidebarLayout><FeedbackPage /></SidebarLayout>} />

      {/* Multiple Pay (POS flow) */}
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/new" replace />} />
    </Routes>
  );
}
