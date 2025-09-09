import React from "react";

export default function Footer() {
  return (
    <div className="footer">
      <div className="summary">
        <p>Quantity: 0</p>
        <p>MRP: 0</p>
        <p>Tax Amount: 0</p>
        <p>Discount: 0</p>
        <p>Flat Discount: 0%</p>
        <p>Round Off: 0</p>
        <p>Amount: 0</p>
      </div>
      <div className="actions">
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
    </div>
  );
}
