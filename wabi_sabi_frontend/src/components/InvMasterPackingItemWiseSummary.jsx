// src/pages/MasterPackingItemwise.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import "../styles/MasterPackingItemWise.css";
import { listMasterPackingItemWise, listLocations } from "../api/client";

/* ---------------- click-outside helper ---------------- */
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const l = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", l);
    document.addEventListener("touchstart", l);
    return () => {
      document.removeEventListener("mousedown", l);
      document.removeEventListener("touchstart", l);
    };
  }, [ref, handler]);
}

/* ---------------- icons (svg so we can recolor) ---------------- */
const Ic = {
  home: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-5v-7H10v7H5a2 2 0 0 1-2-2v-9z" />
    </svg>
  ),
  export: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 20h14v-2H5v2zM12 2l-5 5h3v6h4V7h3l-5-5z" />
    </svg>
  ),
  caret: () => (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.24 4.38a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z" />
    </svg>
  ),
  filter: () => (
    <svg className="ic-filter" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 4h18v2l-7 8v5l-4 1v-6L3 6V4z" />
    </svg>
  ),
  cal: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm14 8H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10z" />
    </svg>
  ),
  file: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />
    </svg>
  ),
};

/* ---------------- select (single, searchable) ---------------- */
function Select({ placeholder, options = [], value, onChange, width = 240 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  const shown = useMemo(
    () => (q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options),
    [q, options]
  );
  return (
    <div className="mpw-combo" style={{ width }} ref={ref}>
      <button
        className={`mpw-combo-btn ${value ? "has" : ""}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="mpw-combo-val">{value || placeholder}</span>
        <span className="mpw-caret">
          <Ic.caret />
        </span>
      </button>
      {open && (
        <div className="mpw-pop">
          <input
            className="mpw-pop-search"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="mpw-pop-list">
            {shown.map((o) => (
              <div
                key={o}
                className="mpw-pop-item"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
              >
                {o}
              </div>
            ))}
            {!shown.length && <div className="mpw-pop-empty">No options</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- per-page dropdown (10,50,100,500) ---------------- */
function PerPage({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  const opts = [10, 50, 100, 500];
  return (
    <div className="mpw-pp" ref={ref}>
      <button className="mpw-pp-btn" onClick={() => setOpen((v) => !v)} type="button">
        {value} <Ic.caret />
      </button>
      {open && (
        <div className="mpw-pp-menu">
          {opts.map((n) => (
            <button
              key={n}
              className="mpw-pp-item"
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- export dropdown (CSV/PDF-print) ---------------- */
function ExportMenu({ rows, headers }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const toCSV = () => {
    const head = headers.join(",");
    const body = rows
      .map((r) => headers.map((h) => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "master-packing-wise.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const toPDF = () => {
    const w = window.open("", "_blank");
    const style = `
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:24px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #e5e7eb;padding:8px 10px;font-size:12px;text-align:left}
        th{background:#f3f4f6}
        h2{margin:0 0 12px;font-size:16px}
      </style>`;
    const body = rows
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td>${headers.map((h) => `<td>${r[h] || ""}</td>`).join("")}</tr>`
      )
      .join("");
    w.document.write(
      `<html><head>${style}</head><body><h2>Master Packing Wise Summary</h2><table><thead><tr><th>#</th>${headers
        .map((h) => `<th>${h}</th>`)
        .join("")}</tr></thead><tbody>${body}</tbody></table></body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="mpw-export" ref={ref}>
      <button className="mpw-export-btn" onClick={() => setOpen((v) => !v)} type="button">
        <Ic.export />
        <span className="mpw-drop-caret">
          <Ic.caret />
        </span>
      </button>
      {open && (
        <div className="mpw-export-menu">
          <button className="mpw-export-item" onClick={toCSV}>
            <Ic.file /> <span>Excel</span>
          </button>
          <button className="mpw-export-item" onClick={toPDF}>
            <Ic.file /> <span>PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ===================== DATE RANGE DROPDOWN CALENDAR ===================== */
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fromISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toDMY(iso) {
  if (!iso) return "";
  const d = fromISODate(iso);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  const day = (first.getDay() + 6) % 7; // Monday=0
  start.setDate(first.getDate() - day);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    cells.push({ dt, inMonth: dt.getMonth() === month });
  }
  return cells;
}

function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const [tmpFrom, setTmpFrom] = useState(from);
  const [tmpTo, setTmpTo] = useState(to);
  const anchorRef = useRef(null);
  useOnClickOutside(anchorRef, () => setOpen(false));

  const base = from ? fromISODate(from) : new Date();
  const [y, setY] = useState(base.getFullYear());
  const [m, setM] = useState(base.getMonth());

  const left = monthMatrix(y, m);
  const rightMonth = (m + 1) % 12,
    rightYear = m === 11 ? y + 1 : y;
  const right = monthMatrix(rightYear, rightMonth);

  const prev = () => {
    if (m === 0) {
      setM(11);
      setY(y - 1);
    } else setM(m - 1);
  };
  const next = () => {
    if (m === 11) {
      setM(0);
      setY(y + 1);
    } else setM(m + 1);
  };

  const pick = (dt) => {
    const iso = toISODate(dt);
    if (!tmpFrom || (tmpFrom && tmpTo)) {
      setTmpFrom(iso);
      setTmpTo("");
      return;
    }
    if (new Date(iso) < new Date(tmpFrom)) {
      setTmpTo(tmpFrom);
      setTmpFrom(iso);
      return;
    }
    setTmpTo(iso);
  };

  const isBetween = (d) => {
    if (!tmpFrom || !tmpTo) return false;
    const t = new Date(toISODate(d)).getTime();
    const a = new Date(tmpFrom).getTime();
    const b = new Date(tmpTo).getTime();
    return t > a && t < b;
  };
  const isSel = (d) => (tmpFrom && toISODate(d) === tmpFrom) || (tmpTo && toISODate(d) === tmpTo);

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const last7Start = new Date();
  last7Start.setDate(today.getDate() - 6);
  const last30Start = new Date();
  last30Start.setDate(today.getDate() - 29);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0);

  const apply = () => {
    onChange(tmpFrom || "", tmpTo || "");
    setOpen(false);
  };
  const cancel = () => {
    setOpen(false);
    setTmpFrom(from);
    setTmpTo(to);
  };

  return (
    <div className="drp-field" ref={anchorRef}>
      <div className="drp-input with-icon" onClick={() => setOpen(true)}>
        <input
          readOnly
          value={`${toDMY(from)} - ${to ? toDMY(to) : ""}`}
          placeholder="dd/mm/yyyy - dd/mm/yyyy"
        />
        <span className="drp-cal-ic" onClick={() => setOpen((v) => !v)} aria-hidden="true">
          <Ic.cal />
        </span>
      </div>

      {open && (
        <div className="drp-pop">
          <div className="drp-left">
            <button
              className="drp-pres"
              onClick={() => {
                setTmpFrom(toISODate(today));
                setTmpTo(toISODate(today));
              }}
            >
              Today
            </button>
            <button
              className="drp-pres"
              onClick={() => {
                setTmpFrom(toISODate(yesterday));
                setTmpTo(toISODate(yesterday));
              }}
            >
              Yesterday
            </button>
            <button
              className="drp-pres"
              onClick={() => {
                setTmpFrom(toISODate(last7Start));
                setTmpTo(toISODate(today));
              }}
            >
              Last 7 Days
            </button>
            <button
              className="drp-pres"
              onClick={() => {
                setTmpFrom(toISODate(last30Start));
                setTmpTo(toISODate(today));
              }}
            >
              Last 30 Days
            </button>
            <button
              className="drp-pres"
              onClick={() => {
                setTmpFrom(toISODate(thisMonthStart));
                setTmpTo(toISODate(thisMonthEnd));
              }}
            >
              This Month
            </button>
            <button
              className="drp-pres"
              onClick={() => {
                setTmpFrom(toISODate(lastMonthStart));
                setTmpTo(toISODate(lastMonthEnd));
              }}
            >
              Last Month
            </button>
            <button
              className="drp-pres"
              onClick={() => {
                setTmpFrom(toISODate(qStart));
                setTmpTo(toISODate(qEnd));
              }}
            >
              This Quarter
            </button>

            <div className="drp-actions">
              <button className="btn-apply" onClick={apply}>
                Apply
              </button>
              <button className="btn-cancel" onClick={cancel}>
                Cancel
              </button>
            </div>
          </div>

          <div className="drp-right">
            <div className="drp-month-head">
              <button className="drp-nav" onClick={prev}>
                ‹
              </button>
              <div className="drp-title">
                {new Date(y, m, 1).toLocaleString(undefined, { month: "short" })} {y}
              </div>
              <div className="drp-spacer" />
              <div className="drp-title">
                {new Date(rightYear, rightMonth, 1).toLocaleString(undefined, { month: "short" })}{" "}
                {rightYear}
              </div>
              <button className="drp-nav" onClick={next}>
                ›
              </button>
            </div>

            <div className="drp-months">
              {[left, right].map((cells, idx) => (
                <div className="drp-month" key={idx}>
                  <div className="drp-weekdays">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w) => (
                      <span key={w}>{w}</span>
                    ))}
                  </div>
                  <div className="drp-grid">
                    {cells.map(({ dt, inMonth }, i) => (
                      <button
                        key={i}
                        className={`drp-day ${inMonth ? "in" : "out"} ${isSel(dt) ? "sel" : ""} ${
                          isBetween(dt) ? "inrange" : ""
                        }`}
                        onClick={() => pick(dt)}
                        type="button"
                      >
                        {dt.getDate()}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== MAIN ===================== */
export default function InvMasterPackingWiseSummary() {
  const [showFilter, setShowFilter] = useState(false);
  const [perPage, setPerPage] = useState(10);

  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");

  // ✅ Locations from backend
  const [LOCS, setLOCS] = useState(["All"]);
  const [fromLoc, setFromLoc] = useState("All");
  const [toLoc, setToLoc] = useState("All");

  // ✅ Keep status UI but we will NOT send it to backend
  const STATUS = ["Select Status", "OPEN", "CLOSED"];
  const [status, setStatus] = useState("Select Status");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const mapToUiRow = (r) => ({
    "From Location": r.from_location,
    "Transfer Date": r.transfer_date,
    "Document Number": r.document_number,
    "HSN CODE": r.hsn_code,
    "To Location": r.to_location,
    "Branch status": r.branch_status,
    "Transfer In Date": r.transfer_in_date,
    "Product Name": r.product_name,
    "Print Name": r.print_name,
    "Department Name": r.department_name,
    "ItemCode": r.item_code,
    "Quantity": String(r.quantity ?? 1),
    "Value": r.value ?? "",
    "Unit Price": r.unit_price ?? "",
    "Tax(%)": r.tax_percent ?? "",
    "Taxable value": r.taxable_value ?? "",
    "MRP": r.mrp ?? "",
    "Sale Price": r.sale_price ?? "",
  });

  // ✅ load locations once
  useEffect(() => {
    listLocations()
      .then((arr) => {
        const names = (Array.isArray(arr) ? arr : [])
          .map((x) => (x?.name || "").trim())
          .filter(Boolean);
        const unique = Array.from(new Set(names));
        setLOCS(["All", ...unique]);
      })
      .catch(() => {
        setLOCS(["All"]);
      });
  }, []);

  // ✅ fetch report (ONLY date + from/to location)
  useEffect(() => {
    const params = {
      date_from: fromDate,
      date_to: toDate,
      from_location: fromLoc === "All" ? "" : fromLoc,
      to_location: toLoc === "All" ? "" : toLoc,
      // 🚫 status intentionally not sent
    };

    setLoading(true);
    listMasterPackingItemWise(params)
      .then((data) => {
        const arr = Array.isArray(data?.items) ? data.items : [];
        setRows(arr.map(mapToUiRow));
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [fromDate, toDate, fromLoc, toLoc]);

  const HEADERS = [
    "From Location",
    "Transfer Date",
    "Document Number",
    "HSN CODE",
    "To Location",
    "Branch status",
    "Transfer In Date",
    "Product Name",
    "Print Name",
    "Department Name",
    "ItemCode",
    "Quantity",
    "Value",
    "Unit Price",
    "Tax(%)",
    "Taxable value",
    "MRP",
    "Sale Price",
  ];

  const totals = useMemo(() => {
    const agg = rows.reduce(
      (acc, r) => {
        acc.qty += Number(r["Quantity"] || 0);
        acc.value += Number(r["Value"] || 0);
        acc.mrp += Number(r["MRP"] || 0);
        acc.sale += Number(r["Sale Price"] || 0);
        return acc;
      },
      { qty: 0, value: 0, mrp: 0, sale: 0 }
    );

    return {
      qty: agg.qty,
      value: agg.value.toFixed(2),
      mrp: agg.mrp.toFixed(2),
      sale: agg.sale.toFixed(2),
    };
  }, [rows]);

  return (
    <div className="mpw-wrap">
      <div className="mpw-head">
        <h3 className="mpw-title">Master Packing Item Wise Summary</h3>
        <span className="mpw-home">
          <Ic.home />
        </span>
      </div>

      <div className="mpw-card">
        <div className="mpw-top">
          <div className="mpw-right">
            <ExportMenu rows={rows} headers={HEADERS} />
            <PerPage value={perPage} onChange={setPerPage} />
            <button
              className={`mpw-filter ${showFilter ? "active" : ""}`}
              onClick={() => setShowFilter((v) => !v)}
              type="button"
              title="Filter"
            >
              <Ic.filter /> <span>Filter</span>
            </button>
          </div>
        </div>

        {showFilter && (
          <div className="mpw-filters">
            <div className="mpw-field">
              <label>Stock Transfer Date</label>
              <DateRangePicker
                from={fromDate}
                to={toDate}
                onChange={(f, t) => {
                  setFromDate(f);
                  setToDate(t);
                }}
              />
            </div>

            <div className="mpw-field">
              <label>From Location</label>
              <Select placeholder="All" options={LOCS} value={fromLoc} onChange={setFromLoc} width={260} />
            </div>

            <div className="mpw-field">
              <label>To Location</label>
              <Select placeholder="All" options={LOCS} value={toLoc} onChange={setToLoc} width={260} />
            </div>

            {/* ✅ kept as-is (UI only), NOT used in API params */}
            <div className="mpw-field">
              <label>Status</label>
              <Select placeholder="Select Status" options={STATUS} value={status} onChange={setStatus} width={240} />
            </div>
          </div>
        )}

        <div className="mpw-table-wrap">
          <div className="mpw-thead">
            <div className="c id">Sr No.</div>
            <div className="c">From Location</div>
            <div className="c">Transfer Date</div>
            <div className="c">Document Number</div>
            <div className="c">HSN CODE</div>
            <div className="c">To Location</div>
            <div className="c">Branch status</div>
            <div className="c">Transfer In Date</div>
            <div className="c">Product Name</div>
            <div className="c">Print Name</div>
            <div className="c">Department Name</div>
            <div className="c">ItemCode</div>
            <div className="c num">Quantity</div>
            <div className="c num">Value</div>
            <div className="c num">Unit Price</div>
            <div className="c num">Tax(%)</div>
            <div className="c num">Taxable value</div>
            <div className="c num">MRP</div>
            <div className="c num">Sale Price</div>
          </div>

          {loading && (
            <div style={{ padding: 14, fontSize: 13, opacity: 0.75 }}>
              Loading...
            </div>
          )}

          {!loading &&
            rows.map((r, i) => (
              <div className="mpw-row" key={i}>
                <div className="c id">{i + 1}</div>
                <div className="c wrap">{r["From Location"]}</div>
                <div className="c">{r["Transfer Date"]}</div>
                <div className="c link">
                  <a href="#">{r["Document Number"]}</a>
                </div>
                <div className="c">{r["HSN CODE"]}</div>
                <div className="c wrap">{r["To Location"]}</div>

                {/* ✅ light green bg + white text */}
                <div className="c">
                  <span
                    className="mpw-badge"
                    style={{
                      background: "#7CCB7C",
                      color: "#fff",
                    }}
                  >
                    {r["Branch status"] || "Active"}
                  </span>
                </div>

                <div className="c">{r["Transfer In Date"]}</div>
                <div className="c wrap">{r["Product Name"]}</div>
                <div className="c wrap">{r["Print Name"]}</div>
                <div className="c">{r["Department Name"]}</div>
                <div className="c">{r["ItemCode"]}</div>
                <div className="c num">{r["Quantity"]}</div>
                <div className="c num">{r["Value"]}</div>
                <div className="c num">{r["Unit Price"]}</div>
                <div className="c num">{r["Tax(%)"]}</div>
                <div className="c num">{r["Taxable value"]}</div>
                <div className="c num">{r["MRP"]}</div>
                <div className="c num">{r["Sale Price"]}</div>
              </div>
            ))}

          <div className="mpw-total">
            <div className="c span">Total</div>
            <div className="c num">{totals.qty}</div>
            <div className="c num">{totals.value}</div>
            <div className="c num">—</div>
            <div className="c num">—</div>
            <div className="c num">—</div>
            <div className="c num">{totals.mrp}</div>
            <div className="c num">{totals.sale}</div>
          </div>
        </div>

        <div className="mpw-foot">
          <div className="mpw-showing">
            Showing 1 to {Math.min(perPage, rows.length)} of {rows.length} entries
          </div>
          <div className="mpw-pager">
            <button className="mpw-page-btn" disabled aria-label="Previous">
              ‹
            </button>
            <span className="mpw-page-num active">1</span>
            <button className="mpw-page-btn" disabled aria-label="Next">
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

