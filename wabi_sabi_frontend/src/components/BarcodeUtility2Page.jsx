// src/components/BarcodeUtility2Page.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/BarcodeUtility2Page.css";

// ❌ OLD (kept)
// import { getItemByCode } from "../api/client";

// ✅ NEW: use shared listLocations from client
import { getItemByCode, listLocations } from "../api/client";

/* ---------------- Common size options (from Code2) ---------------- */
const SIZE_OPTIONS = [
  "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL",
  "26", "28", "30", "32", "34", "36", "38", "40", "42", "44",
  "3-4Y", "5-6Y", "7-8Y", "9-10Y", "11-12Y", "13-14Y",
  "Free Size", "One Size",
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
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const commit = (val) => {
    onChange(val);
    setOpen(false);
    setQuery("");
    setHover(-1);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHover((h) =>
        Math.min(
          h + 1,
          filtered.length - 1 + (!hasExact && query.trim() ? 1 : 0)
        )
      );
      const idx = Math.min(hover + 1, filtered.length - 1);
      listRef.current?.children[idx]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHover((h) => Math.max(h - 1, 0));
      listRef.current?.children[Math.max(hover - 1, 0)]?.scrollIntoView({
        block: "nearest",
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim() && (!filtered[hover] || (!hasExact && hover === 0)))
        return commit(query.trim());
      if (filtered[hover]) return commit(filtered[hover]);
    }
  };

  const showCustomBanner = query.trim().length > 0 && !hasExact;

  return (
    <div className="size-dd" ref={wrapRef}>
      <button
        type="button"
        className="size-btn"
        onClick={() => setOpen((v) => !v)}
        title="Select or type size"
      >
        <span className="size-value">{value || "Select"}</span>
        <span className="size-caret" />
      </button>

      {open && (
        <div className="size-pop" role="listbox" onKeyDown={onKeyDown}>
          <div className="size-search">
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHover(0);
              }}
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
              <div
                className="size-item size-item-custom"
                onClick={() => commit(query.trim())}
              >
                Use “{query.trim()}” (custom)
              </div>
            )}
            {filtered.length === 0 ? (
              !showCustomBanner && <div className="size-item">No results</div>
            ) : (
              filtered.map((opt, i) => {
                const selected = value === opt;
                const isHover =
                  (!showCustomBanner && i === hover) ||
                  (showCustomBanner && i + 1 === hover);
                return (
                  <div
                    key={opt}
                    className={`size-item ${
                      selected ? "is-selected" : ""
                    } ${isHover ? "is-hover" : ""}`}
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
  {
    id: 1,
    itemCode: "0",
    product: "Lenova LCD",
    size: "",
    location: "",
    mrp: 3500.0,
    sp: 1999.0,
    qty: 1,
    discount: 0,
  },
  {
    id: 2,
    itemCode: "0",
    product: "Top",
    size: "",
    location: "",
    mrp: 99.0,
    sp: 49.0,
    qty: 1,
    discount: 0,
  },
  {
    id: 3,
    itemCode: "0",
    product: "Top",
    size: "",
    location: "",
    mrp: 99.0,
    sp: 49.0,
    qty: 1,
    discount: 0,
  },
  {
    id: 4,
    itemCode: "0",
    product: "Top",
    size: "",
    location: "",
    mrp: 99.0,
    sp: 49.0,
    qty: 1,
    discount: 0,
  },
  {
    id: 5,
    itemCode: "0",
    product: "Top",
    size: "",
    location: "",
    mrp: 99.0,
    sp: 49.0,
    qty: 1,
    discount: 0,
  },
  {
    id: 6,
    itemCode: "0",
    product: "Top",
    size: "",
    location: "",
    mrp: 99.0,
    sp: 49.0,
    qty: 1,
    discount: 0,
  },
  {
    id: 7,
    itemCode: "0",
    product: "Top",
    size: "",
    location: "",
    mrp: 99.0,
    sp: 49.0,
    qty: 1,
    discount: 0,
  },
  {
    id: 8,
    itemCode: "0",
    product: "Top",
    size: "",
    location: "",
    mrp: 99.0,
    sp: 49.0,
    qty: 1,
    discount: 0,
  },
];

const STORAGE_KEY = "barcode2_rows_v1";

/* ---------------- Code sanitizers (KEEP) ---------------- */
const sanitizeCodeLoose = (v) =>
  (v || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").replace(/-+/g, "-");
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
    const next = rows.map((r) =>
      r.id === rowId ? { ...r, itemCode: clean, product: name } : r
    );
    persist(next);
  } catch {
    const next = rows.map((r) =>
      r.id === rowId ? { ...r, itemCode: clean } : r
    );
    persist(next);
  }
}

export default function BarcodeUtility2Page({
  title = "Common Barcode Printing",
}) {
  const navigate = useNavigate();

  const [rows, setRows] = useState(INIT_ROWS);
  const [locations, setLocations] = useState([]); // [{code,name}]
  const [loadingRowId, setLoadingRowId] = useState(null); // 🔵 which row is loading

  // ✅ CSV import input ref
  const csvInputRef = useRef(null);

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

  // debounced item lookup (KEEP, with spinner)
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const debouncersRef = useRef({});

  const doLookup = async (rowId, code) => {
    const clean = sanitizeCodeStrict(code);
    if (!clean) return;
    setLoadingRowId(rowId);
    try {
      await lookupAndFill(rowId, clean, rowsRef.current, persist);
    } finally {
      setLoadingRowId((current) => (current === rowId ? null : current));
    }
  };

  const scheduleLookup = (rowId, code) => {
    const raw = sanitizeCodeLoose(code);
    if (!raw || /-$/.test(raw)) return;
    const clean = sanitizeCodeStrict(raw);
    const timers = debouncersRef.current;
    if (timers[rowId]) clearTimeout(timers[rowId]);
    timers[rowId] = setTimeout(() => {
      doLookup(rowId, clean);
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
    setSelected(
      (prev) =>
        pageRows.find((r) => r.id === prev?.id) || pageRows[0] || rows[0]
    );
  }, [pageRows, rows]);

  // change handler (KEEP + lookup hook)
  const handleChange = (id, field, value) => {
    const next = rows.map((r) =>
      r.id === id ? { ...r, [field]: value } : r
    );
    persist(next);
    if (field === "itemCode") scheduleLookup(id, value);
  };

  // ✅ CSV helpers
  const parseCSVLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const handleImportCSVClick = () => {
    csvInputRef.current?.click();
  };

  // ✅ build confirm-page rows (same shape as handleSubmit does)
  const buildExcelSeed = (sourceRows) => {
    const normalized = sourceRows.map((r) => {
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
        salesPrice: Math.max(0, Math.round(sp - sp * (discount / 100))),
        barcodeName: r.itemCode ? sanitizeCodeStrict(r.itemCode) : "0",
      };
    });

    const filtered = normalized.filter((r) => r.itemCode && r.itemCode !== "0");

    return filtered.map((r, i) => ({
      _id: i + 1,
      itemCode: r.itemCode,
      product: r.product,
      size: r.size,
      location: r.location,
      discount: Number.isFinite(r.discount) ? r.discount : 0,
      salesPrice: Number.isFinite(r.salesPrice) ? r.salesPrice : 0,
      mrp: Number.isFinite(r.sp) ? r.sp : 0,
      qty: Number.isFinite(r.qty) ? r.qty : 0,
      barcodeNumber: "",
    }));
  };

  // ✅ After import: redirect to confirm page
  const handleCSVSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text
        .replace(/\r/g, "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (!lines.length) return;

      const first = parseCSVLine(lines[0]).map((h) => (h || "").toLowerCase());

      const headerMap = {
        itemcode: ["item code", "itemcode", "barcode", "code"],
        product: ["product name", "product", "name"],
        size: ["size"],
        location: ["location", "loc"],
        discount: ["discount %", "discount", "disc"],
        sp: ["price", "sp", "selling price", "selling_price"],
        qty: ["qty", "quantity"],
      };

      const idxOf = (keys) =>
        keys
          .map((k) => first.indexOf(k))
          .find((i) => i != null && i >= 0);

      const hasHeader =
        idxOf(headerMap.itemcode) != null ||
        idxOf(headerMap.product) != null ||
        idxOf(headerMap.sp) != null;

      const startLine = hasHeader ? 1 : 0;

      const colIdx = hasHeader
        ? {
            itemCode: idxOf(headerMap.itemcode),
            product: idxOf(headerMap.product),
            size: idxOf(headerMap.size),
            location: idxOf(headerMap.location),
            discount: idxOf(headerMap.discount),
            sp: idxOf(headerMap.sp),
            qty: idxOf(headerMap.qty),
          }
        : {
            itemCode: 0,
            product: 1,
            size: 2,
            location: 3,
            discount: 4,
            sp: 5,
            qty: 6,
          };

      const imported = [];
      for (let i = startLine; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const get = (k) => {
          const idx = colIdx[k];
          if (idx == null || idx < 0) return "";
          return (cols[idx] ?? "").trim();
        };

        const itemCode = sanitizeCodeStrict(get("itemCode"));
        const product = get("product");
        const size = get("size");
        const location = get("location");
        const discount = get("discount");
        const sp = get("sp");
        const qty = get("qty");

        if (!itemCode && !product && !sp) continue;

        imported.push({
          itemCode: itemCode || "0",
          product: product || "",
          size: size || "",
          location: location || "",
          discount: discount === "" ? 0 : Number(discount),
          sp: sp === "" ? 0 : Number(sp),
          qty: qty === "" ? 1 : Number(qty),
        });
      }

      if (!imported.length) return;

      const next = [...rowsRef.current];
      let nextId = Math.max(0, ...next.map((r) => r.id || 0)) + 1;

      for (let i = 0; i < imported.length; i++) {
        if (i < next.length) {
          next[i] = { ...next[i], ...imported[i] };
        } else {
          next.push({
            id: nextId++,
            mrp: 0,
            ...imported[i],
          });
        }
      }

      persist(next);
      setPage(1);

      // ✅ redirect to confirm page after import
      const excelSeed = buildExcelSeed(next);
      navigate("/utilities/barcode2/confirm", {
        state: { initialRows: excelSeed },
      });
    } catch (err) {
      console.error(err);
      alert("Failed to import CSV.");
    } finally {
      e.target.value = "";
    }
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
        salesPrice: Math.max(0, Math.round(sp - sp * (discount / 100))),
        barcodeName: r.itemCode ? sanitizeCodeStrict(r.itemCode) : "0",
      };
    });

    const filtered = normalized.filter(
      (r) => r.itemCode && r.itemCode !== "0"
    );

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
      alert(
        `Please fix the following before submitting:\n\n${problems.join("\n")}`
      );
      return;
    }

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
      barcodeNumber: "",
    }));

    persist(normalized);
    navigate("/utilities/barcode2/confirm", {
      state: { initialRows: excelSeed },
    });
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setPage(1);
    setRows(INIT_ROWS);
  };

  const formatINR = (n) =>
    `₹ ${Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  const totalAmt = (r) => {
    const sp = toNum(r.sp);
    const discount = toNum(r.discount);
    const amt = Math.max(0, sp - sp * (discount / 100));
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

        {/* Import CSV button at right top */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleImportCSVClick}
          style={{ marginLeft: "auto" }}
        >
          Import CSV
        </button>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCSVSelected}
          style={{ display: "none" }}
        />

        <div className="sit-home" aria-label="Home">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
            aria-hidden
          >
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

                      <td>
                        <div className="sit-itemcode-cell">
                          <input
                            className="sit-input t-mono"
                            type="text"
                            inputMode="text"
                            autoCapitalize="characters"
                            spellCheck={false}
                            value={r.itemCode}
                            onChange={(e) =>
                              handleChange(
                                r.id,
                                "itemCode",
                                sanitizeCodeLoose(e.target.value)
                              )
                            }
                            onBlur={(e) => {
                              const v = e.target.value || "";
                              const normalized = v ? sanitizeCodeStrict(v) : "";
                              if (normalized !== r.itemCode)
                                handleChange(r.id, "itemCode", normalized);
                              doLookup(r.id, normalized);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            placeholder="Code"
                          />
                          {loadingRowId === r.id && (
                            <span
                              className="bc-spinner"
                              aria-label="Loading product…"
                            />
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="t-link">{r.product}</span>
                      </td>

                      <td>
                        <SizeSelect
                          value={r.size}
                          onChange={(val) => handleChange(r.id, "size", val)}
                          options={SIZE_OPTIONS}
                        />
                      </td>

                      <td>
                        <select
                          className="sit-input"
                          value={r.location}
                          onChange={(e) =>
                            handleChange(r.id, "location", e.target.value)
                          }
                        >
                          <option value="">Select</option>
                          {locations.map((loc) => (
                            <option key={loc.code} value={loc.code}>
                              {loc.code}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          className="sit-input t-right"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={r.discount}
                          onChange={(e) =>
                            handleChange(r.id, "discount", e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </td>

                      <td>
                        <input
                          className="sit-input t-right"
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={r.sp}
                          onChange={(e) =>
                            handleChange(r.id, "sp", e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </td>

                      <td className="t-right t-dim">
                        {formatINR(totalAmt(r))}
                      </td>

                      <td>
                        <input
                          className="sit-input t-right"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          value={r.qty}
                          onChange={(e) =>
                            handleChange(r.id, "qty", e.target.value)
                          }
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sit-pagination">
              <button
                className="pg-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              <span className="pg-current">{page}</span>
              <button
                className="pg-btn"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>

            <div className="sit-actions" style={{ gap: 10 }}>
              <button
                type="button"
                className="btn btn-warning"
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
