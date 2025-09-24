import React, { useMemo, useRef, useState, useEffect } from "react";
import "../styles/BankTransactionPage.css";

/* ---------------- Demo rows (unchanged) ---------------- */
const ROWS = [
  { id:1, voucher:"TRNS18", date:"15/09/2025", from:"Cash - Brands 4 less - IFFCO Chowk", to:"Cash", amount:23500, by:"abhi", location:"Brands4Less-Iffco Chock" },
  { id:2, voucher:"TRNS17", date:"12/09/2025", from:"Cash - Brands 4 less - IFFCO Chowk", to:"Cash", amount:8615,  by:"abhi", location:"Brands4Less-Iffco Chock" },
  { id:3, voucher:"TRNS16", date:"11/09/2025", from:"Cash - Brands 4 less - IFFCO Chowk", to:"Cash", amount:3615,  by:"abhi", location:"Brands4Less - M3M Urbana" },
  { id:4, voucher:"TRNS15", date:"10/09/2025", from:"Cash - Brands 4 less - IFFCO Chowk", to:"Cash", amount:11563, by:"abhi", location:"Brands4Less - Tilak Nagar" },
  { id:5, voucher:"TRNS14", date:"08/09/2025", from:"Cash - Brands 4 less - IFFCO Chowk", to:"Cash", amount:28000, by:"abhi", location:"Brands4Less-Rajori Garden inside (RJR)" },
  { id:6, voucher:"TRNS13", date:"05/09/2025", from:"Cash - Brands 4 less - IFFCO Chowk", to:"Cash", amount:20000, by:"abhi", location:"Rajori Garden outside (RJO)" },
  { id:7, voucher:"TRNS12", date:"29/08/2025", from:"Cash - Brands 4 less - IFFCO Chowk", to:"Cash", amount:25000, by:"abhi", location:"Brands4Less-Krishna Nagar" },
  { id:8, voucher:"TRNS1",  date:"26/08/2025", from:"Cash - Brands 4 less - M3M Urbana", to:"Cash", amount:25000, by:"M3M", location:"Brands4Less - M3M Urbana" },
  { id:9, voucher:"TRNS11", date:"23/08/2025", from:"Cash - Brands 4 less - IFFCO Chowk", to:"Cash", amount:25000, by:"abhi", location:"Brands4Less-UP-AP" },
  { id:10,voucher:"TRNS10", date:"20/08/2025", from:"Cash - Brands 4 less - IFFCO Chowk", to:"Cash", amount:40000, by:"abhi", location:"Brands4Less-Udhyog Vihar" },
  ...Array.from({length:9}).map((_,i)=>({
    id:11+i, voucher:`TRNS0${9-i}`, date:"18/08/2025",
    from:"Cash - Brands 4 less - IFFCO Chowk", to:"Cash",
    amount:12000+i*321, by:i%2?"abhi":"M3M",
    location:[
      "Brands4Less - Tilak Nagar",
      "Brands4Less - M3M Urbana",
      "Brands4Less-Rajori Garden inside (RJR)",
      "Rajori Garden outside (RJO)",
      "Brands4Less-Iffco Chock",
      "Brands4Less-Krishna Nagar",
      "Brands4Less-UP-AP",
      "Brands4Less-Udhyog Vihar",
    ][i%8]
  }))
];

/* ---------------- Constants: locations for filter ---------------- */
const LOCATIONS = [
  "Brands4Less - Tilak Nagar",
  "Brands4Less - M3M Urbana",
  "Brands4Less-Rajori Garden inside (RJR)",
  "Rajori Garden outside (RJO)",
  "Brands4Less-Iffco Chock",
  "Brands4Less-Krishna Nagar",
  "Brands4Less-UP-AP",
  "Brands4Less-Udhyog Vihar",
];

