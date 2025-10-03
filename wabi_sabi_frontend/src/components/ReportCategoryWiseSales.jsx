import React, { useMemo, useRef, useState } from "react";
import "../styles/ReportCategoryWiseSales.css";
import { useNavigate } from "react-router-dom";

/* ---------- Demo masters ---------- */
const ALL_LOCATIONS = [
  "WABI SABI SUSTAINABILITY LLP",
  "Brands 4 less – Ansal Plaza",
  "Brands 4 less – Rajouri Garden",
  "Brand4Less– Tilak Nagar",
  "Brands 4 less – M3M Urbana",
  "Brands 4 less – IFFCO Chowk",
  "Brands Loot – Udyog Vihar",
  "Brands loot – Krishna Nagar",
];

const ALL_CATEGORIES = [
  "Accessories",
  "Boys & Girls - Blouse",
  "Boys & Girls - Dress",
  "Boys & Girls - Pant",
  "Boys & Girls - Shirt",
  "Boys & Girls - Shorts",
  "Boys & Girls - T-Shirt",
  "Children - Mix",
  "Clothing",
  "Footwear",
];

const SUBCAT_MAP = {
  Clothing: ["Shirts", "Jeans", "Ethnic"],
  Footwear: ["Sneakers", "Sandals"],
};

const RAW_ROWS = [
  { sr: 1, category: "Accessories",          location: "WABI SABI SUSTAINABILITY LLP", qty: 770,   taxable: 86193.01,  tax: 4309.64,  total: 90502.65 },
  { sr: 2, category: "Boys & Girls - Blouse",location: "WABI SABI SUSTAINABILITY LLP", qty: 77,    taxable: 6914.29,   tax: 345.72,   total: 7260.00  },
  { sr: 3, category: "Boys & Girls - Dress", location: "WABI SABI SUSTAINABILITY LLP", qty: 340,   taxable: 55390.43,  tax: 2769.57,  total: 58160.00 },
  { sr: 4, category: "Boys & Girls - Pant",  location: "WABI SABI SUSTAINABILITY LLP", qty: 114,   taxable: 18304.75,  tax: 915.25,   total: 19220.00 },
  { sr: 5, category: "Boys & Girls - Shirt", location: "WABI SABI SUSTAINABILITY LLP", qty: 48,    taxable: 5733.33,   tax: 286.67,   total: 6020.00  },
  { sr: 6, category: "Boys & Girls - Shorts",location: "WABI SABI SUSTAINABILITY LLP", qty: 180,   taxable: 13295.82,  tax: 664.78,   total: 13960.60 },
  { sr: 7, category: "Boys & Girls - T-Shirt",location:"WABI SABI SUSTAINABILITY LLP", qty: 310,   taxable: 20039.81,  tax: 1001.96,  total: 21041.77 },
  { sr: 8, category: "Children - Mix",       location: "WABI SABI SUSTAINABILITY LLP", qty: 40,    taxable: 3866.67,   tax: 193.33,   total: 4060.00  },
  { sr: 9, category: "Clothing",             location: "WABI SABI SUSTAINABILITY LLP", qty: 51197, taxable: 8582479.41, tax: 445332.08,total: 9027811.49 },
  { sr:10, category: "Footwear",             location: "WABI SABI SUSTAINABILITY LLP", qty: 943,   taxable: 545353.20, tax: 44167.65, total: 589520.85 },
];

/* Default visible columns (blue in popup) */
const DEFAULT_VISIBLE = ["sr", "category", "location", "qty", "taxable", "tax", "total"];

