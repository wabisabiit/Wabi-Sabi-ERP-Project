import React from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CartTable from "./components/CartTable";
import RightPanel from "./components/RightPanel";
import Footer from "./components/Footer";
import "./App.css";

export default function App() {
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
