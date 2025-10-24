// src/components/BarcodeUtility2Page.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/BarcodeUtility2Page.css";
import { getItemByCode } from "../api/client";

/* ---------------- Backend locations (KEEP) ---------------- */
const API = "http://127.0.0.1:8000/api";
async function listLocations() {
  const res = await fetch(`${API}/locations/`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load locations");
  return res.json(); // [{code,name}]
}

/* ---------------- Common size options (from Code2) ---------------- */
const SIZE_OPTIONS = [
  "XS","S","M","L","XL","XXL","3XL","4XL",
  "26","28","30","32","34","36","38","40","42","44",
  "3-4Y","5-6Y","7-8Y","9-10Y","11-12Y","13-14Y",
  "Free Size","One Size",
];

/* ---------------- Size dropdown (from Code2; UI-only) ---------------- */
function SizeSelect({ value, onChange, options }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hover, setHover] = React.useState(-1);
  const wrapRef = React.useRef(null);
  const listRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  const hasExact = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return options.some((o) => o.toLowerCase() === q);
  }, [query, options]);

  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const commit = (val) => { onChange(val); setOpen(false); setQuery(""); setHover(-1); };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHover((h) => Math.min(h + 1, filtered.length - 1 + (!hasExact && query.trim() ? 1 : 0)));
      const idx = Math.min(hover + 1, filtered.length - 1);
      listRef.current?.children[idx]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHover((h) => Math.max(h - 1, 0));
      listRef.current?.children[Math.max(hover - 1, 0)]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim() && (!filtered[hover] || (!hasExact && hover === 0))) return commit(query.trim());
      if (filtered[hover]) return commit(filtered[hover]);
    }
  };

  const showCustomBanner = query.trim().length > 0 && !hasExact;

  return (
    <div className="size-dd" ref={wrapRef}>
      <button type="button" className="size-btn" onClick={() => setOpen((v) => !v)} title="Select or type size">
        <span className="size-value">{value || "Select"}</span>
        <span className="size-caret" />
      </button>

      {open && (
        <div className="size-pop" role="listbox" onKeyDown={onKeyDown}>
          <div className="size-search">
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHover(0); }}
              placeholder="Type to search or enter custom"
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) commit(query.trim());
                e.stopPropagation();
              }}
            />
            <span className="ico">⌕</span>
          </div>

          <div className="size-list" ref={listRef}>
            {showCustomBanner && (
              <div className="size-item size-item-custom" onClick={() => commit(query.trim())}>
                Use “{query.trim()}” (custom)
              </div>
            )}
            {filtered.length === 0 ? (
              !showCustomBanner && <div className="size-item">No results</div>
            ) : (
              filtered.map((opt, i) => {
                const selected = value === opt;
                // adjust hover index when custom banner present
                const isHover = (!showCustomBanner && i === hover) || (showCustomBanner && i + 1 === hover);
                return (
                  <div
                    key={opt}
                    className={`size-item ${selected ? "is-selected" : ""} ${isHover ? "is-hover" : ""}`}
                    onMouseEnter={() => setHover(showCustomBanner ? i + 1 : i)}
                    onClick={() => commit(opt)}
                  >
                    {opt}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Seed rows (KEEP) ---------------- */
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

/* ---------------- Code sanitizers (KEEP) ---------------- */
const sanitizeCodeLoose = (v) => (v || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").replace(/-+/g, "-");
const sanitizeCodeStrict = (v) => sanitizeCodeLoose(v).replace(/^-|-$/g, "");
const toNum = (v) => (v === "" || v == null ? 0 : Number(v));

/* ------------- API lookup helper (KEEP) ------------- */
async function lookupAndFill(rowId, code, rows, persist) {
  const clean = sanitizeCodeStrict(code);
  if (!clean) return;
  try {
    const data = await getItemByCode(clean);
    const name =
      data?.product_name ??
      data?.full_name ??
      data?.print_name ??
      data?.item?.name ??
      "";
    const next = rows.map((r) => (r.id === rowId ? { ...r, itemCode: clean, product: name } : r));
    persist(next);
  } catch {
    const next = rows.map((r) => (r.id === rowId ? { ...r, itemCode: clean } : r));
    persist(next);
  }
}

export default function BarcodeUtility2Page({ title = "Common Barcode Printing" }) {
  const navigate = useNavigate();

  const [rows, setRows] = useState(INIT_ROWS);
  const [locations, setLocations] = useState([]); // [{code,name}]

  // restore from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setRows(parsed);
      }
    } catch {}
  }, []);

  // load locations from backend (KEEP)
  useEffect(() => {
    (async () => {
      try {
        const locs = await listLocations();
        setLocations(locs);
      } catch (e) {
        console.error(e);
        alert("Failed to load locations.");
      }
    })();
  }, []);

  const persist = (next) => {
    setRows(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  // debounced item lookup (KEEP)
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const debouncersRef = useRef({});
  const scheduleLookup = (rowId, code) => {
    const raw = sanitizeCodeLoose(code);
    if (!raw || /-$/.test(raw)) return; // wait if trailing hyphen
    const clean = sanitizeCodeStrict(raw);
    const timers = debouncersRef.current;
    if (timers[rowId]) clearTimeout(timers[rowId]);
    timers[rowId] = setTimeout(() => {
      lookupAndFill(rowId, clean, rowsRef.current, persist);
    }, 500);
  };

  // pagination + selected row (UI from Code2)
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

  // change handler (KEEP + lookup hook)
  const handleChange = (id, field, value) => {
    const next = rows.map((r) => (r.id === id ? { ...r, [field]: value } : r));
    persist(next);
    if (field === "itemCode") scheduleLookup(id, value);
  };

  // submit (KEEP backend-compatible mapping & percent discount)
  const handleSubmit = () => {
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
        // NOTE: keep percent-based discount calc (Code1 behavior)
        salesPrice: Math.max(0, Math.round(sp - (sp * (discount / 100)))),
        barcodeName: r.itemCode ? sanitizeCodeStrict(r.itemCode) : "0",
      };
    });

    const filtered = normalized.filter((r) => r.itemCode && r.itemCode !== "0");

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

    // KEEP payload shape expected by the confirm screen
    const excelSeed = filtered.map((r, i) => ({
      _id: i + 1,
      itemCode: r.itemCode,
      product: r.product,
      size: r.size,
      location: r.location, // code like "RJO"
      discount: Number.isFinite(r.discount) ? r.discount : 0,     // percent
      salesPrice: Number.isFinite(r.salesPrice) ? r.salesPrice : 0, // rounded
      mrp: Number.isFinite(r.sp) ? r.sp : 0,
      qty: Number.isFinite(r.qty) ? r.qty : 0,
      barcodeNumber: r.itemCode ? `WS-${r.itemCode}-01` : "",
    }));

    persist(normalized);
    navigate("/utilities/barcode2/confirm", { state: { initialRows: excelSeed } });
  };

  const handleReset = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setPage(1);
    setRows(INIT_ROWS);
  };

  // display helpers (KEEP)
  const formatINR = (n) =>
    `₹ ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const totalAmt = (r) => {
    const sp = toNum(r.sp);
    const discount = toNum(r.discount);
    const amt = Math.max(0, sp - (sp * (discount / 100)));
    return Math.round(amt);
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
          <div className="sit-left" style={{ maxWidth: "100%" }}>
            <div className="sit-table-wrap">
              <table className="sit-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>S.No</th>
                    <th style={{ width: 140 }}>Item Code</th>
                    <th style={{ minWidth: 200 }}>Product Name</th>
                    <th style={{ width: 140 }}>Size</th>
                    <th style={{ width: 128 }}>Location</th>
                    <th style={{ width: 90 }}>Discount %</th>
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

                      {/* Item Code (KEEP sanitizer + lookup) */}
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

                      {/* Product display */}
                      <td><span className="t-link">{r.product}</span></td>

                      {/* Size — Code2 dropdown (UI only) */}
                      <td>
                        <SizeSelect
                          value={r.size}
                          onChange={(val) => handleChange(r.id, "size", val)}
                          options={SIZE_OPTIONS}
                        />
                      </td>

                      {/* Location — from backend (KEEP) */}
                      <td>
                        <select
                          className="sit-input"
                          value={r.location}
                          onChange={(e) => handleChange(r.id, "location", e.target.value)}
                        >
                          <option value="">Select</option>
                          {locations.map((loc) => (
                            <option key={loc.code} value={loc.code}>{loc.code}</option>
                          ))}
                        </select>
                      </td>

                      {/* Discount (percent) */}
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

                      {/* Price (sp) */}
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

                      {/* Computed Total */}
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

            {/* Pagination + Submit/Reset (UI from Code2, behavior from Code1) */}
            <div className="sit-pagination">
              <button className="pg-btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
              <span className="pg-current">{page}</span>
              <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
            </div>

            <div className="sit-actions" style={{ gap: 10 }}>
              <button type="button" className="btn btn-warning" onClick={handleReset}>Reset</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>Submit</button>
            </div>
          </div>
          {/* RIGHT preview intentionally omitted (same as Code2) */}
        </div>
      </div>
    </div>
  );
}
