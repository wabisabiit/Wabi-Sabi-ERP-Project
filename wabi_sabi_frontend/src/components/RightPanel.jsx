import React from "react";
import "../styles/RightPanel.css";
import CustomerDetails from "./CustomerDetails";

export default function RightPanel() {
  return (
    <aside className="right-panel">
      <div className="actions">
        <button><span className="material-icons">pause_circle_outline</span><span className="small">Hold Bill</span></button>
        <button><span className="material-icons">receipt_long</span><span className="small">Payments</span></button>
        <button><span className="material-icons">card_giftcard</span><span className="small">Redeem Loyalty</span></button>
        <button><span className="material-icons">note_add</span><span className="small">Add Payment Credit Notes</span></button>
        <button><span className="material-icons">list_alt</span><span className="small">Orders</span></button>
        <button><span className="material-icons">point_of_sale</span><span className="small">Cash Control</span></button>
      </div>

      <CustomerDetails />
    </aside>
  );
}
