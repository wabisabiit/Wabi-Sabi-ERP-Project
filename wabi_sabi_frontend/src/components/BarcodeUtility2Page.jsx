// src/components/BarcodeUtility2Page.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/BarcodeUtility2Page.css";

/* ✅ Seed rows must be defined before useState */
const INIT_ROWS = [
  { id: 1, itemCode: "8000325", product: "Lenova LCD", location: "IFFCO Chowk", mrp: 3500.0, sp: 1999.0, qty: 1, discount: 0 },
  { id: 2, itemCode: "8000326", product: "Top",        location: "IFFCO Chowk", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 3, itemCode: "8000327", product: "Top",        location: "IFFCO Chowk", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 4, itemCode: "8000328", product: "Top",        location: "IFFCO Chowk", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 5, itemCode: "8000329", product: "Top",        location: "IFFCO Chowk", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 6, itemCode: "8000330", product: "Top",        location: "IFFCO Chowk", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 7, itemCode: "8000331", product: "Top",        location: "IFFCO Chowk", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 8, itemCode: "8000332", product: "Top",        location: "IFFCO Chowk", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
];

export default function SaleItemsTable({ title = "Common Barcode Printing" }) {
  const [rows, setRows] = useState(INIT_ROWS);
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const navigate = useNavigate();

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = rows.slice(start, end);

  const [selected, setSelected] = useState(pageRows[0] || rows[0]);
  useEffect(() => {
    setSelected((prev) => pageRows.find(r => r.id === prev?.id) || pageRows[0] || rows[0]);
  }, [pageRows, rows]);

  const handleChange = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id
      ? { ...r, [field]: (field === "qty" || field === "discount") ? Number(value || 0) : value }
      : r));
  };

  const getLineAmount = (r) => Math.max(0, (r.sp - r.discount) * r.qty);

  const summary = useMemo(() => {
    const totalQty = pageRows.reduce((s, r) => s + Number(r.qty || 0), 0);
    const totalAmt = pageRows.reduce((s, r) => s + getLineAmount(r), 0);
    return { totalQty, totalAmt };
  }, [pageRows]);

  const formatINR = (n) =>
    `₹ ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Navigate to confirm page with only rows having qty > 0
  const handleSubmit = () => {
    const payload = rows
      .filter(r => Number(r.qty) > 0)
      .map(r => ({
        ...r,
        salesPrice: Math.max(0, r.sp - r.discount),
        barcodeName: r.itemCode,
      }));
    navigate("/utilities/barcode2/confirm", { state: { rows: payload } });
  };

  const handleGenerate = () => {
    console.log("Generate for:", selected);
  };

  return (
    <div className="sit-wrap">
      {/* Top bar */}
      <div className="sit-bc">
        <div className="sit-bc-left">
          <span className="sit-title">{title}</span>
          <span className="sit-sep">|</span>
        </div>
        <div className="sit-home" aria-label="Home">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
          </svg>
        </div>
      </div>

      <div className="sit-card">
        {/* Two-column layout */}
        <div className="sit-body">
          {/* LEFT: table + controls */}
          <div className="sit-left">
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
                  {pageRows.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={selected?.id === r.id ? "row-active" : ""}
                      onClick={() => setSelected(r)}
                      style={{ cursor: "pointer" }}
                    >
                      <td className="t-right">{start + idx + 1}</td>
                      <td className="t-mono">{r.itemCode}</td>
                      <td><span className="t-link">{r.product}</span></td>
                      <td className="t-dim">{r.location}</td>
                      <td>
                        <input
                          className="sit-input t-right"
                          type="number" min="0" step="0.01"
                          value={r.discount}
                          onChange={(e) => handleChange(r.id, "discount", e.target.value)}
                        />
                      </td>
                      <td className="t-right">{formatINR(r.sp - r.discount)}</td>
                      <td className="t-right t-dim">{formatINR(r.mrp)}</td>
                      <td>
                        <input
                          className="sit-input t-right"
                          type="number" min="0" step="1"
                          value={r.qty}
                          onChange={(e) => handleChange(r.id, "qty", e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals, pagination, submit */}
            <div className="sit-summary-center">
              <div className="sum-chip">
                <span className="sum-label">Selling Price</span>
                <span className="sum-value">{formatINR(summary.totalAmt)}</span>
              </div>
              <div className="sum-chip">
                <span className="sum-label">Qty</span>
                <span className="sum-value">{summary.totalQty.toFixed(2)}</span>
              </div>
            </div>

            <div className="sit-pagination">
              <button className="pg-btn" disabled={page===1} onClick={() => setPage(p=>Math.max(1,p-1))}>‹</button>
              <span className="pg-current">{page}</span>
              <button className="pg-btn" disabled={page===totalPages} onClick={() => setPage(p=>Math.min(totalPages,p+1))}>›</button>
            </div>

            <div className="sit-actions">
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>

          {/* RIGHT: barcode preview */}
          <aside className="sit-right">
            <div className="bc-card">
              <div className="bc-brand">vyparerp</div>
              <div className="bc-title">{selected?.product || "-"}</div>
              <div className="bc-mrp">MRP : {selected ? selected.mrp : 0}</div>
              <div className="bc-bars" aria-hidden="true">
                {[...Array(26)].map((_, i) => (
                  <span key={i} className={`bar ${i % 5 === 0 ? "bar-thick" : ""}`} />
                ))}
              </div>
              <div className="bc-code">{selected?.itemCode || ""}</div>
            </div>

            <button className="btn btn-primary bc-generate" onClick={handleGenerate}>
              Generate Barcode
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
