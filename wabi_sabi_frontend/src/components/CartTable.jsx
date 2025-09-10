import React from "react";
import "../styles/CartTable.css";

export default function CartTable() {
  return (
    <div className="cart-container">
      <table className="cart-table">
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
            <td colSpan="9" className="empty">No items in cart</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
