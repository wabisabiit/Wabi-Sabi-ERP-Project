import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

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

export default function App() {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Your current POS screen */}
      <Route path="/" element={<POSLayout />} />

      {/* Multiple Pay screen */}
      <Route
        path="/multiple-pay"
        element={
          <MultiplePay
            // TODO: swap this stub with your real cart data
            cart={{
              customerType: "Walk In Customer",
              items: [
                { id: 1, name: "(120)(G) Shirt & Blouse", qty: 1, price: 285, tax: 14.29 }
              ],
              roundoff: 0
            }}
            onBack={() => navigate(-1)}
            onProceed={(payload) => {
              console.log("Proceed clicked:", payload);
              // Call your API here, then:
              navigate("/"); // go back to POS
            }}
          />
        }
      />
    </Routes>
  );
}
