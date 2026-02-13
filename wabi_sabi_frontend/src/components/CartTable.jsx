// src/components/CartTable.jsx
import React, { useMemo, useCallback } from "react";
import "../styles/CartTable.css";

/**
 * IMPORTANT:
 * - Discount input must show sale-time discount when invoice is loaded.
 * - We use `lineDiscountAmount` as ₹ discount PER UNIT (matches your PosPage logic).
 * - Net Amount = (sellingPrice - lineDiscountAmount) * qty
 */

function n(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function clamp(v, min, max) {
  const x = n(v, 0);
  return Math.max(min, Math.min(max, x));
}

export default function CartTable({ items = [], onRowsChange }) {
  // Normalize rows so UI never breaks if older localStorage rows exist
  const rows = useMemo(() => {
    return (items || []).map((r) => {
      const unit = n(
        r.sellingPrice ??
          r.unitPrice ??
          r.unit_price ??
          r.price ??
          r.netAmount ??
          0,
        0
      );

      const disc = n(r.lineDiscountAmount ?? 0, 0);

      return {
        ...r,
        qty: n(r.qty ?? 1, 1),
        mrp: n(r.mrp ?? 0, 0),
        sellingPrice: unit,
        lineDiscountAmount: disc,
      };
    });
  }, [items]);

  const emit = useCallback(
    (next) => {
      onRowsChange?.(next);
    },
    [onRowsChange]
  );

  const updateRow = useCallback(
    (id, patch) => {
      const next = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
      emit(next);
    },
    [rows, emit]
  );

  const removeRow = useCallback(
    (id) => {
      const next = rows.filter((r) => r.id !== id);
      emit(next);
    },
    [rows, emit]
  );

  const onQtyChange = useCallback(
    (id, v) => {
      const qty = clamp(v, 0, 999999);
      updateRow(id, { qty });
    },
    [updateRow]
  );

  const onDiscountChange = useCallback(
    (id, v) => {
      const row = rows.find((x) => x.id === id);
      const unit = n(row?.sellingPrice ?? 0, 0);

      // discount is ₹ PER UNIT, cannot exceed unit price
      const disc = clamp(v, 0, unit);
      updateRow(id, { lineDiscountAmount: disc });
    },
    [rows, updateRow]
  );

  const calcNet = useCallback((r) => {
    const qty = n(r.qty ?? 0, 0);
    const unit = n(r.sellingPrice ?? 0, 0);
    const disc = clamp(r.lineDiscountAmount ?? 0, 0, unit);
    const netUnit = Math.max(0, unit - disc);
    return netUnit * qty;
  }, []);

  return (
    <div className="cart-table-wrap">
      <table className="cart-table">
        <thead>
          <tr>
            <th style={{ width: 50 }}>#</th>
            <th style={{ width: 160 }}>Itemcode</th>
            <th>Product</th>
            <th style={{ width: 90 }}>Qty</th>
            <th style={{ width: 120 }}>MRP</th>
            <th style={{ width: 160 }}>Discount ₹</th>
            <th style={{ width: 140 }}>Unit Cost</th>
            <th style={{ width: 140 }}>Net Amount</th>
            <th style={{ width: 60 }} />
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ padding: 16, textAlign: "center" }}>
                No items
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => {
              const unit = n(r.sellingPrice ?? 0, 0);
              const disc = clamp(r.lineDiscountAmount ?? 0, 0, unit);
              const net = calcNet(r);

              return (
                <tr key={r.id || idx}>
                  <td>{idx + 1}</td>

                  <td>{r.itemcode || r.barcode || ""}</td>

                  <td>{r.product || ""}</td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={n(r.qty ?? 0, 0)}
                      onChange={(e) => onQtyChange(r.id, e.target.value)}
                      style={{ width: "70px" }}
                    />
                  </td>

                  <td>₹{n(r.mrp ?? 0, 0).toFixed(2)}</td>

                  {/* ✅ THIS IS THE FIX:
                      show invoice discount here using lineDiscountAmount */}
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={disc.toFixed(2)}
                      onChange={(e) => onDiscountChange(r.id, e.target.value)}
                      style={{ width: "130px" }}
                    />
                  </td>

                  <td>₹{unit.toFixed(2)}</td>

                  <td>₹{net.toFixed(2)}</td>

                  <td>
                    <button
                      type="button"
                      onClick={() => removeRow(r.id)}
                      title="Remove"
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 18,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
