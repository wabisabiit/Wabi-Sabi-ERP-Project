import React from "react";
import "../styles/RightPanel.css";
import CustomerDetails from "./CustomerDetails";

export default function RightPanel() {
  return (
    <aside className="right-panel">
      <div className="actions">
        <button className="tile" aria-label="Hold Bill">
          <span className="material-icons">pause_circle_outline</span>
          <span className="small">Hold Bill</span>
        </button>

        <button className="tile" aria-label="Redeem Loyalty">
          <span className="material-icons">card_giftcard</span>
          <span className="small">Redeem Loyalty</span>
        </button>

        {/* ⬇️ Split: Add Payment (separate) */}
        <button className="tile" aria-label="Add Payment">
          <span className="material-icons">payments</span>
          <span className="small">Add Payment</span>
        </button>

        {/* ⬇️ Split: Credit Notes (separate) */}
        <button className="tile" aria-label="Credit Notes">
          <span className="material-icons">receipt_long</span>
          <span className="small">Credit Notes</span>
        </button>

        <button className="tile" aria-label="Orders">
          <span className="material-icons">list_alt</span>
          <span className="small">Orders</span>
        </button>

        <button className="tile" aria-label="Cash Control">
          <span className="material-icons">account_balance_wallet</span>
          <span className="small">Cash Control</span>
        </button>
      </div>

      <CustomerDetails />
    </aside>
  );
}
