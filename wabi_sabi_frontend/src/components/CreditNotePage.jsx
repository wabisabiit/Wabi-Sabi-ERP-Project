// src/components/CreditNotePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/CreditNotePage.css";
import { listCreditNotes } from "../api/client";

// Helpers
const fmtMoney = (v) => Number(v || 0).toFixed(2);
const isoDate = (d) => (d ? new Date(d).toLocaleDateString() : "");

/* 🔹 Inline loading spinner for table */
function CreditNoteLoadingInline() {
  return (
    <span className="cnp-loading-inline">
      <span className="cnp-spinner" />
      Loading…
    </span>
  );
}

export default function CreditNotePage() {
  // toolbar popovers
  const [exportOpen, setExportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const exportRef = useRef(null);

  // date range (01/04/2025 - 31/03/2026)
  const defaultStart = new Date(2025, 3, 1); // months 0-indexed
  const defaultEnd = new Date(2026, 2, 31);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // search + paging + customer filter
  const [search, setSearch] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [custQuery, setCustQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const custRef = useRef(null);

  // table state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // dummy customers (replace with API if needed)
  const customers = [
    "John Doe", "Jane Parker", "Krishna Pandit", "IT Account", "Rajdeep",
  ].filter((n) => n.toLowerCase().includes((custQuery || "").toLowerCase()));

  // outside click / esc handlers
  useEffect(() => {
    function onDocClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
      if (custRef.current && !custRef.current.contains(e.target)) setCustOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") {
        setExportOpen(false);
        setCustOpen(false);
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // fetch list
  async function fetchList({ goPage = page, goPageSize = pageSize } = {}) {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = {
        page: goPage,
        page_size: goPageSize,
      };

      const q = (search || "").trim();
      if (q) params.query = q;

      if (startDate) params.start_date = startDate.toISOString().slice(0, 10);
      if (endDate) params.end_date = endDate.toISOString().slice(0, 10);

      const cust = (selectedCustomer || "").trim();
      if (cust) params.customer = cust;

      const resp = await listCreditNotes(params);
      setRows(resp?.results || []);
      setTotal(Number(resp?.total || 0));
      setPage(Number(resp?.page || 1));
      setPageSize(Number(resp?.page_size || goPageSize));
    } catch (err) {
      setErrorMsg(err?.message || "Failed to load credit notes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList({ goPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // export (simple CSV/XLSX stub; keeping same UX, generating an empty file)
  function handleExport(type) {
    const filename =
      type === "excel" ? "credit-notes.xlsx" :
        type === "csv" ? "credit-notes.csv" : "credit-notes.pdf";
    const mime =
      type === "excel" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :
        type === "csv" ? "text/csv" : "application/pdf";
    const blob = new Blob([""], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function onApply() {
    // apply filters: reset to page 1
    fetchList({ goPage: 1 });
    setFilterOpen(false);
  }

  function onReset() {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setSelectedCustomer("");
    setCustQuery("");
    setSearch("");
    fetchList({ goPage: 1 });
  }

  const showingFrom = useMemo(() => (total === 0 ? 0 : (page - 1) * pageSize + 1), [total, page, pageSize]);
  const showingTo = useMemo(() => Math.min(total, page * pageSize), [total, page, pageSize]);

  return (
    <div className="cnp-page">
      {/* Header */}
      <div className="cnp-head">
        <h1>POS Credit Note</h1>
        <span className="material-icons cnp-bc-home" aria-hidden>home</span>
      </div>

      {/* Card */}
      <section className="cnp-card">

        {/* Toolbar */}
        <div className="cnp-toolbar">
          <div className="cnp-spacer" />

          {/* Export */}
          <div className="cnp-export" ref={exportRef}>
            <button
              type="button"
              className="cnp-btn cnp-btn-blue cnp-btn-export"
              onClick={() => setExportOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
            >
              <span className="material-icons">file_download</span>
              <span className="cnp-caret">▾</span>
            </button>
            {exportOpen && (
              <div role="menu" className="cnp-menu">
                <button type="button" role="menuitem" className="cnp-menu-item" onClick={() => handleExport("excel")}>Excel</button>
                <button type="button" role="menuitem" className="cnp-menu-item" onClick={() => handleExport("pdf")}>PDF</button>
              </div>
            )}
          </div>

          {/* Display select */}
          <div className="cnp-display">
            <select
              className="cnp-control cnp-select"
              value={String(pageSize)}
              onChange={(e) => { setPageSize(Number(e.target.value)); fetchList({ goPage: 1, goPageSize: Number(e.target.value) }); }}
              aria-label="Display rows"
            >
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
              <option value="1000">1000</option>
            </select>
          </div>

          {/* Filter button */}
          <button
            type="button"
            className={"cnp-btn cnp-btn-blue cnp-btn-filter" + (filterOpen ? " is-active" : "")}
            onClick={() => setFilterOpen(v => !v)}
            aria-controls="cnp-filters"
            aria-expanded={filterOpen}
          >
            <span className="material-icons">filter_alt</span>
            <span>Filter</span>
          </button>

          {/* Search */}
          <div className="cnp-search">
            <input
              className="cnp-control"
              placeholder="Search List..."
              aria-label="Search list"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") fetchList({ goPage: 1 }); }}
            />
            <button type="button" className="cnp-search-btn" aria-label="Search" onClick={() => fetchList({ goPage: 1 })}>
              <span className="material-icons" aria-hidden>search</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {filterOpen && (
          <div className="cnp-filters" id="cnp-filters">
            {/* Date range */}
            <div className="cnp-field cnp-field-date">
              <label className="cnp-label">Date Range</label>
              <div className="cnp-datewrap">
                <DatePicker
                  selectsRange
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(dates) => {
                    const [start, end] = dates;
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  dateFormat="dd/MM/yyyy"
                  className="cnp-control cnp-input-date"
                  placeholderText="Select date range"
                />
                <span className="material-icons cnp-datebtn">event</span>
              </div>
            </div>

            {/* Select Customer */}
            <div className="cnp-field cnp-field-cust" ref={custRef}>
              <label className="cnp-label">Select Customer</label>
              <div className={"cnp-selectwrap cnp-custdd" + (custOpen ? " is-open" : "")}>
                <input
                  className="cnp-control cnp-input-cust"
                  placeholder="Search Customer"
                  value={selectedCustomer}
                  onFocus={() => setCustOpen(true)}
                  readOnly
                />
                <span className="material-icons cnp-dd-caret" aria-hidden>arrow_drop_down</span>
                {custOpen && (
                  <div className="cnp-cust-panel" role="listbox">
                    <div className="cnp-cust-search">
                      <input
                        autoFocus
                        value={custQuery}
                        onChange={(e) => setCustQuery(e.target.value)}
                        className="cnp-cust-search-input"
                        placeholder="Search Customer"
                        aria-label="Search customer"
                      />
                    </div>
                    {custQuery.length < 1 ? (
                      <div className="cnp-cust-msg">Please enter 1 or more characters</div>
                    ) : customers.length === 0 ? (
                      <div className="cnp-cust-empty">No matches</div>
                    ) : (
                      <ul className="cnp-cust-results">
                        {customers.map((name) => (
                          <li
                            key={name}
                            className="cnp-cust-item"
                            onClick={() => {
                              setSelectedCustomer(name);
                              setCustOpen(false);
                              setCustQuery("");
                            }}
                          >
                            {name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="cnp-filter-actions">
              <button type="button" className="cnp-btn cnp-btn-apply" onClick={onApply}>Apply</button>
              <button type="button" className="cnp-btn cnp-btn-reset" onClick={onReset}>Reset</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="cnp-tablewrap">
          <table className="cnp-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}>#</th>
                <th>Credit Note No.</th>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Total Amount</th>
                <th>Credits Used</th>        {/* left empty per your request */}
                <th>Credits Remaining</th>    {/* computed */}
                <th>Status</th>               {/* Active / Not Active */}
                <th>Created By</th>           {/* left empty */}
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10}>
                    <CreditNoteLoadingInline />
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr><td colSpan={10} style={{ color: "crimson" }}>{errorMsg}</td></tr>
              ) : rows.length === 0 ? (
                <tr className="cnp-empty"><td colSpan={10}>No data available in table</td></tr>
              ) : (
                rows.map((r, idx) => {
                  const used = Number(r?.redeemed_amount || 0);               // will show blank in UI
                  const remaining = Math.max(0, Number(r?.amount || 0) - used);
                  const isActive = !r?.is_redeemed;
                  return (
                    <tr key={r.id}>
                      <td>{(page - 1) * pageSize + idx + 1}</td>
                      <td>{r.note_no}</td>
                      <td>{isoDate(r.date)}</td>
                      <td>{r.customer_name}</td>
                      <td>{fmtMoney(r.amount)}</td>
                      <td>{"" /* left empty intentionally */}</td>
                      <td>{fmtMoney(remaining)}</td>
                      <td>
                        <span className={"cnp-status " + (isActive ? "is-active" : "is-inactive")}>
                          {isActive ? "AVAILABLE" : "USED"}
                        </span>
                      </td>
                      <td>{"" /* left empty intentionally */}</td>
                      <td>
                        <button
                          className="cnp-link"
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(r.note_no)}
                          title="Copy Credit Note No."
                        >
                          Copy No.
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="cnp-footer">
          <div className="cnp-entries">
            {`Showing ${showingFrom} to ${showingTo} of ${total} entries`}
          </div>
          <div className="cnp-pager">
            <button
              className="cnp-pgbtn"
              disabled={page <= 1 || loading}
              title="Previous"
              type="button"
              onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchList({ goPage: p }); }}
            >
              <span className="material-icons" aria-hidden>chevron_left</span>
            </button>
            <button
              className="cnp-pgbtn"
              disabled={page * pageSize >= total || loading}
              title="Next"
              type="button"
              onClick={() => { const p = page + 1; setPage(p); fetchList({ goPage: p }); }}
            >
              <span className="material-icons" aria-hidden>chevron_right</span>
            </button>
          </div>
        </div>

      </section>
    </div>
  );
}
