import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CartTable from "./components/CartTable";
import RightPanel from "./components/RightPanel";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";

import MultiplePay from "./components/MultiplePay";
import CreditNotePage from "./components/CreditNotePage";
import SalesRegisterPage from "./components/SalesRegisterPage";
import OrderList from "./components/OrderListPage";
import EmployeePage from "./components/EmployeePage";
import EmployeeCreatePage from "./components/EmployeeCreatePage";
import OutletPage from "./components/OutletPage";
import OutletCreatePage from "./components/OutletCreatePage";
import BarcodeUtilityPage from "./components/BarcodeUtilityPage"; // ✅ Utilities > Barcode
import ContactPage from "./components/ContactPage";
import "./App.css";

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
      {/* Sidebar forced open + persistent so page hamesha sidebar ke saath dikhe */}
      <Sidebar open={true} persistent onClose={() => {}} />
      <div className="with-sb">{children}</div>
    </>
  );
}

export default function App() {
  const navigate = useNavigate();

  return (
    <Routes>
  <Route path="/" element={<Navigate to="/new" replace />} />
  <Route path="/new" element={<POSLayout />} />

  {/* NEW: Contact with sidebar */}
  <Route path="/contact" element={<SidebarLayout><ContactPage /></SidebarLayout>} />

  <Route path="/credit-note" element={<SidebarLayout><CreditNotePage /></SidebarLayout>} />
  <Route path="/order-list" element={<SidebarLayout><OrderList /></SidebarLayout>} />

  {/* Employees */}
  <Route path="/admin/employee" element={<SidebarLayout><EmployeePage /></SidebarLayout>} />
  <Route path="/admin/employee/new" element={<SidebarLayout><EmployeeCreatePage /></SidebarLayout>} />

  {/* Outlets */}
  <Route path="/admin/outlet" element={<SidebarLayout><OutletPage /></SidebarLayout>} />
  <Route path="/admin/outlet/new" element={<SidebarLayout><OutletCreatePage /></SidebarLayout>} />

  <Route path="/sales-register" element={<SidebarLayout><SalesRegisterPage /></SidebarLayout>} />

  {/* Utilities > Barcode */}
  <Route path="/utilities/barcode" element={<SidebarLayout><BarcodeUtilityPage /></SidebarLayout>} />
  <Route path="/Utilities/Barcode Utility" element={<Navigate to="/utilities/barcode" replace />} />

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

  <Route path="*" element={<Navigate to="/new" replace />} />
</Routes>

  );
}
