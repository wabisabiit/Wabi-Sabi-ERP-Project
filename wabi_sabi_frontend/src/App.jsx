import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CartTable from "./components/CartTable";
import RightPanel from "./components/RightPanel";
import Footer from "./components/Footer";

import MultiplePay from "./components/MultiplePay";
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

/* lightweight placeholders — chaho to baad me real pages se replace kar dena */
const OrdersPage = () => <div style={{padding:16}}>Orders List</div>;
const CreditNotePage = () => <div style={{padding:16}}>Credit Notes</div>;
const SalesRegisterPage = () => <div style={{padding:16}}>Sales Register</div>;

export default function App() {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* default: / -> /new */}
      <Route path="/" element={<Navigate to="/new" replace />} />

      {/* POS → New (your current POS screen) */}
      <Route path="/new" element={<POSLayout />} />

      {/* Other POS modules (optional) */}
      <Route path="/order-list" element={<OrdersPage />} />
      <Route path="/credit-note" element={<CreditNotePage />} />
      <Route path="/sales-register" element={<SalesRegisterPage />} />

      {/* Multiple Pay screen */}
      <Route
        path="/multiple-pay"
        element={
          <MultiplePay
            cart={{
              customerType: "Walk In Customer",
              items: [{ id: 1, name: "(120)(G) Shirt & Blouse", qty: 1, price: 285, tax: 14.29 }],
              roundoff: 0
            }}
            onBack={() => navigate(-1)}
            onProceed={(payload) => {
              console.log("Proceed clicked:", payload);
              navigate("/new"); // back to New POS after payment
            }}
          />
        }
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/new" replace />} />
    </Routes>
  );
}
