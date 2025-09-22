import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/CouponPage.css";

/* ----- Location Multi-Select ----- */
function LocationSelect({ value = [], onChange, options = [] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.toLowerCase().includes(s));
  }, [q, options]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const toggle = (opt) => {
    const s = new Set(value);
    s.has(opt) ? s.delete(opt) : s.add(opt);
    onChange(Array.from(s));
  };

  const clearAll = (e) => {
    e.stopPropagation();
    onChange([]);
    setQ("");
  };

  return (
    <div className="loc-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`loc-pill ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="loc-text">Select Location</span>
        {value.length > 0 && <span className="loc-badge">{value.length}</span>}
        {value.length > 0 && (
          <span className="loc-x" role="button" aria-label="Clear" onClick={clearAll}>
            ×
          </span>
        )}
      </button>

      {open && (
        <div className="loc-pop" role="dialog" aria-label="Select Location">
          <div className="loc-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="loc-list">
            {filtered.length === 0 ? (
              <div className="loc-empty">No results</div>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt);
                return (
                  <label key={opt} className="loc-item" title={opt}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt)}
                    />
                    <span className="loc-txt">{opt}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----- Page ----- */
const LOCATION_OPTIONS = [
  "WABI SABI SUSTAINABILITY LLP",
  "Brands4Less - Tilak Nagar",
  "Brands4Less - M3M Urbana",
  "Brands4Less-Rajori Garden inside (RJR)",
  "Rajori Garden outside (RJO)",
  "Brands4Less-Iffco Chock",
  "Brands4Less-Krishna Nagar",
  "Brands4Less-UP-AP",
  "Brands4Less-Udhyog Vihar",
];

export default function CouponPage() {
  const [activeTab, setActiveTab] = useState("coupons");
  const [pageSize, setPageSize] = useState("15");

  // default selected location
  const [locations, setLocations] = useState(["WABI SABI SUSTAINABILITY LLP"]);

  return (
    <div className="cp-wrap">
      <div className="cp-pagebar">
        <h1>Coupon</h1>
        <span className="material-icons home-ico">home</span>
      </div>

      <div className="cp-card">
        <div className="cp-tabs">
          <button
            className={`tab ${activeTab === "coupons" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("coupons")}
          >
            Coupons
          </button>
          <button
            className={`tab ${activeTab === "generated" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("generated")}
          >
            Generated Coupons
          </button>

          <div className="cp-tools">
            <select
              className="cp-select"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              title="Rows per page"
            >
              {["10", "15", "25", "50", "100"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button className="btn primary" type="button">New Coupon</button>
            <button className="btn primary" type="button">Generate Coupon</button>
          </div>
        </div>

        <div className="cp-filter">
          <label className="cp-label">Location</label>
          <div className="cp-filter-row">
            <LocationSelect
              value={locations}
              onChange={setLocations}
              options={LOCATION_OPTIONS}
            />
          </div>
        </div>

        <div className="cp-table-wrap">
          <table className="cp-table">
            <thead>
              <tr>
                <th className="col-sr">#</th>
                <th>Coupon Name</th>
                <th className="sortable">Coupon Price</th>
                <th className="sortable">Redeem Value</th>
                <th>Redeem Type</th>
                <th>Monthly Basis</th>
                <th>Number Of Month</th>
                <th>Single Use In Month</th>
                <th>To Issue Coupon</th>
                <th>To Redeem Coupon</th>
                <th>Entire Bill</th>
                <th>Created On</th>
                <th>End Date</th>
                <th>Expiry Days</th>
              </tr>
            </thead>
            <tbody>
              <tr className="empty-row">
                <td colSpan={14}>No data available in table</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="cp-foot">
          <div className="foot-left">Showing 0 to 0 of 0 entries</div>
          <div className="foot-right">
            <button className="page arrow" type="button" aria-label="Previous">
              <span className="material-icons">chevron_left</span>
            </button>
            <button className="page arrow" type="button" aria-label="Next">
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
