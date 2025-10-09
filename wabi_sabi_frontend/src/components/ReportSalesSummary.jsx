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
  minus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 11h14v2H5z"/>
    </svg>
  ),
};

/* ---------------- UI atoms ---------------- */
function MultiSelect({ label, placeholder, options, value, onChange }) { /* unchanged */ 
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

function SingleSelect({ label, placeholder, options }) { /* unchanged */ 
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

function ProductSearch() { /* unchanged */ 
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

/* -------- Date range (unchanged) -------- */
function CalendarMonth({ year, month, selectedRange, onPick }) { /* unchanged */ 
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
function DateRange() { /* unchanged */ 
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

  /* filters */
  const [locationSel, setLocationSel] = useState([]);
  const [q, setQ] = useState("");
  const [invoiceQ, setInvoiceQ] = useState("");
  const [barcodeQ, setBarcodeQ] = useState("");

  /* expanded rows */
  const [openRows, setOpenRows] = useState(new Set());
  const toggleRow = (idx) => {
    setOpenRows(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  /* table rows (invoice-style) */
  const rows = [
    { "#":1, Invoice:"INV989", Date:"09/10/2025", Customer:"Brands 4 less – Ansal Plaza –", Mobile:"+91–8868964450", Amount:14400.01, Advance:0, PayMode:"paylater", Taxable:0, CGST:0, SGST:0, IGST:0, RoundOff:0 },
    { "#":2, Invoice:"INV988", Date:"08/10/2025", Customer:"Brands 4 less– Rajouri Garden Outside –", Mobile:"+91–7017402322", Amount:2020.00, Advance:0, PayMode:"paylater", Taxable:0, CGST:0, SGST:0, IGST:0, RoundOff:0 },
    { "#":3, Invoice:"INV987", Date:"08/10/2025", Customer:"Brand4Less– Tilak Nagar –", Mobile:"+91–9599883461", Amount:4679.99, Advance:0, PayMode:"paylater", Taxable:0, CGST:0, SGST:0, IGST:0, RoundOff:0 },
    { "#":4, Invoice:"INV986", Date:"08/10/2025", Customer:"Brand4Less– Tilak Nagar –", Mobile:"+91–9599883461", Amount:6360.00, Advance:0, PayMode:"paylater", Taxable:0, CGST:0, SGST:0, IGST:0, RoundOff:0 },
    { "#":5, Invoice:"INV985", Date:"08/10/2025", Customer:"Brands 4 less – Ansal Plaza –", Mobile:"+91–8868964450", Amount:25239.99, Advance:0, PayMode:"paylater", Taxable:0, CGST:0, SGST:0, IGST:0, RoundOff:0 },
    { "#":6, Invoice:"INV984", Date:"08/10/2025", Customer:"Brands 4 less – Ansal Plaza –", Mobile:"+91–8868964450", Amount:8800.01, Advance:0, PayMode:"paylater", Taxable:0, CGST:0, SGST:0, IGST:0, RoundOff:0 },
    { "#":7, Invoice:"INV983", Date:"08/10/2025", Customer:"Brands 4 less – Ansal Plaza –", Mobile:"+91–8868964450", Amount:5000.00, Advance:0, PayMode:"paylater", Taxable:0, CGST:0, SGST:0, IGST:0, RoundOff:0 },
    { "#":8, Invoice:"INV982", Date:"08/10/2025", Customer:"Brand4Less– Tilak Nagar –", Mobile:"+91–9599883461", Amount:9740.00, Advance:0, PayMode:"paylater", Taxable:0, CGST:0, SGST:0, IGST:0, RoundOff:0 },
  ];

  const HEADERS = ["#","Invoice","Date","Customer","Mobile","Amount","Advance","PayMode","Taxable","CGST","SGST","IGST","RoundOff"];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const inv = invoiceQ.trim().toLowerCase();
    const bar = barcodeQ.trim().toLowerCase();
    return rows.filter(r => {
      const base =
        (r.Invoice||"").toLowerCase().includes(inv || s) ||
        (r.Customer||"").toLowerCase().includes(s) ||
        (r.Mobile||"").toLowerCase().includes(s);
      const byBarcode = bar ? (r.Invoice||"").toLowerCase().includes(bar) : true;
      return base && byBarcode;
    });
  }, [q, invoiceQ, barcodeQ, rows]);

  const totals = useMemo(() => {
    const amount = filtered.reduce((a,r)=>a + Number(r.Amount||0), 0);
    return { amount };
  }, [filtered]);

  /* ========== NEW: Pagination (10, 50, 100, 500) ========== */
  const PAGE_SIZES = [10, 50, 100, 500];
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (page - 1) * perPage;
  const end = Math.min(start + perPage, filtered.length);
  const pageRows = filtered.slice(start, end);

  // reset to page 1 when filters or perPage change
  useEffect(() => { setPage(1); }, [q, invoiceQ, barcodeQ, perPage]);

  // per-page dropdown
  function PerPage() {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useOnClickOutside(ref, () => setOpen(false));
    return (
      <div className="ss-pp" ref={ref}>
        <button className="ss-pp-btn" type="button" onClick={()=>setOpen(v=>!v)}>
          {perPage} <span className="ss-caret"><Ic.caret/></span>
        </button>
        {open && (
          <div className="ss-pp-menu">
            {PAGE_SIZES.map(n => (
              <button key={n} className="ss-pp-item" onClick={()=>{ setPerPage(n); setOpen(false); }}>
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ss-wrap">
      {/* header */}
      <div className="ss-top">
        <div className="ss-title">Sales Summary</div>
        <span className="ss-dot">•</span>
        <div className="ss-sub">- Report</div>
      </div>

      {/* filters (unchanged other than your earlier edits) */}
      <div className="filters-card">
        <MultiSelect label="Location" placeholder="Select Location" options={LOCS} value={locationSel} onChange={setLocationSel}/>
        <DateRange/>
        <div className="fs-field">
          <div className="fs-label">Customer</div>
          <div className="ss-searchbox">
            <input placeholder="Search Customer" value={q} onChange={(e)=>setQ(e.target.value)} />
            <span className="ss-sel-caret"><Ic.caret/></span>
          </div>
        </div>
        <div className="fs-field">
          <div className="fs-label">Invoice No.</div>
          <div className="ss-searchbox">
            <input placeholder="Invoice No." value={invoiceQ} onChange={(e)=>setInvoiceQ(e.target.value)} />
            <span className="ss-sel-caret"><Ic.caret/></span>
          </div>
        </div>
        <div className="fs-field">
          <div className="fs-label">Barcode</div>
          <div className="ss-searchbox">
            <input placeholder="Barcode" value={barcodeQ} onChange={(e)=>setBarcodeQ(e.target.value)} />
            <span className="ss-sel-caret"><Ic.caret/></span>
          </div>
        </div>
        <SingleSelect label="Category" placeholder="Select Category" options={CATS}/>
        <SingleSelect label="Sub Category" placeholder="Select Sub Category" options={[]}/>
        <SingleSelect label="Brand" placeholder="Select Brand" options={BRANDS}/>
        <SingleSelect label="Sub Brand" placeholder="Select Sub Brand" options={[]}/>
        <ProductSearch/>
      </div>

      {/* data card */}
      <div className="ss-card">
        <div className="ss-toolbar">
          <div className="ss-toolbar-right">
            <PerPage />
            <ExportMenu headers={["#","Invoice","Date","Customer","Mobile","Amount","Advance","PayMode","Taxable","CGST","SGST","IGST","RoundOff"]} rows={filtered}/>
            <div className="ss-search">
              <Ic.search/>
              <input placeholder="Search List..." value={q} onChange={(e)=>setQ(e.target.value)}/>
            </div>
          </div>
        </div>

        {/* header */}
        <div className="ss-thead">
          <div>#</div><div>Invoice No.</div><div>Date</div><div>Customer</div>
          <div>Mobile</div><div>Amount</div><div>Advance</div><div>Pay Mode</div>
          <div>Taxable</div><div>CGST</div><div>SGST</div><div>IGST</div><div>Round Off</div>
        </div>

        {/* rows (paginated) */}
        {pageRows.map((r,i)=>(
          <React.Fragment key={start + i}>
            <div className="ss-rowline">
              <div className="ss-cell-hybrid">
                <span
                  className={`ss-plus ${openRows.has(start + i) ? "open" : ""}`}
                  onClick={()=>toggleRow(start + i)}
                  role="button"
                  aria-label={openRows.has(start + i) ? "Collapse row" : "Expand row"}
                  tabIndex={0}
                >
                  {openRows.has(start + i) ? <Ic.minus/> : <Ic.plus/>}
                </span>
                <span>{r["#"]}</span>
              </div>
              <div><a href="#" className="ss-link">{r.Invoice}</a></div>
              <div>{r.Date}</div>
              <div className="ss-branch">{r.Customer}</div>
              <div>{r.Mobile}</div>
              <div>{r.Amount.toFixed(2)}</div>
              <div>{r.Advance.toFixed(3)}</div>
              <div>{r.PayMode}</div>
              <div>{r.Taxable.toFixed(2)}</div>
              <div>{r.CGST.toFixed(2)}</div>
              <div>{r.SGST.toFixed(2)}</div>
              <div>{r.IGST.toFixed(2)}</div>
              <div>{r.RoundOff.toFixed(2)}</div>
            </div>
            {openRows.has(start + i) && (
              <div className="ss-expand">
                <div className="ss-exp-line"><span>Notes :</span><span>—</span></div>
              </div>
            )}
          </React.Fragment>
        ))}

        <div className="ss-total">
          <div></div><div>Total</div>
          <div></div><div></div><div></div>
          <div>{totals.amount.toFixed(2)}</div>
          <div>0.00</div><div></div><div>0.00</div><div>0.00</div><div>0.00</div><div>0.00</div>
        </div>

        {/* footer pager (enabled) */}
        <div className="ss-foot">
          <div className="info">
            Showing {filtered.length ? start + 1 : 0} to {end} of {filtered.length} entries
          </div>
          <div className="ss-pager">
            <button className="ss-page-btn" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>
            <span className="ss-page-num">{page}</span>
            <button className="ss-page-btn" disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------- export menu (unchanged) ------- */
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
    w.document.write(`<html><head>${style}</head><body><h2>Sales Summary</h2><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  return (
    <div className="ss-export" ref={ref}>
      <button className="ss-export-btn" type="button" onClick={()=>setOpen(v=>!v)}>
        <Ic.export/> <span className="ss-drop-caret"><Ic.caret/></span>
      </button>
      {open && (
        <div className="ss-export-menu">
          <button className="ss-export-item" onClick={()=>toCSV("sales-summary.csv")}>Excel</button>
          <button className="ss-export-item" onClick={toPDF}>PDF</button>
          <button className="ss-export-item" onClick={()=>toCSV("sales-summary-all.csv")}>All Excel</button>
        </div>
      )}
    </div>
  );
}
