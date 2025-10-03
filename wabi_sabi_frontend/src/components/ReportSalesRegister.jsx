import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ReportSalesRegister.css";

export default function ReportSalesRegister() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  // ── Filters ───────────────────────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [voucherNo, setVoucherNo] = useState("");
  const [pageSize, setPageSize] = useState(25);

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

  const [selectedLocs, setSelectedLocs] = useState([]);
  const [selectedSales, setSelectedSales] = useState([]);
  const [locOpen, setLocOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const locWrapRef = useRef(null);
  const salesWrapRef = useRef(null);
  const exportRef = useRef(null);

  // ── Columns (modal) ───────────────────────────────────────────────────────────
  const DEFAULT_COLS = [
    "Sr No",
    "Date",
    "Party Name",
    "City Name",
    "Voucher Type",
    "Voucher No",
    "Gross Total",
    "Created By",
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
  const [colModal, setColModal] = useState(false);
  const [visibleCols, setVisibleCols] = useState(new Set(DEFAULT_COLS));

  const headerCols = [
    "Sr No",
    "Date",
    "Party Name",
    "City Name",
    "Voucher Type",
    "Voucher No",
    "Gross Total",
    "Created By",
  ];
  const renderedCols = headerCols.filter((c) => visibleCols.has(c));

  const toggleCol = (name) => {
    if (name === "Restore visibility") return;
    setVisibleCols((p) => {
      const n = new Set(p);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };
  const restoreCols = () => setVisibleCols(new Set(DEFAULT_COLS));

  // ── Data (stub) ───────────────────────────────────────────────────────────────
  const DATA = useMemo(() => [], []);
  const filtered = DATA;
  const totalGross = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const asLinkKeys = (fn) => (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
  };
  const toggleLoc = (l) => {
    if (l === "All") {
      setSelectedLocs((p) =>
        p.length === LOCATIONS.length - 1 ? [] : LOCATIONS.filter((x) => x !== "All")
      );
      return;
    }
    setSelectedLocs((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));
  };
  const toggleSales = (s) => {
    if (s === "All") {
      setSelectedSales((p) =>
        p.length === SALESMEN.length - 1 ? [] : SALESMEN.filter((x) => x !== "All")
      );
      return;
    }
    setSelectedSales((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  };
  const download = (filename, mime) => {
    const blob = new Blob([""], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // click-outside to close popovers
  useEffect(() => {
    const handler = (e) => {
      if (!locWrapRef.current?.contains(e.target)) setLocOpen(false);
      if (!salesWrapRef.current?.contains(e.target)) setSalesOpen(false);
      if (!exportRef.current?.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── UI ────────────────────────────────────────────────────────────────────────
  return (
    <div className="sr-wrap">
      {/* Title + Breadcrumb */}
      <div className="sr-head">
        <div className="sr-title">Sales Register</div>
        <div className="sr-bc">
          <span
            className="material-icons-outlined sr-home"
            role="link"
            tabIndex={0}
            onClick={() => navigate("/")}
            onKeyDown={asLinkKeys(() => navigate("/"))}
          >
            home
          </span>
        </div>
        <span className="sr-bc-sep">›</span>
        <button className="sr-bc-link" onClick={() => navigate("/reports")}>
          Report
        </button>
      </div>

      {/* Card */}
      <div className="sr-card">
        {/* Filter row (single line @1366px) */}
        <div className="sr-bar">
          {/* From */}
          <div className="sr-field">
            <label>From Date</label>
            <div className="sr-input with-ic">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span className="material-icons-outlined">calendar_month</span>
            </div>
          </div>

          {/* To */}
          <div className="sr-field">
            <label>To Date</label>
            <div className="sr-input with-ic">
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <span className="material-icons-outlined">calendar_month</span>
            </div>
          </div>

          {/* Location */}
          <div className="sr-field" ref={locWrapRef}>
            <label>Location</label>
            <div className="sr-select" onClick={() => setLocOpen((s) => !s)}>
              <span className="sr-select-text">
                Select Location {selectedLocs.length > 0 && <span className="sr-badge">{selectedLocs.length}</span>}
              </span>
              <span
                className="material-icons-outlined sr-clear"
                onClick={(e) => { e.stopPropagation(); setSelectedLocs([]); }}
              >
                close
              </span>
            </div>
            {locOpen && (
              <div className="sr-pop">
                <div className="sr-pop-search"><input placeholder="Search..." /></div>
                <div className="sr-pop-list">
                  {LOCATIONS.map((l) => (
                    <label key={l} className="sr-check">
                      <input
                        type="checkbox"
                        checked={l === "All"
                          ? selectedLocs.length === LOCATIONS.length - 1
                          : selectedLocs.includes(l)}
                        onChange={() => toggleLoc(l)}
                      />
                      <span>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sales Man */}
          <div className="sr-field" ref={salesWrapRef}>
            <label>Sales Man</label>
            <div className="sr-select" onClick={() => setSalesOpen((s) => !s)}>
              <span className="sr-select-text">
                Select Sales Man {selectedSales.length > 0 && <span className="sr-badge">{selectedSales.length}</span>}
              </span>
              <span
                className="material-icons-outlined sr-clear"
                onClick={(e) => { e.stopPropagation(); setSelectedSales([]); }}
              >
                close
              </span>
            </div>
            {salesOpen && (
              <div className="sr-pop">
                <div className="sr-pop-search"><input placeholder="Search..." /></div>
                <div className="sr-pop-list">
                  {SALESMEN.map((s) => (
                    <label key={s} className="sr-check">
                      <input
                        type="checkbox"
                        checked={s === "All"
                          ? selectedSales.length === SALESMEN.length - 1
                          : selectedSales.includes(s)}
                        onChange={() => toggleSales(s)}
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Voucher No */}
          <div className="sr-field">
            <label>Voucher No</label>
            <div className="sr-input">
              <input type="text" value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
            </div>
          </div>

          {/* Right controls (fit in one line, no overlap) */}
          <div className="sr-right" ref={exportRef}>
            <select className="sr-pages" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>

            {/* Export button + dropdown */}
            <div className="sr-export-wrap">
              <button className="btn-blue" onClick={() => setExportOpen((s)=>!s)} title="Export">
                <span className="material-icons-outlined">folder</span>
                <span>Export</span>
                <span className="material-icons-outlined">arrow_drop_down</span>
              </button>
              {exportOpen && (
                <div className="sr-dd">
                  <button className="sr-dd-item"
                    onClick={() => download("sales-register.xlsx",
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}>
                    <span className="material-icons-outlined">table_view</span> Excel
                  </button>
                  <button className="sr-dd-item"
                    onClick={() => download("sales-register.pdf","application/pdf")}>
                    <span className="material-icons-outlined">picture_as_pdf</span> PDF
                  </button>
                  <button className="sr-dd-item"
                    onClick={() => download("sales-register-all.xlsx",
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}>
                    <span className="material-icons-outlined">dataset</span> All Data Excel
                  </button>
                </div>
              )}
            </div>

            {/* Columns */}
            <button className="btn-blue" onClick={() => setColModal(true)}>
              Columns <span className="material-icons-outlined">arrow_drop_down</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="sr-table-wrap">
          <table className="sr-table">
            <thead>
              <tr>
                {visibleCols.has("Sr No") && <th>Sr No</th>}
                {visibleCols.has("Date") && <th>Date</th>}
                {visibleCols.has("Party Name") && <th>Party Name</th>}
                {visibleCols.has("City Name") && <th>City Name</th>}
                {visibleCols.has("Voucher Type") && <th>Voucher Type</th>}
                {visibleCols.has("Voucher No") && <th>Voucher No</th>}
                {visibleCols.has("Gross Total") && <th>Gross Total</th>}
                {visibleCols.has("Created By") && <th>Created By</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td className="sr-empty" colSpan={renderedCols.length}>No data available in table</td>
                </tr>
              )}
              <tr className="sr-total">
                {visibleCols.has("Sr No") && <td />}
                {visibleCols.has("Date") && <td />}
                {visibleCols.has("Party Name") && <td className="bold">Total</td>}
                {visibleCols.has("City Name") && <td />}
                {visibleCols.has("Voucher Type") && <td />}
                {visibleCols.has("Voucher No") && <td />}
                {visibleCols.has("Gross Total") && <td className="num bold">{totalGross}</td>}
                {visibleCols.has("Created By") && <td />}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom */}
        <div className="sr-bottom">
          <div className="sr-info">Showing 0 to 0 of 0 entries</div>
          <div>
            <button className="sr-icon-btn" disabled>
              <span className="material-icons-outlined">chevron_left</span>
            </button>
            <button className="sr-icon-btn" disabled style={{ marginLeft: 6 }}>
              <span className="material-icons-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Columns modal */}
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
                    className={`sr-col-tile ${selected ? "selected" : ""} ${isRestore ? "restore" : ""}`}
                    onClick={() => (isRestore ? restoreCols() : toggleCol(name))}
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
