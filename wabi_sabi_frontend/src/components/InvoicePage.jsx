import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/InvoicePage.css";

/* ───────────────── Demo data ───────────────── */
const YEAR_RANGES = ["Current Year","Last Month","This Month","Last Week","This Week","Today"];
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

const ROWS = [
  { no:"INV898", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands loot – Krishna Nagar –", net:4479.98, paid:0, due:4479.98, status:"INVOICED", payStatus:"DUE", tax:213.34, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV897", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands 4 less – Rajouri Garden – Inside –", net:14799.99, paid:0, due:14799.99, status:"INVOICED", payStatus:"DUE", tax:704.76, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV896", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brand4Less– Tilak Nagar –", net:15599.98, paid:0, due:15599.98, status:"INVOICED", payStatus:"DUE", tax:742.85, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV895", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands 4 less – Ansal Plaza –", net:12799.99, paid:0, due:12799.99, status:"INVOICED", payStatus:"DUE", tax:609.52, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV894", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands 4 less – Ansal Plaza –", net:2540.0, paid:0, due:2540.0, status:"INVOICED", payStatus:"DUE", tax:120.95, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV893", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brand4Less– Tilak Nagar –", net:2500.0, paid:0, due:2500.0, status:"INVOICED", payStatus:"DUE", tax:119.05, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV892", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands 4 less – Rajouri Garden – Inside –", net:13839.99, paid:0, due:13839.99, status:"INVOICED", payStatus:"DUE", tax:787.61, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV891", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brands 4 less – Rajouri Garden – Outside –", net:2460.0, paid:0, due:2460.0, status:"INVOICED", payStatus:"DUE", tax:117.14, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV890", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brand4Less– Tilak Nagar –", net:16039.99, paid:0, due:16039.99, status:"INVOICED", payStatus:"DUE", tax:956.66, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
  { no:"INV889", invDate:"06/10/2025", dueDate:"06/10/2025", customer:"Brand4Less– Tilak Nagar –", net:5500.01, paid:0, due:5500.01, status:"INVOICED", payStatus:"DUE", tax:261.90, createdBy:"WABI SABI SUSTAINABILITY LLP", location:"WABI SABI SUSTAINABILITY LLP" },
];

/* ───────── helpers ───────── */
const sum = (arr, key) => arr.reduce((a, r) => a + Number(r[key] || 0), 0);
const formatMoney = (n) => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n||0);

/* outside click hook */
function useOnClickOutside(ref, handler){
  useEffect(() => {
    const l = (e)=>{ if(!ref.current || ref.current.contains(e.target)) return; handler(); };
    document.addEventListener("mousedown", l);
    document.addEventListener("touchstart", l);
    return ()=>{ document.removeEventListener("mousedown", l); document.removeEventListener("touchstart", l); };
  }, [ref, handler]);
}