/* ---------------- Helpers ---------------- */
const nf = new Intl.NumberFormat("en-IN",{ maximumFractionDigits:0 });
const qcsv = (s)=>`"${String(s).replace(/"/g,'""')}"`;
const toIso = (ddmmyyyy)=>{ if(!ddmmyyyy) return ""; const [d,m,y]=ddmmyyyy.split("/"); return `${y}-${m}-${d}`; };
function useOutside(ref, cb){
  useEffect(()=>{
    const h=(e)=>{ if(ref.current && !ref.current.contains(e.target)) cb?.(); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[ref,cb]);
}

/* ---------------- Location Multi-Select (checkbox + search) ---------------- */
function LocationSelect({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);
  useOutside(wrapRef, ()=>setOpen(false));

  const filtered = useMemo(()=>{
    const k = q.trim().toLowerCase();
    return LOCATIONS.filter(o => o.toLowerCase().includes(k));
  }, [q]);

  const toggle = (loc)=>{
    const set = new Set(value);
    set.has(loc) ? set.delete(loc) : set.add(loc);
    onChange(Array.from(set));
  };

  const clearAll = ()=> onChange([]);

  return (
    <div className="locsel" ref={wrapRef}>
      <button type="button" className="locsel-trigger" onClick={()=>setOpen(v=>!v)}>
        Location
        {value.length > 0 && <span className="locsel-count">{value.length}</span>}
      </button>
      {value.length > 0 && (
        <button type="button" className="locsel-clear" title="Clear" onClick={clearAll}>×</button>
      )}

      {open && (
        <div className="locsel-panel" onClick={(e)=>e.stopPropagation()}>
          <input className="locsel-search" placeholder="Search location..." value={q} onChange={(e)=>setQ(e.target.value)} />
          <div className="locsel-list">
            {filtered.length === 0 && <div className="locsel-empty">No locations</div>}
            {filtered.map((loc)=>(
              <label key={loc} className="locsel-item" title={loc}>
                <input
                  type="checkbox"
                  checked={value.includes(loc)}
                  onChange={()=>toggle(loc)}
                />
                <span className="locsel-name">{loc}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Searchable Select used in modal (unchanged except wrapper) ---------------- */
function SearchSelect({ label, required, placeholder, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef(null);
  useOutside(boxRef, ()=>setOpen(false));

  const filtered = useMemo(()=>{
    const k=q.trim().toLowerCase();
    return options.filter(o => o.toLowerCase().includes(k));
  },[q, options]);

  return (
    <div className="fm-field" ref={boxRef}>
      <label className="fm-label">
        {label}{required && <span className="req">*</span>}
      </label>

      <div className="sel-wrap">
        <div
          className={`sel ${open ? "open":""}`}
          onClick={()=>setOpen(o=>!o)}
          role="button"
          tabIndex={0}
        >
          <div className={`sel-display ${!value ? "placeholder":""}`}>
            {value || placeholder}
          </div>
          <svg className="chev" width="16" height="16" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>

        {open && (
          <div className="sel-menu" onClick={(e)=>e.stopPropagation()}>
            <input
              className="sel-search"
              placeholder="Search..."
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              autoFocus
            />
            <div className="sel-list">
              <div
                className="sel-item sel-ph"
                onClick={()=>{ onChange(""); setOpen(false); }}
              >
                {placeholder}
              </div>
              {filtered.map(opt=>(
                <div
                  key={opt}
                  className={`sel-item ${opt===value?"active":""}`}
                  title={opt}
                  onClick={()=>{ onChange(opt); setOpen(false); setQ(""); }}
                >
                  {opt}
                </div>
              ))}
              {filtered.length===0 && <div className="sel-empty">No match</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Modal ---------------- */
function NewTxnModal({ open, onClose, onSave }) {
  const ACCOUNTS = [
    "AXIS BANK (924020051622894)",
    "HDFC BANK (001234567890)",
    "ICICI BANK (0022334455)",
    "Brands 4 less - Krishna Nagar",
    "Brands 4 less - Rajouri Garden inside",
    "Brands 4 less - M3M Urbana",
    "Cash"
  ];

  const [fromAcc, setFromAcc] = useState("");
  const [toAcc, setToAcc]     = useState("");
  const [amount, setAmount]   = useState("");
  const [date, setDate]       = useState(()=>new Date().toISOString().slice(0,10));
  const [desc, setDesc]       = useState("");

  useEffect(()=>{
    if(open){
      document.body.classList.add("modal-open");
    }else{
      document.body.classList.remove("modal-open");
      setFromAcc(""); setToAcc(""); setAmount(""); setDate(new Date().toISOString().slice(0,10)); setDesc("");
    }
    return ()=>document.body.classList.remove("modal-open");
  },[open]);

  if(!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">New Transaction</div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <SearchSelect
            label="From Account"
            required
            placeholder="Select From Account"
            value={fromAcc}
            onChange={setFromAcc}
            options={ACCOUNTS}
          />

          <SearchSelect
            label="To Account"
            required
            placeholder="Select To Account"
            value={toAcc}
            onChange={setToAcc}
            options={ACCOUNTS}
          />

          <div className="fm-field">
            <label className="fm-label">Amount<span className="req">*</span></label>
            <input className="fm-input" type="number" min="0" placeholder="0" value={amount} onChange={(e)=>setAmount(e.target.value)} />
          </div>

          <div className="fm-field">
            <label className="fm-label">Date<span className="req">*</span></label>
            <div className="date-wrap">
              <input className="fm-input" type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
              <svg className="date-ico" width="16" height="16" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>

          <div className="fm-field">
            <label className="fm-label">Description</label>
            <input className="fm-input" placeholder="Description" value={desc} onChange={(e)=>setDesc(e.target.value)} />
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn lite" onClick={onClose}>Close</button>
          <button
            className="btn primary sm"
            onClick={()=>onSave?.({fromAcc,toAcc,amount:+amount,date,desc})}
            disabled={!fromAcc || !toAcc || !amount || !date}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Main Page ---------------- */
export default function BankTransactionPage(){
  const [all] = useState(ROWS);

  // toolbar
  const [perPage, setPerPage] = useState(10);
  const [page, setPage]       = useState(1);
  const [q, setQ]             = useState("");

  // inline filter bar
  const [showFilter, setShowFilter] = useState(false);
  const [selLoc, setSelLoc] = useState([]);          // <-- array of selected locations
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  // download dropdown
  const [dlOpen, setDlOpen]   = useState(false);
  const dlRef = useRef(null);
  useOutside(dlRef, ()=>setDlOpen(false));

  // create-new modal
  const [showModal, setShowModal] = useState(false);

  // combined filter
  const filtered = useMemo(()=>{
    return all.filter(r=>{
      const iso = toIso(r.date);
      if (fromDate && iso < fromDate) return false;
      if (toDate   && iso > toDate)   return false;
      if (selLoc.length>0 && !selLoc.includes(r.location)) return false;
      const qq = q.trim().toLowerCase();
      if (!qq) return true;
      return Object.values(r).some(v => String(v).toLowerCase().includes(qq));
    });
  },[all, q, selLoc, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length/perPage));
  useEffect(()=>setPage(1), [perPage,q,selLoc,fromDate,toDate]);

  const start = (page-1)*perPage;
  const view  = filtered.slice(start, start+perPage);

  const downloadCSV = ()=>{
    const header = ["#","Voucher Number","Transaction Date","From Account","To Account","Amount","Created By","Location"];
    const lines = [header.join(",")];
    filtered.forEach((r,i)=>{
      lines.push([i+1, qcsv(r.voucher), r.date, qcsv(r.from), qcsv(r.to), r.amount, qcsv(r.by), qcsv(r.location)].join(","));
    });
    const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="bank-transactions.csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    setDlOpen(false);
  };

  const clearFilters = ()=>{
    setSelLoc([]); setFromDate(""); setToDate("");
  };

  const handleSave = (payload)=>{
    console.log("SAVE TRANSACTION", payload);
    setShowModal(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Bank Transaction</h1>
        <svg className="home-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
      </div>

      <div className="content-card">
        {/* toolbar */}
        <div className="toolbar">
          <div className="toolbar-actions">
            <select className="rows-select" value={perPage} onChange={e=>setPerPage(+e.target.value)}>
              {[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
            </select>

            <button className="btn icon-btn" onClick={()=>setShowFilter(v=>!v)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              Filter
            </button>

            <div className="search-box">
              <input className="search-input" placeholder="Search List..." value={q} onChange={(e)=>setQ(e.target.value)} />
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>

            <div className="download-wrapper" ref={dlRef}>
              <button className="btn icon-only-btn" onClick={()=>setDlOpen(v=>!v)} title="Download">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              {dlOpen && (
                <div className="download-menu">
                  <button onClick={downloadCSV}>Excel</button>
                  <button onClick={()=>{ alert("PDF download coming soon"); setDlOpen(false); }}>PDF</button>
                </div>
              )}
            </div>

            <button className="btn primary" onClick={()=>setShowModal(true)}>Create New</button>
          </div>
        </div>

        {/* INLINE FILTER BAR */}
        {showFilter && (
          <div className="inline-filter">
            <div className="inline-filter-row">
              {/* ✅ Multi-select Locations */}
              <div className="ifield">
                <label className="ifield-label">Location</label>
                <LocationSelect value={selLoc} onChange={setSelLoc} />
              </div>

              <div className="ifield">
                <label className="ifield-label">From</label>
                <input type="date" className="ifield-input" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
              </div>
              <div className="ifield">
                <label className="ifield-label">To</label>
                <input type="date" className="ifield-input" value={toDate} onChange={e=>setToDate(e.target.value)} />
              </div>

              {/* ✅ Smaller, themed Clear button */}
              <div className="ifield ifield-actions no-push">
                <label className="ifield-label">&nbsp;</label>
                <button className="btn clear clear-eq" onClick={clearFilters}>Clear</button>
              </div>
            </div>
          </div>
        )}

        {/* table */}
        <div className="table-wrapper">
          <table className="data-table">
            <colgroup>
              <col style={{width:"5%"}} />
              <col style={{width:"12%"}} />
              <col style={{width:"13%"}} />
              <col style={{width:"23%"}} />
              <col style={{width:"11%"}} />
              <col style={{width:"10%"}} />
              <col style={{width:"9%"}} />
              <col style={{width:"13%"}} />
              <col style={{width:"4.5%"}} />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>Voucher Number</th>
                <th>Transaction Date</th>
                <th>From Account</th>
                <th>To Account</th>
                <th className="text-right">Amount</th>
                <th>Created By</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r,i)=>(
                <tr key={r.id}>
                  <td>{start+i+1}</td>
                  <td className="mono">{r.voucher}</td>
                  <td>{r.date}</td>
                  <td className="truncate" title={r.from}>{r.from}</td>
                  <td>{r.to}</td>
                  <td className="text-right mono">{nf.format(r.amount)}</td>
                  <td>{r.by}</td>
                  <td className="truncate" title={r.location}>{r.location}</td>
                  <td className="actions-cell"><button className="action-dot">⋯</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* footer */}
        <div className="table-footer">
          <div className="entries-info">
            Showing {filtered.length ? start + 1 : 0} to {Math.min(start + perPage, filtered.length)} of {filtered.length} entries
          </div>
          <div className="pagination">
            <button className="pg-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
            {Array.from({length: totalPages}).map((_,idx)=>{
              const pg = idx+1;
              return <button key={pg} className={`pg-btn ${pg===page?"active":""}`} onClick={()=>setPage(pg)}>{pg}</button>;
            })}
            <button className="pg-btn" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <NewTxnModal open={showModal} onClose={()=>setShowModal(false)} onSave={handleSave} />
    </div>
  );
}
