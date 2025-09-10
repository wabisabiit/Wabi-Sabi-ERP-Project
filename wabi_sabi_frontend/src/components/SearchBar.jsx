import React from "react";
import "../styles/SearchBar.css";

export default function SearchBar() {
  return (
    <div className="search-row">
      <div className="container search-bar">
        <input className="scan" type="text" placeholder="Scan Barcode/Enter Product Name" />
        <div className="customer-input">
          <input type="text" placeholder="Walk in Customer" />
          <button className="edit-btn"><span className="material-icons">edit</span></button>
        </div>
        <input className="invoice" type="text" placeholder="Scan Sales Invoice" />
      </div>
    </div>
  );
}
