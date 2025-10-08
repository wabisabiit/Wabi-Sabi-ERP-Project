import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import "../styles/ReportCustomerWiseSalesOrder.css";

/* Generic popover used for Filter and Download menus */
function Popover({ open, anchorRef, width = 520, align = "right", children }) {
  const [style, setStyle] = useState({});
  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const left =
      align === "right" ? Math.round(r.right - width) : Math.round(r.left);
    setStyle({ top: Math.round(r.bottom + 8), left, width });
  }, [open, anchorRef, width, align]);

  if (!open) return null;
  return (
    <div className="cws-popover" style={style} role="dialog">
      {children}
    </div>
  );
}

/* Utility: trigger a download of an empty file with the given name & mime */
function downloadEmptyFile(filename, mime) {
  const blob = new Blob([""], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CustomerWiseSalesOrderReport() {
  const [showFilter, setShowFilter] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  const actionsRef = useRef(null);
  const downloadBtnRef = useRef(null);

  // Close popovers on outside click
  useEffect(() => {
    function onDocClick(e) {
      const targets = [actionsRef.current];
      const hit = targets.some((n) => n && n.contains(e.target));
      if (!hit) {
        setShowFilter(false);
        setShowDownload(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="cws-page">
      {/* breadcrumb */}
      <header className="cws-breadcrumb">
        <span className="material-icons cws-ic">home</span>
        <span className="cws-bc-slash">/</span>
        <span>Report</span>
      </header>

      <main className="cws-card">
        <div className="cws-head">
          <h1 className="cws-title">Customer Wise Sales Order Report</h1>

          <div className="cws-actions" ref={actionsRef}>
            {/* Download button + menu */}
            <button
              type="button"
              className="cws-btn cws-btn-primary"
              title="Download"
              ref={downloadBtnRef}
              onClick={() => {
                setShowDownload((v) => !v);
                setShowFilter(false);
              }}
            >
              <span className="material-icons cws-ic">download</span>
            </button>

            <Popover open={showDownload} anchorRef={downloadBtnRef} width={180}>
              <div className="cws-menu">
                <button
                  type="button"
                  className="cws-menuitem"
                  onClick={() => {
                    downloadEmptyFile(
                      "CustomerWiseSalesOrderReport.xlsx",
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    );
                    setShowDownload(false);
                  }}
                >
                  <span className="material-icons cws-ic">grid_on</span>
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  className="cws-menuitem"
                  onClick={() => {
                    downloadEmptyFile("CustomerWiseSalesOrderReport.pdf", "application/pdf");
                    setShowDownload(false);
                  }}
                >
                  <span className="material-icons cws-ic">picture_as_pdf</span>
                  <span>PDF</span>
                </button>
              </div>
            </Popover>

            {/* Filter button + panel. Only the icon turns black when open */}
            <button
              type="button"
              className="cws-btn cws-btn-primary cws-btn-filter"
              onClick={() => {
                setShowFilter((v) => !v);
                setShowDownload(false);
              }}
              title="Filter"
            >
              <span className={`material-icons cws-ic ${showFilter ? "cws-ic-dark" : ""}`}>
                filter_list
              </span>
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Filter popover */}
        <Popover open={showFilter} anchorRef={actionsRef} width={560} align="right">
          <form
            className="cws-filter"
            onSubmit={(e) => {
              e.preventDefault();
              setShowFilter(false);
            }}
          >
            <div className="cws-field">
              <label className="cws-label">Customer</label>
              <input className="cws-input" placeholder="Search Customer" />
            </div>

            <div className="cws-field">
              <label className="cws-label">Location</label>
              <div className="cws-selectlike">
                <span className="cws-selecttext">Select Location</span>
                <span className="cws-badge">1</span>
                <button className="cws-clear" type="button" aria-label="Clear selection">
                  <span className="material-icons cws-ic">close</span>
                </button>
              </div>
            </div>

            <div className="cws-field">
              <label className="cws-label">Date Range</label>
              <input className="cws-input" defaultValue="01/04/2025 - 31/03/2026" />
            </div>

            <div className="cws-filter-actions">
              <button type="button" className="cws-btn" onClick={() => setShowFilter(false)}>
                Cancel
              </button>
              <button type="submit" className="cws-btn cws-btn-primary">Apply</button>
            </div>
          </form>
        </Popover>

        {/* Table */}
        <div className="cws-tablewrap">
          <table className="cws-table">
            <thead>
              <tr>
                <th>Sr<br /> No</th>
                <th>Customer<br /> Name</th>
                <th>Location</th>
                <th>Order<br /> No.</th>
                <th>Order<br /> Date</th>
                <th>Items</th>
                <th>Order<br /> Quantity</th>
                <th>Invoiced/DC<br /> Quantity</th>
                <th>Pending<br /> Quantity</th>
                <th>Rate<br />(without GST)</th>
                <th>Product Wise<br /> Pending Amt.</th>
                <th>Order Wise<br /> Pending Amt.</th>
              </tr>
            </thead>
            <tbody>
              <tr className="cws-empty">
                <td colSpan={12}>No data available in table</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
