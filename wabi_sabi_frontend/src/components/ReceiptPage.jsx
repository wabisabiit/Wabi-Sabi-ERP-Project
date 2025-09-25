import React, { useMemo, useRef, useState, useEffect } from "react";
import "../styles/ReceiptPage.css";
import NewReceiptPage from "./NewReceiptPage";

/* ---------------- helpers ---------------- */
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const l = (e) => { if (!ref.current || ref.current.contains(e.target)) return; handler(); };
    document.addEventListener("mousedown", l);
    document.addEventListener("touchstart", l);
    return () => { document.removeEventListener("mousedown", l); document.removeEventListener("touchstart", l); };
  }, [ref, handler]);
}

/* dd/mm/yyyy <-> yyyy-mm-dd */
const toISO = (dmy) => {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return "";
  return `${y.padStart(4,"0")}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
};
const fromISO = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`;
};

/* ---------------- icons ---------------- */
const Icon = {
  home:   () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-5v-7H10v7H5a2 2 0 0 1-2-2v-9z"/></svg>),
  export: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zM12 2l-5 5h3v6h4V7h3l-5-5z"/></svg>),
  caret:  () => (<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.24 4.38a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"/></svg>),
  filter: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2l-7 8v5l-4 1v-6L3 6V4z"/></svg>),
  search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
  ),
  calendar: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm14 8H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10z"/></svg>),
  file:   () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"/></svg>),
  close:  () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.29-6.29z"/></svg>),
};

