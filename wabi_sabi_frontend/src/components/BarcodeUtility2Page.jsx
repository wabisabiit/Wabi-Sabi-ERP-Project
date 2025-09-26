import React, { useMemo, useState } from "react";
import "../styles/BarcodeUtility2Page.css";

const INIT_ROWS = [
  { id: 1, itemCode: "8000325", product: "Top", location: "IFFCO Chowk", mrp: 99.0, sp: 49.0, qty: 1, discount: 0 },
  { id: 2, itemCode: "8000326", product: "Top", location: "IFFCO Chowk", mrp: 99.0, sp: 49.0, qty: 1, discount: 0 },
  { id: 3, itemCode: "8000327", product: "Top", location: "IFFCO Chowk", mrp: 99.0, sp: 49.0, qty: 1, discount: 0 },
  { id: 4, itemCode: "8000328", product: "Top", location: "IFFCO Chowk", mrp: 99.0, sp: 49.0, qty: 1, discount: 0 },
  { id: 5, itemCode: "8000329", product: "Top", location: "IFFCO Chowk", mrp: 99.0, sp: 49.0, qty: 1, discount: 0 },
  { id: 6, itemCode: "8000330", product: "Top", location: "IFFCO Chowk", mrp: 99.0, sp: 49.0, qty: 1, discount: 0 },
  { id: 7, itemCode: "8000331", product: "Top", location: "IFFCO Chowk", mrp: 99.0, sp: 49.0, qty: 1, discount: 0 },
  { id: 8, itemCode: "8000332", product: "Top", location: "IFFCO Chowk", mrp: 99.0, sp: 49.0, qty: 1, discount: 0 },
];

export default function SaleItemsTable({
  onSubmit,
  onSubmitAndPrint,
  title = "Common Barcode Printing", // top bar title like your image
}) {
  const [rows, setRows] = useState(INIT_ROWS);

  const handleChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]:
                field === "qty" || field === "discount"
                  ? Number(value || 0)
                  : value,
            }
          : r
      )
    );
  };

  const getLineAmount = (r) => Math.max(0, (r.sp - r.discount) * r.qty);

  const summary = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + Number(r.qty || 0), 0);
    const totalAmt = rows.reduce((s, r) => s + getLineAmount(r), 0);
    return { totalQty, totalAmt };
  }, [rows]);

  const handleSubmit = () => onSubmit?.(rows, summary);
  const handleSubmitPrint = () => onSubmitAndPrint?.(rows, summary);

  return (
    <div className="sit-wrap">
      {/* ===== Top navigation bar (same design) ===== */}
      <div className="sit-bc">
        <div className="sit-bc-left">
          <span className="sit-title">{title}</span>
          <span className="sit-sep">|</span>
          {/* <span className="sit-crumb">Home</span> */}
        </div>
        <div className="sit-home" aria-label="Home">
          {/* tiny home icon (inline SVG) */}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
          </svg>
        </div>
      </div>

      <div className="sit-card">
        <div className="sit-table-wrap">
          <table className="sit-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>S.No</th>
                <th style={{ width: 120 }}>Item Code</th>
                <th style={{ minWidth: 180 }}>Product Name</th>
                <th style={{ minWidth: 170 }}>Location</th>
                <th style={{ width: 110 }}>Discount</th>
                <th style={{ width: 130 }}>Selling Price</th>
                <th style={{ width: 110 }}>MRP</th>
                <th style={{ width: 80 }}>Qty</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id}>
                  <td className="t-right">{idx + 1}</td>
                  <td className="t-mono">{r.itemCode}</td>
                  <td><span className="t-link">{r.product}</span></td>
                  <td className="t-dim">{r.location}</td>

                  <td>
                    <input
                      className="sit-input t-right"
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.discount}
                      onChange={(e) => handleChange(r.id, "discount", e.target.value)}
                      aria-label="Discount per piece"
                    />
                  </td>

                  <td className="t-right">₹ {r.sp.toFixed(2)}</td>
                  <td className="t-right t-dim">₹ {r.mrp.toFixed(2)}</td>

                  <td>
                    <input
                      className="sit-input t-right"
                      type="number"
                      min="0"
                      step="1"
                      value={r.qty}
                      onChange={(e) => handleChange(r.id, "qty", e.target.value)}
                      aria-label="Quantity"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary row (compact) */}
        <div className="sit-summary">
          <div />
          <div />
          <div />
          <div />
          <div />
          <div className="sum-slot">
            <div className="sum-label">Total Qty</div>
            <div className="sum-value">{summary.totalQty.toFixed(2)}</div>
          </div>
          <div className="sum-slot">
            <div className="sum-label">Amount</div>
            <div className="sum-value">₹ {summary.totalAmt.toFixed(2)}</div>
          </div>
        </div>

        {/* Actions centered below table */}
        <div className="sit-actions">
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            Submit
          </button>
          <button type="button" className="btn btn-outline" onClick={handleSubmitPrint}>
            Submit &amp; Print
          </button>
        </div>
      </div>
    </div>
  );
}
