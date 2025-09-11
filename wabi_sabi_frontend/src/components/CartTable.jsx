import React, { useState } from "react";
import "../styles/CartTable.css";

export default function CartTable({ items = [] }) {
  const [remarks, setRemarks] = useState("");

  return (
    <div className="cart-container">
      <table className="cart-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Itemcode</th>
            <th>Product</th>
            <th className="num">Qty</th>
            <th className="num">MRP</th>
            <th className="num">Discount</th>
            <th className="num">Add Disc</th>
            <th className="num">Unit Cost</th>
            <th className="num">Net Amount</th>
          </tr>
        </thead>

        <tbody>
          {items.length > 0 ? (
            items.map((row, idx) => (
              <tr key={row.id || idx}>
                <td>{idx + 1}</td>
                <td>{row.itemcode}</td>
                <td className="prod">{row.product}</td>
                <td className="num">{row.qty}</td>
                <td className="num">₹{row.mrp?.toFixed?.(2) ?? row.mrp}</td>
                <td className="num">₹{row.discount?.toFixed?.(2) ?? row.discount}</td>
                <td className="num">₹{row.addDisc?.toFixed?.(2) ?? row.addDisc}</td>
                <td className="num">₹{row.unitCost?.toFixed?.(2) ?? row.unitCost}</td>
                <td className="num">₹{row.netAmount?.toFixed?.(2) ?? row.netAmount}</td>
              </tr>
            ))
          ) : (
            // ❗ second screenshot jaisa blank white area (no message)
            <tr className="empty-spacer">
              <td colSpan={9} />
            </tr>
          )}
        </tbody>
      </table>

      {/* Remarks — bright blue border exactly like 2nd screenshot */}
      <div className="remarks-wrap">
        <textarea
          className="remarks-input"
          placeholder="Remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>
    </div>
  );
}
