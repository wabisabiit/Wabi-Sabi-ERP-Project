// src/components/StockTransferPage.jsx
import React, { useMemo, useState, useRef, useEffect } from "react";
import "../styles/StockTransferPage.css";

const RAW_ROWS = [
  { no: "STF/WS/1370", date: "30/09/2025", from: "WABI SABI SUSTAINABILITY LLP", to: "Brands 4 less- M3M Urbana", amount: 9840.0, qty: 27, by: "Krishna Pandit" },
  { no: "STF/WS/1369", date: "30/09/2025", from: "WABI SABI SUSTAINABILITY LLP", to: "Brands 4 less- M3M Urbana", amount: 1200.0, qty: 12, by: "Krishna Pandit" },
  { no: "STF/WS/1368", date: "30/09/2025", from: "WABI SABI SUSTAINABILITY LLP", to: "Brands 4 less - Ansal Plaza", amount: 5600.01, qty: 38, by: "Krishna Pandit" },
  { no: "STF/WS/1367", date: "01/10/2025", from: "WABI SABI SUSTAINABILITY LLP", to: "Brands 4 less- M3M Urbana", amount: 999.99, qty: 25, by: "Krishna Pandit" },
  { no: "STF/WS/1366", date: "01/10/2025", from: "WABI SABI SUSTAINABILITY LLP", to: "Brand4Less-Tilak Nagar", amount: 21919.98, qty: 55, by: "Krishna Pandit" },
  { no: "STF/WS/1365", date: "30/09/2025", from: "WABI SABI SUSTAINABILITY LLP", to: "Brands 4 less - Ansal Plaza", amount: 7979.99, qty: 58, by: "Krishna Pandit" },
  { no: "STF/WS/1364", date: "01/10/2025", from: "WABI SABI SUSTAINABILITY LLP", to: "Brands 4 less - Ansal Plaza", amount: 10959.99, qty: 28, by: "Krishna Pandit" },
  { no: "STF/WS/1363", date: "30/09/2025", from: "WABI SABI SUSTAINABILITY LLP", to: "Brands 4 less - Ansal Plaza", amount: 6899.99, qty: 55, by: "Krishna Pandit" },
  { no: "STF/WS/1362", date: "30/09/2025", from: "WABI SABI SUSTAINABILITY LLP", to: "Brands 4 less- M3M Urbana", amount: 7740.02, qty: 129, by: "Krishna Pandit" },
  { no: "STF/WS/1361", date: "30/09/2025", from: "WABI SABI SUSTAINABILITY LLP", to: "Brands 4 less - Ansal Plaza", amount: 4000.0, qty: 40, by: "Krishna Pandit" },
];

const TO_LOCATIONS = [
  "All",
  "Brands4Less - Tilak Nagar",
  "Brands4Less - M3M Urbana",
  "Brands4Less - Ansal Plaza",
  "Brands4Less-Rajori Garden inside (RJR)",
  "Rajori Garden outside (RJO)",
  "Brands4Less-Iffco Chock",
  "Brands4Less-Krishna Nagar",
  "Brands4Less-UP-AP",
  "Brands4Less-Udhyog Vihar"
];
const FROM_LOCATIONS =[
  "All",
  "Brands4Less - Tilak Nagar",
  "Brands4Less - M3M Urbana",
  "Brands4Less - Ansal Plaza",
  "Brands4Less-Rajori Garden inside (RJR)",
  "Rajori Garden outside (RJO)",
  "Brands4Less-Iffco Chock",
  "Brands4Less-Krishna Nagar",
  "Brands4Less-UP-AP",
  "Brands4Less-Udhyog Vihar"
];

