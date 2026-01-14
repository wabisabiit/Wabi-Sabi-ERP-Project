// src/components/CartTable.jsx
import React, { useState, useEffect } from "react";
import "../styles/CartTable.css";

const money = (v) =>
  typeof v === "number" && isFinite(v) ? `₹${v.toFixed(2)}` : "---";

export default function CartTable({ items = [], onRowsChange }) {
  console.log("🔥 CART TABLE FILE LOADED FROM:", import.meta.url);
  const [remarks, setRemarks] = useState("");
  const [rows, setRows] = useState(items || []);

  // parent se aane wale items ko sync me rakho
  useEffect(() => {
    setRows(items || []);
  }, [items]);

  const updateRow = (idx, patch) => {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      if (typeof onRowsChange === "function") onRowsChange(next);
      return next;
    });
  };

  const handleDelete = (idx) => {
    console.log("🗑️ CartTable: delete clicked", {
      idx,
      rowsBefore: rows.length,
      itemsPropLength: items ? items.length : 0,
    });

    setRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      console.log("✅ CartTable: rows after local delete", next);

      if (typeof onRowsChange === "function") {
        try {
          console.log("📤 CartTable: calling onRowsChange with", next);
          onRowsChange(next);
        } catch (e) {
          console.error("❌ CartTable: error while calling onRowsChange", e);
        }
      } else {
        console.warn(
          "⚠️ CartTable: onRowsChange is missing or not a function. Got:",
          onRowsChange
        );
      }

      return next;
    });
  };

  return (
    <div className="cart-container">
      <div className="cart-scroll">
        <table className="cart-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Itemcode</th>
              <th>Product</th>
              <th className="num">Qty</th>
              <th className="num">MRP</th>

              {/* ✅ DISCOUNT IN ₹ */}
              <th className="num">Discount ₹</th>

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

                // base unit price (prefer sellingPrice if present)
                const unit = Number(
                  row.sellingPrice ??
                    row.unitPrice ??
                    row.unit_price ??
                    row.price ??
                    row.netAmount ??
                    0
                );

                // ✅ discount ₹ per unit (cannot be > unit)
                const rawDisc = Number(row.lineDiscountAmount ?? 0) || 0;
                const discRs = Math.max(0, Math.min(unit || 0, rawDisc));

                const netUnit = Math.max(0, (unit || 0) - discRs);
                const lineAmount = netUnit * qty;

                return (
                  <tr key={row.id || idx}>
                    <td>{idx + 1}</td>
                    <td>{row.itemcode}</td>
                    <td className="prod">{row.product}</td>
                    <td className="num">{qty}</td>
                    <td className="num">{money(Number(row.mrp) || 0)}</td>

                    <td className="num">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.lineDiscountAmount ?? ""}
                        onChange={(e) => {
                          // allow typing freely, cap in calc
                          updateRow(idx, { lineDiscountAmount: e.target.value });
                        }}
                      />
                    </td>

                    <td className="num">{money(netUnit)}</td>
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
                <td colSpan={9} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
