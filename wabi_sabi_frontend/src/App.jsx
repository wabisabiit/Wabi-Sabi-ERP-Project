import React from "react";
import Header from "./components/Header";
import ProductTable from "./components/ProductTable";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <div className="pos-container">
      <Header />
      <div className="main-section">
        <ProductTable />
        <Sidebar />
      </div>
      <Footer />
    </div>
  );
}

export default App;
