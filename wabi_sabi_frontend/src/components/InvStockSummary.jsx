// src/components/InvStockSummary.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/InvStockSummary.css";

/* ---------------- helpers ---------------- */
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const l = (e) => { if (!ref.current || ref.current.contains(e.target)) return; handler(); };
    document.addEventListener("mousedown", l);
    document.addEventListener("touchstart", l);
    return () => { document.removeEventListener("mousedown", l); document.removeEventListener("touchstart", l); };
  }, [ref, handler]);
}
const Ic = {
  caret: () => (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.24 4.38a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"/>
    </svg>
  ),
  x: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4l-6.3 6.3-1.41-1.42L9.17 12 2.88 5.71 4.3 4.29l6.29 6.3 6.3-6.3z"/>
    </svg>
  ),
  export: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 20h14v-2H5v2zM12 2l-5 5h3v6h4V7h3l-5-5z"/>
    </svg>
  ),
  cal: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm14 8H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10z"/>
    </svg>
  ),
  search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
      <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
    </svg>
  ),
  plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"/>
    </svg>
  ),
  /* NEW for collapsible rows */
  minus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 11h14v2H5z"/>
    </svg>
  ),
};

/* ---------------- UI atoms ---------------- */

/* Multi-select (Location) */
function MultiSelect({ label, placeholder, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const allChecked = options.length > 0 && value.length === options.length;
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return options.filter(o => o.toLowerCase().includes(s));
  }, [q, options]);

  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };
  const toggleAll = () => onChange(allChecked ? [] : [...options]);

  return (
    <div className="fs-field">
      <div className="fs-label">{label}</div>
      <div className={`msel ${open ? "open":""}`} ref={ref}>
        <button type="button" className="msel-btn" onClick={()=>setOpen(v=>!v)}>
          <span className={`msel-ph ${value.length ? "picked":""}`}>{placeholder}</span>
          {!!value.length && <span className="msel-badge">{value.length}</span>}
          {!!value.length && (
            <span className="msel-clear" onClick={(e)=>{e.stopPropagation(); onChange([]); setQ("");}}>
              <Ic.x/>
            </span>
          )}
          <span className="msel-caret"><Ic.caret/></span>
        </button>

        {open && (
          <div className="msel-pop">
            <input className="msel-search" value={q} onChange={(e)=>setQ(e.target.value)} />
            <div className="msel-list">
              <label className="msel-item">
                <input type="checkbox" checked={allChecked} onChange={toggleAll}/>
                <span>All</span>
              </label>
              {filtered.map(opt => (
                <label key={opt} className="msel-item">
                  <input type="checkbox" checked={value.includes(opt)} onChange={()=>toggle(opt)}/>
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Single-select (Category/Brand/Sub*) */
function SingleSelect({ label, placeholder, options }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return options.filter(o => o.toLowerCase().includes(s));
  }, [q, options]);

  return (
    <div className="fs-field">
      <div className="fs-label">{label}</div>
      <div className={`ssel ${open ? "open":""}`} ref={ref}>
        <button type="button" className="ssel-btn" onClick={()=>setOpen(v=>!v)}>
          <span className={`ssel-val ${val ? "picked":""}`}>{val || placeholder}</span>
          <span className="ssel-caret"><Ic.caret/></span>
        </button>

        {open && (
          <div className="ssel-pop">
            <input className="ssel-search" value={q} onChange={e=>setQ(e.target.value)} />
            <div className="ssel-list">
              {shown.length ? shown.map(o => (
                <div key={o} className="ssel-item" onClick={()=>{setVal(o); setOpen(false);}}>
                  {o}
                </div>
              )) : <div className="ssel-empty">No results found</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Product search (type prompt) */
function ProductSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const products = useMemo(() => {
    const all = ["Blazer","Coat","Crop T-Shirt","Flared Jeans","Ballerinas","Sneakers","Joggers"];
    if (q.length < 1) return [];
    return all.filter(p => p.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  return (
    <div className="fs-field">
      <div className="fs-label">Product</div>
      <div className={`psel ${open ? "open":""}`} ref={ref}>
        <button className="psel-btn" type="button" onClick={()=>setOpen(v=>!v)}>
          <span className="psel-ph">Search Product</span>
          <span className="psel-caret"><Ic.caret/></span>
        </button>
        {open && (
          <div className="psel-pop">
            <input className="psel-search" autoFocus value={q} onChange={(e)=>setQ(e.target.value)} />
            {q.length < 1 ? (
              <div className="psel-hint">Please enter 1 or more characters</div>
            ) : (
              <div className="psel-list">
                {products.map(p => <div key={p} className="psel-item">{p}</div>)}
                {!products.length && <div className="psel-empty">No results found</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Date range (preset list + dual months) */
function CalendarMonth({ year, month, selectedRange, onPick }) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const days = [...Array(end.getDate())].map((_, i) => new Date(year, month, i + 1));
  const firstDow = start.getDay();
  const cells = [...Array(firstDow).fill(null), ...days];

  const inRange = (d) => {
    if (!selectedRange[0] || !selectedRange[1]) return false;
    const t = d.setHours(0,0,0,0);
    return t >= selectedRange[0].setHours(0,0,0,0) && t <= selectedRange[1].setHours(0,0,0,0);
  };

  return (
    <div className="drp-month">
      <div className="drp-grid">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(h => <div key={h} className="drp-dow">{h}</div>)}
        {cells.map((d, i) => (
          <div key={i}
            className={`drp-cell ${d && inRange(new Date(d)) ? "sel":""} ${d ? "" : "empty"}`}
            onClick={()=> d && onPick(new Date(d))}
          >
            {d ? d.getDate() : ""}
          </div>
        ))}
      </div>
      <div className="drp-weeknums">
        {[...Array(6)].map((_,i)=><div key={i} className="drp-wn">{i+1}</div>)}
      </div>
    </div>
  );
}

function DateRange() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(new Date(2025,3,1));
  const [to, setTo]     = useState(new Date(2026,2,31));
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const [tmpFrom, setTmpFrom] = useState(from);
  const [tmpTo, setTmpTo] = useState(to);
  useEffect(()=>{ if(!open){ setTmpFrom(from); setTmpTo(to);} },[open]);

  const display = `${from.toLocaleDateString("en-GB")} - ${to.toLocaleDateString("en-GB")}`;

  const pick = (d) => {
    if (!tmpFrom || (tmpFrom && tmpTo)) { setTmpFrom(d); setTmpTo(null); return; }
    if (d < tmpFrom) { setTmpTo(tmpFrom); setTmpFrom(d); } else { setTmpTo(d); }
  };
  const apply = () => { if (tmpFrom && tmpTo){ setFrom(tmpFrom); setTo(tmpTo); setOpen(false);} };

  const presets = ["Today","Yesterday","Last 7 Days","Last 30 Days","This Month","Last Month","This Quarter","Custom Range"];
  const leftMonth = new Date(tmpFrom.getFullYear(), tmpFrom.getMonth(), 1);
  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth()+1, 1);

  return (
    <div className="fs-field">
      <div className="fs-label">Date Range</div>
      <div className={`drp ${open ? "open":""}`} ref={ref}>
        <button className="drp-btn" type="button" onClick={()=>setOpen(v=>!v)}>
          <span>{display}</span>
          <span className="drp-ic"><Ic.cal/></span>
        </button>

        {open && (
          <div className="drp-pop">
            <div className="drp-side">
              {presets.map(p => (
                <div key={p} className={`drp-preset ${p==="Custom Range"?"active":""}`}>{p}</div>
              ))}
              <div className="drp-actions">
                <button className="drp-apply" onClick={apply}>Apply</button>
                <button className="drp-cancel" onClick={()=>setOpen(false)}>Cancel</button>
              </div>
            </div>

            <div className="drp-body">
              <div className="drp-inputs">
                <div className="drp-in"><Ic.cal/><input value={tmpFrom.toLocaleDateString("en-GB")} readOnly/></div>
                <div className="drp-in"><Ic.cal/><input value={tmpTo ? tmpTo.toLocaleDateString("en-GB") : ""} readOnly/></div>
              </div>

              <div className="drp-months">
                <div className="drp-title">
                  <span>{leftMonth.toLocaleString("en-GB",{month:"short"})} {leftMonth.getFullYear()}</span>
                  <span>{rightMonth.toLocaleString("en-GB",{month:"short"})} {rightMonth.getFullYear()}</span>
                </div>
                <div className="drp-two">
                  <CalendarMonth
                    year={leftMonth.getFullYear()}
                    month={leftMonth.getMonth()}
                    selectedRange={[tmpFrom, tmpTo || tmpFrom]}
                    onPick={pick}
                  />
                  <CalendarMonth
                    year={rightMonth.getFullYear()}
                    month={rightMonth.getMonth()}
                    selectedRange={[tmpFrom, tmpTo || tmpFrom]}
                    onPick={pick}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function InvStockSummary() {
  const LOCS = [
    "WABI SABI SUSTAINABILITY LLP",
    "Brands 4 less – Ansal Plaza",
    "Brands 4 less – Rajouri Garden",
    "Brand4Less – Tilak Nagar",
    "Brands 4 less – M3M Urbana",
    "Brands 4 less – IFFCO Chowk",
    "Brands Loot – Udyog Vihar",
    "Brands loot – Krishna Nagar",
  ];
  const CATS = ["Accessories","Boys & Girls - Blouse","Boys & Girls - Dress","Boys & Girls - Pant","Boys & Girls - Shirt","Ladies - Jacket","Ladies - Jeans","Ladies - T-Shirt"];
  const BRANDS = ["B4L","ddd","ff","ffff","g","ggg"];

  /* table demo state */
  const [locationSel, setLocationSel] = useState([]);
  const [dateRange] = useState("01/04/2025 - 31/03/2026");
  const [product, setProduct] = useState("");
  const [category] = useState("");
  const [subCategory] = useState("");
  const [brand] = useState("");
  const [subBrand] = useState("");

  const [perPage] = useState(10);
  const [q, setQ] = useState("");

  /* NEW: track expanded rows */
  const [openRows, setOpenRows] = useState(new Set());
  const toggleRow = (idx) => {
    setOpenRows(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const rows = [
    { "#":1, Branch:"WABI SABI SUSTAINABILITY LLP", Code:"800411", Product:"(926)(L) Ballerinas", Category:"Ladies - Shoes", Variant:"", UOM:"Pcs2", MRP:"2000", Selling:"1000", Discount:"1000 Rs.", Purchase:"380.95", Opening:"0", InQty:"1" },
    { "#":2, Branch:"WABI SABI SUSTAINABILITY LLP", Code:"809613", Product:"(700)(L) Coat & Blazer", Category:"Ladies - Jacket", Variant:"", UOM:"Pcs2", MRP:"800", Selling:"400", Discount:"400 Rs.", Purchase:"152.38", Opening:"0", InQty:"1" },
    { "#":3, Branch:"WABI SABI SUSTAINABILITY LLP", Code:"811445", Product:"(301)(L) Crop T-Shirt", Category:"Ladies - T-Shirt", Variant:"", UOM:"Pcs2", MRP:"300", Selling:"150", Discount:"150 Rs.", Purchase:"57.14", Opening:"0", InQty:"1" },
    { "#":4, Branch:"WABI SABI SUSTAINABILITY LLP", Code:"811446", Product:"(301)(L) Crop T-Shirt", Category:"Ladies - T-Shirt", Variant:"", UOM:"Pcs2", MRP:"300", Selling:"150", Discount:"150 Rs.", Purchase:"57.14", Opening:"0", InQty:"1" },
    { "#":5, Branch:"WABI SABI SUSTAINABILITY LLP", Code:"811448", Product:"(301)(L) Crop T-Shirt", Category:"Ladies - T-Shirt", Variant:"", UOM:"Pcs2", MRP:"300", Selling:"150", Discount:"150 Rs.", Purchase:"57.14", Opening:"0", InQty:"1" },
    { "#":6, Branch:"WABI SABI SUSTAINABILITY LLP", Code:"811450", Product:"(301)(L) Crop T-Shirt", Category:"Ladies - T-Shirt", Variant:"", UOM:"Pcs2", MRP:"300", Selling:"150", Discount:"150 Rs.", Purchase:"57.14", Opening:"0", InQty:"1" },
    { "#":7, Branch:"WABI SABI SUSTAINABILITY LLP", Code:"811452", Product:"(301)(L) Crop T-Shirt", Category:"Ladies - T-Shirt", Variant:"", UOM:"Pcs2", MRP:"300", Selling:"150", Discount:"150 Rs.", Purchase:"57.14", Opening:"0", InQty:"1" },
    { "#":8, Branch:"WABI SABI SUSTAINABILITY LLP", Code:"811460", Product:"(301)(L) Crop T-Shirt", Category:"Ladies - T-Shirt", Variant:"", UOM:"Pcs2", MRP:"300", Selling:"150", Discount:"150 Rs.", Purchase:"57.14", Opening:"0", InQty:"1" },
    { "#":9, Branch:"WABI SABI SUSTAINABILITY LLP", Code:"809589", Product:"(452)(L) Flared Jeans", Category:"Ladies - Jeans", Variant:"", UOM:"Pcs2", MRP:"800", Selling:"400", Discount:"400 Rs.", Purchase:"152.38", Opening:"0", InQty:"1" },
    { "#":10, Branch:"WABI SABI SUSTAINABILITY LLP", Code:"811445", Product:"(301)(L) Crop T-Shirt", Category:"Ladies - T-Shirt", Variant:"", UOM:"Pcs2", MRP:"300", Selling:"150", Discount:"150 Rs.", Purchase:"57.14", Opening:"0", InQty:"1" },
  ];
  const HEADERS = ["#","Branch","Code","Product","Category","Variant","UOM","MRP","Selling","Discount","Purchase","Opening","InQty"];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      (r.Code+"").toLowerCase().includes(s) ||
      (r.Product||"").toLowerCase().includes(s) ||
      (r.Category||"").toLowerCase().includes(s) ||
      (r.Branch||"").toLowerCase().includes(s)
    );
  }, [q, rows]);

  const totals = useMemo(() => {
    const opening = filtered.reduce((a,r)=>a + Number(r.Opening||0), 0);
    const inqty   = filtered.reduce((a,r)=>a + Number(r.InQty||0), 0);
    return { opening, inqty };
  }, [filtered]);

  return (
    <div className="ss-wrap">
      {/* header */}
      <div className="ss-top">
        <div className="ss-title">Stock Summary</div>
        <span className="ss-dot">•</span>
        <div className="ss-sub">- Report</div>
      </div>

      {/* filters */}
      <div className="filters-card">
        <MultiSelect
          label="Location"
          placeholder="Select Location"
          options={LOCS}
          value={locationSel}
          onChange={setLocationSel}
        />
        <DateRange/>
        <ProductSearch/>
        <SingleSelect label="Category" placeholder="Select category" options={CATS}/>
        <SingleSelect label="Sub Category" placeholder="Select Sub Category" options={[]}/>
        <SingleSelect label="Brand" placeholder="Select brand" options={BRANDS}/>
        <SingleSelect label="Sub Brand" placeholder="Select Sub Brand" options={[]}/>
      </div>

      {/* data card */}
      <div className="ss-card">
        <div className="ss-toolbar">
          <div className="ss-toolbar-right">
            <ExportMenu headers={HEADERS} rows={filtered}/>
            <div className="ss-search">
              <Ic.search/>
              <input placeholder="Search List..." value={q} onChange={(e)=>setQ(e.target.value)}/>
            </div>
          </div>
        </div>

        <div className="ss-thead">
          <div>#</div><div>Branch Name</div><div>Item Code/Barcode</div><div>Product Name</div>
          <div>Category Name</div><div>Variant Name</div><div>UOM</div><div>MRP</div>
          <div>Selling Price</div><div>Discount</div><div>Purchase Price</div><div>Opening stock</div><div>In Qty</div>
        </div>

        {filtered.map((r,i)=>(
          <React.Fragment key={i}>
            <div className="ss-rowline">
              <div className="ss-cell-hybrid">
                <span
                  className={`ss-plus ${openRows.has(i) ? "open" : ""}`}
                  onClick={()=>toggleRow(i)}
                  role="button"
                  aria-label={openRows.has(i) ? "Collapse row" : "Expand row"}
                  tabIndex={0}
                >
                  {openRows.has(i) ? <Ic.minus/> : <Ic.plus/>}
                </span>
                <span>{r["#"]}</span>
              </div>
              <div className="ss-branch"><div>WABI SABI</div><div>SUSTAINABILITY</div><div>LLP</div></div>
              <div><a href="#" className="ss-link">{r.Code}</a></div>
              <div>{r.Product}</div><div>{r.Category}</div><div>{r.Variant}</div><div>{r.UOM}</div>
              <div>{r.MRP}</div><div>{r.Selling}</div><div>{r.Discount}</div><div>{r.Purchase}</div>
              <div>{r.Opening}</div><div>{r.InQty}</div>
            </div>

            {openRows.has(i) && (
              <div className="ss-expand">
                <div className="ss-exp-line"><span>Out Qty :</span><span>{r.InQty}</span></div>
                <div className="ss-exp-line"><span>Qty :</span><span>0</span></div>
                <div className="ss-exp-line"><span>Stock Value :</span><span>0.00</span></div>
              </div>
            )}
          </React.Fragment>
        ))}

        <div className="ss-total">
          <div></div><div>Total</div>
          <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
          <div>{totals.opening}</div><div>{totals.inqty}</div>
        </div>

        <div className="ss-foot">
          <div className="info">Showing 1 to {Math.min(perPage, filtered.length)} of {filtered.length} entries</div>
          <div className="ss-pager">
            <button className="ss-page-btn" disabled>‹</button>
            <span className="ss-page-num">1</span>
            <button className="ss-page-btn" disabled>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------- small components you referenced but not defined above ------- */
function ExportMenu({ headers, rows }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const toCSV = (filename) => {
    const head = headers.join(",");
    const body = rows.map(r => headers.map(h => `"${(r[h]??"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([head+"\n"+body], { type:"text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename;
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
    const thead = "<tr>" + headers.map(h=>`<th>${h}</th>`).join("") + "</tr>";
    const tbody = rows.map(r => "<tr>" + headers.map(h=>`<td>${r[h]||""}</td>`).join("") + "</tr>").join("");
    w.document.write(`<html><head>${style}</head><body><h2>Stock Summary</h2><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  return (
    <div className="ss-export" ref={ref}>
      <button className="ss-export-btn" type="button" onClick={()=>setOpen(v=>!v)}>
        <Ic.export/> <span className="ss-drop-caret"><Ic.caret/></span>
      </button>
      {open && (
        <div className="ss-export-menu">
          <button className="ss-export-item" onClick={()=>toCSV("stock-summary.csv")}>Excel</button>
          <button className="ss-export-item" onClick={toPDF}>PDF</button>
          <button className="ss-export-item" onClick={()=>toCSV("stock-summary-all.csv")}>All Excel</button>
        </div>
      )}
    </div>
  );
}
