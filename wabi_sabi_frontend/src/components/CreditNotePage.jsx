import React, { useEffect, useRef, useState } from "react";
import "../styles/CreditNotePage.css";

export default function CreditNotePage() {
  const [exportOpen, setExportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const exportRef = useRef(null);
  const filterRef = useRef(null);

  // close export dropdown on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        // only close if click is completely outside the filter area AND not the Filter button
        const filterBtn = document.querySelector(".cnp-btn-filter");
        if (!filterBtn || (filterBtn && !filterBtn.contains(e.target))) {
          setFilterOpen(false);
      }}
    }
    function onEsc(e) {
      if (e.key === "Escape") {
        setExportOpen(false);
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

  return (
    <div className="cnp-page">
      {/* Page header */}
      <div className="cnp-head">
        <h1>POS Credit Note</h1>
        <span className="material-icons cnp-bc-home" aria-hidden>
          home
        </span>
      </div>

      {/* Card */}
      <section className="cnp-card">
        {/* Toolbar (right aligned as per screenshot) */}
        <div className="cnp-toolbar">
          <div className="cnp-spacer" />

          {/* Export button + dropdown */}
          <div className="cnp-export" ref={exportRef}>
            <button
              className="cnp-btn cnp-btn-blue cnp-btn-export"
              onClick={() => setExportOpen((v) => !v)}
              aria-expanded={exportOpen}
              aria-haspopup="menu"
            >
              <span className="material-icons">file_download</span>
              <span className="cnp-caret">▾</span>
            </button>
            {exportOpen && (
              <div role="menu" className="cnp-menu">
                <button role="menuitem" className="cnp-menu-item">
                  Export Excel
                </button>
                <button role="menuitem" className="cnp-menu-item">
                  Export PDF
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
            className="cnp-btn cnp-btn-blue cnp-btn-filter"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
            aria-controls="cnp-filterbar"
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
            <button className="cnp-search-btn" aria-label="Search">
              <span className="material-icons" aria-hidden>
                search
              </span>
            </button>
          </div>
        </div>

        {/* FILTER BAR (matches screenshot layout & colors) */}
        {filterOpen && (
          <div id="cnp-filterbar" className="cnp-filterbar" ref={filterRef}>
            {/* Date Range */}
            <div className="cnp-field">
              <label className="cnp-label">Date Range</label>
              <div className="cnp-input-icon">
                <input
                  className="cnp-control"
                  defaultValue="01/04/2025 - 31/03/2026"
                  aria-label="Date range"
                />
                <span className="material-icons">calendar_today</span>
              </div>
            </div>

            {/* Select Customer */}
            <div className="cnp-field">
              <label className="cnp-label">Select Customer</label>
              <div className="cnp-selectwrap">
                <select className="cnp-control cnp-select">
                  <option value="">Search Customer</option>
                </select>
                <span className="cnp-caret">▾</span>
              </div>
            </div>

            {/* Actions */}
            <div className="cnp-field cnp-actions">
              <button className="cnp-btn cnp-btn-green">Apply</button>
              <button className="cnp-btn cnp-btn-orange">Reset</button>
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

        {/* Footer/pager */}
        <div className="cnp-footer">
          <div className="cnp-entries">Showing 0 to 0 of 0 entries</div>
          <div className="cnp-pager">
            <button className="cnp-pgbtn" disabled title="Previous">
              <span className="material-icons" aria-hidden>
                chevron_left
              </span>
            </button>
            <button className="cnp-pgbtn" disabled title="Next">
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