import React, { useState } from "react";
import "../styles/RightPanel.css";
import CustomerDetails from "./CustomerDetails";
import CashControlModal from "./CashControlModal";
import HoldBillPanel from "./HoldBillPanel";
import PaymentModal from "./PaymentModal";
import OrderListModal from "./OrderListModal";   // ⬅️ ADD

export default function RightPanel() {
  const [showCashControl, setShowCashControl] = useState(false);
  const [showHoldBill, setShowHoldBill] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showOrders, setShowOrders] = useState(false);      // ⬅️ ADD

  return (
    <aside className="right-panel">
      <div className="actions">
        <button className="tile" aria-label="Hold Bill" onClick={() => setShowHoldBill(true)}>
          <span className="material-icons">pause_circle_outline</span>
          <span className="small">Hold Bill</span>
        </button>

        <button className="tile" aria-label="Payments" onClick={() => setShowPayment(true)}>
          <span className="material-icons">payments</span>
          <span className="small">Add Payment</span>
        </button>

        <button className="tile" aria-label="Redeem Loyalty">
          <span className="material-icons">card_giftcard</span>
          <span className="small">Redeem Loyalty</span>
        </button>

        <button className="tile" aria-label="Credit Notes">
          <span className="material-icons">receipt_long</span>
          <span className="small">Credit Notes</span>
        </button>

        <button className="tile" aria-label="Orders" onClick={() => setShowOrders(true)}>
          <span className="material-icons">list_alt</span>
          <span className="small">Orders</span>
        </button>

        <button className="tile" aria-label="Cash Control" onClick={() => setShowCashControl(true)}>
          <span className="material-icons">account_balance_wallet</span>
          <span className="small">Cash Control</span>
        </button>
      </div>

      <CustomerDetails />

      {/* Modals */}
      <OrderListModal open={showOrders} onClose={() => setShowOrders(false)} />  {/* ⬅️ ADD */}
      <PaymentModal open={showPayment} onClose={() => setShowPayment(false)} />
      <CashControlModal open={showCashControl} onClose={() => setShowCashControl(false)} />
      <HoldBillPanel open={showHoldBill} onClose={() => setShowHoldBill(false)} />
    </aside>
  );
}
