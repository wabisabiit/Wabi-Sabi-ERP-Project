import React from "react";
import "../styles/CustomerDetails.css";

export default function CustomerDetails() {
  return (
    <div className="customer-details">
      <h3>Customer Details</h3>

      <div className="details">
        <p><strong>Last Visited:</strong> -</p>
        <p><strong>Last Bill Amount:</strong> ₹0</p>
        <p><strong>Most Purchased Item:</strong> 0</p>
        <p><strong>Payment Mode:</strong> -</p>
        <p><strong>Due Payment:</strong> 0</p>
        <p><strong>Total Purchase:</strong> 0</p>
        <p><strong>Loyalty Points:</strong> 0</p>
      </div>

      <hr />
      <div className="last-bill">
        <p><strong>Last Bill No.:</strong> -</p>
        <p><strong>Last Bill Amount:</strong> ₹-</p>
      </div>

      <button className="print-btn">
        <span className="material-icons">print</span>
        <span>Last Bill Print</span>
      </button>
    </div>
  );
}
