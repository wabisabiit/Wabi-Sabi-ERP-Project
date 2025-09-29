// src/components/BarcodeUtility2Page.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/BarcodeUtility2Page.css";

/* Location options (short names only) */
const LOCATIONS = ["IC", "RJR", "RJO", "TN", "UP-AP", "M3M", "UV", "KN"];

/* Seed rows */
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

const STORAGE_KEY = "barcode2_rows_v1";

export default function SaleItemsTable({ title = "Common Barcode Printing" }) {
  const navigate = useNavigate();

  // ---- Load persisted rows if available ----
  const [rows, setRows] = useState(INIT_ROWS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setRows(parsed);
      }
    } catch (_) {}
  }, []);

  const [page, setPage] = useState(1);
  const rowsPerPage = 5;

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = rows.slice(start, end);

  const [selected, setSelected] = useState(pageRows[0] || rows[0]);
  useEffect(() => {
    setSelected((prev) => pageRows.find((r) => r.id === prev?.id) || pageRows[0] || rows[0]);
  }, [pageRows, rows]);

  const persist = (next) => {
    setRows(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
  };

  const sanitizeDigits = (val) => (val || "").replace(/\D+/g, "");

  const handleChange = (id, field, value) => {
    const next = rows.map((r) =>
      r.id === id
        ? {
            ...r,
            [field]:
              field === "qty" || field === "discount" || field === "sp"
                ? Number(value || 0)
                : value,
          }
        : r
    );
    persist(next);
  };

  const handleSubmit = () => {
    // Persist again to be safe (data stays after submit)
    persist(rows);

    // Prepare payload for confirm page (unchanged)
    const initialRows = rows.map((r) => ({
      ...r,
      itemCode: r.itemCode && r.itemCode !== "" ? r.itemCode : "0",
      salesPrice: Math.max(0, r.sp - r.discount), // final per-unit amount
      barcodeName: r.itemCode && r.itemCode !== "" ? r.itemCode : "0",
    }));
    navigate("/utilities/barcode2/confirm", { state: { initialRows } });
  };

  const handleReset = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    setPage(1);
    setRows(INIT_ROWS);
  };

  const formatINR = (n) =>
    `₹ ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // compute Total Amt = max(0, Price - Discount)
  const totalAmt = (r) => Math.max(0, Number(r.sp || 0) - Number(r.discount || 0));

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
          {/* LEFT: table + controls (RIGHT panel removed) */}
          <div className="sit-left" style={{ maxWidth: "100%" }}>
            <div className="sit-table-wrap">
              <table className="sit-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>S.No</th>
                    <th style={{ width: 110 }}>Item Code</th>
                    <th style={{ minWidth: 160 }}>Product Name</th>
                    <th style={{ width: 100 }}>Size</th>
                    <th style={{ width: 128 }}>Location</th>
                    <th style={{ width: 90 }}>Discount</th>
                    <th style={{ width: 96 }}>Price</th>
                    <th style={{ width: 100 }}>Total Amt</th>
                    <th style={{ width: 60 }}>Qty</th>
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

                      {/* Item Code */}
                      <td>
                        <input
                          className="sit-input t-mono"
                          type="text"
                          inputMode="numeric"
                          value={r.itemCode}
                          onChange={(e) =>
                            handleChange(r.id, "itemCode", sanitizeDigits(e.target.value))
                          }
                          onBlur={(e) => {
                            if (!e.target.value || e.target.value.trim() === "") {
                              handleChange(r.id, "itemCode", "0");
                            }
                          }}
                          placeholder="0"
                        />
                      </td>

                      <td><span className="t-link">{r.product}</span></td>

                      {/* Size */}
                      <td>
                        <input
                          className="sit-input"
                          type="text"
                          value={r.size}
                          onChange={(e) => handleChange(r.id, "size", e.target.value)}
                          placeholder="Size"
                        />
                      </td>

                      {/* Location — per-row select */}
                      <td>
                        <select
                          className="sit-input"
                          value={r.location}
                          onChange={(e) => handleChange(r.id, "location", e.target.value)}
                        >
                          <option value="">Select</option>
                          {LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </td>

                      {/* Discount */}
                      <td>
                        <input
                          className="sit-input t-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={r.discount}
                          onChange={(e) => handleChange(r.id, "discount", e.target.value)}
                          placeholder="0.00"
                        />
                      </td>

                      {/* Price */}
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

                      {/* Total Amt (computed: Price - Discount) */}
                      <td className="t-right t-dim">{formatINR(totalAmt(r))}</td>

                      {/* Qty */}
                      <td>
                        <input
                          className="sit-input t-right"
                          type="number"
                          min="0"
                          step="1"
                          value={r.qty}
                          onChange={(e) => handleChange(r.id, "qty", e.target.value)}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination + Submit/Reset */}
            <div className="sit-pagination">
              <button className="pg-btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
              <span className="pg-current">{page}</span>
              <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
            </div>

            <div className="sit-actions" style={{ gap: 10 }}>
              {/* ⬇️ Yellow reset button */}
              <button type="button" className="btn btn-warning" onClick={handleReset}>Reset</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>Submit</button>
            </div>
          </div>

          {/* RIGHT preview removed */}
        </div>
      </div>
    </div>
  );
}
