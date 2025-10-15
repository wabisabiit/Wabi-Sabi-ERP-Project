import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/BarcodePrintConfirmPage.css";

/* Allowed short locations (case-insensitive match on paste) */
const LOCATIONS = ["IC", "RJR", "RJO", "TN", "UP-AP", "M3M", "UV", "KN"];

/* Column order used for paste/keyboard nav (S.No excluded) */
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

/* Keep uppercase A–Z, 0–9 and single hyphens, trim edge hyphens */
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
  qty: 0,
  barcodeNumber: "",
});

export default function BarcodePrintConfirmPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // If Image-1 passed prefilled rows, use them; otherwise start blank
  const initialRows = Array.isArray(state?.initialRows) ? state.initialRows : [];

  const [excelRows, setExcelRows] = useState(() =>
    initialRows.length ? initialRows.map((r, i) => ({ _id: r._id ?? i + 1, ...r })) : [makeRow(1)]
  );

  useEffect(() => {
    if (initialRows.length) {
      setExcelRows(initialRows.map((r, i) => ({ _id: r._id ?? i + 1, ...r })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once to respect prefill while keeping rest of behavior intact

  const totals = useMemo(
    () => ({ qty: excelRows.reduce((s, r) => s + (Number(r.qty) || 0), 0) }),
    [excelRows]
  );

  /* ===== Spreadsheet focus map ===== */
  const cellRefs = useRef(new Map());
  const setCellRef = (rowIdx, colKey) => (el) => {
    if (!el) return;
    cellRefs.current.set(`${rowIdx}-${colKey}`, el);
  };

  const [focusPos, setFocusPos] = useState({ row: 0, col: 0 }); // last focused cell (row/col index)
  const focusCell = (rowIdx, colIdx) => {
    const key = `${rowIdx}-${COLS[colIdx]}`;
    const el = cellRefs.current.get(key);
    if (el) {
      el.focus();
      el.select?.();
    }
    setFocusPos({ row: rowIdx, col: colIdx });
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

  const addRow = () => {
    setExcelRows((prev) => [...prev, makeRow((prev.at(-1)?._id || 0) + 1)]);
  };
  const clearAll = () => setExcelRows([makeRow(1)]);

  const updateCell = (rowId, key, val) => {
    setExcelRows((prev) =>
      prev.map((r) =>
        r._id === rowId ? { ...r, [key]: NUM_FIELDS.has(key) ? asNum(val) : val } : r
      )
    );
  };

  /* ===== Bulk paste helpers ===== */
  const parseGrid = (text) => {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd().split("\n");
    return lines
      .map((line) => {
        const useTabs = line.includes("\t") || !line.includes(",");
        const parts = (useTabs ? line.split("\t") : line.split(",")).map((s) => s.trim());
        return parts;
      })
      .filter((row) => row.some((c) => c !== ""));
  };

  /** Paste a grid starting at [startRowIndex, startColKey] */
  const pasteGridAt = useCallback((text, startRowIndex, startColKey) => {
    const grid = parseGrid(text);
    if (!grid.length) return;

    const startColIndex = COLS.indexOf(startColKey);
    if (startColIndex < 0) return;

    setExcelRows((prev) => {
      let rows = [...prev];

      // ensure enough rows
      const targetLen = startRowIndex + grid.length;
      let id = (rows.at(-1)?._id || 0) + 1;
      while (rows.length < targetLen) rows.push(makeRow(id++));

      for (let r = 0; r < grid.length; r++) {
        const rowIdx = startRowIndex + r;
        const row = { ...rows[rowIdx] };
        const cells = grid[r];

        for (let c = 0; c < cells.length && startColIndex + c < COLS.length; c++) {
          const key = COLS[startColIndex + c];
          let val = cells[c];

          if (key === "itemCode" || key === "barcodeNumber") {
            val = sanitizeCode(val);
          } else if (key === "location") {
            const match = LOCATIONS.find((L) => L.toLowerCase() === String(val).toLowerCase());
            val = match || val;
          } else if (NUM_FIELDS.has(key)) {
            val = asNum(val);
          }
          row[key] = val;
        }
        rows[rowIdx] = row;
      }
      return rows;
    });
  }, []);

  /** Cell onPaste: if text looks like a grid, consume it here */
  const onCellPaste = (e, rowIdx, colKey) => {
    const txt = e.clipboardData?.getData("text/plain") ?? "";
    const looksGrid =
      txt.includes("\n") || txt.includes("\t") || (txt.includes(",") && txt.split(",").length > 1);
    if (looksGrid) {
      e.preventDefault();
      pasteGridAt(txt, rowIdx, colKey);
    }
  };

  /** Table-level paste: works even if the table (not input) is focused */
  const onTablePaste = (e) => {
    const txt = e.clipboardData?.getData("text/plain") ?? "";
    if (!txt) return;
    const { row, col } = focusPos;
    // If nothing focused yet, paste from first row/first col
    const startRow = Math.max(0, row) || 0;
    const startColKey = COLS[Math.max(0, col) || 0];
    e.preventDefault();
    pasteGridAt(txt, startRow, startColKey);
  };

  /* ===== Keyboard navigation like Excel ===== */
  const handleKeyDown = (e, rowIdx, colIdx) => {
    const lastCol = COLS.length - 1;

    const go = (r, c) => {
      if (r >= excelRows.length) ensureRows(r + 1);
      requestAnimationFrame(() => focusCell(r, c));
    };

    if (e.key === "Enter") {
      e.preventDefault();
      const nextC = colIdx === lastCol ? 0 : colIdx + 1;
      const nextR = colIdx === lastCol ? rowIdx + 1 : rowIdx;
      go(nextR, nextC);
      return;
    }
    if (e.key === "Tab") {
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
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(rowIdx, Math.min(lastCol, colIdx + 1));
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(rowIdx, Math.max(0, colIdx - 1));
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      go(rowIdx + 1, colIdx);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      go(Math.max(0, rowIdx - 1), colIdx);
      return;
    }
  };

  /* ===== Expand → third page ===== */
  const expandAndNavigate = () => {
    const expanded = [];
    let sNo = 1;

    const pad2 = (n) => String(n).padStart(2, "0");
    const makeBarcode = (code, idx) => `WS-${code}-${pad2(idx)}`;

    excelRows.forEach((r) => {
      const q = Math.max(0, Math.floor(Number(r.qty) || 0));
      const code = (r.itemCode || "").trim();

      for (let i = 1; i <= q; i++) {
        const shouldBarcode = code !== "" && code !== "0";
        const barcode = shouldBarcode ? makeBarcode(code, i) : "";

        expanded.push({
          sNo: sNo++,
          itemCode: r.itemCode,
          product: r.product,
          size: r.size,
          location: r.location,
          discount: Number(r.discount) || 0,
          salesPrice: Number(r.salesPrice) || 0,
          mrp: Number(r.mrp) || 0,
          barcodeNumber: barcode,   // only for non-zero, non-empty item codes
          barcodeName: barcode,
        });
      }
    });

    navigate("/utilities/barcode2/expanded", {
      state: {
        expanded,
        fromRows: excelRows,
        stored: initialRows,
        totals: { qty: totals.qty },
      },
    });
  };

  return (
    <div className="sit-wrap confirm-page">
      {/* Top bar — one line tip */}
      <div className="sit-bc">
        <div className="sit-bc-left">
          <span className="sit-title">Barcode Print – Excel Mode</span>
        </div>
        <div className="sit-home" aria-label="Home">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
          </svg>
        </div>
      </div>

      <div className="sit-card confirm-grid">
        {/* Minimal sidebar */}
        <aside className="confirm-side">
          <div className="side-box">
            <div className="side-title">Quick Actions</div>
            <button className="btn btn-primary btn-sm" onClick={addRow}>+ Add Row</button>
            <button className="btn btn-outline btn-sm" onClick={clearAll}>Clear</button>
          </div>
        </aside>

        {/* Main: Excel-like table (captures table-level paste) */}
        <div className="confirm-main">
          {/* datalist for locations (so inputs behave like select but allow bulk paste) */}
          <datalist id="locations">
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>

          <div
            className="sit-table-wrap confirm-narrow"
            onPaste={onTablePaste}     // paste works even if wrapper is focused
            tabIndex={0}               // allow wrapper to receive focus/paste
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
                    <td colSpan={10} className="t-dim" style={{ padding: "12px 8px" }} />
                  </tr>
                ) : (
                  excelRows.map((r, rowIdx) => (
                    <tr key={r._id}>
                      <td className="t-right">{rowIdx + 1}</td>

                      {COLS.map((key, colIdx) => {
                        const isCode = key === "itemCode" || key === "barcodeNumber";
                        const isNumber = NUM_FIELDS.has(key);
                        const isLocation = key === "location";

                        return (
                          <td key={key}>
                            <input
                              ref={setCellRef(rowIdx, key)}
                              className={`sit-input ${isCode ? "t-mono" : ""} ${isNumber ? "t-right" : ""}`}
                              value={r[key]}
                              list={isLocation ? "locations" : undefined}
                              onFocus={() => setFocusPos({ row: rowIdx, col: colIdx })}
                              onChange={(e) => {
                                let v = e.target.value;
                                if (isCode) v = sanitizeCode(v);
                                if (isNumber) v = v === "" ? "" : String(v);
                                updateCell(r._id, key, isNumber ? v : v);
                              }}
                              onBlur={(e) => {
                                if (isNumber) updateCell(r._id, key, asNum(e.target.value));
                                if (isLocation) {
                                  const match = LOCATIONS.find(
                                    (L) => L.toLowerCase() === e.target.value.toLowerCase()
                                  );
                                  if (match) updateCell(r._id, key, match);
                                }
                              }}
                              onPaste={(e) => onCellPaste(e, rowIdx, key)}
                              onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                              placeholder={
                                key === "itemCode"
                                  ? "Code"
                                  : key === "product"
                                  ? "Product"
                                  : key === "size"
                                  ? "Size"
                                  : key === "location"
                                  ? "Location"
                                  : key === "discount" || key === "salesPrice" || key === "mrp"
                                  ? "0.00"
                                  : key === "qty"
                                  ? "0"
                                  : "Barcode Number"
                              }
                              inputMode={isNumber ? "decimal" : isCode ? "numeric" : "text"}
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

          {/* Equal-width actions */}
          <div className="sit-actions confirm-actions equal-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={expandAndNavigate}>
              Submit (Expand)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
