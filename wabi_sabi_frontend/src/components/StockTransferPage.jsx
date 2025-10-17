// src/components/StockTransferPage.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import "../styles/StockTransferPage.css";
import {
  listLocations,
  listTransfers,
  deleteTransfer as apiDeleteTransfer,
} from "../api/client";

// Only used to build the link to the DRF detail page
const API_LINK = "http://127.0.0.1:8000/api";

/* ------------------ Date helpers ------------------ */
const pad2 = (n) => String(n).padStart(2, "0");
const toDate = (iso) => new Date(`${iso}T00:00:00`);
const fmtDMY = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const startOfFY = (y) => `${y}-04-01`;
const endOfFY = (y) => `${y + 1}-03-31`;

/* ============ DateRangePicker (inline, no libs) ============ */
function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const [temp, setTemp] = useState({ start: value.start, end: value.end });

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const apply = () => {
    onChange({ start: temp.start, end: temp.end });
    setOpen(false);
  };
  const cancel = () => {
    setTemp({ start: value.start, end: value.end });
    setOpen(false);
  };

  const display = `${fmtDMY(toDate(value.start))} - ${fmtDMY(toDate(value.end))}`;

  return (
    <div className="st-drp" ref={rootRef}>
      <div className="st-input-ico" onClick={() => setOpen((o) => !o)}>
        <input className="st-drp-input" readOnly value={display} />
        <span className="material-icons">calendar_today</span>
      </div>

      {open && (
        <div className="st-drp-pop">
          <div className="st-drp-left">
            <div className="st-drp-actions">
              <button className="st-drp-apply" onClick={apply}>Apply</button>
              <button className="st-drp-cancel" onClick={cancel}>Cancel</button>
            </div>
          </div>

          <div className="st-drp-right">
            <div className="st-drp-quick">
              <div className="st-input-ico">
                <input
                  type="date"
                  value={value.start}
                  onChange={(e) => setTemp((t) => ({ ...t, start: e.target.value }))}
                />
                <span className="material-icons">event</span>
              </div>
              <div className="st-input-ico">
                <input
                  type="date"
                  value={value.end}
                  onChange={(e) => setTemp((t) => ({ ...t, end: e.target.value }))}
                />
                <span className="material-icons">event</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =================== PAGE =================== */
export default function StockTransferPage() {
  const now = new Date();
  const fyStart = now.getMonth() + 1 >= 4 ? startOfFY(now.getFullYear()) : startOfFY(now.getFullYear() - 1);
  const fyEnd   = now.getMonth() + 1 >= 4 ? endOfFY(now.getFullYear()) : endOfFY(now.getFullYear() - 1);

  const [pageSize, setPageSize]   = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [q, setQ] = useState("");

  const [locations, setLocations] = useState([]); // [{code,name}]
  const [range, setRange] = useState({ start: fyStart, end: fyEnd });
  const [toLoc, setToLoc] = useState("All");

  const [rows, setRows] = useState([]); // API data

  // load locations
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

  // load transfers whenever filters change
  useEffect(() => {
    (async () => {
      try {
        const params = { date_from: range.start, date_to: range.end };
        if (toLoc !== "All") params.to = toLoc;
        const data = await listTransfers(params);
        setRows(data);
      } catch (e) {
        console.error(e);
        alert("Failed to load stock transfers.");
      }
    })();
  }, [range, toLoc]);

  const nameByCode = useMemo(() => {
    const map = new Map();
    locations.forEach((l) => map.set(l.code, l.name));
    return map;
  }, [locations]);

  const filtered = useMemo(() => {
    let r = rows.slice();
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      r = r.filter(
        (x) =>
          String(x.number).toLowerCase().includes(t) ||
          String(x.from).toLowerCase().includes(t) ||
          String(x.to).toLowerCase().includes(t)
      );
    }
    return r;
  }, [rows, q]);

  const handleDelete = async (number) => {
    if (!window.confirm(`Delete transfer ${number}? This will remove all its barcodes.`)) return;
    try {
      await apiDeleteTransfer(number);
      alert("Deleted successfully.");
      // refresh
      const params = { date_from: range.start, date_to: range.end };
      if (toLoc !== "All") params.to = toLoc;
      const data = await listTransfers(params);
      setRows(data);
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  const fmtINR = (n) =>
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="st-wrap">
      <div className="st-head">
        <div className="st-title">Stock Transfer</div>
        <span className="material-icons st-home">home</span>
      </div>

      <div className="st-toolbar">
        <div className="st-left">
          <select className="st-length" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[10, 50, 100, 500, 1000].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <button
            type="button"
            className={`st-filter-btn ${filterOpen ? "active" : ""}`}
            onClick={() => setFilterOpen((v) => !v)}
          >
            <span className="material-icons">filter_alt</span>
            Filter
          </button>

          <input
            className="st-search"
            placeholder="Search List..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {filterOpen && (
        <div className="st-filters">
          <div className="st-field">
            <label>Stock Transfer Date</label>
            <DateRangePicker value={range} onChange={setRange} />
          </div>

          <div className="st-field">
            <label>To Location</label>
            <select value={toLoc} onChange={(e) => setToLoc(e.target.value)}>
              <option value="All">All</option>
              {locations.map((x) => (
                <option key={x.code} value={x.code}>{x.code}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="st-table-wrap">
        <table className="st-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Unique No</th>
              <th>Transfer Date</th>
              <th>From Location</th>
              <th>To Location</th>
              <th>Net Amount</th>
              <th>Qty</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="st-empty">No data available in table</td>
              </tr>
            ) : (
              filtered.slice(0, pageSize).map((r, idx) => {
                const fromName = nameByCode.get(r.from) || r.from;
                const toName = nameByCode.get(r.to) || r.to;
                const d = new Date(r.created_at);
                const dateStr = fmtDMY(d);

                return (
                  <tr key={r.number}>
                    <td>{idx + 1}</td>
                    <td>
                      <a
                        className="st-link"
                        href={`${API_LINK}/products/transfers/${encodeURIComponent(r.number)}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.number}
                      </a>
                    </td>
                    <td>{dateStr}</td>
                    <td>{fromName}</td>
                    <td>{toName}</td>
                    <td className="st-right">{fmtINR(r.net_amount)}</td>
                    <td className="st-right">{r.qty}</td>
                    <td>{/* created-by (optional) */}</td>
                    <td className="st-actions">
                      <button title="Delete" onClick={() => handleDelete(r.number)}>
                        <span className="material-icons">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="st-foot">
          <div className="st-info">
            Showing 1 to {Math.min(pageSize, filtered.length)} of {filtered.length} entries
          </div>
          <div className="st-pager">
            <button className="st-page sel">1</button>
          </div>
        </div>
      </div>
    </div>
  );
}
