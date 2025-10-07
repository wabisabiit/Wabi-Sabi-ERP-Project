import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/InvoicePage.css";

/* ───────────────── Demo data ───────────────── */
const YEAR_RANGES = ["Current Year", "Last Month", "This Month", "Last Week", "This Week", "Today"];
const PAGE_SIZES = [10, 25, 50, 100, 200, 500, "All"];

/* Customers for the typeahead */
const CUSTOMERS = [
  "Brands loot – Krishna Nagar –",
  "Brands 4 less – Rajouri Garden – Inside –",
  "Brand4Less– Tilak Nagar –",
  "Brands 4 less – Ansal Plaza –",
  "Brands 4 less – Rajouri Garden – Outside –",
];

/* Locations for multiselect */
const LOCATIONS = [
  "WABI SABI SUSTAINABILITY LLP",
  "Brands 4 less – IFFCO Chowk",
  "Brands 4 less – Ansal Plaza",
  "Brands 4 less – Rajouri Garden",
  "Brand4Less – Tilak Nagar",
];

/* Demo rows: DD/MM/YYYY */
const ROWS = [
  { no:"INV935", invDate:"07/10/2025", dueDate:"07/10/2025", customer:"Brands loot – Krishna Nagar –", net:7920.02, paid:0, due:7920.02, status:"INVOICED", payStatus:"DUE", tax:377.16, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV934", invDate:"07/10/2025", dueDate:"07/10/2025", customer:"Brands 4 less – Ansal Plaza –", net:4399.99, paid:0, due:4399.99, status:"INVOICED", payStatus:"DUE", tax:209.53, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV933", invDate:"07/10/2025", dueDate:"07/10/2025", customer:"Brands 4 less – Ansal Plaza –", net:5039.99, paid:0, due:5039.99, status:"INVOICED", payStatus:"DUE", tax:240.00, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV932", invDate:"07/10/2025", dueDate:"07/10/2025", customer:"Brand4Less– Tilak Nagar –", net:4480.00, paid:0, due:4480.00, status:"INVOICED", payStatus:"DUE", tax:213.33, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV931", invDate:"07/10/2025", dueDate:"07/10/2025", customer:"Brands 4 less – Rajouri Garden Outside –", net:5000.00, paid:0, due:5000.00, status:"INVOICED", payStatus:"DUE", tax:238.09, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV930", invDate:"07/10/2025", dueDate:"07/10/2025", customer:"Brands 4 less – Ansal Plaza –", net:8399.99, paid:0, due:8399.99, status:"INVOICED", payStatus:"DUE", tax:400.01, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV929", invDate:"07/10/2025", dueDate:"07/10/2025", customer:"Brand4Less– Tilak Nagar –", net:3199.98, paid:0, due:3199.98, status:"INVOICED", payStatus:"DUE", tax:152.38, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV928", invDate:"07/10/2025", dueDate:"07/10/2025", customer:"Brands 4 less – Ansal Plaza –", net:8840.01, paid:0, due:8840.01, status:"INVOICED", payStatus:"DUE", tax:420.95, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV927", invDate:"07/10/2025", dueDate:"07/10/2025", customer:"Brands loot – Krishna Nagar –", net:2399.98, paid:0, due:2399.98, status:"INVOICED", payStatus:"DUE", tax:114.30, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV926", invDate:"07/10/2025", dueDate:"07/10/2025", customer:"Brand4Less– Tilak Nagar –", net:14059.99, paid:0, due:14059.99, status:"INVOICED", payStatus:"DUE", tax:669.52, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
];

const sum = (arr, key) => arr.reduce((a, r) => a + Number(r[key] || 0), 0);
const money = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n||0);

