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
import EmployeeCreatePage from "./components/EmployeeCreatePage"; // ✅ NEW
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
      <Sidebar open={true} persistent onClose={() => {}} />
      <div className="with-sb">{children}</div>
    </>
  );
}

export default function App() {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* default: / -> /new */}
      <Route path="/" element={<Navigate to="/new" replace />} />

      {/* POS → New */}
      <Route path="/new" element={<POSLayout />} />

      {/* Credit note page */}
      <Route
        path="/credit-note"
        element={
          <SidebarLayout>
            <CreditNotePage />
          </SidebarLayout>
        }
      />

      {/* Order List */}
      <Route
        path="/order-list"
        element={
          <SidebarLayout>
            <OrderList />
          </SidebarLayout>
        }
      />

      {/* Employee List */}
      <Route
        path="/admin/employee"
        element={
          <SidebarLayout>
            <EmployeePage />
          </SidebarLayout>
        }
      />

      {/* ✅ Employee Create (exact-design page) */}
      <Route
        path="/admin/employee/new"
        element={
          <SidebarLayout>
            <EmployeeCreatePage />
          </SidebarLayout>
        }
      />

      {/* Sales Register */}
      <Route
        path="/sales-register"
        element={
          <SidebarLayout>
            <SalesRegisterPage />
          </SidebarLayout>
        }
      />

      {/* Multiple Pay screen */}
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
            onProceed={(payload) => {
              console.log("Proceed clicked:", payload);
              navigate("/new");
            }}
          />
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/new" replace />} />
    </Routes>
  );
}
