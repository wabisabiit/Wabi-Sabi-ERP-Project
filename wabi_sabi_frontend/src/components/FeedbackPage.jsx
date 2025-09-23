import React, { useMemo, useState } from "react";
import "../styles/FeedbackPage.css";

/* ---------- Date-range presets ---------- */
const RANGE_OPTS = [
  { id: "today",        label: "Today" },
  { id: "this_week",    label: "This Week" },
  { id: "last_week",    label: "Last Week" },
  { id: "this_month",   label: "This Month" },
  { id: "last_month",   label: "Last Month" },
  { id: "current_year", label: "Current Year" },
  { id: "custom",       label: "Custom Range" },
];

function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d){ const x=new Date(d); x.setHours(23,59,59,999); return x; }

// Accepts: Date, "YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", etc.
function parseDate(val){
  if(!val) return null;
  if(val instanceof Date && !isNaN(val)) return val;
  const d1 = new Date(val);
  if(!isNaN(d1)) return d1;
  const parts = String(val).trim().split(/[\/\-\.]/);
  if(parts.length >= 3){
    let [a,b,c] = parts;
    let y,m,d;
    if(a.length === 4){ y=a; m=b; d=c; }   // YYYY-MM-DD
    else { d=a; m=b; y=c; }               // DD-MM-YYYY
    const nY = Number(y), nM = Number(m), nD = Number(d);
    if(nY && nM && nD) return new Date(nY, nM-1, nD);
  }
  return null;
}

