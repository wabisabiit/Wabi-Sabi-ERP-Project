import React from "react";

export default function Header() {
  return (
    <div className="header">
      <div className="logo">Wabi Sabi <span className="erp">ERP</span></div>
      <div className="options">
        <label>
          <input type="radio" name="mode" /> Walk In
        </label>
        <label>
          <input type="radio" name="mode" /> Delivery
        </label>
        <span>Salesman: 
          <select style={{marginLeft:'10px'}}>
            <option>IT Account</option>
          </select>
        </span>
        <input style={{marginLeft:'10px'}} placeholder="Scan Barcode/Enter Product Name" />
        <input style={{marginLeft:'10px'}} placeholder="Walk in Customer" />
        <input style={{marginLeft:'10px'}} placeholder="Scan Sales Invoice" />
      </div>
    </div>
  );
}