/* ---------------- combobox ---------------- */
function SimpleSelect({ placeholder, options = [], value, onChange, width = 170 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  const shown = useMemo(() => (q ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())) : options), [q, options]);

  return (
    <div className="rc-combo" style={{ width }} ref={ref}>
      <button className={`rc-combo-btn ${value ? "has" : ""}`} onClick={() => setOpen(v => !v)}>
        <span className="rc-combo-val">{value || placeholder}</span>
        <span className="rc-caret"><Icon.caret /></span>
      </button>
      {open && (
        <div className="rc-pop">
          <input className="rc-pop-search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="rc-pop-list">
            {shown.map(o => (
              <div key={o} className="rc-pop-item" onClick={() => { onChange(o); setOpen(false); }}>{o}</div>
            ))}
            {!shown.length && <div className="rc-pop-empty">No options</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------- multiselect (same as before) ------------- */
function MultiSelect({ placeholder, options = [], values = [], onChange, width = 240 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  const shown = useMemo(() => (q ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())) : options), [q, options]);
  const toggle = (opt) => onChange(values.includes(opt) ? values.filter(v => v!==opt) : [...values, opt]);

  return (
    <div className="rc-combo" style={{ width }} ref={ref}>
      <button className="rc-combo-btn has" onClick={() => setOpen(v => !v)}>
        <span className="rc-combo-val">
          {values.length ? <>Select Location <span className="rc-badge">{values.length}</span></> : placeholder}
        </span>
        <span className="rc-caret"><Icon.caret/></span>
      </button>
      {open && (
        <div className="rc-pop">
          <input className="rc-pop-search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="rc-pop-list rc-pop-list--5">
            {shown.map(o => (
              <label key={o} className="rc-pop-item chk">
                <input type="checkbox" checked={values.includes(o)} onChange={() => toggle(o)} />
                <span>{o}</span>
              </label>
            ))}
            {!shown.length && <div className="rc-pop-empty">No options</div>}
          </div>
          {!!values.length && (
            <div className="rc-pop-actions">
              <button className="rc-link" onClick={() => onChange([])}>Clear</button>
              <button className="rc-link" onClick={() => setOpen(false)}>Done</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Per Page ---------------- */
function PerPageSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  const options = [10, 25, 50, 100];

  return (
    <div className="rc-pp-wrap" ref={ref}>
      <button className="rc-pp-btn" onClick={() => setOpen(v => !v)}>
        {value} <Icon.caret />
      </button>
      {open && (
        <div className="rc-pp-menu">
          {options.map(n => (
            <button key={n} className="rc-pp-item" onClick={() => { onChange(n); setOpen(false); }}>
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Date input for filters ---------------- */
function DateInput({ value, onChange }) {
  const ref = useRef(null);
  const iso = toISO(value);
  const open = () => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else { el.focus(); el.click(); }
  };
  return (
    <div className="rc-date rc-date--sm">
      <input ref={ref} type="date" value={iso} onChange={(e)=>onChange(fromISO(e.target.value))}/>
      <span className="rc-cal" onClick={open}><Icon.calendar/></span>
    </div>
  );
}

/* ---------------- Export menu ---------------- */
function ExportMenu({ rows, headers }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const toCSV = () => {
    const headerLine = headers.join(",");
    const body = rows.map(r => headers.map(h => `"${(r[h]??"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([headerLine+"\n"+body], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "receipt-list.csv";
    document.body.appendChild(a); a.click(); a.remove();
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
    const head = ["#", "Receipt No.","Party Name","Mode","Type","Date","Amount","Status","Created By"];
    const body = rows.map((r,i)=>(
      `<tr><td>${i+1}</td><td>${r["Receipt No."]||""}</td><td>${r["Party Name"]||""}</td><td>${r["Mode"]||""}</td><td>${r["Type"]||""}</td><td>${r["Date"]||""}</td><td>${r["Amount"]||""}</td><td>${r["Status"]||""}</td><td>${r["Created By"]||""}</td></tr>`
    )).join("");
    w.document.write(`<html><head>${style}</head><body><h2>Receipt</h2><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  return (
    <div className="rc-export-wrap" ref={ref}>
      <button className="rc-export" onClick={()=>setOpen(v=>!v)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zM12 2l-5 5h3v6h4V7h3l-5-5z"/></svg>
        <span className="rc-drop-caret"><Icon.caret/></span>
      </button>
      {open && (
        <div className="rc-export-menu">
          <button className="rc-export-item" onClick={toCSV}><Icon.file/> <span>Excel</span></button>
          <button className="rc-export-item" onClick={toPDF}><Icon.file/> <span>PDF</span></button>
        </div>
      )}
    </div>
  );
}

/* =================== MAIN PAGE (List + New) =================== */
export default function ReceiptPage() {
  const [route, setRoute] = useState("list"); // 'list' | 'new'

  // list UI state
  const [showFilter, setShowFilter] = useState(false);
  const [perPage, setPerPage] = useState(10);
  const [query, setQuery] = useState("");

  const rows = []; // blank like screenshot
  const HEADERS = ["Receipt No.","Party Name","Mode","Type","Date","Amount","Status","Created By"];

  // filters
  const PARTIES = ["John Retail","Acme Corp","Zed Traders","Omnia Pvt Ltd"];
  const TYPES   = ["On Account","Advance","Against"];
  const LOCS    = ["WABI SABI SUSTAINABILITY LLP","Brands 4 less – IFFCO Chowk","Brands 4 less – M3M Urbana","Brands Loot – Udyog Vihar","Brands 4 less – Rajouri Garden (Inside)","Brand4Less – Tilak Nagar","Brands loot – Krishna Nagar"];
  const [party, setParty] = useState("");
  const [rtype, setRtype] = useState("");
  const [from, setFrom]   = useState("01/04/2025");
  const [to, setTo]       = useState("31/03/2026");
  const [locs, setLocs]   = useState([]);

  if (route === "new") {
    return <NewReceiptPage onBack={() => setRoute("list")} />;
  }

  return (
    <div className="rc-wrap">
      {/* title row */}
      <div className="rc-head">
        <h3 className="rc-title">Receipt</h3>
        <span className="rc-home"><Icon.home/></span>
      </div>

      <div className="rc-card">
        {/* top bar — right aligned */}
        <div className="rc-top rc-top--right">
          <div className="rc-right">
            <ExportMenu rows={rows} headers={HEADERS}/>
            <PerPageSelect value={perPage} onChange={setPerPage} />
            <button className={`rc-filter ${showFilter ? "active" : ""}`} onClick={()=>setShowFilter(v=>!v)}>
              {Icon.filter()} <span>Filter</span>
            </button>
            <div className="rc-search rc-search--sm">
              <span className="rc-search-ic"><Icon.search/></span>
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search List..." />
            </div>
            <button className="rc-create" onClick={()=>setRoute("new")}>Create New</button>
          </div>
        </div>

        {/* filter area */}
        {showFilter && (
          <div className="rc-filters">
            <div className="rc-fcol">
              <div className="rc-lb">Select Party</div>
              <SimpleSelect placeholder="Select Party" options={PARTIES} value={party} onChange={setParty} width={170} />
            </div>
            <div className="rc-fcol">
              <div className="rc-lb">Select Type</div>
              <SimpleSelect placeholder="Select Type" options={TYPES} value={rtype} onChange={setRtype} width={170} />
            </div>
            <div className="rc-fcol">
              <div className="rc-lb">From Date</div>
              <DateInput value={from} onChange={setFrom} />
            </div>
            <div className="rc-fcol">
              <div className="rc-lb">To Date</div>
              <DateInput value={to} onChange={setTo} />
            </div>
            <div className="rc-fcol">
              <div className="rc-lb">Location</div>
              <div className="rc-location-clear">
                <MultiSelect placeholder="Select Location" options={LOCS} values={locs} onChange={setLocs} width={240}/>
                {!!locs.length && (
                  <button className="rc-clear" onClick={()=>setLocs([])} title="Clear"><Icon.close/></button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* table header only (blank state) */}
        <div className="rc-table">
          <div className="rc-thead">
            <div className="c id">#</div>
            <div className="c">Receipt No.</div>
            <div className="c">PartyName</div>
            <div className="c">Mode</div>
            <div className="c">Type</div>
            <div className="c">Date</div>
            <div className="c">Amount</div>
            <div className="c">Status</div>
            <div className="c">Created By</div>
            <div className="c">Actions</div>
          </div>
        </div>
      </div>
    </div>
  );
}
