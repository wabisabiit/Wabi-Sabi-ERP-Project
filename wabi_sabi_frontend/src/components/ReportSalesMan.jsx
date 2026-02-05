import React, { useMemo, useRef, useState, useEffect } from "react";
import "../styles/ReportSalesMan.css";
import { listLocations, listEmployees, listSalesmanReport } from "../api/client";

export default function ReportSalesMan() {
  // ───────── Page / toolbar state ─────────
  const [pageSize, setPageSize] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Export menu
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  // ───────── Filter data & state ─────────
  const [LOCATIONS, setLOCATIONS] = useState(["All"]); // ✅ backend-driven
  const [locOpen, setLocOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const [selectedLocs, setSelectedLocs] = useState([]); // ✅ default = ALL data (no filter)

  const [drOpen, setDrOpen] = useState(false);
  const [dateRange, setDateRange] = useState("01/04/2025 - 31/03/2026");
  const [fromDate, setFromDate] = useState("01/04/2025");
  const [toDate, setToDate] = useState("31/03/2026");

  const [foOpen, setFoOpen] = useState(false);
  const FILTER_FIELDS = [
    "Customer Name",
    "Department",
    "Category",
    "Sub Category",
    "Brand",
    "Sub Brand",
  ];
  const [filterOption, setFilterOption] = useState("");

  // Salesman dropdown (API)
  const [smOpen, setSmOpen] = useState(false);
  const [smQuery, setSmQuery] = useState("");
  const [smLoading, setSmLoading] = useState(false);
  const [smErr, setSmErr] = useState("");
  const [SALESMEN, setSALESMEN] = useState([]); // [{id,label,name,phone}]
  const [salesman, setSalesman] = useState(null); // selected object

  // ───────── Data state (API) ─────────
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const [kpi, setKpi] = useState({
    target: 0,
    total_sales: 0,
    difference: 0,
    wages: 0,
    commission: 0,
    extra_wages: 0,
    total_salary: 0,
    percent_of_sale: 0,
  });

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
  const defaultVisible = allColumns
    .filter((c) => !c.hiddenByDefault)
    .map((c) => c.key);
  const [visibleCols, setVisibleCols] = useState(new Set(defaultVisible));
  const [colPopup, setColPopup] = useState(false);
  const colBtnRef = useRef(null);

  const toggleCol = (key) =>
    setVisibleCols((prev) => {
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
      if (exportRef.current && !exportRef.current.contains(e.target))
        setExportOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ───────── Helpers ─────────
  const dmyToYmd = (s) => {
    const v = String(s || "").trim();
    const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return v; // if user already typed YYYY-MM-DD, keep it
    const dd = m[1];
    const mm = m[2];
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  };

  const isAllSelected = useMemo(() => {
    const list = (LOCATIONS || []).filter((x) => x !== "All");
    return selectedLocs.length === list.length && list.length > 0;
  }, [LOCATIONS, selectedLocs]);

  const filteredLocs = useMemo(() => {
    const q = locSearch.trim().toLowerCase();
    return (LOCATIONS || []).filter((l) => l.toLowerCase().includes(q));
  }, [LOCATIONS, locSearch]);

  const applyDate = () => {
    setDateRange(`${fromDate} - ${toDate}`);
    setDrOpen(false);
  };

  const toggleLoc = (l) => {
    if (l === "All") {
      const allOnly = selectedLocs.length === LOCATIONS.length - 1;
      setSelectedLocs(allOnly ? [] : LOCATIONS.filter((x) => x !== "All"));
      return;
    }
    setSelectedLocs((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );
  };

  // ───────── Load locations from backend (backend-driven list) ─────────
  useEffect(() => {
    (async () => {
      try {
        const locs = await listLocations();
        const arr = Array.isArray(locs)
          ? locs
          : locs?.results || locs?.data || [];
        const names = arr
          .map((x) => x?.name || x?.code || "")
          .map((s) => String(s).trim())
          .filter(Boolean);

        if (names.length) {
          const merged = ["All", ...Array.from(new Set(names))];
          setLOCATIONS(merged);
          // ✅ IMPORTANT: do NOT auto-select any location (default shows ALL data)
        } else {
          setLOCATIONS(["All"]);
        }
      } catch {
        // keep existing LOCATIONS if backend not available
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────── Load salesmen list (searchable) ─────────
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      // only fetch when dropdown is open OR user typed something
      if (!smOpen && !smQuery.trim()) return;

      setSmLoading(true);
      setSmErr("");
      try {
        const res = await listEmployees({ search: smQuery.trim() });
        const arr = Array.isArray(res)
          ? res
          : res?.results || res?.data || res?.items || [];
        const mapped = arr
          .map((e) => {
            const name =
              e?.name ||
              e?.full_name ||
              e?.user?.username ||
              e?.user?.first_name ||
              "";
            const phone = e?.phone || e?.mobile || e?.contact_no || "";
            const label = `${String(name || "").trim()}${
              phone ? ` - ${phone}` : ""
            }`.trim();
            return {
              id: e?.id,
              name: String(name || "").trim(),
              phone: String(phone || "").trim(),
              label,
            };
          })
          .filter((x) => x.id && x.label);

        if (alive) setSALESMEN(mapped);
      } catch (e) {
        if (alive)
          setSmErr(String(e?.message || "Failed to load employees."));
      } finally {
        if (alive) setSmLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [smQuery, smOpen]);

  // ───────── Fetch report data ─────────
  const fetchReport = async ({ keepPanelOpen = true } = {}) => {
    setLoading(true);
    setLoadErr("");
    try {
      const params = {
        date_from: dmyToYmd(fromDate),
        date_to: dmyToYmd(toDate),
      };

      // locations: if all selected OR nothing selected => send nothing (means "all")
      if (selectedLocs.length && !isAllSelected) {
        params.location = selectedLocs;
      }

      if (salesman?.id) params.salesman = salesman.id;

      // backend invoice search only: we send q
      const q = String(search || "").trim();
      if (q) params.q = q;

      const res = await listSalesmanReport(params);
      const resultRows = res?.results || [];
      const totals = res?.totals || {};

      setRows(resultRows);
      setKpi({
        target: totals?.target ?? 0,
        total_sales: totals?.total_sales ?? 0,
        difference: totals?.difference ?? 0,
        wages: totals?.wages ?? 0,
        commission: totals?.commission ?? 0,
        extra_wages: totals?.extra_wages ?? 0,
        total_salary: totals?.total_salary ?? 0,
        percent_of_sale: totals?.percent_of_sale ?? 0,
      });

      if (!keepPanelOpen) setFilterOpen(false);
    } catch (e) {
      setLoadErr(String(e?.message || "Failed to load report."));
      setRows([]);
      setKpi({
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

  // ✅ Default load: show ALL data on page open
  useEffect(() => {
    fetchReport({ keepPanelOpen: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // “Search” button inside filter panel (real apply)
  const applyFilters = () => {
    setLocOpen(false);
    setFoOpen(false);
    setSmOpen(false);
    setDrOpen(false);
    fetchReport({ keepPanelOpen: true });
  };

  // ───────── Rows + client-side quick filter (kept) ─────────
  const RAW = useMemo(() => rows || [], [rows]);

  const filteredRows = useMemo(() => {
    // keep your UI search behavior on screen,
    // but backend uses q for invoice-only when pressing Search in filter
    if (!search.trim()) return RAW;
    const q = search.toLowerCase();
    return RAW.filter(
      (r) =>
        String(r.customer || "").toLowerCase().includes(q) ||
        String(r.inv || "").toLowerCase().includes(q) ||
        String(r.product || "").toLowerCase().includes(q) ||
        String(r.location || "").toLowerCase().includes(q) ||
        String(r.createdBy || "").toLowerCase().includes(q)
    );
  }, [RAW, search]);

  const totals = useMemo(() => {
    const qty = filteredRows.reduce((a, r) => a + (Number(r.qty) || 0), 0);
    const amt = filteredRows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
    const tx = filteredRows.reduce((a, r) => a + (Number(r.taxable) || 0), 0);
    return { qty, amt, tx };
  }, [filteredRows]);

  const ColHead = ({ c }) =>
    visibleCols.has(c.key) ? <th key={c.key}>{c.label}</th> : null;
  const ColCell = ({ c, row }) => {
    if (!visibleCols.has(c.key)) return null;
    const val = row[c.key] ?? "";
    if (c.key === "inv")
      return (
        <td className="sm-link">
          <button type="button" className="sm-a">
            {val}
          </button>
        </td>
      );
    if (c.key === "amount" || c.key === "taxable")
      return (
        <td className="sm-num">{Number(val || 0).toFixed(2)}</td>
      );
    if (c.key === "qty") return <td className="sm-num">{val}</td>;
    return <td className="sm-text">{String(val)}</td>;
  };

  // download empty file (pdf/excel) — left as-is
  const downloadEmpty = (fmt) => {
    let filename = "salesman_report";
    let blob;
    if (fmt === "pdf") {
      filename += ".pdf";
      const pdf =
        "%PDF-1.4\n1 0 obj<<>>endobj\n2 0 obj<<>>endobj\ntrailer<<>>\n%%EOF";
      blob = new Blob([pdf], { type: "application/pdf" });
    } else {
      filename += ".xlsx";
      blob = new Blob([""], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
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

  return (
    <div className="sm-wrap">
      {/* Header */}
      <div className="sm-top">
        <div className="sm-headline">
          <span className="sm-title">Sales Man</span>
          <span
            className="material-icons-outlined sm-home"
            aria-hidden="true"
          >
            home
          </span>
          <span className="sm-crumb">Reports</span>
        </div>
      </div>

      <div className="sm-surface">
        {/* Toolbar */}
        <div className="sm-toolbar">
          <div className="sm-left sm-colroot">
            <div className="sm-columns" ref={colBtnRef}>
              <button
                className="sm-colbtn"
                onClick={() => setColPopup((s) => !s)}
                type="button"
              >
                Columns{" "}
                <span className="material-icons-outlined">
                  arrow_drop_down
                </span>
              </button>
              {colPopup && (
                <div className="sm-colmenu">
                  <div className="sm-colgrid">
                    <button
                      className="sm-colchip ghost"
                      onClick={restoreVisibility}
                    >
                      Select All
                    </button>
                    {allColumns
                      .filter((c) => c.key !== "sr")
                      .map((c) => {
                        const active = visibleCols.has(c.key);
                        return (
                          <button
                            key={c.key}
                            className={`sm-colchip ${
                              active ? "active" : ""
                            }`}
                            onClick={() => toggleCol(c.key)}
                            type="button"
                          >
                            {c.label}
                          </button>
                        );
                      })}
                  </div>
                  <button className="sm-restore" onClick={restoreVisibility}>
                    Restore visibility
                  </button>
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
                onClick={() => setExportOpen((s) => !s)}
              >
                <span className="material-icons-outlined">file_download</span>
              </button>
              {exportOpen && (
                <div className="sm-exportmenu">
                  <button onClick={() => downloadEmpty("pdf")} type="button">
                    PDF
                  </button>
                  <button
                    onClick={() => downloadEmpty("excel")}
                    type="button"
                  >
                    Excel
                  </button>
                </div>
              )}
            </div>

            <select
              className="sm-pagesize"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              className={`sm-filterbtn ${filterOpen ? "active" : ""}`}
              onClick={() => setFilterOpen((s) => !s)}
              type="button"
            >
              <span className="material-icons-outlined">filter_list</span>
              <span>Filter</span>
            </button>
            <div className="sm-search">
              <input
                placeholder="Search List..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                <button
                  className="sm-locpill sm-input-outline"
                  type="button"
                  onClick={() => setLocOpen((s) => !s)}
                >
                  <span className="sm-loctext">Select Location</span>
                  <span className="sm-count">{selectedLocs.length}</span>
                  <span className="sm-x-outer">
                    <span className="sm-x">×</span>
                  </span>
                </button>
                {locOpen && (
                  <div className="sm-pop sm-locpop">
                    <div className="sm-pop-search">
                      <input
                        placeholder="Search..."
                        value={locSearch}
                        onChange={(e) => setLocSearch(e.target.value)}
                      />
                    </div>
                    <div className="sm-pop-list">
                      {filteredLocs.map((l) => {
                        const isAll = l === "All";
                        const checked = isAll
                          ? selectedLocs.length === LOCATIONS.length - 1
                          : selectedLocs.includes(l);
                        return (
                          <label key={l} className="sm-checkrow">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleLoc(l)}
                            />
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
                <button
                  className="sm-input sm-input--flat sm-input-outline"
                  type="button"
                  onClick={() => setDrOpen((s) => !s)}
                >
                  {dateRange}
                </button>
                {drOpen && (
                  <div className="sm-pop sm-datepop">
                    <div className="sm-dateinputs">
                      <div className="sm-datein with-icon">
                        <span className="material-icons-outlined">
                          calendar_month
                        </span>
                        <input
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                        />
                      </div>
                      <div className="sm-datein with-icon">
                        <span className="material-icons-outlined">
                          calendar_month
                        </span>
                        <input
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="sm-dateactions">
                      <button
                        className="btn-apply"
                        type="button"
                        onClick={applyDate}
                      >
                        Apply
                      </button>
                      <button
                        className="btn-cancel"
                        type="button"
                        onClick={() => setDrOpen(false)}
                      >
                        Cancel
                      </button>
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
                  onClick={() => setFoOpen((s) => !s)}
                  onChange={() => {}}
                  readOnly
                />
                {foOpen && (
                  <div className="sm-pop sm-fopop">
                    {FILTER_FIELDS.map((f) => (
                      <button
                        key={f}
                        className={`sm-foitem ${
                          filterOption === f ? "active" : ""
                        }`}
                        onClick={() => {
                          setFilterOption(f);
                          setFoOpen(false);
                        }}
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
                <div
                  className="sm-select sm-select--flat sm-input-outline"
                  role="button"
                  onClick={() => setSmOpen((s) => !s)}
                >
                  <input
                    className="sm-select-input"
                    placeholder="Search Employee"
                    value={salesman ? salesman.label : smQuery}
                    onChange={(e) => {
                      setSmQuery(e.target.value);
                      setSalesman(null);
                      setSmOpen(true);
                    }}
                  />
                  <span className="material-icons-outlined">
                    keyboard_arrow_down
                  </span>
                </div>

                {smOpen && (
                  <div className="sm-pop sm-smpop">
                    <div className="sm-smsearching">
                      {smLoading
                        ? "Searching..."
                        : smErr
                        ? smErr
                        : "Select Employee"}
                    </div>
                    <div className="sm-pop-list sm-pop-list--tall">
                      {(SALESMEN || [])
                        .filter((s) =>
                          s.label
                            .toLowerCase()
                            .includes(smQuery.toLowerCase())
                        )
                        .map((s) => (
                          <button
                            key={s.id}
                            className={`sm-smitem ${
                              salesman?.id === s.id ? "active" : ""
                            }`}
                            onClick={() => {
                              setSalesman(s);
                              setSmOpen(false);
                            }}
                            type="button"
                          >
                            {s.label}
                          </button>
                        ))}
                      {!smLoading &&
                        !smErr &&
                        (SALESMEN || []).length === 0 && (
                          <div className="sm-minirow">
                            No employees found.
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Apply/Search button */}
            <div className="sm-applyrow">
              <button
                className="btn-apply"
                type="button"
                onClick={applyFilters}
              >
                {loading ? (
                  <>
                    <span className="sm-spinner sm-spinner--btn" /> Searching...
                  </>
                ) : (
                  "Search"
                )}
              </button>
            </div>

            {/* KPI row: now real backend totals */}
            <div className="sm-kpis sm-kpis--bar">
              <div className="sm-kcell">
                <div className="sm-klabel">Target</div>
                <div className="sm-kval neg">
                  {Number(kpi.target || 0).toFixed(2)}
                </div>
              </div>
              <div className="sm-kcell">
                <div className="sm-klabel">Total Sales</div>
                <div className="sm-kval pos">
                  {Number(kpi.total_sales || 0).toFixed(2)}
                </div>
              </div>
              <div className="sm-kcell">
                <div className="sm-klabel">Difference</div>
                <div className="sm-kval blue">
                  {Number(kpi.difference || 0).toFixed(2)}
                </div>
              </div>
              <div className="sm-kcell">
                <div className="sm-klabel">Wages</div>
                <div className="sm-kval neg">
                  {Number(kpi.wages || 0).toFixed(2)}
                </div>
              </div>
              <div className="sm-kcell">
                <div className="sm-klabel">Commission</div>
                <div className="sm-kval pos">
                  {Number(kpi.commission || 0).toFixed(2)}
                </div>
              </div>
              <div className="sm-kcell">
                <div className="sm-klabel">Extra Wages</div>
                <div className="sm-kval blue">
                  {Number(kpi.extra_wages || 0).toFixed(2)}
                </div>
              </div>
              <div className="sm-kcell">
                <div className="sm-klabel">Total Salary</div>
                <div className="sm-kval neg">
                  {Number(kpi.total_salary || 0).toFixed(2)}
                </div>
              </div>
              <div className="sm-kcell">
                <div className="sm-klabel">% Of Sale</div>
                <div className="sm-kval pos">
                  {Number(kpi.percent_of_sale || 0).toFixed(2)}
                </div>
              </div>
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
          {!loading && !!loadErr && <div className="sm-empty">{loadErr}</div>}
          {!loading && !loadErr && filteredRows.length === 0 && (
            <div className="sm-empty">No data.</div>
          )}

          <table className="sm-table">
            <thead>
              <tr>
                {allColumns.map((c) => (
                  <ColHead key={c.key} c={c} />
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.slice(0, pageSize).map((r, idx) => (
                <tr key={`${r.sr || idx}-${r.inv || ""}`}>
                  {allColumns.map((c) => (
                    <ColCell key={c.key} c={c} row={r} />
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {(() => {
                  const visible = allColumns
                    .filter((c) => visibleCols.has(c.key))
                    .map((c) => c.key);
                  const qtyIndex = visible.indexOf("qty");
                  const span = Math.max(qtyIndex, 1);
                  return (
                    <>
                      <td className="sm-total" colSpan={span}>
                        Total
                      </td>
                      {visible.includes("qty") && (
                        <td className="sm-num">{totals.qty}</td>
                      )}
                      {visible.includes("amount") && (
                        <td className="sm-num">{totals.amt.toFixed(0)}</td>
                      )}
                      {visible.includes("taxable") && (
                        <td className="sm-num">
                          {Number(totals.tx.toFixed(1))}
                        </td>
                      )}
                      {visible
                        .slice(visible.indexOf("taxable") + 1)
                        .map((k, i) => (
                          <td key={k + i}></td>
                        ))}
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
            Showing {filteredRows.length ? 1 : 0} to{" "}
            {Math.min(pageSize, filteredRows.length)} of {filteredRows.length}{" "}
            entries
          </div>
          <div className="sm-pager">
            <button className="pg" disabled>
              <span className="material-icons-outlined">chevron_left</span>
            </button>
            <button className="pg active">1</button>
            <button className="pg" disabled>
              <span className="material-icons-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
