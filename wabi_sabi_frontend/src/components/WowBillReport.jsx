import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/WowBillReport.css";

const LOCATIONS = [
  "WABI SABI SUSTAINABILITY LLP",
  "Brands 4 less – Ansal Plaza",
  "Brands 4 less – Rajouri Garden",
  "Brand4Less – Tilak Nagar",
  "Brands 4 less – M3M Urbana",
  "Brands 4 less – IFFCO Chowk",
  "Brands Loot – Udyog Vihar",
  "Brands loot – Krishna Nagar",
];

/* Simple demo mapping of salespeople per location */
const SALES_BY_LOC = {
  "WABI SABI SUSTAINABILITY LLP": ["Riya", "Amit"],
  "Brands 4 less – Ansal Plaza": ["Neha", "Rahul"],
  "Brands 4 less – Rajouri Garden": ["Riya"],
  "Brand4Less – Tilak Nagar": ["Amit", "Rahul"],
  "Brands 4 less – M3M Urbana": ["Neha"],
  "Brands 4 less – IFFCO Chowk": ["Riya", "Neha"],
  "Brands Loot – Udyog Vihar": ["Rahul"],
  "Brands loot – Krishna Nagar": ["Amit"],
};

const ALL_SALESPERSONS = Array.from(
  new Set(Object.values(SALES_BY_LOC).flat())
);

