import React from "react";
import "../styles/Footer.css";

export default function Footer() {
  const buttons = [
    "Multiple Pay(F12)","Redeem Credit","Hold (F6)","UPI (F5)",
    "Card (F3)","Cash (F4)","Apply Coupon","Pay Later (F11)",
    "Hold & Print (F7)","UPI & Print (F10)","Card & Print (F9)","Cash & Print (F8)"
  ];

  return (
    <footer className="footer">
      <div className="container summary">
        <div className="stat">
          <div className="label">Quantity</div>
          <div className="value">0</div>
        </div>

        <div className="stat">
          <div className="label">MRP</div>
          <div className="value">0</div>
        </div>

        <div className="stat">
          <div className="label">Tax Amount</div>
          <div className="value">0</div>
        </div>

        <div className="stat">
          <div className="label">
            <button className="small-btn">Add Charges +</button>
          </div>
          <div className="value">0</div>
        </div>

        <div className="stat">
          <div className="label">Discount</div>
          <div className="value">0</div>
        </div>

        <div className="roundoff">
          <input type="text" value="0.00" readOnly />
          <button className="small-btn">Roundoff</button>
        </div>

        <div className="amount">
          <div className="label">Amount</div>
          <div className="value big">0</div>
        </div>
      </div>

      <div className="container payment-btns">
        {buttons.map((b, i) => <button key={i} className="pay-btn">{b}</button>)}
      </div>
    </footer>
  );
}
