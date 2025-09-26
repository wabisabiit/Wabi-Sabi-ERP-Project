// src/components/BarcodeUtility2Page.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/BarcodeUtility2Page.css";

/* Location options (short names only) */
const LOCATIONS = ["IC", "RJR", "RJO", "TN", "UP-AP", "M3M", "UV", "KN"];

/* ✅ Seed rows (now include size:"") */
const INIT_ROWS = [
  { id: 1, itemCode: "0", product: "Lenova LCD", size: "", location: "", mrp: 3500.0, sp: 1999.0, qty: 1, discount: 0 },
  { id: 2, itemCode: "0", product: "Top",        size: "", location: "", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 3, itemCode: "0", product: "Top",        size: "", location: "", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 4, itemCode: "0", product: "Top",        size: "", location: "", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 5, itemCode: "0", product: "Top",        size: "", location: "", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 6, itemCode: "0", product: "Top",        size: "", location: "", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 7, itemCode: "0", product: "Top",        size: "", location: "", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
  { id: 8, itemCode: "0", product: "Top",        size: "", location: "", mrp: 99.0,   sp: 49.0,   qty: 1, discount: 0 },
];

export default function SaleItemsTable({ title = "Common Barcode Printing" }) {
  const [rows, setRows] = useState(INIT_ROWS);
  const [page, setPage] = useState(1);
  const rowsPerPage = 5;
  const navigate = useNavigate();

  // Header select: start empty (placeholder "Location")
  const [location, setLocation] = useState("");

  // keep initial rows empty for location (no prefill)
  useEffect(() => {
    setRows(prev => prev.map(r => ({ ...r, location: "" })));
  }, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = rows.slice(start, end);

  const [selected, setSelected] = useState(pageRows[0] || rows[0]);
  useEffect(() => {
    setSelected((prev) => pageRows.find(r => r.id === prev?.id) || pageRows[0] || rows[0]);
  }, [pageRows, rows]);

  const sanitizeDigits = (val) => (val || "").replace(/\D+/g, "");

  const handleChange = (id, field, value) => {
    setRows(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              [field]:
                field === "qty" || field === "discount" || field === "sp"
                  ? Number(value || 0)
                  : value,
            }
          : r
      )
    );
  };

  // TH dropdown -> update header state + ALL rows' location
  const handleLocationChange = (val) => {
    setLocation(val);
    setRows(prev => prev.map(r => ({ ...r, location: val })));
  };

  const getLineAmount = (r) => Math.max(0, (r.sp - r.discount) * r.qty);

  const summary = useMemo(() => {
    const totalQty = pageRows.reduce((s, r) => s + Number(r.qty || 0), 0);
    const totalAmt = pageRows.reduce((s, r) => s + getLineAmount(r), 0);
    return { totalQty, totalAmt };
  }, [pageRows]);

  const formatINR = (n) =>
    `₹ ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSubmit = () => {
    const payload = rows
      .filter(r => Number(r.qty) > 0)
      .map(r => ({
        ...r,
        itemCode: r.itemCode && r.itemCode !== "" ? r.itemCode : "0",
        salesPrice: Math.max(0, r.sp - r.discount),
        barcodeName: r.itemCode && r.itemCode !== "" ? r.itemCode : "0",
        // size और location अब payload में साथ जाएंगे
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
                    <th style={{ width: 120 }}>Size</th>

                    {/* TH = placeholder-first select for Location (short codes) */}
                    <th style={{ minWidth: 150 }}>
                      <select
                        className="sit-select sit-select-th"
                        value={location}
                        onChange={(e) => handleLocationChange(e.target.value)}
                        title="Select Location"
                      >
                        <option value="" disabled>
                          Location
                        </option>
                        {LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </th>

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

                      {/* Item Code (digits only, default "0" on blur) */}
                      <td>
                        <input
                          className="sit-input t-mono"
                          type="text"
                          inputMode="numeric"
                          value={r.itemCode}
                          onChange={(e) => handleChange(r.id, "itemCode", sanitizeDigits(e.target.value))}
                          onBlur={(e) => {
                            if (!e.target.value || e.target.value.trim() === "") {
                              handleChange(r.id, "itemCode", "0");
                            }
                          }}
                          placeholder="0"
                        />
                      </td>

                      <td><span className="t-link">{r.product}</span></td>

                      {/* Size (per-row editable) */}
                      <td>
                        <input
                          className="sit-input"
                          type="text"
                          value={r.size}
                          onChange={(e) => handleChange(r.id, "size", e.target.value)}
                          placeholder="Size"
                        />
                      </td>

                      {/* row location reflects header selection */}
                      <td className="t-dim">{r.location || ""}</td>

                      <td>
                        <input
                          className="sit-input t-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.discount}
                          onChange={(e) => handleChange(r.id, "discount", e.target.value)}
                        />
                      </td>

                      {/* Selling Price editable */}
                      <td>
                        <input
                          className="sit-input t-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.sp}
                          onChange={(e) => handleChange(r.id, "sp", e.target.value)}
                          placeholder="0.00"
                        />
                      </td>

                      <td className="t-right t-dim">{formatINR(r.mrp)}</td>

                      <td>
                        <input
                          className="sit-input t-right"
                          type="number"
                          min="0"
                          step="1"
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
              <button className="pg-btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
              <span className="pg-current">{page}</span>
              <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
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