export default function WowBillReportCore() {
  /* ---------- header Filter (Location only) ---------- */
  const [filterOpen, setFilterOpen] = useState(false);

  const [locOpen, setLocOpen] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const [locationsSelected, setLocationsSelected] = useState([]);

  const locBtnRef = useRef(null);
  const locPopRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      const t = e.target;
      if (
        locOpen &&
        locPopRef.current &&
        !locPopRef.current.contains(t) &&
        locBtnRef.current &&
        !locBtnRef.current.contains(t)
      ) {
        setLocOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [locOpen]);

  const shownLocations = useMemo(() => {
    const s = locQuery.trim().toLowerCase();
    if (!s) return LOCATIONS;
    return LOCATIONS.filter((l) => l.toLowerCase().includes(s));
  }, [locQuery]);

  const allChecked = locationsSelected.length === LOCATIONS.length;
  const toggleAll = () =>
    setLocationsSelected(allChecked ? [] : [...LOCATIONS]);

  const toggleOne = (loc) =>
    setLocationsSelected((prev) =>
      prev.includes(loc) ? prev.filter((x) => x !== loc) : [...prev, loc]
    );

  const comboLabel =
    locationsSelected.length === 0
      ? "Select Location"
      : locationsSelected.length === 1
      ? locationsSelected[0]
      : `${locationsSelected.length} selected`;

  /* ---------- downloads dropdown ---------- */
  const [dlOpen, setDlOpen] = useState(false);
  const dlRef = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const downloadEmpty = (type) => {
    if (type === "pdf") {
      const blob = new Blob([], { type: "application/pdf" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "wow-bill-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }
    const csvBlob = new Blob([""], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(csvBlob);
    a.download = "wow-bill-report.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  /* ---------- Wow interface content ---------- */
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [salesperson, setSalesperson] = useState("Riya");
  const [wowMin, setWowMin] = useState("1000");
  const [payoutPerWow, setPayoutPerWow] = useState("100");
  const [excludeReturns, setExcludeReturns] = useState(true);

  /* Salesperson options depend on selected locations */
  const salespersonOptions = useMemo(() => {
    if (!locationsSelected.length) return ALL_SALESPERSONS;
    const set = new Set();
    locationsSelected.forEach((loc) => {
      (SALES_BY_LOC[loc] || []).forEach((n) => set.add(n));
    });
    return Array.from(set);
  }, [locationsSelected]);

  useEffect(() => {
    if (!salespersonOptions.includes(salesperson) && salespersonOptions.length) {
      setSalesperson(salespersonOptions[0]);
    }
  }, [salespersonOptions]); // eslint-disable-line

  const summary = useMemo(() => {
    const count = salesperson ? 1 : 0;
    const payout = Number(payoutPerWow || 0);
    const total = count * payout;
    return [{ salesperson, count, payout, total }];
  }, [salesperson, payoutPerWow]);

  const grandTotal = summary.reduce((a, r) => a + r.total, 0);

  return (
    <div className="wbrc-root">
      {/* Top app bar */}
      <div className="wbrc-appbar">
        <div className="wbrc-container">
          <div className="wbrc-appbar-row">
            <div className="wbrc-titlewrap">
              <h1 className="wbrc-title">Wow Bill Report</h1>
              <span className="material-icons wbrc-home" aria-label="Home" role="img">
                home
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="wbrc-container wbrc-main">
        <div className="wbrc-card">
          {/* Actions row */}
          <div className="wbrc-actions">
            {/* Download dropdown */}
            <div className="wbrc-download" ref={dlRef}>
              <button
                className="wbrc-btn wbrc-btn-primary"
                title="Download"
                onClick={() => setDlOpen((s) => !s)}
              >
                <span className="material-icons" aria-hidden="true">download</span>
              </button>
              {dlOpen && (
                <div className="wbrc-dd">
                  <button
                    className="wbrc-dd-item"
                    onClick={() => { downloadEmpty("pdf"); setDlOpen(false); }}
                  >
                    <span className="material-icons" aria-hidden="true">picture_as_pdf</span>
                    PDF
                  </button>
                  <button
                    className="wbrc-dd-item"
                    onClick={() => { downloadEmpty("excel"); setDlOpen(false); }}
                  >
                    <span className="material-icons" aria-hidden="true">grid_on</span>
                    Excel
                  </button>
                </div>
              )}
            </div>

            {/* Filter toggle */}
            <button
              className={`wbrc-btn wbrc-btn-primary wbrc-filter-btn ${filterOpen ? "active" : ""}`}
              title="Filter"
              onClick={() => setFilterOpen((s) => !s)}
            >
              <span className="material-icons" aria-hidden="true">filter_list</span>
              <span className="wbrc-btn-label">Filter</span>
            </button>
          </div>

          {/* Header filter strip (Location only with checkboxes) */}
          {filterOpen && (
            <div className="wbrc-filter-strip">
              <div className="wbrc-field" style={{ gridColumn: "1 / span 3" }}>
                <label>Location</label>
                <div
                  className={`wbrc-combo ${locOpen ? "open" : ""}`}
                  ref={locBtnRef}
                  onClick={() => setLocOpen((s) => !s)}
                >
                  <span className={`wbrc-combo-val ${locationsSelected.length ? "picked" : ""}`}>
                    {comboLabel}
                  </span>
                  <span className="material-icons wbrc-caret">expand_more</span>

                  {locOpen && (
                    <div
                      className="wbrc-pop"
                      ref={locPopRef}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        className="wbrc-pop-search"
                        placeholder="Search..."
                        value={locQuery}
                        onChange={(e) => setLocQuery(e.target.value)}
                      />
                      <div className="wbrc-pop-list">
                        {/* All */}
                        <label className="wbrc-checkrow">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={(e) => { e.stopPropagation(); toggleAll(); }}
                          />
                          <span>All</span>
                        </label>

                        {shownLocations.map((l) => (
                          <label key={l} className="wbrc-checkrow">
                            <input
                              type="checkbox"
                              checked={locationsSelected.includes(l)}
                              onChange={(e) => { e.stopPropagation(); toggleOne(l); }}
                            />
                            <span>{l}</span>
                          </label>
                        ))}
                        {!shownLocations.length && (
                          <div className="wbrc-pop-empty">No results</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Wow interface (controls + summary) */}
          <div className="wbrc-card inner">
            <div className="wbrc-section-title">Controls</div>

            <div className="wbrc-controls-grid">
              <div className="wbrc-field">
                <label>From</label>
                <div className="wbrc-input with-icon">
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  <span className="material-icons">calendar_month</span>
                </div>
              </div>

              <div className="wbrc-field">
                <label>To</label>
                <div className="wbrc-input with-icon">
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  <span className="material-icons">calendar_month</span>
                </div>
              </div>

              <div className="wbrc-field">
                <label>Salesperson</label>
                <div className="wbrc-select">
                  <select
                    value={salesperson}
                    onChange={(e) => setSalesperson(e.target.value)}
                  >
                    {salespersonOptions.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span className="material-icons">expand_more</span>
                </div>
              </div>

              <div className="wbrc-field">
                <label>WOW Min Value (₹)</label>
                <div className="wbrc-input">
                  <input
                    value={wowMin}
                    onChange={(e) => setWowMin(e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="wbrc-field">
                <label>Payout / WOW (₹)</label>
                <div className="wbrc-input">
                  <input
                    value={payoutPerWow}
                    onChange={(e) => setPayoutPerWow(e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <label className="wbrc-check">
                <input
                  type="checkbox"
                  checked={excludeReturns}
                  onChange={(e) => setExcludeReturns(e.target.checked)}
                />
                <span>Exclude returns</span>
              </label>
            </div>
          </div>

          <div className="wbrc-card inner">
            <div className="wbrc-section-title">Summary (Per Salesperson)</div>

            <div className="wbrc-grid-table">
              <div className="wbrc-row wbrc-head">
                <div>Salesperson</div>
                <div>WOW Count</div>
                <div>Payout / WOW (₹)</div>
                <div>Total Payout (₹)</div>
              </div>

              {summary.map((r, i) => (
                <div key={i} className="wbrc-row">
                  <div>{r.salesperson}</div>
                  <div>{r.count}</div>
                  <div>{r.payout}</div>
                  <div>{r.total}</div>
                </div>
              ))}

              <div className="wbrc-grand">
                <div>Grand Total</div>
                <div className="wbrc-grand-value">{grandTotal}</div>
              </div>
            </div>
          </div>
          {/* end wow interface */}
        </div>
      </div>
    </div>
  );
}