const COL_META = [
  { key: "sr",       label: "Sr No",           align: "left",  width: 70 },
  { key: "category", label: "Category Name",   align: "left",  width: 240 },
  { key: "location", label: "Location",        align: "left",  width: 320 },
  { key: "qty",      label: "Qty",             align: "right", width: 120, format: (v)=>v.toLocaleString() },
  { key: "taxable",  label: "Taxable Amount",  align: "right", width: 170, format: (v)=>v.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
  { key: "tax",      label: "Tax Amount",      align: "right", width: 150, format: (v)=>v.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
  { key: "total",    label: "Total Amount",    align: "right", width: 170, format: (v)=>v.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
  /* Optional (white in popup initially) */
  { key: "cgst",     label: "CGST",            align: "right", width: 140, format: (v)=>v.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
  { key: "sgst",     label: "SGST",            align: "right", width: 140, format: (v)=>v.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
  { key: "igst",     label: "IGST",            align: "right", width: 140, format: (v)=>v.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
];

export default function ReportCategoryWiseSales() {
  const navigate = useNavigate();

  /* Filters */
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");

  const [locOpen, setLocOpen] = useState(false);
  const [locQ, setLocQ] = useState("");
  const [selectedLocs, setSelectedLocs] = useState(["WABI SABI SUSTAINABILITY LLP"]);

  /* Simple single Select Category */
  const [catSelOpen, setCatSelOpen] = useState(false);
  const [catSelected, setCatSelected] = useState("");

  const [subOpen, setSubOpen] = useState(false);
  const [subQ, setSubQ] = useState("");
  const [selectedSub, setSelectedSub] = useState("");

  /* Table controls */
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  /* Columns manager (modal) */
  const [colOpen, setColOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE);

  const tableWrapRef = useRef(null);

  /* Derived lists */
  const filteredLocs = useMemo(
    () => ALL_LOCATIONS.filter(l => l.toLowerCase().includes(locQ.trim().toLowerCase())),
    [locQ]
  );
  const availableSubcats = useMemo(() => {
    const hit = SUBCAT_MAP[catSelected];
    return hit ? hit.filter(s => s.toLowerCase().includes(subQ.trim().toLowerCase())) : [];
  }, [catSelected, subQ]);

  const appliedRows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return RAW_ROWS.filter(r => {
      const matchText =
        `${r.category} ${r.location} ${r.qty} ${r.taxable} ${r.tax} ${r.total}`.toLowerCase();
      return s ? matchText.includes(s) : true;
    });
  }, [search]);

  /* Actions */
  const toggleLoc = (loc) => {
    if (loc === "All") {
      const allOnly = selectedLocs.length === ALL_LOCATIONS.length;
      setSelectedLocs(allOnly ? [] : [...ALL_LOCATIONS]);
      return;
    }
    setSelectedLocs(prev => prev.includes(loc) ? prev.filter(x => x !== loc) : [...prev, loc]);
  };

  const downloadFile = (name) => {
    const blob = new Blob([""], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const isVisible = (key) => visibleCols.includes(key);
  const toggleCol = (key) =>
    setVisibleCols((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  const restoreCols = () => setVisibleCols(DEFAULT_VISIBLE.slice());

  /* Single page (10 demo rows) */
  const pageRows = appliedRows.slice(0, pageSize);

  const keyLink = (fn) => (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  };

  return (
    <div className="cws-wrap">
      {/* top/breadcrumb */}
      <div className="cws-top">
        <div className="cws-title">Category Wise Sales Summary</div>
        <div className="cws-crumb" aria-label="breadcrumb">
          <span
            className="material-icons-outlined cws-crumb-link"
            role="link" tabIndex={0}
            aria-label="Go to Home"
            onClick={() => navigate("/")}
            onKeyDown={keyLink(()=>navigate("/"))}
          >
            home
          </span>
          <span className="cws-crumb-sep">›</span>
          <span
            className="cws-crumb-link" role="link" tabIndex={0}
            onClick={() => navigate("/reports")}
            onKeyDown={keyLink(()=>navigate("/reports"))}
          >
            Reports
          </span>
        </div>
      </div>

      {/* Filter panel */}
      <div className="cws-panel">
        {/* Location */}
        <div className="cws-field">
          <label>Select Location</label>
          <div className="cws-select" onClick={() => setLocOpen((s) => !s)}>
            <span className="cws-select-text">
              {selectedLocs.length ? "Select Location 1" : "Select Location"}
            </span>
            <button
              type="button"
              className="cws-clear"
              onClick={(e) => { e.stopPropagation(); setSelectedLocs([]); }}
              aria-label="Clear"
            >×</button>
            {locOpen && (
              <div className="cws-popover cws-popover-loc" onClick={(e)=>e.stopPropagation()}>
                <label className="cws-check">
                  <input
                    type="checkbox"
                    checked={selectedLocs.length === ALL_LOCATIONS.length}
                    onChange={() => toggleLoc("All")}
                  />
                  <span>All</span>
                </label>

                <div className="cws-popover-search">
                  <input
                    placeholder="Search List…"
                    value={locQ}
                    onChange={(e) => setLocQ(e.target.value)}
                  />
                </div>

                <div className="cws-popover-list">
                  {filteredLocs.map((l) => (
                    <label key={l} className="cws-check">
                      <input
                        type="checkbox"
                        checked={selectedLocs.includes(l)}
                        onChange={() => toggleLoc(l)}
                      />
                      <span>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Select Category – simple dropdown */}
        <div className="cws-field">
          <label>Select Category</label>
          <div
            className="cws-select cws-select--menu"
            onClick={() => setCatSelOpen((s) => !s)}
          >
            <span className="cws-select-text">
              {catSelected || "Select Category"}
            </span>
            <span className="material-icons-outlined cws-caret">expand_more</span>

            {catSelOpen && (
              <div
                className="cws-popover cws-popover--menu"
                role="listbox"
                onClick={(e) => e.stopPropagation()}
              >
                {ALL_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="option"
                    className={`cws-item ${catSelected === c ? "selected" : ""}`}
                    onClick={() => {
                      setCatSelected(c);
                      setCatSelOpen(false);
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sub Category */}
        <div className="cws-field">
          <label>Select Sub Category</label>
          <div className="cws-select" onClick={() => setSubOpen((s)=>!s)}>
            <span className="cws-select-text">{selectedSub || "Select Sub Category"}</span>
            <span className="material-icons-outlined cws-caret">expand_more</span>
            {subOpen && (
              <div className="cws-popover" onClick={(e)=>e.stopPropagation()}>
                <div className="cws-popover-search">
                  <input placeholder="" value={subQ} onChange={(e)=>setSubQ(e.target.value)} />
                </div>
                {availableSubcats.length === 0 ? (
                  <div className="cws-empty">No results found</div>
                ) : (
                  <div className="cws-popover-list">
                    {availableSubcats.map(sc => (
                      <button
                        key={sc}
                        type="button"
                        className={`cws-item ${selectedSub===sc ? "selected":""}`}
                        onClick={()=>setSelectedSub(sc)}
                      >{sc}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="cws-field">
          <label>From Date</label>
          <div className="cws-input with-icon">
            <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
            <span className="material-icons-outlined">calendar_month</span>
          </div>
        </div>
        <div className="cws-field">
          <label>To Date</label>
          <div className="cws-input with-icon">
            <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} />
            <span className="material-icons-outlined">calendar_month</span>
          </div>
        </div>
      </div>

      {/* ===== Toolbar (image 2) ===== */}
      <div className="cws-tbar">
        <div className="cws-left">
          {/* Export */}
          <div className="cws-export">
            <div className="cws-dd">
              <button type="button" className="cws-dd-btn" aria-label="Download">
                <span className="material-icons-outlined">file_download</span>
              </button>
              <div className="cws-dd-menu">
                <button type="button" onClick={()=>downloadFile("category-wise.xlsx")}>
                  <span className="material-icons-outlined">description</span> Excel
                </button>
                <button type="button" onClick={()=>downloadFile("category-wise.pdf")}>
                  <span className="material-icons-outlined">picture_as_pdf</span> PDF
                </button>
                <button type="button" onClick={()=>downloadFile("category-wise-all.xlsx")}>
                  <span className="material-icons-outlined">table_view</span> All Data Excel
                </button>
              </div>
            </div>
          </div>

          {/* Page size */}
          <select
            className="cws-pagesize"
            value={pageSize}
            onChange={(e)=>setPageSize(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {[10,50,100,500,1000].map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Search */}
          <div className="cws-search">
            <input
              placeholder="Search List..."
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
            />
            <span className="material-icons-outlined">search</span>
          </div>
        </div>

        {/* Columns (right) – solid blue button; opens centered modal */}
        <div className="cws-columns">
          <button
            type="button"
            className="cws-columns-btn cws-columns-btn--blue"
            onClick={() => setColOpen(true)}
            aria-haspopup="dialog"
          >
            Columns <span className="material-icons-outlined">arrow_drop_down</span>
          </button>
        </div>
      </div>

      {/* Columns Upgradation popup (image 3) */}
      {colOpen && (
        <>
          <div className="cws-col-overlay" onClick={() => setColOpen(false)} />
          <div className="cws-col-modal" role="dialog" aria-modal="true">
            <div className="cws-col-grid">
              {[
                "sr","qty","total",
                "category","taxable","_restore",
                "location","tax","cgst",
                "sgst","igst"
              ].map((key) => {
                if (key === "_restore") {
                  return (
                    <button
                      key="_restore"
                      type="button"
                      className="cws-restore"
                      onClick={restoreCols}
                    >
                      Restore visibility
                    </button>
                  );
                }
                const meta = COL_META.find((m) => m.key === key);
                if (!meta) return null;
                const on = visibleCols.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`cws-tile ${on ? "on" : ""}`}
                    onClick={() => toggleCol(key)}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Table */}
      <div className="cws-table-wrap" ref={tableWrapRef}>
        <table className="cws-table">
          <thead>
            <tr>
              {COL_META.filter(c=>isVisible(c.key)).map(c=>(
                <th key={c.key} style={{textAlign:c.align, width:c.width}}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.sr}>
                {COL_META.filter(c=>isVisible(c.key)).map(c=>{
                  let raw = r[c.key];
                  if (c.key === "cgst") raw = r.tax / 2;
                  if (c.key === "sgst") raw = r.tax / 2;
                  if (c.key === "igst") raw = 0;
                  const val = c.format ? c.format(raw ?? "") : (raw ?? "");
                  return <td key={c.key} style={{textAlign:c.align}}>{val}</td>;
                })}
              </tr>
            ))}
            <tr className="cws-total">
              {COL_META.filter(c=>isVisible(c.key)).map((c, idx) => {
                if (c.key === "qty") {
                  const sum = RAW_ROWS.reduce((a,b)=>a+b.qty,0);
                  return <td key={c.key} style={{textAlign:c.align}}>{sum.toLocaleString()}</td>;
                }
                if (c.key === "taxable") {
                  const sum = RAW_ROWS.reduce((a,b)=>a+b.taxable,0);
                  return <td key={c.key} style={{textAlign:c.align}}>{sum.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>;
                }
                if (c.key === "tax") {
                  const sum = RAW_ROWS.reduce((a,b)=>a+b.tax,0);
                  return <td key={c.key} style={{textAlign:c.align}}>{sum.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>;
                }
                if (c.key === "cgst") {
                  const sum = RAW_ROWS.reduce((a,b)=>a+(b.tax/2),0);
                  return <td key={c.key} style={{textAlign:c.align}}>{sum.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>;
                }
                if (c.key === "sgst") {
                  const sum = RAW_ROWS.reduce((a,b)=>a+(b.tax/2),0);
                  return <td key={c.key} style={{textAlign:c.align}}>{sum.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>;
                }
                if (c.key === "igst") {
                  const sum = 0;
                  return <td key={c.key} style={{textAlign:c.align}}>{sum.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>;
                }
                if (c.key === "total") {
                  const sum = RAW_ROWS.reduce((a,b)=>a+b.total,0);
                  return <td key={c.key} style={{textAlign:c.align}}>{sum.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>;
                }
                if (idx === 0) return <td key={c.key} style={{textAlign:"left"}}>Total</td>;
                return <td key={c.key} />;
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination (single page) */}
      <div className="cws-pager">
        <button type="button" className="cws-page-btn" disabled>&lt;</button>
        <button type="button" className="cws-page-btn active">1</button>
        <button type="button" className="cws-page-btn" disabled>&gt;</button>
      </div>

      <div className="cws-entries">
        Showing 1 to {Math.min(pageRows.length, RAW_ROWS.length)} of {RAW_ROWS.length} entries
      </div>
    </div>
  );
}
