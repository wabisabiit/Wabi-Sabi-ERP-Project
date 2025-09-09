import React from "react";

export default function Sidebar() {
  return (
    <div className="sidebar">
      <button>Hold Bill</button>
      <button>Payments</button>
      <button>Redeem Loyalty</button>
      <button>Add Payment Credit Notes</button>
      <button>Orders</button>
      <button>Cash Control</button>

      <div className="customer-details">
        <h4>Customer Details</h4>
        <p>Last Visited: -</p>
        <p>Last Bill Amount: ₹0</p>
        <p>Most Purchased Item: 0</p>
        <p>Payment Mode: -</p>
        <p>Due Payment: 0</p>
        <p>Total Purchase: 0</p>
        <p>Loyalty Points: 0</p>
        <button>Last Bill Print</button>
      </div>
    </div>
  );
}
