import React, { useMemo, useRef, useState, useEffect } from "react";
import "../styles/InvStockSummary.css";

/* --------- small helpers --------- */
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const l = (e) => { if (!ref.current || ref.current.contains(e.target)) return; handler(); };
    document.addEventListener("mousedown", l);
    document.addEventListener("touchstart", l);
    return () => { document.removeEventListener("mousedown", l); document.removeEventListener("touchstart", l); };
  }, [ref, handler]);
}

const Ic = {
  caret:  () => (<svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.24 4.38a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"/></svg>),
  export: () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zM12 2l-5 5h3v6h4V7h3l-5-5z"/></svg>),
  cal:    () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm14 8H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10z"/></svg>),
  search: () => (<svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>),
  plus:   () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"/></svg>),
};

/* search-select used for filters */
function Select({ placeholder="Select…", options=[], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  const shown = useMemo(() => (q ? options.filter(o => o.toLowerCase().includes(q.toLowerCase())) : options), [q, options]);

  return (
    <div className="ss-combo" ref={ref}>
      <button className={`ss-combo-btn ${value ? "has":""}`} type="button" onClick={()=>setOpen(v=>!v)}>
        <span className="ss-combo-val">{value || placeholder}</span>
        <span className="ss-caret"><Ic.caret/></span>
      </button>
      {open && (
        <div className="ss-pop">
          <input className="ss-pop-search" placeholder="Search…" value={q} onChange={(e)=>setQ(e.target.value)} />
          <div className="ss-pop-list">
            {shown.map(o => <div key={o} className="ss-pop-item" onClick={()=>{onChange(o); setOpen(false);}}>{o}</div>)}
            {!shown.length && <div className="ss-pop-empty">No options</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* per-page */
function PerPage({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  const opts = [10,50,100,500];
  return (
    <div className="ss-pp" ref={ref}>
      <button className="ss-pp-btn" type="button" onClick={()=>setOpen(v=>!v)}>{value} <Ic.caret/></button>
      {open && (
        <div className="ss-pp-menu">
          {opts.map(n => <button key={n} className="ss-pp-item" onClick={()=>{onChange(n); setOpen(false);}}>{n}</button>)}
        </div>
      )}
    </div>
  );
}

/* export dropdown (Excel, PDF, All Excel) */
function ExportMenu({ headers, rows }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const toCSV = (filename) => {
    const head = headers.join(",");
    const body = rows.map(r => headers.map(h => `"${(r[h]??"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([head+"\n"+body], { type:"text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
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

/* ================= Main ================= */
export default function InvStockSummary() {
  /* filters (exact like screenshots) */
  const [location, setLocation] = useState("Select Location");
  const [dateRange, setDateRange] = useState("01/04/2025 - 31/03/2026");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("Select category");
  const [subCategory, setSubCategory] = useState("Select Sub Category");
  const [brand, setBrand] = useState("Select brand");
  const [subBrand, setSubBrand] = useState("Select Sub Brand");

  /* toolbar right */
  const [perPage, setPerPage] = useState(10);
  const [q, setQ] = useState("");

  const LOCS = ["Select Location","WABI SABI SUSTAINABILITY LLP","Brands 4 less – Rajouri Garden"];
  const CATS = ["Select category","Ladies - Shoes","Ladies - Jacket","Ladies - T-Shirt","Ladies - Jeans"];
  const SUBCATS = ["Select Sub Category"];
  const BRANDS = ["Select brand","B4L","Wabi Sabi"];
  const SUBBRANDS = ["Select Sub Brand"];

  /* 10 dummy rows (match look) */
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
      {/* heading row */}
      <div className="ss-top">
        <div className="ss-title">Stock Summary</div>
        <span className="ss-dot">•</span>
        <div className="ss-sub">- Report</div>
      </div>

      {/* FILTERS CARD */}
      <div className="ss-card ss-card-filters">
        <div className="ss-fgrid">
          <div className="ss-field">
            <div className="ss-label">Location</div>
            <Select value={location} onChange={setLocation} options={LOCS} placeholder="Select Location" />
          </div>

          <div className="ss-field">
            <div className="ss-label">Date Range</div>
            <div className="ss-range">
              <input className="ss-range-input" value={dateRange} onChange={(e)=>setDateRange(e.target.value)}/>
              <span className="ss-range-ic"><Ic.cal/></span>
            </div>
          </div>

          <div className="ss-field">
            <div className="ss-label">Product</div>
            <div className="ss-searchbox">
              <input placeholder="Search Product" value={product} onChange={(e)=>setProduct(e.target.value)}/>
              <span className="ss-sel-caret"><Ic.caret/></span>
            </div>
          </div>

          <div className="ss-field">
            <div className="ss-label">Category</div>
            <Select value={category} onChange={setCategory} options={CATS} placeholder="Select category" />
          </div>

          <div className="ss-field">
            <div className="ss-label">Sub Category</div>
            <Select value={subCategory} onChange={setSubCategory} options={SUBCATS} placeholder="Select Sub Category" />
          </div>

          <div className="ss-field">
            <div className="ss-label">Brand</div>
            <Select value={brand} onChange={setBrand} options={BRANDS} placeholder="Select brand" />
          </div>

          <div className="ss-field">
            <div className="ss-label">Sub Brand</div>
            <Select value={subBrand} onChange={setSubBrand} options={SUBBRANDS} placeholder="Select Sub Brand" />
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="ss-card">
        {/* right-aligned top toolbar */}
        <div className="ss-toolbar">
          <div className="ss-toolbar-right">
            <ExportMenu headers={HEADERS} rows={filtered}/>
            <PerPage value={perPage} onChange={setPerPage}/>
            <div className="ss-search">
              <Ic.search/>
              <input placeholder="Search List..." value={q} onChange={(e)=>setQ(e.target.value)}/>
            </div>
          </div>
        </div>

        {/* header */}
        <div className="ss-thead">
          <div>#</div>
          <div>Branch Name</div>
          <div>Item Code/Barcode</div>
          <div>Product Name</div>
          <div>Category Name</div>
          <div>Variant Name</div>
          <div>UOM</div>
          <div>MRP</div>
          <div>Selling Price</div>
          <div>Discount</div>
          <div>Purchase Price</div>
          <div>Opening stock</div>
          <div>In Qty</div>
        </div>

        {/* rows */}
        {filtered.map((r,i)=>(
          <div key={i} className="ss-rowline">
            <div className="ss-cell-hybrid">
              <span className="ss-plus"><Ic.plus/></span>
              <span>{r["#"]}</span>
            </div>
            <div className="ss-branch">
              <div>WABI SABI</div>
              <div>SUSTAINABILITY</div>
              <div>LLP</div>
            </div>
            <div><a className="ss-link" href="#">{r.Code}</a></div>
            <div>{r.Product}</div>
            <div>{r.Category}</div>
            <div>{r.Variant}</div>
            <div>{r.UOM}</div>
            <div>{r.MRP}</div>
            <div>{r.Selling}</div>
            <div>{r.Discount}</div>
            <div>{r.Purchase}</div>
            <div>{r.Opening}</div>
            <div>{r.InQty}</div>
          </div>
        ))}

        {/* total */}
        <div className="ss-total">
          <div></div><div>Total</div>
          <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
          <div>{totals.opening}</div>
          <div>{totals.inqty}</div>
        </div>

        {/* footer right (pager) */}
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