/* Dates (DD/MM/YYYY) */
const parseDMY = (s) => { if(!s) return null; const [d,m,y]=s.split("/").map(Number); return new Date(y,(m||1)-1,d||1); };
const sod = (d) => new Date(d.getFullYear(),d.getMonth(),d.getDate());
const eod = (d) => new Date(d.getFullYear(),d.getMonth(),d.getDate(),23,59,59,999);
const rangeFor = (label) => {
  const t = sod(new Date());
  if(label==="Today") return {from:t,to:eod(t)};
  if(label==="This Week"){ const day=t.getDay(); const mon=day===0?-6:1-day; const f=new Date(t); f.setDate(f.getDate()+mon); const to=eod(new Date(f)); to.setDate(to.getDate()+6); return {from:f,to}; }
  if(label==="Last Week"){ const {from} = rangeFor("This Week"); const f=new Date(from); f.setDate(f.getDate()-7); const to=eod(new Date(f)); to.setDate(to.getDate()+6); return {from:f,to}; }
  if(label==="This Month"){ const f=new Date(t.getFullYear(),t.getMonth(),1); const to=eod(new Date(t.getFullYear(),t.getMonth()+1,0)); return {from:f,to}; }
  if(label==="Last Month"){ const f=new Date(t.getFullYear(),t.getMonth()-1,1); const to=eod(new Date(t.getFullYear(),t.getMonth(),0)); return {from:f,to}; }
  const f=new Date(t.getFullYear(),0,1); const to=eod(new Date(t.getFullYear(),11,31)); return {from:f,to};
};

