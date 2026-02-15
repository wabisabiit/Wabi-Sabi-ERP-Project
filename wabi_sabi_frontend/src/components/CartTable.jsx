// src/components/CartTable.jsx
import React, { useMemo, useCallback, useEffect, useState } from "react";
import "../styles/CartTable.css";

/**
 * IMPORTANT:
 * - lineDiscountAmount = ₹ discount PER UNIT (manual/line discount)
 * - Footer flat discount (%) should ALSO reflect in each row Discount ₹ and Net Amount
 * - We DO NOT overwrite lineDiscountAmount with bill discount; we only add it for display/net
 * - Discount input shows: (lineDiscountAmount + billDiscPerUnit)
 * - When user edits Discount input, we store ONLY the extra part back into lineDiscountAmount
 *
 * ✅ NEW: CartTable listens to "pos:bill-discount" and reads window.__BILL_DISCOUNT__
 * so rows update even if PosPage doesn't pass props.
 */

function n(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function clamp(v, min, max) {
  const x = n(v, 0);
  return Math.max(min, Math.min(max, x));
}

export default function CartTable({
  items = [],
  onRowsChange,

  // optional props (if PosPage passes them)
  billDiscountValue,
  billDiscountIsPercent,
}) {
  // ✅ internal bill discount state (auto from footer)
  const [billDiscValueState, setBillDiscValueState] = useState("0.00");
  const [billDiscIsPercentState, setBillDiscIsPercentState] = useState(true);

  // if props are provided, they win; otherwise use internal state
  const effBillValue =
    billDiscountValue !== undefined ? String(billDiscountValue) : billDiscValueState;
  const effBillIsPercent =
    billDiscountIsPercent !== undefined ? !!billDiscountIsPercent : billDiscIsPercentState;

  // ✅ Listen to footer broadcast
  useEffect(() => {
    const apply = (d) => {
      if (!d) return;
      setBillDiscValueState(String(d.value ?? "0"));
      setBillDiscIsPercentState(!!d.isPercent);
    };

    // pick up current value (if already set)
    apply(window.__BILL_DISCOUNT__);

    const handler = (e) => apply(e?.detail);
    window.addEventListener("pos:bill-discount", handler);
    return () => window.removeEventListener("pos:bill-discount", handler);
  }, []);

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

  // ✅ compute allocation base: after line discounts
  const baseTotalAfterLine = useMemo(() => {
    return rows.reduce((sum, r) => {
      const qty = n(r.qty ?? 0, 0);
      const unit = n(r.sellingPrice ?? 0, 0);
      const lineDisc = clamp(r.lineDiscountAmount ?? 0, 0, unit);
      const baseUnit = Math.max(0, unit - lineDisc);
      return sum + baseUnit * qty;
    }, 0);
  }, [rows]);

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

  // ✅ bill discount per unit for a row (after line discount)
  const billDiscPerUnitFor = useCallback(
    (r) => {
      const qty = n(r.qty ?? 0, 0);
      const unit = n(r.sellingPrice ?? 0, 0);
      const lineDisc = clamp(r.lineDiscountAmount ?? 0, 0, unit);
      const baseUnit = Math.max(0, unit - lineDisc);
      const baseLine = baseUnit * qty;

      const raw = Math.max(0, Number(effBillValue) || 0);

      if (effBillIsPercent) {
        return (baseUnit * raw) / 100;
      }

      // rupee mode: allocate proportionally across rows by baseLine
      if (baseTotalAfterLine > 0 && qty > 0) {
        const share = baseLine / baseTotalAfterLine;
        const allocLine = raw * share;
        return allocLine / qty;
      }
      return 0;
    },
    [effBillValue, effBillIsPercent, baseTotalAfterLine]
  );

  const onDiscountChange = useCallback(
    (id, v) => {
      const row = rows.find((x) => x.id === id);
      const unit = n(row?.sellingPrice ?? 0, 0);

      const billPerUnit = billDiscPerUnitFor(row || {});
      const combinedWanted = clamp(v, 0, unit);

      // store ONLY the extra (manual/line) part, keep bill discount separate
      const newLineDisc = clamp(combinedWanted - billPerUnit, 0, unit);
      updateRow(id, { lineDiscountAmount: newLineDisc });
    },
    [rows, updateRow, billDiscPerUnitFor]
  );

  const calcNet = useCallback(
    (r) => {
      const qty = n(r.qty ?? 0, 0);
      const unit = n(r.sellingPrice ?? 0, 0);
      const lineDisc = clamp(r.lineDiscountAmount ?? 0, 0, unit);
      const billDisc = Math.max(0, billDiscPerUnitFor(r));
      const totalDisc = Math.max(0, Math.min(unit, lineDisc + billDisc));
      const netUnit = Math.max(0, unit - totalDisc);
      return netUnit * qty;
    },
    [billDiscPerUnitFor]
  );

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
              const lineDisc = clamp(r.lineDiscountAmount ?? 0, 0, unit);
              const billDisc = Math.max(0, billDiscPerUnitFor(r));
              const combinedDisc = Math.max(0, Math.min(unit, lineDisc + billDisc));
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

                  {/* ✅ shows discount ₹ including footer flat discount */}
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={String(combinedDisc)}
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