function getRange(rangeId, customFrom, customTo){
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const thisMonthStart = new Date(y, m, 1);
  const thisMonthEnd   = new Date(y, m+1, 0);
  const lastMonthStart = new Date(y, m-1, 1);
  const lastMonthEnd   = new Date(y, m, 0);

  // Monday-based weeks
  const weekday = (now.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const monThis = new Date(y, m, d - weekday);
  const sunThis = new Date(y, m, d - weekday + 6);
  const monLast = new Date(monThis); monLast.setDate(monThis.getDate() - 7);
  const sunLast = new Date(sunThis); sunLast.setDate(sunThis.getDate() - 7);

  switch(rangeId){
    case "today":        return { start: startOfDay(now),            end: endOfDay(now) };
    case "this_week":    return { start: startOfDay(monThis),        end: endOfDay(sunThis) };
    case "last_week":    return { start: startOfDay(monLast),        end: endOfDay(sunLast) };
    case "this_month":   return { start: startOfDay(thisMonthStart), end: endOfDay(thisMonthEnd) };
    case "last_month":   return { start: startOfDay(lastMonthStart), end: endOfDay(lastMonthEnd) };
    case "current_year": return { start: startOfDay(new Date(y,0,1)), end: endOfDay(new Date(y,11,31)) };
    case "custom": {
      if(!customFrom || !customTo) return { start: null, end: null }; // until both picked, ignore range filter
      const s = startOfDay(parseDate(customFrom));
      const e = endOfDay(parseDate(customTo));
      return { start: s, end: e };
    }
    default:             return { start: null, end: null };
  }
}

/* ---------- Small star icon ---------- */
function Star({ filled }) {
  return <span className={`fb-star ${filled ? "filled" : ""}`} aria-hidden>★</span>;
}

export default function FeedbackPage() {
  // Demo table data (empty for now). Shape: {invoiceNo,date,customerName,mobileNo,feedback,recommended,location,action,rating}
  const [rows] = useState([]);

  // UI state
  const [query, setQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [page, setPage] = useState(1);

  // Date-range selector state
  const [range, setRange] = useState("current_year"); // default to Current Year
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // active range
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getRange(range, customFrom, customTo),
    [range, customFrom, customTo]
  );

  // Filter by search + date range
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchQuery =
        !q ||
        [r.invoiceNo, r.customerName, r.mobileNo, r.feedback, r.location, r.action]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q));

      // Date filter (if range present)
      const dt = parseDate(r.date);
      const inRange =
        !rangeStart || !rangeEnd ? true : (dt && dt >= rangeStart && dt <= rangeEnd);

      return matchQuery && inRange;
    });
  }, [rows, query, rangeStart, rangeEnd]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageSafe = Math.min(page, totalPages);
  const pageSlice = filtered.slice((pageSafe - 1) * rowsPerPage, pageSafe * rowsPerPage);

  // Average rating + distribution
  const { avg, dist } = useMemo(() => {
    if (!filtered.length) return { avg: 0, dist: [0, 0, 0, 0, 0] };
    const ratings = filtered
      .map((r) => Number(r.rating))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
    if (!ratings.length) return { avg: 0, dist: [0, 0, 0, 0, 0] };
    const sum = ratings.reduce((a, b) => a + b, 0);
    const avg = sum / ratings.length;
    const d = [0, 0, 0, 0, 0];
    ratings.forEach((n) => (d[n - 1] += 1));
    return { avg, dist: d };
  }, [filtered]);

  // Simple weekly spark (flat for now)
  const weekly = useMemo(() => {
    return { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], values: [0,0,0,0,0,0,0] };
  }, []);

  // Export (placeholder empty files)
  const download = (blob, filename) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };
  const exportExcel = () => {
    const header = ["Sr No","Invoice No","Date","Customer Name","Mobile No","Feedback","Recommended","Location","Action"];
    const csv = [header.join(","), ""].join("\n");
    download(new Blob([csv], { type: "text/csv;charset=utf-8" }), "feedback.xlsx");
  };
  const exportAllExcel = () => {
    const header = ["Sr No","Invoice No","Date","Customer Name","Mobile No","Feedback","Recommended","Location","Action"];
    const csv = [header.join(","), ""].join("\n");
    download(new Blob([csv], { type: "text/csv;charset=utf-8" }), "feedback_all.xlsx");
  };
  const exportPdf = () => {
    const minimalPdf =
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 55>>stream\nBT /F1 12 Tf 50 740 Td (Feedback Export - Empty) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000061 00000 n \n0000000114 00000 n \n0000000264 00000 n \n0000000378 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n458\n%%EOF";
    download(new Blob([minimalPdf], { type: "application/pdf" }), "feedback.pdf");
  };

  const displayAvg = avg.toFixed(1).replace(/\.0$/, "");

  return (
    <div className="fb-page" role="main" aria-label="Feedback">
      {/* Header */}
      <div className="fb-head">
        <div className="fb-crumb">
          <span className="material-icons fb-home">home</span>
          <span className="fb-title">Feedback</span>
        </div>

        <div className="fb-right">
          {/* Range select like screenshot */}
          <div className="fb-year">
            <select
              value={range}
              onChange={(e) => { setRange(e.target.value); setPage(1); }}
              aria-label="Date range"
            >
              {RANGE_OPTS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <span className="material-icons">expand_more</span>
          </div>

          {/* Custom range inputs */}
          {range === "custom" && (
            <div className="fb-custom">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                aria-label="From date"
              />
              <span className="fb-to">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                aria-label="To date"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div className="fb-kpis">
        <div className="fb-card fb-avg">
          <div className="fb-avg-number">{displayAvg}</div>
          <div className="fb-avg-stars">
            {[1,2,3,4,5].map((i) => <Star key={i} filled={avg >= i - 0.5} />)}
          </div>
          <div className="fb-avg-label">Average Rating</div>
        </div>

        <div className="fb-card fb-stars-board">
          {[5,4,3,2,1].map((s) => {
            const count = dist[s - 1] || 0;
            const max = Math.max(1, Math.max(...dist));
            const pct = Math.round((count / max) * 100);
            return (
              <div key={s} className="fb-row">
                <div className="fb-row-label">{s} Star</div>
                <div className="fb-bar">
                  <div className="fb-bar-bg" />
                  <div className="fb-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="fb-row-count">{count}</div>
              </div>
            );
          })}
        </div>

        <div className="fb-card fb-graph">
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="fb-spark">
            <line x1="0" y1="35" x2="100" y2="35" className="fb-spark-axis" />
            <polyline
              className="fb-spark-line"
              points={weekly.values.map((v,i)=>{
                const x=(i/6)*100;
                const y=35-Math.min(25,v);
                return `${x},${y}`;
              }).join(" ")}
            />
          </svg>
          <div className="fb-spark-labels">
            {weekly.labels.map((d)=> <span key={d}>{d}</span>)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="fb-toolbar">
        <div className="fb-export">
          <button className="fb-export-btn">
            <span className="material-icons">file_download</span> Export
          </button>
          <div className="fb-export-menu">
            <button onClick={exportExcel}>Excel</button>
            <button onClick={exportPdf}>Pdf</button>
            <button onClick={exportAllExcel}>All Excel</button>
          </div>
        </div>

        <div className="fb-search">
          <input
            type="text"
            placeholder="Search List"
            value={query}
            onChange={(e)=>{ setQuery(e.target.value); setPage(1); }}
            aria-label="Search feedback"
          />
          <span className="material-icons">search</span>
        </div>
      </div>

      {/* Table */}
      <div className="fb-table-wrap">
        <table className="fb-table">
          <thead>
            <tr>
              <th>Sr. No</th>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Customer Name</th>
              <th>Mobile No</th>
              <th>Feedback</th>
              <th>Recommended</th>
              <th>Location</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pageSlice.length === 0 ? (
              <tr className="fb-empty">
                <td colSpan={9}>No records found</td>
              </tr>
            ) : (
              pageSlice.map((r, idx) => (
                <tr key={idx}>
                  <td>{(pageSafe - 1) * rowsPerPage + idx + 1}</td>
                  <td>{r.invoiceNo}</td>
                  <td>{r.date}</td>
                  <td>{r.customerName}</td>
                  <td>{r.mobileNo}</td>
                  <td>{r.feedback}</td>
                  <td>{r.recommended ? "Yes" : "No"}</td>
                  <td>{r.location}</td>
                  <td>{r.action}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      <div className="fb-footbar">
        <div className="fb-entries">
          Showing {pageSlice.length ? (pageSafe - 1) * rowsPerPage + 1 : 1} to{" "}
          {pageSlice.length ? (pageSafe - 1) * rowsPerPage + pageSlice.length : 0} of{" "}
          {filtered.length} entries
        </div>

        <div className="fb-pagination">
          <div className="fb-rpp">
            <span>Rows Per Page:</span>
            <div className="fb-rpp-select">
              <select
                value={rowsPerPage}
                onChange={(e)=>{ setRowsPerPage(Number(e.target.value)); setPage(1); }}
              >
                {[15,25,50].map((n)=> <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="material-icons">expand_more</span>
            </div>
          </div>

          <div className="fb-arrows">
            <button
              className="fb-page-btn"
              onClick={()=> setPage((p)=> Math.max(1, p-1))}
              disabled={pageSafe <= 1}
              aria-label="Previous page"
            >
              <span className="material-icons">chevron_left</span>
            </button>
            <button
              className="fb-page-btn"
              onClick={()=> setPage((p)=> Math.min(totalPages, p+1))}
              disabled={pageSafe >= totalPages}
              aria-label="Next page"
            >
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
