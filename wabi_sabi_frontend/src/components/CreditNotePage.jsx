// src/components/CreditNotePage.jsx
import React, { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/CreditNotePage.css";

export default function CreditNotePage() {
  // toolbar popovers
  const [exportOpen, setExportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const exportRef = useRef(null);

  // date range (01/04/2025 - 31/03/2026)
  const defaultStart = new Date(2025, 3, 1);  // months are 0-indexed
  const defaultEnd = new Date(2026, 2, 31);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // customer combobox
  const [custOpen, setCustOpen] = useState(false);
  const [custQuery, setCustQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const custRef = useRef(null);

  // close export or customer dropdowns on outside click + close popovers on ESC
  useEffect(() => {
    function onDocClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
      if (custRef.current && !custRef.current.contains(e.target)) {
        setCustOpen(false);
      }
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

  // dummy export (creates an empty file with the right name/type)
  function handleExport(type) {
    const filename = type === "excel" ? "credit-notes.xlsx" : "credit-notes.pdf";
    const mime =
      type === "excel"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";

    const blob = new Blob([""], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  // (placeholder) filtered customers list
  const customers = [
    "John Doe",
    "Jane Parker",
    "Krishna Pandit",
    "IT Account",
    "Rajdeep",
  ].filter((n) => n.toLowerCase().includes(custQuery.toLowerCase()));

  // Filter actions
  function onApply() {
    // hook your API call here
    setFilterOpen(false);
  }
  function onReset() {
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setSelectedCustomer("");
    setCustQuery("");
  }

  return (
    <div className="cnp-page">
      {/* Header */}
      <div className="cnp-head">
        <h1>POS Credit Note</h1>
        <span className="material-icons cnp-bc-home" aria-hidden>
          home
        </span>
      </div>

      {/* Card */}
      <section className="cnp-card">
        {/* Toolbar */}
        <div className="cnp-toolbar">
          <div className="cnp-spacer" />

          {/* Export (single source of truth) */}
          <div className="cnp-export" ref={exportRef}>
            <button
              type="button"
              className="cnp-btn cnp-btn-blue cnp-btn-export"
              onClick={() => setExportOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
            >
              <span className="material-icons">file_download</span>
              <span className="cnp-caret">▾</span>
            </button>

            {exportOpen && (
              <div role="menu" className="cnp-menu">
                <button
                  type="button"
                  role="menuitem"
                  className="cnp-menu-item"
                  onClick={() => handleExport("excel")}
                >
                  Excel
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="cnp-menu-item"
                  onClick={() => handleExport("pdf")}
                >
                  PDF
                </button>
              </div>
            )}
          </div>

          {/* Display select */}
          <div className="cnp-display">
            <select
              className="cnp-control cnp-select"
              defaultValue="10"
              aria-label="Display rows"
            >
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
            <span className="cnp-caret">▾</span>
          </div>

          {/* Filter button */}
          <button
            type="button"
            className={
              "cnp-btn cnp-btn-blue cnp-btn-filter" +
              (filterOpen ? " is-active" : "")
            }
            onClick={() => setFilterOpen((v) => !v)}
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
            />
            <button type="button" className="cnp-search-btn" aria-label="Search">
              <span className="material-icons" aria-hidden>
                search
              </span>
            </button>
          </div>
        </div>

        {/* Filter strip */}
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
              <div
                className={
                  "cnp-selectwrap cnp-custdd" + (custOpen ? " is-open" : "")
                }
              >
                <input
                  className="cnp-control cnp-input-cust"
                  placeholder="Search Customer"
                  value={selectedCustomer}
                  onFocus={() => setCustOpen(true)}
                  readOnly
                />
                <span className="material-icons cnp-dd-caret" aria-hidden>
                  arrow_drop_down
                </span>

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
                      <div className="cnp-cust-msg">
                        Please enter 1 or more characters
                      </div>
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
              <button type="button" className="cnp-btn cnp-btn-apply" onClick={onApply}>
                Apply
              </button>
              <button type="button" className="cnp-btn cnp-btn-reset" onClick={onReset}>
                Reset
              </button>
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
                <th>Credits Used</th>
                <th>Credits Remaining</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="cnp-empty">
                <td colSpan={10}>No data available in table</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="cnp-footer">
          <div className="cnp-entries">Showing 0 to 0 of 0 entries</div>
          <div className="cnp-pager">
            <button className="cnp-pgbtn" disabled title="Previous" type="button">
              <span className="material-icons" aria-hidden>
                chevron_left
              </span>
            </button>
            <button className="cnp-pgbtn" disabled title="Next" type="button">
              <span className="material-icons" aria-hidden>
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