/* empty file download */
function downloadFile(filename, mime){
  const blob = new Blob([""], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export default function InvoicePage(){
  const [crumbs] = useState(["Sales","Invoice"]);

  /* header-year + toolbar menus */
  const [year, setYear] = useState("Current Year");
  const [yearMenu, setYearMenu] = useState(false);
  const [yearQuery, setYearQuery] = useState("");
  const yearRef = useRef(null); useOnClickOutside(yearRef, ()=>setYearMenu(false));

  const [pageSize, setPageSize] = useState(10);
  const [pageMenu, setPageMenu] = useState(false);
  const pageRef = useRef(null); useOnClickOutside(pageRef, ()=>setPageMenu(false));

  const [exportMenu, setExportMenu] = useState(false);
  const exportRef = useRef(null); useOnClickOutside(exportRef, ()=>setExportMenu(false));

  /* filter panel + fields */
  const [filterOpen, setFilterOpen] = useState(false);

  // Customer typeahead
  const [customerInput, setCustomerInput] = useState("");
  const [customerValue, setCustomerValue] = useState("");
  const [showCustList, setShowCustList] = useState(false);
  const custRef = useRef(null); useOnClickOutside(custRef, ()=>setShowCustList(false));

  // Location multiselect
  const [locOpen, setLocOpen] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const [locValues, setLocValues] = useState([]); // array of strings
  const locRef = useRef(null); useOnClickOutside(locRef, ()=>setLocOpen(false));

  // Status + Payment Status
  const [status, setStatus] = useState(""); // Invoiced / Delivery Challan Created / Partial Delivery Challan Created / Partially Cancelled / Cancelled
  const [pstatus, setPstatus] = useState(""); // Due / Over Due / Paid

  // Global search box from toolbar
  const [query, setQuery] = useState("");

  const [expanded, setExpanded] = useState({});
  const [checked, setChecked] = useState({});

  /* filter logic */
  const filteredRows = useMemo(() => {
    let rows = [...ROWS];

    // global search
    const q = query.trim().toLowerCase();
    if(q){
      rows = rows.filter(r =>
        [r.no,r.customer,r.createdBy,r.location].some(v => String(v).toLowerCase().includes(q))
      );
    }
    // customer equals (when selected from dropdown)
    if(customerValue){
      rows = rows.filter(r => r.customer === customerValue);
    }
    // location contains any of selected
    if(locValues.length){
      rows = rows.filter(r => locValues.includes(r.location));
    }
    // status equals (our demo rows only "INVOICED" so only that will match)
    if(status){
      // map dropdown text to row.status equivalents
      const map = {
        "Invoiced":"INVOICED",
        "Delivery Challan Created":"DELIVERY",
        "Partial Delivery Challan Created":"PARTIAL_DC",
        "Partially Cancelled":"PARTIAL_CANCEL",
        "Cancelled":"CANCELLED",
      };
      rows = rows.filter(r => (map[status] ? r.status === map[status] : true));
    }
    // payment status
    if(pstatus){
      const mapP = { "Due":"DUE", "Over Due":"OVERDUE", "Paid":"PAID" };
      rows = rows.filter(r => r.payStatus === mapP[pstatus]);
    }
    return rows;
  }, [query, customerValue, locValues, status, pstatus]);

  /* pagination */
  const itemsPerPage = pageSize === "All" ? filteredRows.length : pageSize;
  const [page, setPage] = useState(1);
  useEffect(()=>setPage(1), [query, customerValue, locValues, status, pstatus, pageSize]);
  const totalPages = Math.max(1, Math.ceil((filteredRows.length || 1) / (itemsPerPage || 1)));
  const pageRows = filteredRows.slice((page-1)*itemsPerPage, (page-1)*itemsPerPage + itemsPerPage);

  /* metrics (visual only) */
  const METRICS = [
    { title:"All", value:1001 },
    { title:"Invoiced", value:890 },
    { title:"Delivery Challan Created", value:0 },
    { title:"Partial Delivery Challan Created", value:0 },
    { title:"Partially Cancelled", value:0 },
    { title:"Cancelled", value:111 },
  ];
  const METRICS_BOTTOM = [
    { title:"Paid", value:0 },
    { title:"UnPaid", value:"1.49C" },
    { title:"Total Sales", value:"1.49C" },
  ];

  const allChecked = pageRows.every(r => checked[r.no]);
  const someChecked = pageRows.some(r => checked[r.no]);
  const toggleAll = (val) => {
    const next = {...checked};
    pageRows.forEach(r => next[r.no] = val);
    setChecked(next);
  };

  const totals = useMemo(()=>({
    net: sum(pageRows,"net"),
    paid: sum(pageRows,"paid"),
    due: sum(pageRows,"due"),
    tax: sum(pageRows,"tax"),
  }), [pageRows]);

  /* helpers for UI badges */
  const filterIsApplied = !!(customerValue || locValues.length || status || pstatus || query);

  return (
    <div className="inv-page">

      {/* Breadcrumb + Year on right */}
      <div className="inv-breadcrumb">
        <span className="mi">home</span>
        {crumbs.map((c,i)=>(
          <span key={c} className={i===crumbs.length-1 ? "active":""}>{c}</span>
        ))}

        <div className="year-wrap" ref={yearRef}>
          <button className="year-btn" onClick={()=>setYearMenu(v=>!v)}>
            {year} <span className="mi">expand_more</span>
          </button>
          {yearMenu && (
            <div className="menu year-menu">
              <div className="menu-search">
                <input placeholder="Search…" value={yearQuery} onChange={e=>setYearQuery(e.target.value)} />
              </div>
              <div className="menu-list">
                {YEAR_RANGES.filter(y=>y.toLowerCase().includes(yearQuery.toLowerCase())).map(opt=>(
                  <div key={opt} className={`menu-item ${opt===year?"sel":""}`} onClick={()=>{setYear(opt); setYearMenu(false);}}>
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="metrics">
        {METRICS.map(m=>(
          <div key={m.title} className="metric">
            <div className="metric-num">{m.value}</div>
            <div className="metric-label">{m.title}</div>
          </div>
        ))}
      </div>
      <div className="metrics metrics-bottom">
        {METRICS_BOTTOM.map((m,i)=>(
          <div key={m.title} className={`metric ${i===1?"highlight":""}`}>
            <div className="metric-num">{m.value}</div>
            <div className="metric-label">{m.title}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="tbl-toolbar">
        {/* Download */}
        <div className="btn-dropdown" ref={exportRef}>
          <button className="icon-btn" onClick={()=>setExportMenu(v=>!v)} title="Download"><span className="mi">download</span></button>
          {exportMenu && (
            <div className="menu export-menu">
              <div className="menu-item" onClick={()=>downloadFile("invoices.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}><span className="mi">insert_drive_file</span> Excel</div>
              <div className="menu-item" onClick={()=>downloadFile("invoices.pdf","application/pdf")}><span className="mi">picture_as_pdf</span> PDF</div>
            </div>
          )}
        </div>

        {/* Page size */}
        <div className="btn-dropdown" ref={pageRef}>
          <button className="select-btn" onClick={()=>setPageMenu(v=>!v)}>{pageSize} <span className="mi">expand_more</span></button>
          {pageMenu && (
            <div className="menu">
              {PAGE_SIZES.map(p=>(
                <div key={p} className={`menu-item ${String(p)===String(pageSize)?"sel":""}`} onClick={()=>{setPageSize(p); setPageMenu(false);}}>
                  {p}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter (black when open OR when any filter applied) */}
        <button className={`filter-btn ${filterOpen || filterIsApplied ? "active":""}`} onClick={()=>setFilterOpen(v=>!v)} title="Filter">
          <span className="mi">filter_alt</span> Filter
        </button>

        {/* Search */}
        <div className="search-wrap">
          <input placeholder="Search List…" value={query} onChange={e=>setQuery(e.target.value)} />
          <span className="mi">search</span>
        </div>

        <button className="create-btn">Create New</button>
      </div>

      {/* Filter strip EXACT like screenshots */}
      {filterOpen && (
        <div className="filter-bar">
          {/* Select Customer (typeahead) */}
          <div className="field" ref={custRef}>
            <label>Select Customer</label>
            <div className="typeahead">
              <input
                placeholder="Search Customer"
                value={customerInput || customerValue}
                onChange={(e)=>{ setCustomerValue(""); setCustomerInput(e.target.value); setShowCustList(true); }}
                onFocus={()=>setShowCustList(true)}
              />
              <button className="ta-caret"><span className="mi">expand_more</span></button>
              {showCustList && (
                <div className="ta-menu">
                  {(!customerInput || customerInput.trim().length<1) ? (
                    <div className="ta-empty">Please enter 1 or more characters</div>
                  ) : (
                    (CUSTOMERS.filter(c=>c.toLowerCase().includes(customerInput.toLowerCase())).map(c=>(
                      <div key={c} className="ta-item" onClick={()=>{ setCustomerValue(c); setCustomerInput(""); setShowCustList(false); }}>
                        {c}
                      </div>
                    )) || [])
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Location multiselect with checkbox list + badge + clear */}
          <div className="field" ref={locRef}>
            <label>Location</label>
            <div className={`loc-select ${locOpen?"open":""}`} onClick={()=>setLocOpen(true)}>
              <span className="placeholder">Select Location</span>
              {locValues.length>0 && <span className="count-badge">{locValues.length}</span>}
              {locValues.length>0 && (
                <button
                  className="clear-x"
                  onClick={(e)=>{ e.stopPropagation(); setLocValues([]); setLocQuery(""); }}
                  title="Clear"
                ><span className="mi">close</span></button>
              )}
              <span className="mi caret">expand_more</span>
            </div>
            {locOpen && (
              <div className="menu loc-menu" onClick={(e)=>e.stopPropagation()}>
                <div className="menu-search">
                  <input placeholder="" value={locQuery} onChange={(e)=>setLocQuery(e.target.value)} />
                </div>
                <div className="menu-list">
                  {LOCATIONS.filter(l=>l.toLowerCase().includes(locQuery.toLowerCase())).map(loc=>(
                    <label key={loc} className="loc-item">
                      <input
                        type="checkbox"
                        checked={locValues.includes(loc)}
                        onChange={(e)=>{
                          const on = e.target.checked;
                          setLocValues(prev => on ? [...prev, loc] : prev.filter(x=>x!==loc));
                        }}
                      />
                      <span>{loc}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Select Status */}
          <div className="field">
            <label>Select Status</label>
            <div className="simple-select">
              <select value={status} onChange={e=>setStatus(e.target.value)}>
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

          {/* Select Payment Status */}
          <div className="field">
            <label>Select Payment Status</label>
            <div className="simple-select">
              <select value={pstatus} onChange={e=>setPstatus(e.target.value)}>
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

      {/* Bulk action bar */}
      {someChecked && (
        <div className="bulk-bar">
          <span>Selected {Object.values(checked).filter(Boolean).length} Invoice</span>
          <button className="btn"><span className="mi">print</span> Print PDF</button>
          <button className="btn"><span className="mi">send</span> Send Email</button>
          <button className="btn danger"><span className="mi">delete</span> Delete</button>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th className="w40">
                <label className={`chk ${allChecked?"on":""} ${someChecked&&!allChecked?"ind":""}`}>
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
            {pageRows.map((r,i)=>{
              const isOpen = !!expanded[r.no];
              const isChecked = !!checked[r.no];
              return (
                <React.Fragment key={r.no}>
                  <tr className="data">
                    <td className="w40">
                      <label className={`chk ${isChecked?"on":""}`}>
                        <input type="checkbox" checked={isChecked} onChange={(e)=>setChecked({...checked,[r.no]:e.target.checked})}/>
                        <span />
                      </label>
                    </td>
                    <td className="w40">
                      <button className={`circle ${isOpen?"minus":"plus"}`} onClick={()=>setExpanded({...expanded,[r.no]:!isOpen})} title={isOpen?"Collapse":"Expand"} />
                    </td>
                    <td className="link">{r.no}</td>
                    <td>{r.invDate}</td>
                    <td>{r.dueDate}</td>
                    <td className="link">{r.customer}</td>
                    <td className="num">{r.net.toFixed(2)}</td>
                    <td className="num">{r.paid.toFixed(2)}</td>
                    <td className="num">{r.due.toFixed(2)}</td>
                    <td><span className="badge green">{r.status}</span></td>
                    <td><span className="badge amber">{r.payStatus}</span></td>
                    <td className="num">{r.tax.toFixed(2)}</td>
                    <td className="muted">-</td>
                    <td>{r.createdBy}</td>
                    <td>{r.location}</td>
                  </tr>

                  {isOpen && (
                    <tr className="actions-row">
                      <td />
                      <td colSpan={14}>
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
              <td colSpan={6} className="right strong">Total</td>
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
          {Array.from({length: Math.min(totalPages,6)}).map((_,i)=>{
            const n=i+1;
            return <button key={n} className={page===n?"on":""} onClick={()=>setPage(n)}>{n}</button>
          })}
          {totalPages>6 && <button className="muted">…</button>}
          <button disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}><span className="mi">chevron_right</span></button>
        </div>
      </div>
    </div>
  );
}
