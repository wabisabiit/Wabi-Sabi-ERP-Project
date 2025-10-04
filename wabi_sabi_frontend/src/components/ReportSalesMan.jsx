import React, { useMemo, useRef, useState, useEffect } from "react";
import "../styles/ReportSalesMan.css";

export default function ReportSalesMan() {
  // ───────── Page / toolbar state ─────────
  const [pageSize, setPageSize] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Export menu
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  // ───────── Filter data & state ─────────
  const LOCATIONS = [
    "All",
    "WABI SABI SUSTAINABILITY",
    "Brands 4 less – Ansal Plaza",
    "Brands 4 less – Rajouri Garden",
    "Brand4Less – Tilak Nagar",
    "Brands 4 less – M3M Urbana",
    "Brands 4 less – IFFCO Chowk",
    "Brands Loot – Udyog Vihar",
    "Brands loot – Krishna Nagar",
  ];
  const [locOpen, setLocOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const [selectedLocs, setSelectedLocs] = useState(["WABI SABI SUSTAINABILITY"]);

  const [drOpen, setDrOpen] = useState(false);
  const [dateRange, setDateRange] = useState("01/04/2025 - 31/03/2026");
  const [fromDate, setFromDate] = useState("01/04/2025");
  const [toDate, setToDate] = useState("31/03/2026");

  const [foOpen, setFoOpen] = useState(false);
  const FILTER_FIELDS = ["Customer Name", "Department", "Category", "Sub Category", "Brand", "Sub Brand"];
  const [filterOption, setFilterOption] = useState("");

  const [smOpen, setSmOpen] = useState(false);
  const [smQuery, setSmQuery] = useState("");
  const SALESMEN = [
    "Krishna Pandit - 9718068241",
    "Nishant - 9658475122",
    "IT Account - 7859456588",
    "Rajdeep - 7827635203",
    "sandeep - 9689652369",
  ];
  const [salesman, setSalesman] = useState("");

  // ───────── Columns (unchanged) ─────────
  const allColumns = [
    { key: "sr", label: "Sr No" },
    { key: "salesman", label: "Salesman Name" },
    { key: "customer", label: "Customer Name" },
    { key: "inv", label: "Invoice No" },
    { key: "date", label: "Date" },
    { key: "product", label: "Product Name" },
    { key: "qty", label: "Qty" },
    { key: "amount", label: "Amount" },
    { key: "taxable", label: "Taxable Amount" },
    { key: "createdBy", label: "Created By" },
    { key: "location", label: "Location" },
    { key: "cat", label: "Category Name", hiddenByDefault: true },
    { key: "subCat", label: "Sub Category Name", hiddenByDefault: true },
    { key: "brand", label: "Brand Name", hiddenByDefault: true },
    { key: "dept", label: "Department Name", hiddenByDefault: true },
    { key: "subBrand", label: "Sub Brand Name", hiddenByDefault: true },
  ];
  const defaultVisible = allColumns.filter(c => !c.hiddenByDefault).map(c => c.key);
  const [visibleCols, setVisibleCols] = useState(new Set(defaultVisible));
  const [colPopup, setColPopup] = useState(false);
  const colBtnRef = useRef(null);

  const toggleCol = (key) =>
    setVisibleCols(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  const restoreVisibility = () => setVisibleCols(new Set(defaultVisible));

  // close popovers on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      const closeIfOutside = (selector, closer) => {
        const el = document.querySelector(selector);
        if (el && !el.contains(e.target)) closer(false);
      };
      closeIfOutside(".sm-colroot", setColPopup);
      closeIfOutside(".sm-locroot", setLocOpen);
      closeIfOutside(".sm-dateroot", setDrOpen);
      closeIfOutside(".sm-foroot", setFoOpen);
      closeIfOutside(".sm-smroot", setSmOpen);
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ───────── Dummy rows (unchanged) ─────────
  const RAW = useMemo(() => {
    const base = {
      salesman: "",
      customer: "Brands 4 less - Rajouri Garden -\nInside -",
      inv: "INV869",
      date: "03/10/2025",
      product: "(925) (L) Heel",
      qty: 1,
      amount: 800.0,
      taxable: 714.29,
      createdBy: "WABI SABI\nSUSTAINABILITY LLP",
      location: "WABI SABI\nSUSTAINABILITY LLP",
    };
    return Array.from({ length: 10 }, (_, i) => ({ sr: i + 1, ...base }));
  }, []);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return RAW;
    const q = search.toLowerCase();
    return RAW.filter(
      (r) =>
        r.customer.toLowerCase().includes(q) ||
        r.inv.toLowerCase().includes(q) ||
        r.product.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.createdBy.toLowerCase().includes(q)
    );
  }, [RAW, search]);

  const totals = useMemo(() => {
    const qty = filteredRows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const amt = filteredRows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const tx = filteredRows.reduce((a, r) => a + (Number(r.taxable) || 0), 0);
    return { qty, amt, tx };
  }, [filteredRows]);

  const ColHead = ({ c }) => (visibleCols.has(c.key) ? <th key={c.key}>{c.label}</th> : null);
  const ColCell = ({ c, row }) => {
    if (!visibleCols.has(c.key)) return null;
    const val = row[c.key] ?? "";
    if (c.key === "inv")
      return (
        <td className="sm-link">
          <button type="button" className="sm-a">{val}</button>
        </td>
      );
    if (c.key === "amount" || c.key === "taxable") return <td className="sm-num">{Number(val).toFixed(2)}</td>;
    if (c.key === "qty") return <td className="sm-num">{val}</td>;
    return <td className="sm-text">{String(val)}</td>;
  };

  // helpers
  const filteredLocs = LOCATIONS.filter(l => l.toLowerCase().includes(locSearch.trim().toLowerCase()));
  const toggleLoc = (l) => {
    if (l === "All") {
      const allOnly = selectedLocs.length === LOCATIONS.length - 1;
      setSelectedLocs(allOnly ? [] : LOCATIONS.filter(x => x !== "All"));
      return;
    }
    setSelectedLocs(prev => (prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]));
  };
  const applyDate = () => {
    setDateRange(`${fromDate} - ${toDate}`);
    setDrOpen(false);
  };

  // download empty file (pdf/excel)
  const downloadEmpty = (fmt) => {
    let filename = "salesman_report";
    let blob;
    if (fmt === "pdf") {
      filename += ".pdf";
      // minimal PDF structure
      const pdf = "%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<<>>endobj\ntrailer<<>>\n%%EOF";
      blob = new Blob([pdf], { type: "application/pdf" });
    } else {
      filename += ".xlsx"; // empty binary as placeholder
      blob = new Blob([""], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    setExportOpen(false);
  };

  // “Search” button inside filter panel (mock apply)
  const applyFilters = () => {
    setLocOpen(false);
    setFoOpen(false);
    setSmOpen(false);
    setDrOpen(false);
    // keep filter panel open (to match your screenshot with KPI visible)
  };

  return (
    <div className="sm-wrap">
      {/* Header */}
      <div className="sm-top">
        <div className="sm-headline">
          <span className="sm-title">Sales Man</span>
          <span className="material-icons-outlined sm-home" aria-hidden="true">home</span>
          <span className="sm-crumb">Reports</span>
        </div>
      </div>

      <div className="sm-surface">
        {/* Toolbar */}
        <div className="sm-toolbar">
          <div className="sm-left sm-colroot">
            <div className="sm-columns" ref={colBtnRef}>
              <button className="sm-colbtn" onClick={() => setColPopup(s => !s)} type="button">
                Columns <span className="material-icons-outlined">arrow_drop_down</span>
              </button>
              {colPopup && (
                <div className="sm-colmenu">
                  <div className="sm-colgrid">
                    <button className="sm-colchip ghost" onClick={restoreVisibility}>Select All</button>
                    {allColumns.filter(c => c.key !== "sr").map(c => {
                      const active = visibleCols.has(c.key);
                      return (
                        <button
                          key={c.key}
                          className={`sm-colchip ${active ? "active" : ""}`}
                          onClick={() => toggleCol(c.key)}
                          type="button"
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <button className="sm-restore" onClick={restoreVisibility}>Restore visibility</button>
                </div>
              )}
            </div>
          </div>

          <div className="sm-right">
            <div className="sm-export" ref={exportRef}>
              <button
                className="sm-iconbtn"
                title="Export"
                type="button"
                onClick={() => setExportOpen(s => !s)}
              >
                <span className="material-icons-outlined">file_download</span>
              </button>
              {exportOpen && (
                <div className="sm-exportmenu">
                  <button onClick={() => downloadEmpty("pdf")} type="button">PDF</button>
                  <button onClick={() => downloadEmpty("excel")} type="button">Excel</button>
                </div>
              )}
            </div>

            <select className="sm-pagesize" value={pageSize} onChange={(e)=>setPageSize(Number(e.target.value))}>
              {[10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button
              className={`sm-filterbtn ${filterOpen ? "active" : ""}`}
              onClick={() => setFilterOpen(s => !s)}
              type="button"
            >
              <span className="material-icons-outlined">filter_list</span>
              <span>Filter</span>
            </button>
            <div className="sm-search">
              <input placeholder="Search List..." value={search} onChange={(e)=>setSearch(e.target.value)} />
              <span className="material-icons-outlined">search</span>
            </div>
          </div>
        </div>

        {/* Filter row UI */}
        {filterOpen && (
          <>
            <div className="sm-filterpanel sm-filterpanel--raised">
              {/* Location */}
              <div className="sm-field sm-locroot">
                <label>Location</label>
                <button className="sm-locpill sm-input-outline" type="button" onClick={()=>setLocOpen(s=>!s)}>
                  <span className="sm-loctext">Select Location</span>
                  <span className="sm-count">{selectedLocs.length}</span>
                  <span className="sm-x-outer"><span className="sm-x">×</span></span>
                </button>
                {locOpen && (
                  <div className="sm-pop sm-locpop">
                    <div className="sm-pop-search">
                      <input placeholder="Search..." value={locSearch} onChange={(e)=>setLocSearch(e.target.value)} />
                    </div>
                    <div className="sm-pop-list">
                      {LOCATIONS.filter(l => l.toLowerCase().includes(locSearch.toLowerCase())).map(l => {
                        const isAll = l === "All";
                        const checked = isAll
                          ? selectedLocs.length === LOCATIONS.length - 1
                          : selectedLocs.includes(l);
                        return (
                          <label key={l} className="sm-checkrow">
                            <input type="checkbox" checked={checked} onChange={()=> {
                              if (isAll) {
                                const allOnly = selectedLocs.length === LOCATIONS.length - 1;
                                setSelectedLocs(allOnly ? [] : LOCATIONS.filter(x=>x!=="All"));
                              } else {
                                setSelectedLocs(prev => prev.includes(l) ? prev.filter(x=>x!==l) : [...prev, l]);
                              }
                            }} />
                            <span>{l}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div className="sm-field sm-dateroot">
                <label>Date Range</label>
                <button className="sm-input sm-input--flat sm-input-outline" type="button" onClick={()=>setDrOpen(s=>!s)}>
                  {dateRange}
                </button>
                {drOpen && (
                  <div className="sm-pop sm-datepop">
                    <div className="sm-dateinputs">
                      <div className="sm-datein with-icon">
                        <span className="material-icons-outlined">calendar_month</span>
                        <input value={fromDate} onChange={(e)=>setFromDate(e.target.value)} />
                      </div>
                      <div className="sm-datein with-icon">
                        <span className="material-icons-outlined">calendar_month</span>
                        <input value={toDate} onChange={(e)=>setToDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="sm-calwrap">
                      <div className="sm-cal">
                        <div className="sm-cal-head">Apr 2025</div>
                        <div className="sm-cal-body filled" />
                        <div className="sm-cal-foot">4 5 6 7 8 9 10</div>
                      </div>
                      <div className="sm-cal">
                        <div className="sm-cal-head">May 2025</div>
                        <div className="sm-cal-body filled" />
                        <div className="sm-cal-foot">1 2 3 4 5 6 7</div>
                      </div>
                    </div>
                    <div className="sm-dateactions">
                      <button className="btn-apply" type="button" onClick={applyDate}>Apply</button>
                      <button className="btn-cancel" type="button" onClick={()=>setDrOpen(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Select Filter Options */}
              <div className="sm-field sm-foroot">
                <label>Select Filter Options</label>
                <input
                  className="sm-input sm-input--flat sm-input-outline"
                  placeholder="Select Filter Options"
                  value={filterOption}
                  onClick={()=>setFoOpen(s=>!s)}
                  onChange={()=>{}}
                  readOnly
                />
                {foOpen && (
                  <div className="sm-pop sm-fopop">
                    {FILTER_FIELDS.map(f => (
                      <button
                        key={f}
                        className={`sm-foitem ${filterOption === f ? "active" : ""}`}
                        onClick={()=>{ setFilterOption(f); setFoOpen(false); }}
                        type="button"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Salesman Name */}
              <div className="sm-field sm-smroot">
                <label>Salesman Name</label>
                <div className="sm-select sm-select--flat sm-input-outline" role="button" onClick={()=>setSmOpen(s=>!s)}>
                  <input
                    className="sm-select-input"
                    placeholder="Search Employee"
                    value={salesman ? salesman : smQuery}
                    onChange={(e)=>{ setSmQuery(e.target.value); setSalesman(""); setSmOpen(true); }}
                  />
                  <span className="material-icons-outlined">keyboard_arrow_down</span>
                </div>
                {smOpen && (
                  <div className="sm-pop sm-smpop">
                    <div className="sm-smsearching">Searching...</div>
                    <div className="sm-pop-list">
                      {SALESMEN.filter(s => s.toLowerCase().includes(smQuery.toLowerCase())).map(s => (
                        <button
                          key={s}
                          className={`sm-smitem ${salesman === s ? "active" : ""}`}
                          onClick={()=>{ setSalesman(s); setSmOpen(false); }}
                          type="button"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Apply/Search button */}
            <div className="sm-applyrow">
              <button className="btn-apply" type="button" onClick={applyFilters}>Search</button>
            </div>

            {/* KPI row: shown with Filter open */}
            <div className="sm-kpis sm-kpis--bar">
              <div className="sm-kcell"><div className="sm-klabel">Target</div><div className="sm-kval neg">0.00</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Total Sales</div><div className="sm-kval pos">10279965.61</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Difference</div><div className="sm-kval blue">-10279965.61</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Wages</div><div className="sm-kval neg">0.00</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Commission</div><div className="sm-kval pos">0.00</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Extra Wages</div><div className="sm-kval blue">0.00</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Total Salary</div><div className="sm-kval neg">0.00</div></div>
              <div className="sm-kcell"><div className="sm-klabel">% Of Sale</div><div className="sm-kval pos">0.00</div></div>
            </div>
          </>
        )}

        {/* Table */}
        <div className="sm-tablewrap">
          <table className="sm-table">
            <thead>
              <tr>{allColumns.map((c) => <ColHead key={c.key} c={c} />)}</tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.sr}>
                  {allColumns.map((c) => <ColCell key={c.key} c={c} row={r} />)}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {(() => {
                  const visible = allColumns.filter((c) => visibleCols.has(c.key)).map((c) => c.key);
                  const qtyIndex = visible.indexOf("qty");
                  const span = Math.max(qtyIndex, 1);
                  return (
                    <>
                      <td className="sm-total" colSpan={span}>Total</td>
                      {visible.includes("qty") && <td className="sm-num">{totals.qty}</td>}
                      {visible.includes("amount") && <td className="sm-num">{totals.amt.toFixed(0)}</td>}
                      {visible.includes("taxable") && <td className="sm-num">{Number(totals.tx.toFixed(1))}</td>}
                      {visible.slice(visible.indexOf("taxable") + 1).map((k, i) => <td key={k + i}></td>)}
                    </>
                  );
                })()}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="sm-footer">
          <div className="sm-showing">Showing 1 to {Math.min(pageSize, filteredRows.length)} of 10 entries</div>
          <div className="sm-pager">
            <button className="pg" disabled><span className="material-icons-outlined">chevron_left</span></button>
            <button className="pg active">1</button>
            <button className="pg"><span className="material-icons-outlined">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
