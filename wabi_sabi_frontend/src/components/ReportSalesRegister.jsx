// src/components/ReportSalesRegister.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ReportSalesRegister.css";

export default function ReportSalesRegister() {
  const navigate = useNavigate();

  // filters
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

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
  const SALESMEN = [
    "All",
    "Krishna Pandit – 9718068241",
    "Nishant – 9658745122",
    "IT Account – 7859456858",
    "Rajdeep – 7827635203",
    "sandeep – 9689652369",
  ];

  const [locOpen, setLocOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [selectedLocs, setSelectedLocs] = useState([]);
  const [selectedSales, setSelectedSales] = useState([]);
  const [voucherNo, setVoucherNo] = useState("");
  const [pageSize, setPageSize] = useState(25);

  // columns modal
  const [colModal, setColModal] = useState(false);

  // Visible columns default (blue chips in screenshot)
  const DEFAULT_COLS = [
    "Sr No","Date","Party Name","City Name","Voucher Type","Voucher No","Gross Total","Created By"
  ];
  const ALL_COLS = [
    "Sr No","PAN no","Total Basic","Cess","Ack date",
    "Date","Description","Discount","Additional Charge","Ack no",
    "Party Name","Reverse Charge","Tax Inclusive Discount","TCS Amount","EwayBill date",
    "Address","Due Date","Total Tax","Created By","EwayBill no",
    "City Name","Payment Term","CGST","Created On","Shipping Date",
    "State Name","Total Item","SGST","Branch","Shipping Reference No",
    "Place Of Supply","Total Qty","IGST","Payment Mode","Transport Date",
    "Voucher Type","Total Free Qty","Round Off","Paid Amount","Transporter Name",
    "Voucher No","Basic (0%)","Gross Total","Due Amount","Vehicle No",
    "Discount Code","Basic (5%)","Tax (5%)","Receipt Date","Sales man",
    "Reference No","Basic (12%)","Tax (12%)","Landing Cost","Discounts",
    "Channel Name","Basic (18%)","Tax (18%)","Profit","Flat Discount",
    "Order Type","Basic (28%)","Tax (28%)","Profit (%) (On Costing)","Restore visibility",
    "GSTIN","Basic (Other)","Tax (Other)","Profit (%) (On Selling)"
  ];

  const [visibleCols, setVisibleCols] = useState(new Set(DEFAULT_COLS));

  const toggleCol = (name) => {
    if (name === "Restore visibility") return;
    setVisibleCols((prev) => {
      const n = new Set(prev);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  };
  const restoreCols = () => setVisibleCols(new Set(DEFAULT_COLS));

  // dataset (empty for now to match screenshot)
  const DATA = useMemo(() => [], []);
  const filtered = useMemo(() => DATA, [DATA]); // hook up real filters later

  const totalGross = 0;

  const asLinkKeys = (fn) => (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };

  // multi-select togglers
  const toggleLoc = (l) => {
    if (l === "All") {
      setSelectedLocs((p) => p.length === LOCATIONS.length - 1 ? [] : LOCATIONS.filter((x) => x !== "All"));
    } else {
      setSelectedLocs((p) => p.includes(l) ? p.filter((x) => x !== l) : [...p, l]);
    }
  };
  const toggleSales = (s) => {
    if (s === "All") {
      setSelectedSales((p) => p.length === SALESMEN.length - 1 ? [] : SALESMEN.filter((x) => x !== "All"));
    } else {
      setSelectedSales((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);
    }
  };

  // download helpers
  const download = (filename, mime) => {
    const blob = new Blob([""], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rp-wrap">
      {/* top bar */}
      <div className="rp-top">
        <div className="rp-title">Sales Register</div>
        <div className="rp-crumb" aria-label="breadcrumb">
          <span
            className="material-icons-outlined rp-crumb-link"
            role="link" tabIndex={0}
            onClick={() => navigate("/")}
            onKeyDown={asLinkKeys(() => navigate("/"))}
          >home</span>
          <span className="rp-crumb-sep">›</span>
          <span
            className="rp-crumb-link"
            role="link" tabIndex={0}
            onClick={() => navigate("/reports")}
            onKeyDown={asLinkKeys(() => navigate("/reports"))}
          >Report</span>
        </div>
      </div>

      {/* card */}
      <div className="rp-surface rp-result-surface sr-card">
        {/* filter grid */}
        <div className="sr-toolbar">
          <div className="sr-field">
            <label>From Date</label>
            <div className="rp-input with-icon">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span className="material-icons-outlined">calendar_month</span>
            </div>
          </div>

          <div className="sr-field">
            <label>To Date</label>
            <div className="rp-input with-icon">
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <span className="material-icons-outlined">calendar_month</span>
            </div>
          </div>

          <div className="sr-field">
            <label>Location</label>
            <div className="rp-select" onClick={() => setLocOpen((s) => !s)}>
              <span className="rp-select-text">
                {selectedLocs.length ? `Select Location ${selectedLocs.length}` : "Select Location"}
              </span>
              <span className="material-icons-outlined rp-clear" onClick={(e) => { e.stopPropagation(); setSelectedLocs([]); }}>close</span>
              {locOpen && (
                <div className="rp-popover rp-popover-loc" onClick={(e) => e.stopPropagation()}>
                  <div className="rp-popover-search"><input placeholder="Search..." /></div>
                  <div className="rp-popover-list">
                    {LOCATIONS.map((l) => (
                      <label key={l} className="rp-check">
                        <input
                          type="checkbox"
                          checked={l === "All" ? selectedLocs.length === LOCATIONS.length - 1 : selectedLocs.includes(l)}
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

          <div className="sr-field">
            <label>Sales Man</label>
            <div className="rp-select" onClick={() => setSalesOpen((s) => !s)}>
              <span className="rp-select-text">
                {selectedSales.length ? `Select Sales Man ${selectedSales.length}` : "Select Sales Man"}
              </span>
              <span className="material-icons-outlined rp-clear" onClick={(e) => { e.stopPropagation(); setSelectedSales([]); }}>close</span>
              {salesOpen && (
                <div className="rp-popover rp-popover-loc" onClick={(e) => e.stopPropagation()}>
                  <div className="rp-popover-search"><input placeholder="Search..." /></div>
                  <div className="rp-popover-list">
                    {SALESMEN.map((s) => (
                      <label key={s} className="rp-check">
                        <input
                          type="checkbox"
                          checked={s === "All" ? selectedSales.length === SALESMEN.length - 1 : selectedSales.includes(s)}
                          onChange={() => toggleSales(s)}
                        />
                        <span>{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="sr-field sr-field--vno">
            <label>Voucher No</label>
            <div className="rp-input">
              <input type="text" value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
            </div>
          </div>

          {/* right-side controls */}
          <div className="sr-actions">
            <select className="sr-page-size" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>

            <button className="sr-btn icon" title="Export PDF" onClick={() => download("sales-register.pdf", "application/pdf")}>
              <span className="material-icons-outlined">picture_as_pdf</span>
            </button>
            <button className="sr-btn icon" title="Export Excel" onClick={() =>
              download("sales-register.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            }>
              <span className="material-icons-outlined">table_view</span>
            </button>

            <div className="sr-columns">
              <button className="sr-btn" onClick={() => setColModal(true)}>
                Columns <span className="material-icons-outlined">arrow_drop_down</span>
              </button>
            </div>
          </div>
        </div>

        {/* table */}
        <div className="rp-table-wrap">
          <table className="rp-table">
            <thead>
              <tr>
                {Array.from(visibleCols).includes("Sr No") && <th>Sr No</th>}
                {Array.from(visibleCols).includes("Date") && <th>Date</th>}
                {Array.from(visibleCols).includes("Party Name") && <th>Party Name</th>}
                {Array.from(visibleCols).includes("City Name") && <th>City Name</th>}
                {Array.from(visibleCols).includes("Voucher Type") && <th>Voucher Type</th>}
                {Array.from(visibleCols).includes("Voucher No") && <th>Voucher No</th>}
                {Array.from(visibleCols).includes("Gross Total") && <th>Gross Total</th>}
                {Array.from(visibleCols).includes("Created By") && <th>Created By</th>}
                {Array.from(visibleCols).includes("Action") && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={Math.max(1, visibleCols.size)} className="rp-empty">No data available in table</td></tr>
              ) : null}

              {/* total row */}
              <tr className="sr-total-row">
                {Array.from(visibleCols).includes("Sr No") && <td />}
                {Array.from(visibleCols).includes("Date") && <td />}
                {Array.from(visibleCols).includes("Party Name") && <td className="bold">Total</td>}
                {Array.from(visibleCols).includes("City Name") && <td />}
                {Array.from(visibleCols).includes("Voucher Type") && <td />}
                {Array.from(visibleCols).includes("Voucher No") && <td />}
                {Array.from(visibleCols).includes("Gross Total") && <td className="num bold">{totalGross}</td>}
                {Array.from(visibleCols).includes("Created By") && <td />}
                {Array.from(visibleCols).includes("Action") && <td />}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="sr-footer">
          <div className="sr-info">Showing 0 to 0 of 0 entries</div>
          <div className="sr-pager">
            <button disabled className="sr-btn icon"><span className="material-icons-outlined">chevron_left</span></button>
            <button disabled className="sr-btn icon"><span className="material-icons-outlined">chevron_right</span></button>
          </div>
        </div>
      </div>

      {/* Columns Modal (border-grid as per screenshot) */}
      {colModal && (
        <div className="sr-col-overlay" onClick={() => setColModal(false)}>
          <div className="sr-col-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sr-col-grid">
              {ALL_COLS.map((name) => {
                const isRestore = name === "Restore visibility";
                const selected = visibleCols.has(name);
                return (
                  <button
                    key={name}
                    className={`sr-col-tile ${isRestore ? "restore" : ""} ${selected ? "selected" : ""}`}
                    onClick={() => (isRestore ? restoreCols() : toggleCol(name))}
                    type="button"
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
