import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/BarcodeUtility2Page.css";
import { getItemByCode } from "../api/client";

/* ---------------- Location options (short names only) ---------------- */
const LOCATIONS = ["IC", "RJR", "RJO", "TN", "UP-AP", "M3M", "UV", "KN"];

/* ---------------- Seed rows ---------------- */
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

/* ---------------- Code sanitizers ----------------
   Loose: allow trailing '-' while typing (so user can type '100-' then '100-W')
   Strict: trim only leading/trailing '-' on commit (blur/lookup/submit)
--------------------------------------------------*/
const sanitizeCodeLoose = (v) =>
  (v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-");

const sanitizeCodeStrict = (v) =>
  sanitizeCodeLoose(v).replace(/^-|-$/g, "");

/* -------- numbers: keep strings in state; convert only when needed -------- */
const toNum = (v) => (v === "" || v == null ? 0 : Number(v));

/* ------------- API lookup helper ------------- */
async function lookupAndFill(rowId, code, rows, persist) {
  const clean = sanitizeCodeStrict(code);
  if (!clean) return;

  try {
    const data = await getItemByCode(clean); // must return exact item for '100' or '100-W'
    const name =
      data?.product_name ??
      data?.full_name ??
      data?.print_name ??
      data?.item?.name ??
      "";

    const next = rows.map((r) =>
      r.id === rowId ? { ...r, itemCode: clean, product: name } : r
    );
    persist(next);
  } catch (err) {
    console.warn("lookup failed:", err);
    const next = rows.map((r) => (r.id === rowId ? { ...r, itemCode: clean } : r));
    persist(next);
  }
}

export default function BarcodeUtility2Page({ title = "Common Barcode Printing" }) {
  const navigate = useNavigate();

  /* ---- state + localStorage hydration ---- */
  const [rows, setRows] = useState(INIT_ROWS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setRows(parsed);
      }
    } catch {}
  }, []);

  const persist = (next) => {
    setRows(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  /* ---- keep a ref for debounced lookups ---- */
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const debouncersRef = useRef({}); // { [rowId]: timeoutId }
  const scheduleLookup = (rowId, code) => {
    const raw = sanitizeCodeLoose(code);
    if (!raw || /-$/.test(raw)) return; // skip while user is mid-typing a trailing '-'
    const clean = sanitizeCodeStrict(raw);

    const timers = debouncersRef.current;
    if (timers[rowId]) clearTimeout(timers[rowId]);
    timers[rowId] = setTimeout(() => {
      lookupAndFill(rowId, clean, rowsRef.current, persist);
    }, 500);
  };

  /* ---- pagination ---- */
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

  /* ---- handlers ---- */
  const handleChange = (id, field, value) => {
    const next = rows.map((r) =>
      r.id === id ? { ...r, [field]: value } : r
    );
    persist(next);

    if (field === "itemCode") scheduleLookup(id, value);
  };

  const handleSubmit = () => {
    // Normalize numbers and compute total fields
    const normalized = rows.map((r) => {
      const sp = toNum(r.sp);
      const discount = toNum(r.discount);
      const qty = Math.trunc(toNum(r.qty));
      return {
        ...r,
        itemCode: r.itemCode ? sanitizeCodeStrict(r.itemCode) : "0",
        product: (r.product || "").trim(),
        size: (r.size || "").trim(),
        location: (r.location || "").trim(),
        sp,
        discount,
        qty,
        // % discount on Selling Price
        salesPrice: Math.max(0, sp - (sp * (discount / 100))),
        barcodeName: r.itemCode ? sanitizeCodeStrict(r.itemCode) : "0",
      };
    });

    // Keep only rows where itemCode is not "0" or empty
    const filtered = normalized.filter((r) => r.itemCode && r.itemCode !== "0");

    // Validate required fields for the filtered rows
    const problems = [];
    filtered.forEach((r, idx) => {
      const rowNo = idx + 1;
      if (!r.product) problems.push(`Row ${rowNo}: Product Name required`);
      if (!r.size) problems.push(`Row ${rowNo}: Size required`);
      if (!r.location) problems.push(`Row ${rowNo}: Location required`);
      if (!(r.sp > 0)) problems.push(`Row ${rowNo}: Price must be > 0`);
      if (!(r.qty >= 1)) problems.push(`Row ${rowNo}: Qty must be at least 1`);
    });

    if (problems.length) {
      alert(`Please fix the following before submitting:\n\n${problems.join("\n")}`);
      return;
    }

    // Prepare rows for Image-2 (confirm) page with WS-{code}-01
    const excelSeed = filtered.map((r, i) => ({
      _id: i + 1,
      itemCode: r.itemCode,
      product: r.product,
      size: r.size,
      location: r.location,
      discount: Number.isFinite(r.discount) ? r.discount : 0,
      salesPrice: Number.isFinite(r.salesPrice) ? r.salesPrice : 0,
      mrp: Number.isFinite(r.sp) ? r.sp : 0,
      qty: Number.isFinite(r.qty) ? r.qty : 0,
      barcodeNumber: r.itemCode ? `WS-${r.itemCode}-01` : "",
    }));

    // Persist local & go to confirm page with prefilled rows
    persist(normalized);
    navigate("/utilities/barcode2/confirm", {
      state: { initialRows: excelSeed },
    });
  };

  const handleReset = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setPage(1);
    setRows(INIT_ROWS);
  };

  /* ---- display helpers ---- */
  const formatINR = (n) =>
    `₹ ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // LIVE total amount now uses percentage discount
  const totalAmt = (r) => {
    const sp = toNum(r.sp);
    const discount = toNum(r.discount);
    return Math.max(0, sp - (sp * (discount / 100)));
  };

  /* ---- UI ---- */
  return (
    <div className="sit-wrap">
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
          <div className="sit-left" style={{ maxWidth: "100%" }}>
            <div className="sit-table-wrap">
              <table className="sit-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>S.No</th>
                    <th style={{ width: 140 }}>Item Code</th>
                    <th style={{ minWidth: 200 }}>Product Name</th>
                    <th style={{ width: 100 }}>Size</th>
                    <th style={{ width: 128 }}>Location</th>
                    <th style={{ width: 90 }}>Discount</th>
                    <th style={{ width: 96 }}>Price</th>
                    <th style={{ width: 110 }}>Total Amt</th>
                    <th style={{ width: 72 }}>Qty</th>
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
                          inputMode="text"
                          autoCapitalize="characters"
                          spellCheck={false}
                          value={r.itemCode}
                          onChange={(e) => handleChange(r.id, "itemCode", sanitizeCodeLoose(e.target.value))}
                          onBlur={(e) => {
                            const v = e.target.value || "";
                            const normalized = v ? sanitizeCodeStrict(v) : "";
                            if (normalized !== r.itemCode) handleChange(r.id, "itemCode", normalized);
                            lookupAndFill(r.id, normalized, rowsRef.current, persist);
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                          placeholder="Code"
                        />
                      </td>

                      {/* Product Name (auto-filled) */}
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

                      {/* Location */}
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
                          inputMode="decimal"
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
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={r.sp}
                          onChange={(e) => handleChange(r.id, "sp", e.target.value)}
                          placeholder="0.00"
                        />
                      </td>

                      {/* Total Amt */}
                      <td className="t-right t-dim">{formatINR(totalAmt(r))}</td>

                      {/* Qty */}
                      <td>
                        <input
                          className="sit-input t-right"
                          type="number"
                          inputMode="numeric"
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

            {/* Pagination */}
            <div className="sit-pagination">
              <button className="pg-btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
              <span className="pg-current">{page}</span>
              <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
            </div>

            {/* Actions */}
            <div className="sit-actions" style={{ gap: 10 }}>
              <button type="button" className="btn btn-warning" onClick={handleReset}>Reset</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>Submit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* keep a ref for debounced lookups — moved here to stay identical to your file */
const rowsRef = { current: [] };