/* Portal Popover */
function Popover({ open, anchorRef, onClose, width, align="left", children }) {
  const [style, setStyle] = useState({top:0,left:0,width});
  useLayoutEffect(()=> {
    if(!open || !anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const w = width ?? r.width;
    setStyle({ top: Math.round(r.bottom+6), left: Math.round(align==="right"? r.right-w : r.left), width: w });
  },[open, anchorRef, width, align]);

  useEffect(()=> {
    if(!open) return;
    const a=(e)=>e.key==="Escape"&&onClose?.();
    const b=(e)=>{ const inA=anchorRef?.current?.contains(e.target); const inP=e.target.closest?.(".pop"); if(!inA && !inP) onClose?.(); };
    window.addEventListener("keydown",a); window.addEventListener("mousedown",b); window.addEventListener("scroll",onClose,true); window.addEventListener("resize",onClose);
    return ()=>{ window.removeEventListener("keydown",a); window.removeEventListener("mousedown",b); window.removeEventListener("scroll",onClose,true); window.removeEventListener("resize",onClose); };
  },[open,onClose,anchorRef]);

  if(!open) return null;
  return createPortal(<div className="pop" style={style}>{children}</div>, document.body);
}

/* Helpers for export */
function downloadBlob(name, mime, content){
  const blob = content instanceof Blob ? content : new Blob([content],{type:mime});
  const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function rowsToCSV(rows){
  const headers=["Invoice No.","Invoice Date","Due Date","Customer Name","Net Amount","Paid Amount","Due Amount","Status","Payment Status","Tax Amount","Created By","Location"];
  const esc=(v)=>`"${String(v??"").replace(/"/g,'""')}"`;
  const out=[headers.map(esc).join(",")];
  rows.forEach(r=> out.push([r.no,r.invDate,r.dueDate,r.customer,r.net.toFixed(2),r.paid.toFixed(2),r.due.toFixed(2),r.status,r.payStatus,r.tax.toFixed(2),r.createdBy,r.location].map(esc).join(",")));
  return out.join("\r\n");
}

/* Pagination numbers like 1 2 3 … 104 */
const buildPageList=(page,total)=> {
  const pages=[];
  const add=(p)=> pages.push(p);
  const show=(p)=> p>=1 && p<=total;
  add(1);
  const start=Math.max(2,page-2), end=Math.min(total-1,page+2);
  if(start>2) add("…");
  for(let p=start;p<=end;p++) add(p);
  if(end<total-1) add("…");
  if(total>1) add(total);
  return [...new Set(pages)];
};

export default function InvoicePage(){
  /* top breadcrumb + FY dropdown */
  const [year, setYear] = useState("Current Year");
  const [yearQuery, setYearQuery] = useState("");
  const yearBtnRef = useRef(null);
  const [openYear, setOpenYear] = useState(false);

  /* mini tabs (Paid / UnPaid) */
  const [tab, setTab] = useState("All"); // All | Paid | UnPaid

  /* toolbar menus */
  const [pageSize, setPageSize] = useState(10);
  const pageBtnRef = useRef(null);
  const [openPage, setOpenPage] = useState(false);

  const exportBtnRef = useRef(null);
  const [openExport, setOpenExport] = useState(false);

  /* filter bar fields */
  const [filterOpen, setFilterOpen] = useState(true);

  const [customerInput, setCustomerInput] = useState("");
  const [customerValue, setCustomerValue] = useState("");
  const custInputRef = useRef(null);
  const [openCust, setOpenCust] = useState(false);

  const [locOpen, setLocOpen] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const [locValues, setLocValues] = useState([]);
  const locBtnRef = useRef(null);

  const [status, setStatus] = useState("");
  const [pstatus, setPstatus] = useState("");

  const [query, setQuery] = useState("");

  /* expand + selection */
  const [expanded, setExpanded] = useState({});
  const [checked, setChecked] = useState({});

  const closeAll=()=>{ setOpenYear(false); setOpenExport(false); setOpenPage(false); setOpenCust(false); setLocOpen(false); };

  /* filtering like screenshots */
  const filteredRows = useMemo(()=> {
    let rows=[...ROWS];
    const {from,to}=rangeFor(year);
    rows=rows.filter(r=>{ const d=parseDMY(r.invDate); return d && d>=from && d<=to; });

    if(tab==="Paid") rows=rows.filter(r=>r.payStatus==="PAID");
    if(tab==="UnPaid") rows=rows.filter(r=>r.payStatus!=="PAID");

    if(customerValue) rows=rows.filter(r=> r.customer===customerValue);
    if(locValues.length) rows=rows.filter(r=> locValues.includes(r.location));
    if(status){
      const map={Invoiced:"INVOICED","Delivery Challan Created":"DELIVERY","Partial Delivery Challan Created":"PARTIAL_DC","Partially Cancelled":"PARTIAL_CANCEL",Cancelled:"CANCELLED"};
      rows=rows.filter(r=> map[status]? r.status===map[status] : true);
    }
    if(pstatus){
      const map={Due:"DUE","Over Due":"OVERDUE",Paid:"PAID"};
      rows=rows.filter(r=> r.payStatus===map[pstatus]);
    }
    const q=query.trim().toLowerCase();
    if(q) rows=rows.filter(r=> [r.no,r.customer,r.createdBy,r.location].some(v=>String(v).toLowerCase().includes(q)));
    return rows;
  },[year,tab,customerValue,locValues,status,pstatus,query]);

  /* pagination */
  const itemsPerPage = pageSize==="All" ? filteredRows.length : pageSize;
  const [page, setPage] = useState(1);
  useEffect(()=> setPage(1), [year,tab,customerValue,locValues,status,pstatus,query,pageSize]);
  const totalPages = Math.max(1, Math.ceil((filteredRows.length||1)/(itemsPerPage||1)));
  const pageRows = filteredRows.slice((page-1)*itemsPerPage, (page-1)*itemsPerPage + itemsPerPage);

  /* KPIs (display only) */
  const METRICS = [
    { title:"All", value:1038 },
    { title:"Invoiced", value:925 },
    { title:"Delivery Challan Created", value:0 },
    { title:"Partial Delivery Challan Created", value:0 },
    { title:"Partially Cancelled", value:0 },
    { title:"Cancelled", value:113 },
  ];
  const METRICS_BOTTOM = [
    { title:"Paid", value:0 },
    { title:"UnPaid", value:"1.46C" },
    { title:"Total Sales", value:"1.46C" },
  ];

  /* selection + bulk bar */
  const selectedCount = Object.values(checked).filter(Boolean).length;
  const allChecked = pageRows.length>0 && pageRows.every(r=> checked[r.no]);
  const someChecked = pageRows.some(r=> checked[r.no]);
  const toggleAll = (val)=> {
    const next={...checked}; pageRows.forEach(r=> next[r.no]=val); setChecked(next);
  };

  const totals = useMemo(()=> ({
    net: sum(pageRows,"net"),
    paid: sum(pageRows,"paid"),
    due: sum(pageRows,"due"),
    tax: sum(pageRows,"tax"),
  }),[pageRows]);

  const filterApplied = !!(customerValue || locValues.length || status || pstatus || query);

  /* export actions */
  const exportCurrentExcel = ()=> downloadBlob("invoices_page.csv","text/csv;charset=utf-8", rowsToCSV(pageRows));
  const exportAllExcel = ()=> downloadBlob("invoices_all.csv","text/csv;charset=utf-8", rowsToCSV(filteredRows));
  const exportPDF = ()=> {
    const lines = pageRows.map(r=> `${r.no}\t${r.invDate}\t${r.customer}\t₹${r.net.toFixed(2)}`);
    const content = `Invoices\n\n${lines.join("\n")}\n\nTotal: ₹${totals.net.toFixed(2)}`;
    downloadBlob("invoices.pdf","application/pdf",content);
  };

  return (
    <div className="inv-page" onClick={closeAll}>
      {/* Breadcrumb + FY dropdown on right */}
      <div className="inv-breadcrumb" onClick={(e)=>e.stopPropagation()}>
        <span className="mi">home</span>
        <span>Sales</span><span className="active">Invoice</span>

        <div className="year-wrap">
          <button ref={yearBtnRef} className="year-btn" onClick={()=>{ setOpenYear(v=>!v); setOpenExport(false); setOpenPage(false); }}>
            {year} <span className="mi">expand_more</span>
          </button>
          <Popover open={openYear} anchorRef={yearBtnRef} onClose={()=>setOpenYear(false)} width={220} align="right">
            <div className="menu-search"><input placeholder="Search…" value={yearQuery} onChange={(e)=>setYearQuery(e.target.value)} /></div>
            <div className="menu-list">
              {YEAR_RANGES.filter(y=>y.toLowerCase().includes(yearQuery.toLowerCase())).map(opt=>(
                <div key={opt} className={`menu-item ${opt===year?"sel":""}`} onClick={()=>{ setYear(opt); setOpenYear(false); }}>{opt}</div>
              ))}
            </div>
          </Popover>
        </div>
      </div>

      {/* KPI cards (top row + bottom trio) */}
      <div className="metrics">{METRICS.map(m=>(
        <div key={m.title} className="metric"><div className="metric-num">{m.value}</div><div className="metric-label">{m.title}</div></div>
      ))}</div>
      <div className="metrics metrics-bottom">{METRICS_BOTTOM.map((m,i)=>(
        <div key={m.title} className={`metric ${i===1?"highlight":""}`}><div className="metric-num">{m.value}</div><div className="metric-label">{m.title}</div></div>
      ))}</div>

      {/* Paid / UnPaid tabs (like screenshot) */}
      <div className="seg-tabs">
        {["All","Paid","UnPaid"].map(t=>(
          <button key={t} className={`seg ${tab===t?"on":""}`} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>

      {/* Toolbar row */}
      <div className="tbl-toolbar" onClick={(e)=>e.stopPropagation()}>
        {/* Download */}
        <div className="btn-dropdown">
          <button ref={exportBtnRef} className="icon-btn" title="Download" onClick={()=>{ setOpenExport(v=>!v); setOpenYear(false); setOpenPage(false); }}>
            <span className="mi">download</span>
          </button>
          <Popover open={openExport} anchorRef={exportBtnRef} onClose={()=>setOpenExport(false)} width={180} align="left">
            <div className="menu-list">
              <div className="menu-item" onClick={()=>{ exportCurrentExcel(); setOpenExport(false); }}><span className="mi">insert_drive_file</span> Excel</div>
              <div className="menu-item" onClick={()=>{ exportPDF(); setOpenExport(false); }}><span className="mi">picture_as_pdf</span> PDF</div>
              <div className="menu-item" onClick={()=>{ exportAllExcel(); setOpenExport(false); }}><span className="mi">table_view</span> All Excel</div>
            </div>
          </Popover>
        </div>

        {/* Rows per page */}
        <div className="btn-dropdown">
          <button ref={pageBtnRef} className="select-btn" onClick={()=>{ setOpenPage(v=>!v); setOpenExport(false); setOpenYear(false); }}>
            {pageSize} <span className="mi">expand_more</span>
          </button>
          <Popover open={openPage} anchorRef={pageBtnRef} onClose={()=>setOpenPage(false)} width={140} align="left">
            <div className="menu-list">
              {PAGE_SIZES.map(p=>(
                <div key={p} className={`menu-item ${String(p)===String(pageSize)?"sel":""}`} onClick={()=>{ setPageSize(p); setOpenPage(false); }}>{p}</div>
              ))}
            </div>
          </Popover>
        </div>

        {/* Filter toggle */}
        <button className={`filter-btn ${filterOpen||filterApplied?"active":""}`} onClick={()=>{ setFilterOpen(v=>!v); closeAll(); }}>
          <span className="mi">filter_alt</span> Filter
        </button>

        {/* Search box */}
        <div className="search-wrap">
          <input placeholder="Search List…" value={query} onChange={(e)=>setQuery(e.target.value)} />
          <span className="mi">search</span>
        </div>

        <button className="create-btn">Create New</button>
      </div>

      {/* Bulk selected bar (exact buttons) */}
      {selectedCount>0 && (
        <div className="bulk-bar all-selected">
          <label className={`chk ${allChecked?"on":""} ${!allChecked&&someChecked?"ind":""}`}>
            <input type="checkbox" checked={allChecked} onChange={(e)=>toggleAll(e.target.checked)} />
            <span />
          </label>
          <div className="bulk-text">Selected {selectedCount} Invoice:</div>
          <button className="btn highlight"><span className="mi">print</span> Print PDF</button>
          <button className="btn"><span className="mi">send</span> Send Email</button>
          <button className="btn danger"><span className="mi">delete</span> Delete</button>
        </div>
      )}

      {/* Filter bar */}
      {filterOpen && (
        <div className="filter-bar" onClick={(e)=>e.stopPropagation()}>
          <div className="field">
            <label>Select Customer</label>
            <div className="typeahead">
              <input
                ref={custInputRef}
                placeholder="Search Customer"
                value={customerInput || customerValue}
                onChange={(e)=>{ setCustomerValue(""); setCustomerInput(e.target.value); setOpenCust(true); }}
                onFocus={()=>setOpenCust(true)}
              />
              <button className="ta-caret" onClick={()=>setOpenCust(v=>!v)} tabIndex={-1}><span className="mi">expand_more</span></button>
              <Popover open={openCust} anchorRef={custInputRef} onClose={()=>setOpenCust(false)} align="left">
                <div className="menu-list">
                  {!customerInput || customerInput.trim().length<1 ? (
                    <div className="ta-empty">Please enter 1 or more characters</div>
                  ) : (
                    CUSTOMERS.filter(c=>c.toLowerCase().includes(customerInput.toLowerCase())).map(c=>(
                      <div key={c} className="menu-item" onClick={()=>{ setCustomerValue(c); setCustomerInput(""); setOpenCust(false); }}>{c}</div>
                    ))
                  )}
                </div>
              </Popover>
            </div>
          </div>

          <div className="field">
            <label>Location</label>
            <div ref={locBtnRef} className={`loc-select ${locOpen?"open":""}`} onClick={()=>setLocOpen(v=>!v)}>
              <span className="placeholder">
                {locValues.length ? `${locValues[0]}${locValues.length>1?` +${locValues.length-1}`:""}` : "Select Location"}
              </span>
              {locValues.length>0 && <span className="count-badge">{locValues.length}</span>}
              {locValues.length>0 && (
                <button className="clear-x" onClick={(e)=>{ e.stopPropagation(); setLocValues([]); setLocQuery(""); }} title="Clear">
                  <span className="mi">close</span>
                </button>
              )}
              <span className="mi caret">expand_more</span>
            </div>
            <Popover open={locOpen} anchorRef={locBtnRef} onClose={()=>setLocOpen(false)} align="left">
              <div className="menu-search"><input placeholder="Search location" value={locQuery} onChange={(e)=>setLocQuery(e.target.value)} /></div>
              <div className="menu-list">
                {LOCATIONS.filter(l=>l.toLowerCase().includes(locQuery.toLowerCase())).map(loc=>{
                  const isOn = locValues.includes(loc);
                  return (
                    <label key={loc} className="menu-item" style={{cursor:"pointer"}}>
                      <input type="checkbox" checked={isOn} onChange={()=>{
                        setLocValues(curr=> isOn ? curr.filter(v=>v!==loc) : [...curr, loc]);
                      }} />
                      <span>{loc}</span>
                    </label>
                  );
                })}
              </div>
            </Popover>
          </div>

          <div className="field">
            <label>Select Status</label>
            <select value={status} onChange={(e)=>setStatus(e.target.value)}>
              <option value="">Select Status</option>
              <option>Invoiced</option>
              <option>Delivery Challan Created</option>
              <option>Partial Delivery Challan Created</option>
              <option>Partially Cancelled</option>
              <option>Cancelled</option>
            </select>
          </div>

          <div className="field">
            <label>Select Payment Status</label>
            <select value={pstatus} onChange={(e)=>setPstatus(e.target.value)}>
              <option value="">Select payment Status</option>
              <option>Due</option>
              <option>Over Due</option>
              <option>Paid</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th className="w48">
                <label className={`chk ${allChecked?"on":""} ${!allChecked&&someChecked?"ind":""}`}>
                  <input type="checkbox" checked={allChecked} onChange={(e)=>toggleAll(e.target.checked)} />
                  <span />
                </label>
              </th>
              <th className="w32"></th>
              <th className="w40">#</th>
              <th>Invoice No.</th>
              <th>Invoice Date</th>
              <th>Due Date</th>
              <th>Customer Name</th>
              <th className="num">Net Amount</th>
              <th className="num">Paid Amount</th>
              <th className="num">Due Amount</th>
              <th>Status</th>
              <th>Payment Status</th>
              <th className="num">Tax Amount</th>
              <th>Feedback</th>
              <th>Created By</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, idx)=>(
              <React.Fragment key={r.no}>
                <tr className="data">
                  <td className="w48">
                    <label className={`chk ${checked[r.no]?"on":""}`}>
                      <input type="checkbox" checked={!!checked[r.no]} onChange={(e)=> setChecked(s=>({...s,[r.no]:e.target.checked}))} />
                      <span />
                    </label>
                  </td>
                  <td className="w32">
                    <button className={`circle ${expanded[r.no]?"minus":"plus"}`} onClick={()=> setExpanded(s=>({...s,[r.no]:!s[r.no]}))} />
                  </td>
                  <td className="w40">{(page-1)*itemsPerPage + idx + 1}</td>
                  <td>
                    <div className="strong link">{r.no}</div>
                    <div className="muted">{r.invDate}</div>
                  </td>
                  <td>{r.invDate}</td>
                  <td>{r.dueDate}</td>
                  <td className="nowrap">{r.customer}</td>
                  <td className="num strong">{money(r.net)}</td>
                  <td className="num">{money(r.paid)}</td>
                  <td className="num strong">{money(r.due)}</td>
                  <td><span className="badge green">{r.status}</span></td>
                  <td><span className="badge amber">{r.payStatus}</span></td>
                  <td className="num">{money(r.tax)}</td>
                  <td> - </td>
                  <td className="nowrap">{r.createdBy}</td>
                  <td className="nowrap">{r.location}</td>
                </tr>
                {expanded[r.no] && (
                  <tr className="actions-row">
                    <td></td><td></td><td></td>
                    <td colSpan={13}>
                      <div className="actions"><span>Actions:</span>
                        <span className="icon" title="Edit"><span className="mi">edit</span></span>
                        <span className="icon" title="Print"><span className="mi">print</span></span>
                        <span className="icon danger" title="Delete"><span className="mi">delete</span></span>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}

            <tr className="total-row">
              <td colSpan={7} className="right strong">Total</td>
              <td className="num strong">{money(totals.net)}</td>
              <td className="num strong">{money(totals.paid)}</td>
              <td className="num strong">{money(totals.due)}</td>
              <td colSpan={1}></td>
              <td className="num strong">{money(totals.tax)}</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pager exactly like screenshots (numbers + … + last) */}
      <div className="pager">
        <div className="muted">
          Showing {(page-1)*itemsPerPage + 1} to {Math.min(filteredRows.length, page*itemsPerPage)} of {filteredRows.length} entries
        </div>
        <div className="pages">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
          {buildPageList(page,totalPages).map((p,i)=> p==="…" ? (
            <span key={`e${i}`} className="ellipsis">…</span>
          ) : (
            <button key={p} className={p===page?"on":""} onClick={()=>setPage(p)}>{p}</button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
        </div>
      </div>
    </div>
  );
}
