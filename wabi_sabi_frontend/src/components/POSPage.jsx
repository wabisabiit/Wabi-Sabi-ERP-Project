import React from "react";
import "./POSPage.css";

export default function POS() {
  return (
    <div className="pos-container">
      {/* Header */}
      <div className="header">
        <h2 className="logo">vasy <span className="erp">ERP</span></h2>
        <div className="options">
          <label><input type="radio" name="mode" /> Walk In</label>
          <label><input type="radio" name="mode" /> Delivery Salesman</label>
          <select>
            <option>IT Account</option>
          </select>
          <button className="support">Support Desk</button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input type="text" placeholder="Scan Barcode/Enter Product" />
        <select>
          <option>Walk In Customer</option>
        </select>
        <button>Scan Sales Invoice</button>
      </div>

      {/* Table */}
      <table className="pos-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Itemcode</th>
            <th>Product</th>
            <th>Qty</th>
            <th>MRP</th>
            <th>Discount</th>
            <th>Add Disc</th>
            <th>Unit Cost</th>
            <th>Net Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan="9" className="no-items">No items added</td>
          </tr>
        </tbody>
      </table>

      {/* Remarks */}
      <input type="text" className="remarks" placeholder="Remarks" />

      {/* Summary */}
      <div className="summary">
        <span>Quantity: 0</span>
        <span>MRP: 0</span>
        <span>Tax Amount: 0</span>
        <span>Discount: 0</span>
        <span>Flat Discount: 0%</span>
        <span>Round OFF: 0</span>
        <span>Amount: 0</span>
      </div>

      {/* Buttons */}
      <div className="buttons">
        <button>Multiple Pay (F12)</button>
        <button>Redeem Credit</button>
        <button>Hold (F6)</button>
        <button>UPI (F5)</button>
        <button>Card (F3)</button>
        <button>Cash (F4)</button>
        <button>Apply Coupon</button>
        <button>Pay Later (F1)</button>
        <button>Hold & Print (F7)</button>
        <button>UPI & Print (F10)</button>
        <button>Card & Print (F9)</button>
        <button>Cash & Print (F8)</button>
      </div>

      {/* Customer Details */}
      <div className="customer">
        <h3>Customer Details</h3>
        <p>Last Visited: -</p>
        <p>Last Bill Amount: ₹0</p>
        <p>Most Purchased Item: 0</p>
        <p>Payment Mode: -</p>
        <p>Due Payment: 0</p>
        <p>Total Purchase: 0</p>
        <p>Loyalty Points: 0</p>
      </div>
    </div>
  );
}
