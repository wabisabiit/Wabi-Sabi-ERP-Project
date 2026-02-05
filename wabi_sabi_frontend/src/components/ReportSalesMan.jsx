import React, { useMemo, useRef, useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/ReportSalesMan.css";
import { listLocations, listSalesmanSalesReport, listSalesmenForReport } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function ReportSalesMan() {
  const navigate = useNavigate();

  // ───────── Page / toolbar state ─────────
  const [pageSize, setPageSize] = useState(10);
  const [filterOpen, setFilterOpen] = useState(true);
  const [search, setSearch] = useState("");

  // Export menu
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  // ───────── Remote lists ─────────
  const [locations, setLocations] = useState([]); // {id, code, name}
  const [salesmen, setSalesmen] = useState([]);   // {id,label,...}
  const [loadingLists, setLoadingLists] = useState(true);

  // ───────── Filter state ─────────
  const [locOpen, setLocOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const [selectedLocs, setSelectedLocs] = useState([]); // ✅ default all

  const [drOpen, setDrOpen] = useState(false);
  const [dateRange, setDateRange] = useState([new Date("2025-04-01"), new Date("2026-03-31")]);
  const [tmpRange, setTmpRange] = useState([new Date("2025-04-01"), new Date("2026-03-31")]);

  const [smOpen, setSmOpen] = useState(false);
  const [smQuery, setSmQuery] = useState("");
  const [salesman, setSalesman] = useState(null); // {id,label}

  // ───────── Data state ─────────
  const [rows, setRows] = useState([]);
  const [kpis, setKpis] = useState({
    target: 0,
    total_sales: 0,
    difference: 0,
    wages: 0,
    commission: 0,
    extra_wages: 0,
    total_salary: 0,
    percent_of_sale: 0,
  });
  const [loading, setLoading] = useState(false);

  // ───────── Columns (keep same keys) ─────────
  const allColumns = [
    { key: "sr", label: "Sr No" },
    { key: "salesman", label: "Salesman Name" },
    { key: "customer", label: "Customer Name" }, // ✅ outlet name
    { key: "inv", label: "Invoice No" },
    { key: "date", label: "Date" },
    { key: "product", label: "Product Name" },   // ✅ link to invoice
    { key: "qty", label: "Qty" },
    { key: "amount", label: "Amount" },
    { key: "taxable", label: "Taxable Amount" },
    { key: "createdBy", label: "Created By" },   // ✅ outlet name
    { key: "location", label: "Location" },
  ];

  const defaultVisible = allColumns.map(c => c.key);
  const [visibleCols, setVisibleCols] = useState(new Set(defaultVisible));
  const [colPopup, setColPopup] = useState(false);

  const toggleCol = (key) =>
    setVisibleCols(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

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
      closeIfOutside(".sm-smroot", setSmOpen);
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ✅ Load locations + salesmen for dropdown
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingLists(true);
        const [locs, sms] = await Promise.all([
          listLocations(),
          listSalesmenForReport(),
        ]);
        if (!alive) return;
        setLocations(Array.isArray(locs) ? locs : []);
        setSalesmen(Array.isArray(sms?.results) ? sms.results : []);
      } catch (e) {
        console.error("Salesman report lists load failed:", e);
      } finally {
        if (alive) setLoadingLists(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const fmtYMD = (d) => {
    const dt = (d instanceof Date) ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // ✅ Fetch report
  const fetchReport = async () => {
    try {
      setLoading(true);

      const locParams =
        selectedLocs.length
          ? selectedLocs.map((x) => x.code || x.name).filter(Boolean)
          : []; // ✅ empty means "all"

      const res = await listSalesmanSalesReport({
        date_from: fmtYMD(dateRange[0]),
        date_to: fmtYMD(dateRange[1]),
        location: locParams,
        salesman_id: salesman?.id || "",
        q: (search || "").trim(), // ✅ invoice search
        all: 1,
      });

      setRows(Array.isArray(res?.results) ? res.results : []);
      setKpis(res?.kpis || {
        target: 0, total_sales: 0, difference: 0, wages: 0, commission: 0,
        extra_wages: 0, total_salary: 0, percent_of_sale: 0,
      });
    } catch (e) {
      console.error("Salesman report load failed:", e);
      setRows([]);
      setKpis({
        target: 0,
        total_sales: 0,
        difference: 0,
        wages: 0,
        commission: 0,
        extra_wages: 0,
        total_salary: 0,
        percent_of_sale: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const qty = rows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const amt = rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const tx = rows.reduce((a, r) => a + (Number(r.taxable) || 0), 0);
    return { qty, amt, tx };
  }, [rows]);

  const ColHead = ({ c }) => (visibleCols.has(c.key) ? <th key={c.key}>{c.label}</th> : null);

  const openInvoice = (invNo) => {
    const safe = String(invNo || "").trim();
    if (!safe) return;
    // navigate to any invoice details page you already have, else keep noop:
    try { navigate(`/sales?invoice=${encodeURIComponent(safe)}`); } catch {}
  };

  const ColCell = ({ c, row }) => {
    if (!visibleCols.has(c.key)) return null;
    const val = row[c.key] ?? "";

    if (c.key === "inv") {
      return (
        <td className="sm-link">
          <button type="button" className="sm-a" onClick={() => openInvoice(row.inv)}>
            {val}
          </button>
        </td>
      );
    }

    if (c.key === "product") {
      return (
        <td className="sm-link">
          <button type="button" className="sm-a" onClick={() => openInvoice(row.inv)}>
            {String(val)}
          </button>
        </td>
      );
    }

    if (c.key === "amount" || c.key === "taxable") {
      return <td className="sm-num">{Number(val).toFixed(2)}</td>;
    }

    if (c.key === "qty") return <td className="sm-num">{val}</td>;
    return <td className="sm-text">{String(val)}</td>;
  };

  // ✅ Location helpers (multi-select)
  const filteredLocs = useMemo(() => {
    const q = locSearch.trim().toLowerCase();
    return locations.filter((l) => {
      const name = (l?.name || "").toLowerCase();
      const code = (l?.code || "").toLowerCase();
      return !q || name.includes(q) || code.includes(q);
    });
  }, [locations, locSearch]);

  const locChecked = (loc) => selectedLocs.some((x) => x.id === loc.id);

  const toggleLoc = (loc) => {
    setSelectedLocs((prev) => {
      const on = prev.some((x) => x.id === loc.id);
      return on ? prev.filter((x) => x.id !== loc.id) : [...prev, loc];
    });
  };

  // ✅ Salesman dropdown (scrollable)
  const filteredSalesmen = useMemo(() => {
    const q = smQuery.trim().toLowerCase();
    return salesmen.filter((s) => !q || String(s.label || "").toLowerCase().includes(q));
  }, [salesmen, smQuery]);

  // download empty file (kept)
  const downloadEmpty = (fmt) => {
    let filename = "salesman_report";
    let blob;
    if (fmt === "pdf") {
      filename += ".pdf";
      const pdf = "%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<<>>endobj\ntrailer<<>>\n%%EOF";
      blob = new Blob([pdf], { type: "application/pdf" });
    } else {
      filename += ".xlsx";
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

  const applyDate = () => {
    setDateRange(tmpRange);
    setDrOpen(false);
  };

  const applyFilters = () => {
    fetchReport();
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
            <div className="sm-columns">
              <button className="sm-colbtn" onClick={() => setColPopup(s => !s)} type="button">
                Columns <span className="material-icons-outlined">arrow_drop_down</span>
              </button>
              {colPopup && (
                <div className="sm-colmenu">
                  <div className="sm-colgrid">
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
              <input
                placeholder="Search List..."
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                onKeyDown={(e)=> e.key === "Enter" && fetchReport()}
              />
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
                  <span className="sm-loctext">{selectedLocs.length ? "Selected" : "All Locations"}</span>
                  <span className="sm-count">{selectedLocs.length}</span>
                  <span className="sm-x-outer"><span className="sm-x">×</span></span>
                </button>

                {locOpen && (
                  <div className="sm-pop sm-locpop">
                    <div className="sm-pop-search">
                      <input placeholder="Search..." value={locSearch} onChange={(e)=>setLocSearch(e.target.value)} />
                    </div>

                    <div className="sm-pop-list">
                      {loadingLists ? (
                        <div className="sm-minirow"><span className="sm-spinner" /> Loading...</div>
                      ) : (
                        filteredLocs.map((l) => (
                          <label key={l.id} className="sm-checkrow">
                            <input type="checkbox" checked={locChecked(l)} onChange={()=>toggleLoc(l)} />
                            <span>{l.code} — {l.name}</span>
                          </label>
                        ))
                      )}
                    </div>

                    <div className="sm-pop-actions">
                      <button className="btn-cancel" type="button" onClick={()=>setSelectedLocs([])}>Clear</button>
                      <button className="btn-apply" type="button" onClick={()=>setLocOpen(false)}>Done</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div className="sm-field sm-dateroot">
                <label>Date Range</label>
                <button className="sm-input sm-input--flat sm-input-outline" type="button" onClick={()=>{ setTmpRange(dateRange); setDrOpen(s=>!s); }}>
                  {`${dateRange[0]?.toLocaleDateString("en-GB")} - ${dateRange[1]?.toLocaleDateString("en-GB")}`}
                </button>

                {drOpen && (
                  <div className="sm-pop sm-datepop">
                    <div className="sm-datepickerbox">
                      <DatePicker
                        selected={tmpRange[0]}
                        onChange={(update) => setTmpRange(update)}
                        startDate={tmpRange[0]}
                        endDate={tmpRange[1]}
                        selectsRange
                        inline
                      />
                    </div>
                    <div className="sm-dateactions">
                      <button className="btn-apply" type="button" onClick={applyDate}>Apply</button>
                      <button className="btn-cancel" type="button" onClick={()=>setDrOpen(false)}>Cancel</button>
                    </div>
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
                    value={salesman ? salesman.label : smQuery}
                    onChange={(e)=>{ setSmQuery(e.target.value); setSalesman(null); setSmOpen(true); }}
                  />
                  <span className="material-icons-outlined">keyboard_arrow_down</span>
                </div>

                {smOpen && (
                  <div className="sm-pop sm-smpop">
                    <div className="sm-pop-search">
                      <input
                        placeholder="Search..."
                        value={smQuery}
                        onChange={(e)=>setSmQuery(e.target.value)}
                      />
                    </div>

                    <div className="sm-pop-list sm-pop-list--tall">
                      {loadingLists ? (
                        <div className="sm-minirow"><span className="sm-spinner" /> Loading...</div>
                      ) : (
                        <>
                          <button
                            className={`sm-smitem ${!salesman ? "active" : ""}`}
                            type="button"
                            onClick={()=>{ setSalesman(null); setSmOpen(false); }}
                          >
                            All Salesmen
                          </button>

                          {filteredSalesmen.map(s => (
                            <button
                              key={s.id}
                              className={`sm-smitem ${salesman?.id === s.id ? "active" : ""}`}
                              onClick={()=>{ setSalesman(s); setSmOpen(false); }}
                              type="button"
                            >
                              {s.label}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Spacer (keep grid 4 cols look) */}
              <div className="sm-field sm-field--ghost" />
            </div>

            {/* Apply/Search button */}
            <div className="sm-applyrow">
              <button className="btn-apply" type="button" onClick={applyFilters} disabled={loading}>
                {loading ? (<><span className="sm-spinner sm-spinner--btn" /> Loading</>) : "Search"}
              </button>
            </div>

            {/* KPI row */}
            <div className="sm-kpis sm-kpis--bar">
              <div className="sm-kcell"><div className="sm-klabel">Target</div><div className="sm-kval neg">{Number(kpis.target||0).toFixed(2)}</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Total Sales</div><div className="sm-kval pos">{Number(kpis.total_sales||0).toFixed(2)}</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Difference</div><div className="sm-kval blue">{Number(kpis.difference||0).toFixed(2)}</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Wages</div><div className="sm-kval neg">{Number(kpis.wages||0).toFixed(2)}</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Commission</div><div className="sm-kval pos">{Number(kpis.commission||0).toFixed(2)}</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Extra Wages</div><div className="sm-kval blue">{Number(kpis.extra_wages||0).toFixed(2)}</div></div>
              <div className="sm-kcell"><div className="sm-klabel">Total Salary</div><div className="sm-kval neg">{Number(kpis.total_salary||0).toFixed(2)}</div></div>
              <div className="sm-kcell"><div className="sm-klabel">% Of Sale</div><div className="sm-kval pos">{Number(kpis.percent_of_sale||0).toFixed(2)}</div></div>
            </div>
          </>
        )}

        {/* Table */}
        <div className="sm-tablewrap">
          {loading && (
            <div className="sm-tableloading">
              <span className="sm-spinner" /> Loading report...
            </div>
          )}

          <table className="sm-table">
            <thead>
              <tr>{allColumns.map((c) => <ColHead key={c.key} c={c} />)}</tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td className="sm-empty" colSpan={allColumns.filter(c => visibleCols.has(c.key)).length || 1}>
                    No data found.
                  </td>
                </tr>
              ) : (
                rows.slice(0, pageSize).map((r) => (
                  <tr key={`${r.sr}-${r.inv}-${r.product}`}>
                    {allColumns.map((c) => <ColCell key={c.key} c={c} row={r} />)}
                  </tr>
                ))
              )}
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
                      {visible.includes("amount") && <td className="sm-num">{totals.amt.toFixed(2)}</td>}
                      {visible.includes("taxable") && <td className="sm-num">{totals.tx.toFixed(2)}</td>}
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
          <div className="sm-showing">
            Showing 1 to {Math.min(pageSize, rows.length)} of {rows.length} entries
          </div>
          <div className="sm-pager">
            <button className="pg" disabled><span className="material-icons-outlined">chevron_left</span></button>
            <button className="pg active">1</button>
            <button className="pg" disabled={rows.length <= pageSize}><span className="material-icons-outlined">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
