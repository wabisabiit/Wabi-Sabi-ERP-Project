// src/components/InvoicePage.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "../styles/InvoicePage.css";

import { buildInvoiceDetail } from "../data/invoices"; // only for building customer context
import { listMasterPacks } from "../api/client";

/* ───────────────── Demo/settings ───────────────── */
const YEAR_RANGES = ["Current Year","Last Month","This Month","Last Week","This Week","Today","2025–2026"];
const PAGE_SIZES = [10, 25, 50, 100, 200, 500, "All"];

const sum = (arr, key) => arr.reduce((a, r) => a + Number(r[key] || 0), 0);
const formatMoney = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
const shortINR = (n = 0) => {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${(n / 1e7).toFixed(2)}C`;
  if (abs >= 1e5) return `${(n / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return Math.round(n).toString();
};

// Date helpers (DD/MM/YYYY)
const parseDMY = (s) => { if (!s) return null; const [dd, mm, yyyy] = s.split("/").map(Number); return new Date(yyyy, (mm || 1) - 1, dd || 1); };
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay   = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

// FY / ranges
const rangeFor = (label) => {
  if (!label) return null;
  const fy = /^(\d{4})\s*[–-]\s*(\d{4})$/.exec(label);
  if (fy) { const y1 = Number(fy[1]); const from = new Date(y1, 3, 1); const to = endOfDay(new Date(y1 + 1, 2, 31)); return { from, to }; }
  const today = startOfDay(new Date());
  if (label === "Today") return { from: today, to: endOfDay(today) };
  if (label === "This Week") { const day = today.getDay(); const monOffset = day === 0 ? -6 : 1 - day; const from = startOfDay(new Date(today)); from.setDate(from.getDate() + monOffset); const to = endOfDay(new Date(from)); to.setDate(to.getDate() + 6); return { from, to }; }
  if (label === "Last Week") { const { from: thisMon } = rangeFor("This Week"); const from = new Date(thisMon); from.setDate(from.getDate() - 7); const to = endOfDay(new Date(from)); to.setDate(to.getDate() + 6); return { from, to }; }
  if (label === "This Month") { const from = new Date(today.getFullYear(), today.getMonth(), 1); const to = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)); return { from, to }; }
  if (label === "Last Month") { const from = new Date(today.getFullYear(), today.getMonth() - 1, 1); const to = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0)); return { from, to }; }
  const from = new Date(today.getFullYear(), 0, 1); const to = endOfDay(new Date(today.getFullYear(), 11, 31)); return { from, to };
};

