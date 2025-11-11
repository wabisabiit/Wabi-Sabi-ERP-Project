import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/ReportCategoryWiseSales.css";
import { useNavigate } from "react-router-dom";

const API_BASE = (import.meta?.env?.VITE_API_BASE) || "http://127.0.0.1:8000/api";

/* ---------- Demo masters (kept for UX; filtering still applies) ---------- */
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
  "Boys & Girls - Shoes",
  "Boys & Girls - Shorts",
  "Boys & Girls - Sockes",
  "Boys & Girls - T-shirts",
  "Boys & Girls - Undergarments",
];

const SUBCAT_MAP = {
  Clothing: ["Shirts", "Jeans", "Ethnic"],
  Footwear: ["Sneakers", "Sandals"],
};

/* Default visible columns (blue in popup) */
const DEFAULT_VISIBLE = ["sr", "category", "location", "qty", "taxable", "tax", "total"];

const COL_META = [
  { key: "sr",       label: "Sr No",           align: "left",  width: 70 },
  { key: "category", label: "Category Name",   align: "left",  width: 240 },
  { key: "location", label: "Location",        align: "left",  width: 320 },
  { key: "qty",      label: "Qty",             align: "right", width: 120, format: v => Number(v ?? 0).toLocaleString() },
  { key: "taxable",  label: "Taxable Amount",  align: "right", width: 170, format: v => Number(v ?? 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
  { key: "tax",      label: "Tax Amount",      align: "right", width: 150, format: v => Number(v ?? 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
  { key: "total",    label: "Total Amount",    align: "right", width: 170, format: v => Number(v ?? 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
  { key: "cgst",     label: "CGST",            align: "right", width: 140, format: v => Number(v ?? 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
  { key: "sgst",     label: "SGST",            align: "right", width: 140, format: v => Number(v ?? 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
  { key: "igst",     label: "IGST",            align: "right", width: 140, format: v => Number(v ?? 0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) },
];

export default function ReportCategoryWiseSales() {
  const navigate = useNavigate();

  /* Filters */
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");

  /* Which popover is open: 'loc' | 'cat' | 'sub' | null */
  const [openKey, setOpenKey] = useState(null);

  /* Location */
  const [locQ, setLocQ] = useState("");
  const [selectedLocs, setSelectedLocs] = useState(["WABI SABI SUSTAINABILITY LLP"]);

  /* Category */
  const [catSelected, setCatSelected] = useState("");
  const [catQ, setCatQ] = useState("");

  /* Sub Category (UI only; not sent to API) */
  const [subQ, setSubQ] = useState("");
  const [selectedSub, setSelectedSub] = useState("");

  /* Table data (REAL) */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  /* Table controls */
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  /* Columns manager (modal) */
  const [colOpen, setColOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE);

  const locRef = useRef(null);
  const catRef = useRef(null);
  const subRef = useRef(null);

  /* Derived lists */
  const filteredLocs = useMemo(
    () => ALL_LOCATIONS.filter(l => l.toLowerCase().includes(locQ.trim().toLowerCase())),
    [locQ]
  );

  const filteredCats = useMemo(
    () => ALL_CATEGORIES.filter(c => c.toLowerCase().includes(catQ.trim().toLowerCase())),
    [catQ]
  );

  const availableSubcats = useMemo(() => {
    const hit = SUBCAT_MAP[catSelected];
    return hit ? hit.filter(s => s.toLowerCase().includes(subQ.trim().toLowerCase())) : [];
  }, [catSelected, subQ]);

  /* Apply client search on fetched rows */
  const appliedRows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter(r => {
      const matchText = `${r.category} ${r.location} ${r.qty} ${r.taxable ?? ""} ${r.tax ?? ""} ${r.total ?? ""}`.toLowerCase();
      return s ? matchText.includes(s) : true;
    });
  }, [search, rows]);

  /* Open one popover at a time */
  const toggleOpen = (key) => setOpenKey(prev => (prev === key ? null : key));

  /* Click-outside + ESC close */
  useEffect(() => {
    const onDoc = (e) => {
      const t = e.target;
      const inside =
        (locRef.current && locRef.current.contains(t)) ||
        (catRef.current && catRef.current.contains(t)) ||
        (subRef.current && subRef.current.contains(t));
      if (!inside) setOpenKey(null);
    };
    const onEsc = (e) => { if (e.key === "Escape") setOpenKey(null); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  /* Fetch data whenever filters change */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const sp = new URLSearchParams();
        sp.append("date_from", fromDate);
        sp.append("date_to", toDate);
        if (catSelected) sp.append("category", catSelected);
        // multi-locations
        (selectedLocs || []).forEach(l => sp.append("location", l));

        const res = await fetch(`${API_BASE}/reports/category-wise-sales/?${sp.toString()}`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText} – ${txt}`);
        }
        const data = await res.json();

        // rows from API, ensure sr present (backend already sets sr)
        const r = Array.isArray(data?.rows) ? data.rows : [];
        setRows(r);
      } catch (err) {
        setRows([]);
        setErrorMsg(err?.message || "Failed to load report.");
      } finally {
        setLoading(false);
      }
    };
    // only fetch when dates are valid
    if (fromDate && toDate) fetchData();
  }, [fromDate, toDate, selectedLocs, catSelected]);

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

  /* Single page */
  const pageRows = appliedRows.slice(0, pageSize);

  const keyLink = (fn) => (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  };

  /* Totals based on fetched rows */
  const totalQty = useMemo(() => pageRows.reduce((a,b)=> a + Number(b.qty || 0), 0), [pageRows]);
  const totalTaxable = 0; // kept empty in UI
  const totalTax = 0;     // kept empty in UI
  const totalAmount = useMemo(() => pageRows.reduce((a,b)=> a + Number(b.total || 0), 0), [pageRows]);

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
        {/* Select Location */}
        <div className="cws-field" ref={locRef}>
          <label>Select Location</label>
          <div className="cws-select" onClick={() => toggleOpen("loc")}>
            <span className="cws-select-text">Select Location</span>
            <span className={`cws-badge ${selectedLocs.length ? "on" : ""}`}>
              {selectedLocs.length || 0}
            </span>
            <button
              type="button"
              className="cws-clear"
              onClick={(e) => { e.stopPropagation(); setSelectedLocs([]); }}
              aria-label="Clear"
            >×</button>

            {openKey === "loc" && (
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

        {/* Select Category (search + scroll like image) */}
        <div className="cws-field" ref={catRef}>
          <label>Select Category</label>
          <div
            className="cws-select cws-select--menu"
            onClick={() => toggleOpen("cat")}
          >
            <span className="cws-select-text">
              {catSelected || "Select Category"}
            </span>
            <span className="material-icons-outlined cws-caret">expand_more</span>

            {openKey === "cat" && (
              <div
                className="cws-popover cws-popover--menu"
                role="listbox"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="cws-popover-search cws-cat-search">
                  <input
                    placeholder="Select Category"
                    value={catQ}
                    onChange={(e)=>setCatQ(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="cws-popover-list cws-cat-list">
                  {filteredCats.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="option"
                      className={`cws-item ${catSelected === c ? "selected" : ""}`}
                      onClick={() => {
                        setCatSelected(c);
                        setOpenKey(null);
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Select Sub Category */}
        <div className="cws-field" ref={subRef}>
          <label>Select Sub Category</label>
          <div className="cws-select" onClick={() => toggleOpen("sub")}>
            <span className="cws-select-text">{selectedSub || "Select Sub Category"}</span>
            <span className="material-icons-outlined cws-caret">expand_more</span>
            {openKey === "sub" && (
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
                        onClick={()=>{ setSelectedSub(sc); setOpenKey(null); }}
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

      {/* ===== Toolbar (left: export + size + search | right: columns) ===== */}
      <div className="cws-tbar">
        <div className="cws-left">
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

          <select
            className="cws-pagesize"
            value={pageSize}
            onChange={(e)=>setPageSize(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {[10,50,100,500,1000].map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <div className="cws-search">
            <input
              placeholder="Search List..."
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
            />
            <span className="material-icons-outlined">search</span>
          </div>
        </div>

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

      {/* Columns popup */}
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
      <div className="cws-table-wrap">
        {loading && <div className="cws-loading">Loading…</div>}
        {(!loading && errorMsg) && <div className="cws-error">{errorMsg}</div>}

        {!loading && !errorMsg && (
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
                <tr key={`${r.sr}-${r.category}-${r.location}`}>
                  {COL_META.filter(c=>isVisible(c.key)).map(c=>{
                    let raw = r[c.key];

                    // derive CGST/SGST/IGST
                    if (c.key === "cgst") raw = r.tax ? Number(r.tax)/2 : 0;
                    if (c.key === "sgst") raw = r.tax ? Number(r.tax)/2 : 0;
                    if (c.key === "igst") raw = 0;

                    // keep Taxable/Tax blank if backend sent "" or null
                    if ((c.key === "taxable" || c.key === "tax") && (raw === "" || raw === null)) {
                      return <td key={c.key} style={{textAlign:c.align}}></td>;
                    }

                    const val = c.format ? c.format(raw ?? 0) : (raw ?? "");
                    return <td key={c.key} style={{textAlign:c.align}}>{val}</td>;
                  })}
                </tr>
              ))}

              {/* Totals row */}
              <tr className="cws-total">
                {COL_META.filter(c=>isVisible(c.key)).map((c, idx) => {
                  if (c.key === "qty") {
                    return <td key={c.key} style={{textAlign:c.align}}>{Number(totalQty).toLocaleString()}</td>;
                  }
                  if (c.key === "taxable") {
                    return <td key={c.key} style={{textAlign:c.align}}></td>;
                  }
                  if (c.key === "tax") {
                    return <td key={c.key} style={{textAlign:c.align}}></td>;
                  }
                  if (c.key === "cgst") {
                    return <td key={c.key} style={{textAlign:c.align}}>{Number(0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>;
                  }
                  if (c.key === "sgst") {
                    return <td key={c.key} style={{textAlign:c.align}}>{Number(0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>;
                  }
                  if (c.key === "igst") {
                    return <td key={c.key} style={{textAlign:c.align}}>{Number(0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>;
                  }
                  if (c.key === "total") {
                    return <td key={c.key} style={{textAlign:c.align}}>{Number(totalAmount).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>;
                  }
                  if (idx === 0) return <td key={c.key} style={{textAlign:"left"}}>Total</td>;
                  return <td key={c.key} />;
                })}
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination (single page) */}
      <div className="cws-pager">
        <button type="button" className="cws-page-btn" disabled>&lt;</button>
        <button type="button" className="cws-page-btn active">1</button>
        <button type="button" className="cws-page-btn" disabled>&gt;</button>
      </div>

      <div className="cws-entries">
        Showing 1 to {Math.min(pageRows.length, appliedRows.length)} of {appliedRows.length} entries
      </div>
    </div>
  );
}
