// src/components/BarcodePrintConfirmPage.jsx
import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/BarcodePrintConfirmPage.css";
import { upsertProductsFromBarcodes } from "../api/client";

/* Backend helpers */
const API = "http://127.0.0.1:8000/api";

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} – ${text || "request failed"}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function listLocations() {
  return fetchJSON(`${API}/locations/`);
}

async function printBarcodes(payload) {
  return fetchJSON(`${API}/products/print-barcodes/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* Column order for paste/keyboard nav (S.No excluded) */
const COLS = [
  "itemCode",
  "product",
  "size",
  "location",
  "discount",
  "salesPrice",
  "mrp",
  "qty",
  "barcodeNumber",
];

const NUM_FIELDS = new Set(["discount", "salesPrice", "mrp", "qty"]);
const asNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sanitizeCode = (v) =>
  (v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
const makeRow = (id) => ({
  _id: id,
  itemCode: "",
  product: "",
  size: "",
  location: "",
  discount: 0,
  salesPrice: 0,
  mrp: 0,
  qty: 1,
  barcodeNumber: "",
});

export default function BarcodePrintConfirmPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const initialRows = Array.isArray(state?.initialRows) ? state.initialRows : [];

  const [excelRows, setExcelRows] = useState(() =>
    initialRows.length
      ? initialRows.map((r, i) => ({ _id: r._id ?? i + 1, ...r }))
      : [makeRow(1)]
  );
  const [locations, setLocations] = useState([]);

  const [focusPos, setFocusPos] = useState({ row: 0, col: 0 });

  // 🔵 New: submitting + toast state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  const showToast = (type, message) => {
    setToast({ type, message });
    // auto hide in 3s
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const locs = await listLocations();
        setLocations(locs);
      } catch (e) {
        console.error(e);
        // keep existing behaviour: simple error message
        alert("Failed to load locations.");
      }
    })();
  }, []);

  useEffect(() => {
    if (initialRows.length)
      setExcelRows(initialRows.map((r, i) => ({ _id: r._id ?? i + 1, ...r })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(
    () => ({ qty: excelRows.reduce((s, r) => s + (Number(r.qty) || 0), 0) }),
    [excelRows]
  );
  const cellRefs = useRef(new Map());
  const setCellRef = (rowIdx, colKey) => (el) => {
    if (el) cellRefs.current.set(`${rowIdx}-${colKey}`, el);
  };

  const ensureRows = (need) => {
    setExcelRows((prev) => {
      if (prev.length >= need) return prev;
      const next = [...prev];
      let id = (next.at(-1)?._id || 0) + 1;
      while (next.length < need) next.push(makeRow(id++));
      return next;
    });
  };

  const addRow = () =>
    setExcelRows((prev) => [...prev, makeRow((prev.at(-1)?._id || 0) + 1)]);
  const clearAll = () => setExcelRows([makeRow(1)]);

  const updateCell = (rowId, key, val) => {
    setExcelRows((prev) =>
      prev.map((r) =>
        r._id === rowId ? { ...r, [key]: NUM_FIELDS.has(key) ? asNum(val) : val } : r
      )
    );
  };

  const parseGrid = (text) => {
    const lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trimEnd()
      .split("\n");
    return lines
      .map((line) => {
        const useTabs = line.includes("\t") || !line.includes(",");
        const parts = (useTabs ? line.split("\t") : line.split(",")).map((s) =>
          s.trim()
        );
        return parts;
      })
      .filter((row) => row.some((c) => c !== ""));
  };

  const pasteGridAt = useCallback(
    (text, startRowIndex, startColKey) => {
      const grid = parseGrid(text);
      if (!grid.length) return;

      const startColIndex = COLS.indexOf(startColKey);
      if (startColIndex < 0) return;

      setExcelRows((prev) => {
        let rows = [...prev];
        const targetLen = startRowIndex + grid.length;
        let id = (rows.at(-1)?._id || 0) + 1;
        while (rows.length < targetLen) rows.push(makeRow(id++));

        for (let r = 0; r < grid.length; r++) {
          const rowIdx = startRowIndex + r;
          const row = { ...rows[rowIdx] };
          const cells = grid[r];

          for (
            let c = 0;
            c < cells.length && startColIndex + c < COLS.length;
            c++
          ) {
            const key = COLS[startColIndex + c];
            let val = cells[c];

            if (key === "itemCode" || key === "barcodeNumber") {
              val = sanitizeCode(val);
            } else if (key === "location") {
              const match = (locations || []).find(
                (L) => L.code.toLowerCase() === String(val).toLowerCase()
              );
              val = match ? match.code : val;
            } else if (NUM_FIELDS.has(key)) {
              val = asNum(val);
            }
            row[key] = val;
          }
          rows[rowIdx] = row;
        }
        return rows;
      });
    },
    [locations]
  );

  const onCellPaste = (e, rowIdx, key) => {
    const txt = e.clipboardData?.getData("text/plain") ?? "";
    const looksGrid =
      txt.includes("\n") ||
      txt.includes("\t") ||
      (txt.includes(",") && txt.split(",").length > 1);
    if (looksGrid) {
      e.preventDefault();
      pasteGridAt(txt, rowIdx, key);
    }
  };

  const onTablePaste = (e) => {
    const txt = e.clipboardData?.getData("text/plain") ?? "";
    if (!txt) return;
    const startRow = Math.max(0, focusPos.row) || 0;
    const startColKey = COLS[Math.max(0, focusPos.col) || 0];
    e.preventDefault();
    pasteGridAt(txt, startRow, startColKey);
  };

  const handleKeyDown = (e, rowIdx, colIdx) => {
    const lastCol = COLS.length - 1;
    const go = (r, c) => {
      if (r >= excelRows.length) ensureRows(r + 1);
      requestAnimationFrame(() => {
        const key = `${r}-${COLS[c]}`;
        const el = cellRefs.current.get(key);
        el?.focus();
        el?.select?.();
      });
    };

    if (e.key === "Enter") {
      e.preventDefault();
      const nextC = colIdx === lastCol ? 0 : colIdx + 1;
      const nextR = colIdx === lastCol ? rowIdx + 1 : rowIdx;
      go(nextR, nextC);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      let c = colIdx + dir;
      let r = rowIdx;
      if (c < 0) {
        c = lastCol;
        r = Math.max(0, r - 1);
      } else if (c > lastCol) {
        c = 0;
        r = r + 1;
      }
      go(r, c);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(rowIdx, Math.min(lastCol, colIdx + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(rowIdx, Math.max(0, colIdx - 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      go(rowIdx + 1, colIdx);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      go(Math.max(0, rowIdx - 1), colIdx);
    }
  };

  /* ===== Expand → save to DB → create STF ===== */
  /* ===== Expand → save to DB (server mints barcodes) → create STF ===== */
  const expandAndNavigate = async () => {
    if (isSubmitting) return; // avoid double click

    setIsSubmitting(true);

    // 1) Expand rows by qty (no client-side barcode generation)
    const expanded = [];
    let sNo = 1;

    excelRows.forEach((r) => {
      const qty = Math.max(0, Math.floor(Number(r.qty) || 0));
      const itemCode = String(r.itemCode || "").trim();
      for (let i = 0; i < qty; i++) {
        expanded.push({
          sNo: sNo++,
          itemCode,
          product: r.product,
          size: r.size,
          location: r.location, // e.g. RJO
          discount: Number(r.discount) || 0,
          salesPrice: Number(r.salesPrice) || 0,
          mrp: Number(r.mrp) || 0,
          barcodeNumber: "", // SERVER will fill
          barcodeName: "", // (kept for UI compatibility)
          imageUrl: r.imageUrl || "",
        });
      }
    });

    // Build payload for /products/bulk-upsert/
    // One row per label; barcodeNumber intentionally blank
    const payload = expanded
      .filter((r) => r.itemCode && r.itemCode !== "0")
      .map((r) => ({
        itemCode: r.itemCode,
        barcodeNumber: "", // <-- let server mint A-001 … Z-999
        salesPrice: r.salesPrice,
        mrp: r.mrp,
        size: (r.size || "").trim(),
        imageUrl: r.imageUrl || "",
        qty: 1, // one product per label
        discountPercent: r.discount,
      }));

    // 2) Upsert → server generates barcodes and returns them in results[]
    let minted = [];
    try {
      if (payload.length) {
        const res = await upsertProductsFromBarcodes(payload); // POST /products/bulk-upsert/
        const created = res?.created ?? 0;
        const updated = res?.updated ?? 0;
        const errs = Array.isArray(res?.errors) ? res.errors : [];
        minted = Array.isArray(res?.results) ? res.results : [];

        if (errs.length) {
          console.warn("bulk-upsert errors:", errs);
          showToast(
            "error",
            `Barcode save completed with ${errs.length} error(s).`
          );
        } else {
          // ✅ success popup (light green)
          showToast("success", "Barcode created successfully.");
        }

        console.log("Bulk upsert:", { created, updated });
      } else {
        console.warn("No rows with Item Code to save.");
        showToast("error", "No rows with Item Code to save.");
      }
    } catch (e) {
      console.error("Bulk upsert failed:", e);
      // ❌ failure popup (red)
      showToast("error", "Failed to save barcodes.");
    }

    // 3) Fill expanded[] with the actual server-minted barcodes (A-xxx)
    //    We created payload in the same order as expanded, so map by index.
    if (minted.length) {
      const codes = minted.map((m) => m.barcode); // [{row, id, itemCode, barcode}]
      for (let i = 0; i < expanded.length && i < codes.length; i++) {
        expanded[i].barcodeNumber = codes[i] || expanded[i].barcodeNumber;
        expanded[i].barcodeName = expanded[i].barcodeNumber;
      }
    }

    // 4) Create Stock Transfers — group by location using real (A-xxx) barcodes
    try {
      const byLoc = new Map();
      for (const r of expanded) {
        if (!r.location || !r.barcodeNumber) continue;
        if (!byLoc.has(r.location)) byLoc.set(r.location, []);
        byLoc.get(r.location).push(r.barcodeNumber);
      }

      const createdAt = new Date().toISOString();
      const results = [];

      for (const [loc, barcodes] of byLoc.entries()) {
        const resp = await printBarcodes({
          to_location_code: loc,
          barcodes, // <- A-xxx from server
          created_at: createdAt,
          note: "Auto from Expand",
        });
        results.push(resp?.stf_number);
      }

      if (results.length) {
        // ✅ stock transfer success popup (light green)
        showToast("success", "Stock transfer created successfully.");
        console.log("Stock Transfer numbers:", results);
      } else {
        showToast(
          "error",
          "No stock transfer created (no location or barcodes)."
        );
      }
    } catch (e) {
      console.error("STF create failed:", e);
      // ❌ failure popup (red)
      showToast("error", "Failed to create Stock Transfer.");
    }

    // 5) Navigate to expanded preview (now showing A-xxx barcodes)
    setIsSubmitting(false);
    navigate("/utilities/barcode2/expanded", {
      state: {
        expanded,
        fromRows: excelRows,
        stored: initialRows,
        totals: { qty: expanded.length },
      },
    });
  };

  return (
    <div className="sit-wrap confirm-page">
      <div className="sit-bc">
        <div className="sit-bc-left">
          <span className="sit-title">Barcode Print – Excel Mode</span>
        </div>
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

      <div className="sit-card confirm-page-card confirm-grid">
        <aside className="confirm-side">
          <div className="side-box">
            <div className="side-title">Quick Actions</div>
            <button className="btn btn-primary btn-sm" onClick={addRow}>
              + Add Row
            </button>
            <button className="btn btn-outline btn-sm" onClick={clearAll}>
              Clear
            </button>
          </div>
        </aside>

        <div className="confirm-main">
          <datalist id="locations">
            {(locations || []).map((loc) => (
              <option key={loc.code} value={loc.code} />
            ))}
          </datalist>

          <div
            className="sit-table-wrap confirm-narrow"
            onPaste={onTablePaste}
            tabIndex={0}
            onFocus={() => {
              if (excelRows.length === 0) ensureRows(1);
            }}
          >
            <table className="sit-table confirm-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>S.No</th>
                  <th style={{ width: 110 }}>Item Code</th>
                  <th style={{ minWidth: 160 }}>Product Name</th>
                  <th style={{ width: 90 }}>Size</th>
                  <th style={{ width: 122 }}>Location</th>
                  <th style={{ width: 90 }}>Discount</th>
                  <th style={{ width: 104 }}>Selling Price</th>
                  <th style={{ width: 100 }}>MRP</th>
                  <th style={{ width: 64 }}>Qty</th>
                  <th style={{ width: 130 }}>Barcode Number</th>
                </tr>
              </thead>

              <tbody>
                {excelRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="t-dim"
                      style={{ padding: "12px 8px" }}
                    />
                  </tr>
                ) : (
                  excelRows.map((r, rowIdx) => (
                    <tr key={r._id}>
                      <td className="t-right">{rowIdx + 1}</td>
                      {COLS.map((key, colIdx) => {
                        const isCode =
                          key === "itemCode" || key === "barcodeNumber";
                        const isNumber = NUM_FIELDS.has(key);
                        const isLocation = key === "location";
                        return (
                          <td key={key}>
                            <input
                              ref={setCellRef(rowIdx, key)}
                              className={`sit-input ${
                                isCode ? "t-mono" : ""
                              } ${isNumber ? "t-right" : ""}`}
                              value={r[key]}
                              list={isLocation ? "locations" : undefined}
                              onFocus={() =>
                                setFocusPos({ row: rowIdx, col: colIdx })
                              }
                              onChange={(e) => {
                                let v = e.target.value;
                                if (isCode) v = sanitizeCode(v);
                                if (isNumber) v = v === "" ? "" : String(v);
                                if (isLocation) {
                                  const match = (locations || []).find(
                                    (L) =>
                                      L.code.toLowerCase() ===
                                      v.toLowerCase()
                                  );
                                  if (match) v = match.code;
                                }
                                updateCell(
                                  r._id,
                                  key,
                                  isNumber ? asNum(v) : v
                                );
                              }}
                              onPaste={(e) => onCellPaste(e, rowIdx, key)}
                              onKeyDown={(e) =>
                                handleKeyDown(e, rowIdx, colIdx)
                              }
                              placeholder={
                                key === "itemCode"
                                  ? "Code"
                                  : key === "product"
                                  ? "Product"
                                  : key === "size"
                                  ? "Size"
                                  : key === "location"
                                  ? "Location"
                                  : key === "discount" ||
                                    key === "salesPrice" ||
                                    key === "mrp"
                                  ? "0.00"
                                  : key === "qty"
                                  ? "0"
                                  : "Barcode Number"
                              }
                              /* text for codes (allows letters like A-001), decimal for number fields */
                              inputMode={isNumber ? "decimal" : undefined}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="sit-actions confirm-actions equal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={expandAndNavigate}
              disabled={isSubmitting}
            >
              Submit (Expand)
            </button>
          </div>
        </div>
      </div>

      {/* 🔵 Spinner overlay during processing */}
      {isSubmitting && (
        <div className="confirm-spinner-overlay">
          <div className="confirm-spinner-box">
            <div className="confirm-spinner" />
            <div className="confirm-spinner-text">Processing request…</div>
          </div>
        </div>
      )}

      {/* 🔔 Toast popup for success / error */}
      {toast && (
        <div className={`confirm-toast confirm-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
