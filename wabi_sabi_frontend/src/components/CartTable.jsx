import React, { useState } from "react";
import "../styles/CartTable.css";

const money = (v) =>
  typeof v === "number" && isFinite(v) ? `₹${v.toFixed(2)}` : "---";

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
            items.map((row, idx) => {
              const qty = Number.isFinite(Number(row.qty)) ? Number(row.qty) : 1;
              const lineAmount = (Number(row.netAmount) || 0) * qty;

              return (
                <tr key={row.id || idx}>
                  <td>{idx + 1}</td>
                  <td>{row.itemcode}</td>
                  <td className="prod">{row.product}</td>
                  <td className="num">{qty}</td>
                  <td className="num">{money(row.mrp)}</td>
                  <td className="num">{money(row.discount)}</td>
                  <td className="num">{money(row.addDisc)}</td>
                  <td className="num">{money(row.unitCost)}</td>
                  <td className="num">{money(lineAmount)}</td>
                </tr>
              );
            })
          ) : (
            // Empty white area (no text), like your reference screenshot
            <tr className="empty-spacer">
              <td colSpan={9} />
            </tr>
          )}
        </tbody>
      </table>

      {/* Remarks box with bright blue border */}
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
