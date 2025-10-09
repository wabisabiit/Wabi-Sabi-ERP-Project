import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import "../styles/ReportCustomerWiseSalesOrder.css";

/* ---------------- utilities (unchanged download) ---------------- */
function downloadEmptyFile(filename, mime) {
  const blob = new Blob([""], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ================== ADD: small helpers for dropdowns ================== */
const LOCATIONS = [
  "WABI SABI SUSTAINABILITY",
  "Brands 4 less – Ansal Plaza",
  "Brands 4 less – Rajouri Garden",
  "Brand4Less – Tilak Nagar",
  "Brands 4 less – M3M Urbana",
  "Brands 4 less – IFFCO Chowk",
  "Brands Loot – Udyog Vihar",
  "Brands loot – Krishna Nagar",
];

function useOnClickOutside(refs, handler) {
  useEffect(() => {
    const onDown = (e) => {
      const hit = refs.some((r) => r?.current && r.current.contains(e.target));
      if (!hit) handler?.();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [refs, handler]);
}

/* dd/mm/yyyy */
const dmy = (d) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
function parseDMY(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || "");
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* Positioned container (uses .cws-popover styles you added) */
function Popover({ open, anchorRef, width, align = "left", children }) {
  const [style, setStyle] = useState({ top: 0, left: 0, width: 0 });
  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const w = width || r.width;
    const left = align === "right" ? r.right - w : r.left;
    const top = r.bottom + 6;
    setStyle({ top: Math.round(top), left: Math.round(left), width: Math.round(w) });
  }, [open, anchorRef, width, align]);
  if (!open) return null;
  return (
    <div className="cws-popover" style={style} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}

/* ================== ADD: Location Multi-select ================== */
function LocationMultiSelect({ value, onChange, options }) {
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [open, setOpen] = useState(false);

  useOnClickOutside([btnRef, popRef], () => setOpen(false));

  const allChecked = value.length === options.length;
  const toggleAll = () => onChange(allChecked ? [] : [...options]);
  const toggleOne = (opt) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  const clear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="cws-field">
      <label className="cws-label">Location</label>
      <button
        type="button"
        ref={btnRef}
        className="cws-selectlike"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="cws-selecttext">
          {value.length ? `${value.length} selected` : "Select Location"}
        </span>
        {value.length > 0 && <span className="cws-badge">{value.length}</span>}
        {value.length > 0 && (
          <button className="cws-clear" type="button" onClick={clear} aria-label="Clear">
            <span className="material-icons cws-ic">close</span>
          </button>
        )}
        <span className="material-icons cws-caret">expand_more</span>
      </button>

      <div ref={popRef}>
        <Popover open={open} anchorRef={btnRef} width={360}>
          <div className="cws-mscroll">
            <label className="cws-mitem">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} />
              <span>All</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="cws-mitem">
                <input
                  type="checkbox"
                  checked={value.includes(opt)}
                  onChange={() => toggleOne(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </Popover>
      </div>
    </div>
  );
}

/* ================== ADD: Date Range Picker (two months) ================== */
function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}

function DateRangePicker({ value, onChange }) {
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [open, setOpen] = useState(false);

  const [tempStart, setTempStart] = useState(value.start);
  const [tempEnd, setTempEnd] = useState(value.end);
  const [cursor, setCursor] = useState(new Date(value.start.getFullYear(), value.start.getMonth(), 1));

  useOnClickOutside([btnRef, popRef], () => setOpen(false));

  useEffect(() => {
    if (open) {
      setTempStart(value.start);
      setTempEnd(value.end);
      setCursor(new Date(value.start.getFullYear(), value.start.getMonth(), 1));
    }
  }, [open, value]);

  const apply = () => {
    if (tempStart && tempEnd && tempStart <= tempEnd) {
      onChange({ start: tempStart, end: tempEnd });
      setOpen(false);
    }
  };

  const onInputStart = (e) => {
    const d = parseDMY(e.target.value);
    if (d) setTempStart(d);
  };
  const onInputEnd = (e) => {
    const d = parseDMY(e.target.value);
    if (d) setTempEnd(d);
  };

  const pick = (d) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(d);
      setTempEnd(null);
    } else if (d < tempStart) {
      setTempEnd(tempStart);
      setTempStart(d);
    } else {
      setTempEnd(d);
    }
  };

  const Month = ({ base }) => {
    const y = base.getFullYear();
    const m = base.getMonth();
    const firstDow = new Date(y, m, 1).getDay(); // 0=Sun
    const total = daysInMonth(y, m);
    const cells = [];
    const leading = firstDow; // keep Su–Sa as in screenshot
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(y, m, d));

    const sameDay = (a, b) =>
      a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const inRange = (d) => tempStart && tempEnd && d >= tempStart && d <= tempEnd;

    return (
      <div className="drp-month">
        <div className="drp-head">
          {base.toLocaleString(undefined, { month: "long" })} {y}
        </div>
        <div className="drp-grid drp-dow">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((x) => (
            <div key={x} className="drp-dowc">{x}</div>
          ))}
        </div>
        <div className="drp-grid drp-days">
          {cells.map((date, i) => (
            <button
              key={i}
              className={[
                "drp-cell",
                date ? "" : "drp-empty",
                date && inRange(date) ? "is-in" : "",
                date && sameDay(date, tempStart) ? "is-start" : "",
                date && sameDay(date, tempEnd) ? "is-end" : "",
              ].join(" ")}
              onClick={() => date && pick(date)}
              disabled={!date}
            >
              {date ? date.getDate() : ""}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="cws-field-date">
      <label className="cws-label">Date Range</label>
      <button
        type="button"
        ref={btnRef}
        className="cws-input"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}
      >
        <span>{dmy(value.start)} - {dmy(value.end)}</span>
        <span className="material-icons" style={{ color: "#6b7280" }}>expand_more</span>
      </button>

      <div ref={popRef}>
        <Popover open={open} anchorRef={btnRef} width={720}>
          <div className="drp-shell">
            <div className="drp-inputs">
              <input className="drp-mini" value={dmy(tempStart)} onChange={onInputStart} />
              <input className="drp-mini" value={tempEnd ? dmy(tempEnd) : ""} onChange={onInputEnd} />
            </div>
            <div className="drp-calwrap">
              <button className="drp-nav left" onClick={() => setCursor(addMonths(cursor, -1))}>
                <span className="material-icons">chevron_left</span>
              </button>
              <Month base={cursor} />
              <Month base={addMonths(cursor, 1)} />
              <button className="drp-nav right" onClick={() => setCursor(addMonths(cursor, 1))}>
                <span className="material-icons">chevron_right</span>
              </button>
            </div>
            <div className="drp-actions">
              <button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn primary" onClick={apply}>Apply</button>
            </div>
          </div>
        </Popover>
      </div>
    </div>
  );
}

/* ================== PAGE (your component, only two fields changed) ================== */
export default function CustomerWiseSalesOrderReport() {
  const [filterActive, setFilterActive] = useState(false); // controls visibility + icon color
  const [showDownload, setShowDownload] = useState(false);
  const downloadBtnRef = useRef(null);

  // NEW: state for the two new controls
  const [selectedLocs, setSelectedLocs] = useState([LOCATIONS[0]]);
  const [range, setRange] = useState({
    start: new Date(2025, 3, 1),  // 01/04/2025
    end: new Date(2026, 2, 31),   // 31/03/2026
  });

  // close download dropdown on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (downloadBtnRef.current && !downloadBtnRef.current.parentNode.contains(e.target)) {
        setShowDownload(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="cws-page">
      {/* breadcrumb */}
      <header className="cws-breadcrumb">
        <span className="material-icons cws-ic">home</span>
        <span className="cws-bc-slash">/</span>
        <span>Report</span>
      </header>

      <main className="cws-card">
        {/* header row with actions */}
        <div className="cws-head">
          <h1 className="cws-title">Customer Wise Sales Order Report</h1>

          <div className="cws-actions">
            {/* Download */}
            <div className="cws-dropdown">
              <button
                type="button"
                className="cws-btn cws-btn-primary"
                title="Download"
                ref={downloadBtnRef}
                onClick={() => setShowDownload(v => !v)}
              >
                <span className="material-icons cws-ic">download</span>
              </button>

              {showDownload && (
                <div className="cws-menu" role="menu">
                  <button
                    type="button"
                    className="cws-menuitem"
                    onClick={() => {
                      downloadEmptyFile(
                        "CustomerWiseSalesOrderReport.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      );
                      setShowDownload(false);
                    }}
                  >
                    <span className="material-icons cws-ic">grid_on</span>
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    className="cws-menuitem"
                    onClick={() => {
                      downloadEmptyFile("CustomerWiseSalesOrderReport.pdf", "application/pdf");
                      setShowDownload(false);
                    }}
                  >
                    <span className="material-icons cws-ic">picture_as_pdf</span>
                    <span>PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter (only icon color changes; fields appear below when active) */}
            <button
              type="button"
              className="cws-btn cws-btn-primary cws-btn-filter"
              onClick={() => setFilterActive(v => !v)}
              title="Filter"
            >
              <span className={`material-icons cws-ic ${filterActive ? "cws-ic-dark" : ""}`}>
                filter_list
              </span>
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* INLINE FILTER — rendered ONLY when Filter is active */}
        {filterActive && (
          <section className="cws-inline-filter">
            <div className="cws-field">
              <label className="cws-label">Customer</label>
              <input className="cws-input" placeholder="Search Customer" />
            </div>

            {/* CHANGED: Location dropdown becomes multi-select */}
            <LocationMultiSelect
              options={LOCATIONS}
              value={selectedLocs}
              onChange={setSelectedLocs}
            />

            {/* CHANGED: Date range becomes two-month picker */}
            <DateRangePicker value={range} onChange={setRange} />
          </section>
        )}

        {/* Table */}
        <div className="cws-tablewrap">
          <table className="cws-table">
            <thead>
              <tr>
                <th>Sr<br /> No</th>
                <th>Customer<br /> Name</th>
                <th>Location</th>
                <th>Order<br /> No.</th>
                <th>Order<br /> Date</th>
                <th>Items</th>
                <th>Order<br /> Quantity</th>
                <th>Invoiced/DC<br /> Quantity</th>
                <th>Pending<br /> Quantity</th>
                <th>Rate<br />(without GST)</th>
                <th>Product Wise<br /> Pending Amt.</th>
                <th>Order Wise<br /> Pending Amt.</th>
              </tr>
            </thead>
            <tbody>
              <tr className="cws-empty">
                <td colSpan={12}>No data available in table</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
