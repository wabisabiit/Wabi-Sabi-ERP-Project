import React, { useMemo, useState, useRef, useEffect } from "react";
import "../styles/PaymentPage.css";
import { useNavigate } from "react-router-dom";

const COLUMNS = [
  "#", "Payment No", "Party Name", "Payment Mode", "Type", "Date",
  "Amount", "Status", "Created By", "Action",
];

// parse DD/MM/YYYY to Date
const parseDMY = (dmy) => {
  const [d, m, y] = dmy.split("/").map(Number);
  return new Date(y, m - 1, d);
};

export default function PaymentPage() {
  const [rows] = useState([
    { id: 1, no: "PAY38", party: "TN-Store", mode: "Cash", type: "Against Bill", date: "23/09/2025", amount: 1150, status: "Cleared", createdBy: "Neeraj Singh" },
    { id: 2, no: "PAY23", party: "M3M", mode: "Cash", type: "Against Bill", date: "23/09/2025", amount: 349, status: "Cleared", createdBy: "Pallavi" },
    { id: 3, no: "PAY84", party: "RJR Expense", mode: "Cash", type: "Against Bill", date: "23/09/2025", amount: 3770, status: "Cleared", createdBy: "Mohd Zaheer" },
    { id: 4, no: "PAY37", party: "IC Store", mode: "Cash", type: "Against Bill", date: "23/09/2025", amount: 70, status: "Cleared", createdBy: "abhi" },
    { id: 5, no: "PAY82", party: "KN-Store", mode: "Cash", type: "Against Bill", date: "23/09/2025", amount: 3230, status: "Cleared", createdBy: "Sukhjinder Singh" },
    { id: 6, no: "PAY37", party: "TN-Store", mode: "Cash", type: "Against Bill", date: "22/09/2025", amount: 2190, status: "Cleared", createdBy: "Neeraj Singh" },
    { id: 7, no: "PAY83", party: "RJR Expense", mode: "Cash", type: "Against Bill", date: "22/09/2025", amount: 1520, status: "Cleared", createdBy: "Mohd Zaheer" },
    { id: 8, no: "PAY36", party: "IC Store", mode: "Cash", type: "Against Bill", date: "22/09/2025", amount: 77, status: "Cleared", createdBy: "abhi" },
    { id: 9, no: "PAY81", party: "KN-Store", mode: "Cash", type: "Against Bill", date: "21/09/2025", amount: 490, status: "Cleared", createdBy: "Sukhjinder Singh" },
    { id: 10, no: "PAY36", party: "TN-Store", mode: "Cash", type: "Against Bill", date: "21/09/2025", amount: 1220, status: "Cleared", createdBy: "Neeraj Singh" },
  ]);

  const navigate = useNavigate();

  /* ---------- toolbar ---------- */
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // download dropdown
  const [dlOpen, setDlOpen] = useState(false);
  const dlRef = useRef(null);
  useEffect(() => {
    const close = (e) => dlRef.current && !dlRef.current.contains(e.target) && setDlOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  const exportExcel = () => {
    const header = COLUMNS.join(",") + "\n";
    download(new Blob([header], { type: "text/csv;charset=utf-8" }), "payments.csv");
    setDlOpen(false);
  };
  const exportPDF = () => {
    const pdf = "%PDF-1.4\n%âãÏÓ\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF";
    download(new Blob([pdf], { type: "application/pdf" }), "payments.pdf");
    setDlOpen(false);
  };

  /* ---------- filter bar ---------- */
  const [showFilters, setShowFilters] = useState(false);

  const partyOptions = useMemo(
    () => Array.from(new Set(rows.map(r => r.party))).sort(), [rows]
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(rows.map(r => r.type))).sort(), [rows]
  );
  const locationOptions = useMemo(
    () => [
      "Brands4Less-Rajori Garden inside (RJR)",
      "Rajori Garden outside (RJO)",
      "Brands4Less-Iffco Chock",
      "Brands4Less-Krishna Nagar",
      "Brands4Less-UP-AP",
      "A very very long location name to force horizontal scroll → → → demo",
    ],
    []
  );

  // Party (searchable popup)
  const [party, setParty] = useState("");
  const [partyOpen, setPartyOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const partyRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) setPartyOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Type (simple select)
  const [ptype, setPtype] = useState("");

  // Dates
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");

  // Locations (multi with scroll)
  const [locations, setLocations] = useState([]);
  const toggleLocation = (loc) =>
    setLocations(prev => prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]);
  const clearLocations = () => setLocations([]);
  const [locOpen, setLocOpen] = useState(false);
  const locRef = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (locRef.current && !locRef.current.contains(e.target)) setLocOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  /* ---------- search + filter pipeline ---------- */
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    return rows.filter(r => {
      // search
      const cells = [
        r.no, r.party, r.mode, r.type, r.date, String(r.amount), r.status, r.createdBy
      ].join(" ").toLowerCase();
      if (q && !cells.includes(q)) return false;

      if (party && r.party !== party) return false;
      if (ptype && r.type !== ptype) return false;

      const rd = parseDMY(r.date);
      if (from && rd < from) return false;
      if (to && rd > to) return false;

      if (locations.length && !locations.includes(r.party)) return false;

      return true;
    });
  }, [rows, q, party, ptype, fromDate, toDate, locations]);

  // pagination on filtered
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filtered.length);
  const visibleRows = filtered.slice(pageStart, pageEnd);

  const showing = filtered.length
    ? { from: pageStart + 1, to: pageEnd, total: filtered.length }
    : { from: 0, to: 0, total: 0 };

  // Helpers to reset page when filters change
  const resetPage = () => setPage(1);

  return (
    <div className="pay-wrap">
      <div className="pay-pagebar">
        <h1 className="pay-title">Payment</h1>
        <span className="bank-home-ic material-icons" title="Home">home</span>
      </div>

      <div className="pay-card">
        {/* ---------- TOP TOOLBAR (right-aligned) ---------- */}
        <div className="pay-toolbar right">
          <div className="pay-download" ref={dlRef}>
            <button className="btn btn-primary" onClick={() => setDlOpen(v => !v)}>
              <span className="material-icons">file_download</span>
              <span className="caret">▾</span>
            </button>
            {dlOpen && (
              <div className="pay-menu">
                <button onClick={exportExcel}>Excel</button>
                <button onClick={exportPDF}>PDF</button>
              </div>
            )}
          </div>

          <select
            className="pay-size"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); resetPage(); }}
          >
            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          {/* Filter toggle: icon turns black when visible */}
          <button
            className="btn btn-primary"
            onClick={() => setShowFilters(v => !v)}
          >
            <span className="material-icons" style={{ color: showFilters ? "#000" : "#fff" }}>
              filter_list
            </span>
            <span>Filter</span>
          </button>

          <div className="pay-search">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetPage(); }}
              placeholder="Search List..."
            />
          </div>

          <button className="btn btn-primary" onClick={() => navigate("/bank/payment/new")}>
            Create New
          </button>
        </div>

        {/* ---------- FILTER BAR (hidden until toggled) ---------- */}
        {showFilters && (
          <div className="pay-filters">
            {/* PARTY with search bar */}
            <div className="pf-col" ref={partyRef}>
              <label>Select Party</label>
              <div className="pf-multi">
                <button
                  className="pf-multi-btn"
                  type="button"
                  onClick={() => setPartyOpen(v => !v)}
                  aria-expanded={partyOpen}
                >
                  {party || "Select Party"}
                </button>

                {party && (
                  <button
                    className="pf-clear"
                    type="button"
                    onClick={() => { setParty(""); setPartySearch(""); setPartyOpen(false); resetPage(); }}
                    title="Clear"
                  >
                    ✕
                  </button>
                )}

                {partyOpen && (
                  <div className="pf-menu scroll-both">
                    <input
                      type="text"
                      placeholder="Search Party..."
                      className="pf-search"
                      value={partySearch}
                      onChange={(e) => setPartySearch(e.target.value)}
                    />
                    {partyOptions
                      .filter(p => p.toLowerCase().includes(partySearch.toLowerCase()))
                      .map(p => (
                        <button
                          key={p}
                          className="pf-option"
                          onClick={() => { setParty(p); setPartyOpen(false); resetPage(); }}
                        >
                          {p}
                        </button>
                      ))}
                    {partyOptions.filter(p => p.toLowerCase().includes(partySearch.toLowerCase())).length === 0 && (
                      <div className="pf-noopt">No results found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* TYPE (simple select) */}
            <div className="pf-col">
              <label>Select Type</label>
              <div className="pf-select">
                <select value={ptype} onChange={(e) => { setPtype(e.target.value); resetPage(); }}>
                  <option value="">Select Type</option>
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span className="pf-caret">▾</span>
              </div>
            </div>

            {/* DATES */}
            <div className="pf-col">
              <label>From Date</label>
              <div className="pf-date">
                <input type="date" value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); resetPage(); }} />
                <span className="material-icons pf-cal">event</span>
              </div>
            </div>
            <div className="pf-col">
              <label>To Date</label>
              <div className="pf-date">
                <input type="date" value={toDate}
                  onChange={(e) => { setToDate(e.target.value); resetPage(); }} />
                <span className="material-icons pf-cal">event</span>
              </div>
            </div>

            {/* LOCATION (multi with scroll) */}
            <div className="pf-col" ref={locRef}>
              <label>Location</label>
              <div className="pf-multi">
                <button
                  className="pf-multi-btn"
                  type="button"
                  onClick={() => setLocOpen(v => !v)}
                  aria-expanded={locOpen}
                >
                  Select Location
                  {locations.length > 0 && <span className="pf-badge">{locations.length}</span>}
                </button>

                {locations.length > 0 && (
                  <button className="pf-clear" type="button" onClick={clearLocations} title="Clear">✕</button>
                )}

                {locOpen && (
                  <div className="pf-menu scroll-both">
                    {locationOptions.map((loc) => (
                      <label key={loc} className="pf-check">
                        <input
                          type="checkbox"
                          checked={locations.includes(loc)}
                          onChange={() => { toggleLocation(loc); resetPage(); }}
                        />
                        <span className="pf-check-label">{loc}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------- TABLE ---------- */}
        <div className="pay-table">
          <table>
            <thead>
              <tr>{COLUMNS.map(c => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr className="no-data">
                  <td colSpan={COLUMNS.length}>
                    {q || party || ptype || fromDate || toDate || locations.length
                      ? "Result not found"
                      : "No data available in table"}
                  </td>
                </tr>
              ) : (
                visibleRows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{pageStart + i + 1}</td>
                    <td><a className="pay-link" href="#!">{r.no}</a></td>
                    <td>{r.party}</td>
                    <td>{r.mode}</td>
                    <td>{r.type}</td>
                    <td>{r.date}</td>
                    <td className="num">{r.amount.toLocaleString("en-IN")}</td>
                    <td>{r.status}</td>
                    <td>{r.createdBy}</td>
                    <td><button className="dots" aria-label="actions">⋯</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ---------- FOOTER (numeric pagination) ---------- */}
        <div className="pay-foot">
          <span>Showing {showing.from} to {showing.to} of {showing.total} entries</span>
          <div className="pay-foot-pager">
            <button className="pg-btn" disabled={currentPage === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} className={`pg-btn ${n === currentPage ? "active" : ""}`}
                onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className="pg-btn" disabled={currentPage === totalPages || filtered.length === 0}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