/* Popover */
function Popover({ open, anchorRef, onClose, width, align="left", children }) {
  const [style, setStyle] = useState({ top:0, left:0, width:width||undefined });
  useLayoutEffect(() => {
    if(!open || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const popW = width || rect.width;
    const left = align==="right" ? rect.right - popW : rect.left;
    const top = rect.bottom + 6;
    setStyle({ top:Math.round(top), left:Math.round(left), width:Math.round(popW) });
  }, [open, anchorRef, width, align]);
  useEffect(() => {
    if(!open) return;
    const onEsc = (e)=>e.key==="Escape" && onClose?.();
    const onAway=(e)=>{ const inAnchor=anchorRef?.current?.contains(e.target); const inPop=(e.target.closest && e.target.closest(".pop"))!=null; if(!inAnchor && !inPop) onClose?.(); };
    window.addEventListener("keydown", onEsc);
    window.addEventListener("mousedown", onAway);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return ()=>{ window.removeEventListener("keydown", onEsc); window.removeEventListener("mousedown", onAway); window.removeEventListener("resize", onClose); window.removeEventListener("scroll", onClose, true); };
  }, [open, onClose, anchorRef]);
  if(!open) return null;
  return createPortal(<div className="pop" style={style} role="dialog" aria-modal="true">{children}</div>, document.body);
}

/* download helpers */
function downloadBlob(name, mime, content) {
  const blob = content instanceof Blob ? content : new Blob([content],{type:mime});
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function rowsToCSV(rows){
  const headers=["Invoice No.","Invoice Date","Due Date","Customer Name","Net Amount","Paid Amount","Due Amount","Status","Payment Status","Tax Amount","Created By","Location"];
  const esc=(v)=>`"${String(v??"").replace(/"/g,'""')}"`;
  const lines=[headers.map(esc).join(",")];
  rows.forEach(r=>lines.push([r.no,r.invDate,r.dueDate,r.customer,r.net.toFixed(2),r.paid.toFixed(2),r.due.toFixed(2),r.status,r.payStatus,r.tax.toFixed(2),r.createdBy,r.location].map(esc).join(",")));
  return lines.join("\r\n");
}

export default function InvoicePage(){
  const navigate = useNavigate();

  /* ⬇️ Live rows from backend */
  const [ROWS, setROWS] = useState([]);

  /* Fetch MasterPack list and map to grid shape */
  useEffect(() => {
    const toDMY = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    };

    listMasterPacks()
      .then(list => {
        const mapped = (list || []).map(p => {
          const invNo = p.number || "";
          const invDate = p.created_at ? toDMY(p.created_at) : "";
          const dueDate = invDate; // as requested: same as DB date for now
          const net = Number(p.amount_total || 0);
          return {
            no: invNo,                                   // Invoice No.
            invDate,                                     // Invoice Date
            dueDate,                                     // Due Date
            customer: p.location?.name || p.location?.code || "", // customer shown as location
            net,                                         // Net Amount (DB)
            paid: 0,                                     // Paid (default 0)
            due: net,                                    // Due = net (requested)
            status: "INVOICED",
            payStatus: "DUE",
            tax: 0,                                      // leave for now
            createdBy: "WABI SABI LLP",
            location: p.location?.code || p.location?.name || "",
          };
        });
        setROWS(mapped);
      })
      .catch(() => setROWS([]));
  }, []);

  /* ⬇️ customers & locations derived from live data */
  const ALL_CUSTOMERS = useMemo(() => [...new Set(ROWS.map(r => r.customer))], [ROWS]);
  const ALL_LOCATIONS = useMemo(() => [...new Set(ROWS.map(r => r.location))], [ROWS]);

  const [year,setYear]=useState("Current Year");
  const [yearQuery,setYearQuery]=useState("");
  const yearBtnRef=useRef(null); const [openYear,setOpenYear]=useState(false);

  const [pageSize,setPageSize]=useState(10);
  const pageBtnRef=useRef(null); const [openPage,setOpenPage]=useState(false);

  const exportBtnRef=useRef(null); const [openExport,setOpenExport]=useState(false);

  const [filterOpen,setFilterOpen]=useState(false);

  const [customerInput,setCustomerInput]=useState(""); const [customerValue,setCustomerValue]=useState("");
  const custInputRef=useRef(null); const [openCust,setOpenCust]=useState(false);

  const [locOpen,setLocOpen]=useState(false); const [locQuery,setLocQuery]=useState("");
  const [locValues,setLocValues]=useState([]); const locBtnRef=useRef(null);

  const [status,setStatus]=useState(""); const [pstatus,setPstatus]=useState("");
  const [query,setQuery]=useState("");

  const [expanded,setExpanded]=useState({}); const [checked,setChecked]=useState({});

  /* filtering */
  const filteredRows = useMemo(()=>{
    let rows=[...ROWS];
    const r = rangeFor(year);
    if (r?.from && r?.to) {
      rows = rows.filter(one => {
        const d = parseDMY(one.invDate);
        return d && d >= r.from && d <= r.to;
      });
    }
    const q=query.trim().toLowerCase();
    if(q) rows=rows.filter(r=>[r.no,r.customer,r.createdBy,r.location].some(v=>String(v).toLowerCase().includes(q)));
    if(customerValue) rows=rows.filter(r=>r.customer===customerValue);
    if(locValues.length) rows=rows.filter(r=>locValues.includes(r.location));
    if(status){
      const map={ Invoiced:"INVOICED", "Delivery Challan Created":"DELIVERY","Partial Delivery Challan Created":"PARTIAL_DC","Partially Cancelled":"PARTIAL_CANCEL", Cancelled:"CANCELLED" };
      rows=rows.filter(r=> map[status] ? r.status===map[status] : true);
    }
    if(pstatus){
      const mapP={ "Due":"DUE", "Over Due":"OVERDUE", "Paid":"PAID" };
      rows=rows.filter(r=> r.payStatus===mapP[pstatus]);
    }
    return rows;
  },[year,query,customerValue,locValues,status,pstatus,ROWS]);

  /* pagination */
  const itemsPerPage = pageSize==="All" ? filteredRows.length : pageSize;
  const [page,setPage]=useState(1);
  useEffect(()=>setPage(1),[year,query,customerValue,locValues,status,pstatus,pageSize,ROWS]);
  const totalPages = Math.max(1, Math.ceil((filteredRows.length||1)/(itemsPerPage||1)));
  const pageRows = filteredRows.slice((page-1)*itemsPerPage, (page-1)*itemsPerPage + itemsPerPage);

  /* bulk select */
  const allChecked = pageRows.length>0 && pageRows.every(r=>checked[r.no]);
  const someChecked = pageRows.some(r=>checked[r.no]);
  const toggleAll = (val)=>{ const next={...checked}; pageRows.forEach(r=>next[r.no]=val); setChecked(next); };

  /* totals */
  const totals = useMemo(()=>({ net:sum(pageRows,"net"), paid:sum(pageRows,"paid"), due:sum(pageRows,"due"), tax:sum(pageRows,"tax") }),[pageRows]);

  const filterIsApplied = !!(customerValue || locValues.length || status || pstatus || query);

  const exportCurrentExcel=()=>{ const csv=rowsToCSV(pageRows); downloadBlob("invoices_page.csv","text/csv;charset=utf-8",csv); };
  const exportAllExcel=()=>{ const csv=rowsToCSV(filteredRows); downloadBlob("invoices_all.csv","text/csv;charset=utf-8",csv); };
  const exportPDF=()=>{ const lines=pageRows.map(r=>`${r.no}\t${r.invDate}\t${r.customer}\t₹${r.net.toFixed(2)}`); const content=`Invoices\n\n${lines.join("\n")}\n\nTotal: ₹${totals.net.toFixed(2)}`; downloadBlob("invoices.pdf","application/pdf",content); };

  const closeAll=()=>{ setOpenYear(false); setOpenExport(false); setOpenPage(false); setOpenCust(false); setLocOpen(false); };

  /* metrics (filtered) */
  const mAll = filteredRows.length;                  // number of invoices
  const mInvoiced = filteredRows.filter(r => r.status === "INVOICED").length;
  const mCancelled = filteredRows.filter(r => r.status === "CANCELLED").length;
  const mPaid = sum(filteredRows, "paid");           // paid total (0 for now)
  const mUnPaid = sum(filteredRows, "due");          // equals total invoice amount as requested
  const mTotalSales = sum(filteredRows, "net");      // total sales = sum of net

  /* customer name click -> CustomerDetail with invoice context */
  const handleOpenCustomer = (row) => {
    try {
      const built = buildInvoiceDetail(row);
      const slug = encodeURIComponent(built.party.slug || built.party.name || row.customer || "customer");
      navigate(`/customer/${slug}?inv=${encodeURIComponent(built.meta.invoiceNo)}`, {
        state: { fromInvoice: built },
      });
    } catch {
      const slug = encodeURIComponent(row.customer || "customer");
      navigate(`/customer/${slug}?inv=${encodeURIComponent(row.no)}`);
    }
  };

  return (
    <div className="inv-page" onClick={closeAll}>
      {/* Breadcrumb + FY selector */}
      <div className="inv-breadcrumb" onClick={(e)=>e.stopPropagation()}>
        <span className="mi">home</span><span className="active">Invoice</span>
        <div className="year-wrap">
          <button
            ref={yearBtnRef}
            className="year-btn"
            onClick={(e)=>{e.stopPropagation(); setOpenYear(v=>!v); setOpenExport(false); setOpenPage(false);}}
          >
            {year} <span className="mi">expand_more</span>
          </button>
          <Popover open={openYear} anchorRef={yearBtnRef} onClose={()=>setOpenYear(false)} align="right">
            <div className="menu-search"><input placeholder="Search…" value={yearQuery} onChange={(e)=>setYearQuery(e.target.value)} /></div>
            <div className="menu-list">
              {YEAR_RANGES.filter(y=>y.toLowerCase().includes(yearQuery.toLowerCase())).map(opt=>(
                <div key={opt} className={`menu-item ${opt===year ? "sel":""}`} onClick={()=>{ setYear(opt); setOpenYear(false); }}>{opt}</div>
              ))}
            </div>
          </Popover>
        </div>
      </div>

      {/* METRICS */}
      <div className="metrics">
        <div className="metric"><div className="met-pill">{mAll}</div><div className="metric-label">All</div></div>
        <div className="metric"><div className="met-pill">{mInvoiced}</div><div className="metric-label">Invoiced</div></div>
        <div className="metric"><div className="met-pill">0</div><div className="metric-label">Delivery Challan Created</div></div>
        <div className="metric"><div className="met-pill">0</div><div className="metric-label">Partial Delivery Challan Created</div></div>
        <div className="metric"><div className="met-pill">0</div><div className="metric-label">Partially Cancelled</div></div>
        <div className="metric"><div className="met-pill">{mCancelled}</div><div className="metric-label">Cancelled</div></div>
        <div className="metric"><div className="met-pill">{shortINR(mTotalSales)}</div><div className="metric-label">Total Sales</div></div>
      </div>

      <div className="metrics metrics-bottom">
        <div className="metric"><div className="met-pill">{shortINR(mPaid)}</div><div className="metric-label">Paid</div></div>
        <div className="metric"><div className="met-pill on">{shortINR(mUnPaid)}</div><div className="metric-label">UnPaid</div></div>
      </div>

      {/* Toolbar */}
      <div className="tbl-toolbar" onClick={(e)=>e.stopPropagation()}>
        <div className="btn-dropdown">
          <button ref={exportBtnRef} className="icon-btn" onClick={()=>{setOpenExport(v=>!v); setOpenYear(false); setOpenPage(false);}} title="Download">
            <span className="mi">download</span>
          </button>
          <Popover open={openExport} anchorRef={exportBtnRef} onClose={()=>setOpenExport(false)} width={200} align="left">
            <div className="menu-list">
              <div className="menu-item" onClick={()=>{exportCurrentExcel(); setOpenExport(false);}}><span className="mi">insert_drive_file</span> Excel</div>
              <div className="menu-item" onClick={()=>{exportPDF(); setOpenExport(false);}}><span className="mi">picture_as_pdf</span> PDF</div>
              <div className="menu-item" onClick={()=>{exportAllExcel(); setOpenExport(false);}}><span className="mi">table_view</span> All Excel</div>
            </div>
          </Popover>
        </div>

        <div className="btn-dropdown">
          <button ref={pageBtnRef} className="select-btn" onClick={()=>{setOpenPage(v=>!v); setOpenYear(false); setOpenExport(false);}} title="Rows per page">
            {pageSize} <span className="mi">expand_more</span>
          </button>
          <Popover open={openPage} anchorRef={pageBtnRef} onClose={()=>setOpenPage(false)} align="left">
            <div className="menu-list">
              {PAGE_SIZES.map(p=>(
                <div key={p} className={`menu-item ${String(p)===String(pageSize) ? "sel":""}`} onClick={()=>{setPageSize(p); setOpenPage(false);}}>{p}</div>
              ))}
            </div>
          </Popover>
        </div>

        <button className={`filter-btn ${filterOpen || filterIsApplied ? "active":""}`} onClick={()=>{setFilterOpen(v=>!v); closeAll();}} title="Filter">
          <span className="mi">filter_alt</span> Filter
        </button>

        <div className="search-wrap">
          <input placeholder="Search List…" value={query} onChange={(e)=>setQuery(e.target.value)} />
          <span className="mi">search</span>
        </div>

        <button className="create-btn" onClick={() => navigate("/sales/invoice/new")}>Create New</button>
      </div>

      {/* Filter strip */}
      {filterOpen && (
        <div className="filter-bar" onClick={(e)=>e.stopPropagation()}>
          {/* 1. Customer (Typeahead) */}
          <div className="flt">
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
                    ALL_CUSTOMERS.filter(c=>c.toLowerCase().includes(customerInput.toLowerCase())).map(c=>(
                      <div key={c} className="menu-item" onClick={()=>{ setCustomerValue(c); setCustomerInput(""); setOpenCust(false); }}>{c}</div>
                    ))
                  )}
                </div>
              </Popover>
            </div>
          </div>

          {/* 2. Location (Multi) */}
          <div className="flt">
            <label>Location</label>
            <div ref={locBtnRef} className={`loc-select ${locOpen ? "open":""}`} onClick={()=>setLocOpen(v=>!v)}>
              <span className="placeholder">
                {locValues.length ? `${locValues[0]}${locValues.length>1 ? ` +${locValues.length-1}`:""}` : "Select Location"}
              </span>
              {locValues.length>0 && <span className="count-badge">{locValues.length}</span>}
              {locValues.length>0 && <button className="clear-x" onClick={(e)=>{e.stopPropagation(); setLocValues([]); setLocQuery("");}} title="Clear"><span className="mi">close</span></button>}
              <span className="mi caret">expand_more</span>
            </div>

            <Popover open={locOpen} anchorRef={locBtnRef} onClose={()=>setLocOpen(false)} align="left">
              <div className="menu-search"><input placeholder="Search location" value={locQuery} onChange={(e)=>setLocQuery(e.target.value)} /></div>
              <div className="menu-list">
                {ALL_LOCATIONS.filter(l=>l.toLowerCase().includes(locQuery.toLowerCase())).map(loc=>{
                  const on = locValues.includes(loc);
                  return (
                    <label key={loc} className="menu-item" style={{cursor:"pointer"}}>
                      <input type="checkbox" checked={on} onChange={(e)=>{ const v=e.target.checked; setLocValues(prev=> v ? [...prev, loc] : prev.filter(x=>x!==loc)); }} style={{marginRight:8}} />
                      <span>{loc}</span>
                    </label>
                  );
                })}
              </div>
            </Popover>
          </div>

          {/* 3. Status */}
          <div className="flt">
            <label>Select Status</label>
            <div className="simple-select">
              <select value={status} onChange={(e)=>setStatus(e.target.value)}>
                <option value="">Select Status</option>
                <option>Invoiced</option>
                <option>Delivery Challan Created</option>
                <option>Partial Delivery Challan Created</option>
                <option>Partially Cancelled</option>
                <option>Cancelled</option>
              </select>
              <span className="mi">expand_more</span>
            </div>
          </div>

          {/* 4. Payment Status */}
          <div className="flt">
            <label>Select Payment Status</label>
            <div className="simple-select">
              <select value={pstatus} onChange={(e)=>setPstatus(e.target.value)}>
                <option value="">Select payment Status</option>
                <option>Due</option>
                <option>Over Due</option>
                <option>Paid</option>
              </select>
              <span className="mi">expand_more</span>
            </div>
          </div>
        </div>
      )}

      {/* Bulk bar */}
      {someChecked && (
        <div className="bulk-bar" onClick={(e)=>e.stopPropagation()}>
          <span className="bulk-text">Selected {Object.values(checked).filter(Boolean).length} Invoice</span>
          <button className="btn"><span className="mi">print</span> Print PDF</button>
          <button className="btn"><span className="mi">send</span> Send Email</button>
          <button className="btn danger"><span className="mi">delete</span> Delete</button>
        </div>
      )}

      {/* ====== TABLE ====== */}
      <div className="table-wrap" onClick={closeAll}>
        <table className="grid">
          <colgroup>
            <col className="c-exp" />
            <col className="c-check" />
            <col className="c-idx" />
            <col className="c-invno" />
            <col className="c-date" />
            <col className="c-date" />
            <col className="c-customer" />
            <col className="c-amt" />
            <col className="c-amt" />
            <col className="c-amt" />
            <col className="c-badge" />
            <col className="c-badge" />
            <col className="c-amt" />
            <col className="c-fb" />
            <col className="c-created" />
            <col className="c-loc" />
          </colgroup>

          <thead>
            <tr>
              <th />
              <th className="w40">
                <label className={`chk ${allChecked ? "on":""} ${someChecked && !allChecked ? "ind":""}`}>
                  <input type="checkbox" checked={allChecked} onChange={(e)=>toggleAll(e.target.checked)} />
                  <span />
                </label>
              </th>
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
            {pageRows.length === 0 && (
              <tr>
                <td className="muted" colSpan={16} style={{ textAlign: "center" }}>
                  No invoices found for the selected range.
                </td>
              </tr>
            )}

            {pageRows.map((r, idx) => {
              const isOpen = !!expanded[r.no];
              const isChecked = !!checked[r.no];
              const sr = (page - 1) * (itemsPerPage || 1) + idx + 1;

              return (
                <React.Fragment key={r.no}>
                  <tr className="data">
                    <td className="w34">
                      <button
                        className={`circle ${isOpen ? "minus" : "plus"}`}
                        onClick={() => setExpanded({ ...expanded, [r.no]: !isOpen })}
                        title={isOpen ? "Collapse" : "Expand"}
                      />
                    </td>

                    <td className="w40">
                      <label className={`chk ${isChecked ? "on":""}`}>
                        <input type="checkbox" checked={isChecked} onChange={(e)=>setChecked({ ...checked, [r.no]: e.target.checked })} />
                        <span />
                      </label>
                    </td>

                    <td className="w40">{sr}</td>

                    {/* Clickable Invoice No. -> Detail page */}
                    <td
                      className="link"
                      onClick={() => navigate(`/sales/invoice/${r.no}`)}
                      title="Open Invoice"
                      style={{ cursor: "pointer" }}
                    >
                      {r.no}
                    </td>

                    <td>{r.invDate}</td>
                    <td>{r.dueDate}</td>

                    {/* Customer name -> Customer Detail with context */}
                    <td
                      className="link"
                      onClick={() => handleOpenCustomer(r)}
                      title="Open Customer"
                      style={{ cursor: "pointer" }}
                    >
                      {r.customer}
                    </td>

                    <td className="num">{r.net.toFixed(2)}</td>
                    <td className="num">{r.paid.toFixed(2)}</td>
                    <td className="num">{r.due.toFixed(2)}</td>
                    <td><span className="badge green">{r.status}</span></td>
                    <td><span className="badge amber">{r.payStatus}</span></td>
                    <td className="num">{r.tax.toFixed(2)}</td>
                    <td className="muted">-</td>
                    <td className="clip">{r.createdBy}</td>
                    <td className="clip">{r.location}</td>
                  </tr>

                  {isOpen && (
                    <tr className="actions-row">
                      <td />
                      <td colSpan={15}>
                        <div className="actions">
                          <span>Actions:</span>
                          <button className="icon" title="Edit"><span className="mi">edit</span></button>
                          <button className="icon" title="Copy"><span className="mi">content_copy</span></button>
                          <button className="icon" title="Print"><span className="mi">print</span></button>
                          <button className="icon danger" title="Delete"><span className="mi">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="total-row">
              <td colSpan={7} className="right strong">Total</td>
              <td className="num strong">{formatMoney(totals.net).replace("₹","")}</td>
              <td className="num strong">{formatMoney(totals.paid).replace("₹","")}</td>
              <td className="num strong">{formatMoney(totals.due).replace("₹","")}</td>
              <td />
              <td />
              <td className="num strong">{totals.tax.toFixed(2)}</td>
              <td />
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      <div className="pager">
        <div className="muted">Showing {pageRows.length} of {filteredRows.length} entries</div>
        <div className="pages">
          <button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}><span className="mi">chevron_left</span></button>
          {Array.from({length:Math.min(totalPages,6)}).map((_,i)=>{ const n=i+1; return <button key={n} className={page===n ? "on":""} onClick={()=>setPage(n)}>{n}</button>; })}
          {totalPages>6 && <button className="muted" disabled>…</button>}
          <button disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}><span className="mi">chevron_right</span></button>
        </div>
      </div>
    </div>
  );
}
