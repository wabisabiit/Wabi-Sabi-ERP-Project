// src/components/CartTable.jsx
import React, { useState, useEffect } from "react";
import "../styles/CartTable.css";

const money = (v) =>
  typeof v === "number" && isFinite(v) ? `₹${v.toFixed(2)}` : "---";

export default function CartTable({ items = [], onRowsChange }) {
  const [remarks, setRemarks] = useState("");
  const [rows, setRows] = useState(items || []);

  // keep local rows in sync if parent changes items
  useEffect(() => {
    setRows(items || []);
  }, [items]);

  const handleDelete = (idx) => {
  setRows((prev) => {
    const next = prev.filter((_, i) => i !== idx);
    if (typeof onRowsChange === "function") onRowsChange(next);
    return next;
  });
};



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
            <th className="num"></th>
          </tr>
        </thead>

        <tbody>
          {rows.length > 0 ? (
            rows.map((row, idx) => {
              const qty = Number.isFinite(Number(row.qty))
                ? Number(row.qty)
                : 1;
              const lineAmount = (Number(row.netAmount) || 0) * qty;

              return (
                <tr key={row.id || idx}>
                  <td>{idx + 1}</td>
                  <td>{row.itemcode}</td>
                  <td className="prod">{row.product}</td>
                  <td className="num">{qty}</td>
                  <td className="num">{money(row.mrp)}</td>

                  <td className="num">
                    <input type="text" placeholder="..." />
                  </td>
                  <td className="num">
                    <input type="text" placeholder="..." />
                  </td>
                  <td className="num">
                    <input type="text" placeholder="..." />
                  </td>

                  <td className="num">{money(lineAmount)}</td>

                  <td className="num">
                    <button
                      type="button"
                      className="cart-delete-btn"
                      onClick={() => handleDelete(idx)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr className="empty-spacer">
              <td colSpan={10} />
            </tr>
          )}
        </tbody>
      </table>

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