/* ------------------ Helpers ------------------ */
const pad2 = (n)=>String(n).padStart(2,"0");
const fmtISO = (d)=> `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const fmtDMY = (d)=> `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
const dmyToISO = (dmy)=>{ const [dd,mm,yy]=dmy.split("/"); return `${yy}-${mm}-${dd}`; };
const toDate = (iso)=> new Date(`${iso}T00:00:00`);
const addMonths = (d, n)=> { const x=new Date(d); x.setMonth(x.getMonth()+n); return x; };
const startOfMonth=(d)=> new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth=(d)=> new Date(d.getFullYear(), d.getMonth()+1, 0);

/* ============ DateRangePicker (inline, no libs) ============ */
function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // confirmed value drives filter; tempRange used while popover is open
  const [temp, setTemp] = useState({ start: value.start, end: value.end });

  // visible calendar months (left is current, right is +1)
  const [viewLeft, setViewLeft] = useState(startOfMonth(toDate(value.start)));

  useEffect(()=>{
    function onDoc(e){
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return ()=> document.removeEventListener("mousedown", onDoc);
  },[]);

  // grid for a month
  function makeMonthGrid(base){
    const first = startOfMonth(base);
    const last = endOfMonth(base);
    const startIdx = first.getDay(); // 0=Sun
    // 6 rows * 7 = 42 cells
    const days = [];
    for (let i=0;i<42;i++){
      const day = new Date(first);
      day.setDate(1 - startIdx + i);
      days.push(day);
    }
    return days;
  }

  const leftGrid = makeMonthGrid(viewLeft);
  const rightGrid = makeMonthGrid(addMonths(viewLeft,1));

  const inRange = (d)=>{
    const s = toDate(temp.start);
    const e = toDate(temp.end);
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return x >= s && x <= e;
  };
  const isOtherMonth = (d, base)=> d.getMonth() !== base.getMonth();

  function selectDay(d){
    // if selecting a new range: first click sets start, second sets end
    const s = toDate(temp.start);
    const e = toDate(temp.end);
    if (isNaN(s) || !temp._awaitEnd){
      setTemp({ start: fmtISO(d), end: fmtISO(d), _awaitEnd: true });
    } else {
      let a = s, b = d;
      if (b < a){ const t=a; a=b; b=t; }
      setTemp({ start: fmtISO(a), end: fmtISO(b), _awaitEnd: false });
    }
  }

  // Presets
  const today = new Date();
  const presets = [
    { label:"Today",        range:()=>({start:fmtISO(today), end:fmtISO(today)}) },
    { label:"Yesterday",    range:()=>{const y=new Date(today); y.setDate(y.getDate()-1); return {start:fmtISO(y), end:fmtISO(y)};} },
    { label:"Last 7 Days",  range:()=>{const s=new Date(today); s.setDate(s.getDate()-6); return {start:fmtISO(s), end:fmtISO(today)};} },
    { label:"Last 30 Days", range:()=>{const s=new Date(today); s.setDate(s.getDate()-29); return {start:fmtISO(s), end:fmtISO(today)};} },
    { label:"This Month",   range:()=>{const s=startOfMonth(today); const e=endOfMonth(today); return {start:fmtISO(s), end:fmtISO(e)};} },
    { label:"Last Month",   range:()=>{const lm=addMonths(today,-1); const s=startOfMonth(lm); const e=endOfMonth(lm); return {start:fmtISO(s), end:fmtISO(e)};} },
    { label:"This Quarter", range:()=>{const q=Math.floor(today.getMonth()/3); const s=new Date(today.getFullYear(), q*3, 1); const e=new Date(today.getFullYear(), q*3+3, 0); return {start:fmtISO(s), end:fmtISO(e)};} },
    { label:"Custom Range", range:()=>null, custom:true },
  ];
  const [activePreset, setActivePreset] = useState("Custom Range");

  function applyPreset(p){
    if (p.custom) { setActivePreset(p.label); return; }
    const r = p.range();
    setTemp({ start:r.start, end:r.end, _awaitEnd:false });
    setActivePreset(p.label);
  }

  function apply(){
    const next = { start: temp.start, end: temp.end };
    onChange(next);
    setOpen(false);
  }
  function cancel(){
    setTemp({ start: value.start, end: value.end, _awaitEnd:false });
    setOpen(false);
  }

  const displayValue = `${fmtDMY(toDate(value.start))} - ${fmtDMY(toDate(value.end))}`;

  return (
    <div className="st-drp" ref={rootRef}>
      <div className="st-input-ico" onClick={()=>{ setOpen(o=>!o); setViewLeft(startOfMonth(toDate(value.start))); }}>
        <input
          className="st-drp-input"
          readOnly
          value={displayValue}
        />
        <span className="material-icons">calendar_today</span>
      </div>

      {open && (
        <div className="st-drp-pop">
          <div className="st-drp-left">
            {presets.map(p=>(
              <button
                key={p.label}
                type="button"
                className={`st-drp-preset ${activePreset===p.label ? "sel":""}`}
                onClick={()=>applyPreset(p)}
              >
                {p.label}
              </button>
            ))}
            <div className="st-drp-actions">
              <button className="st-drp-apply" onClick={apply}>Apply</button>
              <button className="st-drp-cancel" onClick={cancel}>Cancel</button>
            </div>
          </div>

          <div className="st-drp-right">
            {/* top quick inputs (from/to) */}
            <div className="st-drp-quick">
              <div className="st-input-ico">
                <input
                  type="text"
                  value={fmtDMY(toDate(temp.start))}
                  onChange={(e)=>{
                    const v=e.target.value.trim();
                    // accept dd/mm/yyyy
                    const m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                    if (m){ setTemp(t=>({ ...t, start: dmyToISO(v) })); }
                  }}
                />
                <span className="material-icons">event</span>
              </div>
              <div className="st-input-ico">
                <input
                  type="text"
                  value={fmtDMY(toDate(temp.end))}
                  onChange={(e)=>{
                    const v=e.target.value.trim();
                    const m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                    if (m){ setTemp(t=>({ ...t, end: dmyToISO(v) })); }
                  }}
                />
                <span className="material-icons">event</span>
              </div>
            </div>

            {/* two calendars */}
            <div className="st-drp-cals">
              <Calendar
                baseMonth={viewLeft}
                grid={leftGrid}
                title={`${viewLeft.toLocaleString("en", { month:"short" })} ${viewLeft.getFullYear()}`}
                onPrev={()=> setViewLeft(addMonths(viewLeft,-1))}
                onNext={()=> {}}
                isOtherMonth={(d)=>isOtherMonth(d, viewLeft)}
                inRange={inRange}
                onPick={selectDay}
              />
              <Calendar
                baseMonth={addMonths(viewLeft,1)}
                grid={rightGrid}
                title={`${addMonths(viewLeft,1).toLocaleString("en", { month:"short" })} ${addMonths(viewLeft,1).getFullYear()}`}
                onPrev={()=> {}}
                onNext={()=> setViewLeft(addMonths(viewLeft,1))}
                isOtherMonth={(d)=>isOtherMonth(d, addMonths(viewLeft,1))}
                inRange={inRange}
                onPick={selectDay}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Calendar({ baseMonth, grid, title, onPrev, onNext, isOtherMonth, inRange, onPick }){
  return (
    <div className="st-cal">
      <div className="st-cal-head">
        <button className="st-nav" onClick={onPrev}><span className="material-icons">chevron_left</span></button>
        <div className="st-cal-title">{title}</div>
        <button className="st-nav" onClick={onNext}><span className="material-icons">chevron_right</span></button>
      </div>
      <div className="st-cal-grid">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d)=>(<div key={d} className="st-dow">{d}</div>))}
        {grid.map((d,i)=>{
          const other = isOtherMonth(d);
          const cls = [
            "st-day",
            other ? "muted":"",
            inRange(d) ? "in-range":""
          ].join(" ");
          return (
            <button key={i} className={cls} onClick={()=> onPick(d)}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =================== PAGE =================== */
export default function StockTransferPage() {
  const [pageSize, setPageSize] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const menuRef = useRef(null);

  const [q, setQ] = useState("");

  // default FY 01/04/2025 - 31/03/2026
  const [range, setRange] = useState({ start: "2025-04-01", end: "2026-03-31" });

  const [fromLoc, setFromLoc] = useState("All");
  const [toLoc, setToLoc] = useState("All");

  useEffect(() => {
    function onDoc(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setExportOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const rows = useMemo(() => {
    let r = RAW_ROWS.slice();
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      r = r.filter(
        (x) => x.no.toLowerCase().includes(t) || x.from.toLowerCase().includes(t) || x.to.toLowerCase().includes(t)
      );
    }
    if (fromLoc !== "All") r = r.filter((x) => x.from === fromLoc);
    if (toLoc !== "All") r = r.filter((x) => x.to === toLoc);

    // date range (inclusive)
    const s = toDate(range.start);
    const e = toDate(range.end);
    r = r.filter((x) => {
      const d = toDate(dmyToISO(x.date));
      return d >= s && d <= e;
    });

    return r;
  }, [q, fromLoc, toLoc, range]);

  const handleDownload = (type) => {
    const exts = { excel: "xlsx", pdf: "pdf" };
    const mime = type === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
    const blob = new Blob([""], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-transfer.${exts[type]}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  return (
    <div className="st-wrap">
      {/* header (home + title on the LEFT) */}
      <div className="st-head">
        <div className="st-title">Stock Transfer</div>
        <span className="material-icons st-home">home</span>
      </div>

      {/* toolbar (ALL controls on left) */}
      <div className="st-toolbar">
        <div className="st-left">
          <div className="st-export-wrap" ref={menuRef}>
            <button
              type="button"
              className="st-export"
              title="Export"
              onClick={() => setExportOpen((v) => !v)}
            >
              <span className="material-icons">file_download</span>
              <span className="material-icons st-caret">arrow_drop_down</span>
            </button>

            {exportOpen && (
              <div className="st-export-menu">
                <button type="button" onClick={() => handleDownload("excel")}>Excel</button>
                <button type="button" onClick={() => handleDownload("pdf")}>PDF</button>
              </div>
            )}
          </div>

          <select
            className="st-length"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
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

      {/* filter panel */}
      {filterOpen && (
        <div className="st-filters">
          <div className="st-field">
            <label>Stock Transfer Date</label>
            <DateRangePicker
              value={range}
              onChange={setRange}
            />
          </div>

          <div className="st-field">
            <label>From Location</label>
            <select value={fromLoc} onChange={(e) => setFromLoc(e.target.value)}>
              {FROM_LOCATIONS.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </div>

          <div className="st-field">
            <label>To Location</label>
            <select value={toLoc} onChange={(e) => setToLoc(e.target.value)}>
              {TO_LOCATIONS.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* table */}
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
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="st-empty">No data available in table</td></tr>
            ) : (
              rows.slice(0, pageSize).map((r, idx) => (
                <tr key={r.no}>
                  <td>{idx + 1}</td>
                  <td><a className="st-link" href="#!">{r.no}</a></td>
                  <td>{r.date}</td>
                  <td>{r.from}</td>
                  <td>{r.to}</td>
                  <td className="st-right">{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="st-right">{r.qty}</td>
                  <td>{r.by}</td>
                  <td className="st-actions">
                    <button title="Edit"><span className="material-icons">edit</span></button>
                    <button title="Delete"><span className="material-icons">delete</span></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="st-foot">
          <div className="st-info">
            Showing 1 to {Math.min(pageSize, rows.length)} of 1,368 entries
          </div>
          <div className="st-pager">
            <button className="st-page" disabled><span className="material-icons">chevron_left</span></button>
            <button className="st-page sel">1</button>
            <button className="st-page">2</button>
            <button className="st-page">3</button>
            <button className="st-page">4</button>
            <span className="st-ellipsis">…</span>
            <button className="st-page">137</button>
            <button className="st-page"><span className="material-icons">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
