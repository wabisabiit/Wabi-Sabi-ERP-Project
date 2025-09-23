import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";          // ⬅️ add
import "../styles/DiscountPage.css";

/** ======= Demo data (empty like screenshot) ======= */
const ROWS = [];

/** Filters */
const STATUS_OPTIONS = ["All", "ARCHIVE", "ACTIVE", "DEACTIVE"];
const PAGE_SIZE_OPTIONS = [15, 25, 50, 100, 200, 500, "All"];
const RANGE_OPTIONS = ["Current Year", "Last Month", "This Month", "Last Week", "This Week", "Today"];

/** Locations */
const LOCATION_OPTIONS = [
  "Brands4Less - Tilak Nagar",
  "Brands4Less - M3M Urbana",
  "Brands4Less-Rajori Garden inside (RJR)",
  "Rajori Garden outside (RJO)",
  "Brands4Less-Iffco Chock",
  "Brands4Less-Krishna Nagar",
  "Brands4Less-UP-AP",
  "Brands4Less-Udhyog Vihar",
];

/* ---------- Basic Select ---------- */
function Select({ value, onChange, options = [], className = "", width, ariaLabel }) {
  return (
    <div className={`dp-select ${className}`} style={width ? { width } : undefined}>
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel || "Select"}>
        {options.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}
          </option>
        ))}
      </select>
      <span className="material-icons">expand_more</span>
    </div>
  );
}

/* ---------- Location Multi-Select (search + badge + clear) ---------- */
function LocationMultiSelect({ value = [], onChange, options = [] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.toLowerCase().includes(s));
  }, [q, options]);

  useEffect(() => {
    const onDoc = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
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

  const clear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="loc-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`loc-pill ${open ? "on" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Select Location"
      >
        <span className="loc-text">Select Location</span>
        <span className="loc-badge">{value.length}</span>
        {value.length > 0 && (
          <button className="loc-clear" title="Clear" onClick={clear}>
            <span className="material-icons">close</span>
          </button>
        )}
        <span className="material-icons loc-caret">expand_more</span>
      </button>

      {open && (
        <div className="loc-pop" role="menu">
          <div className="loc-search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
          </div>
          <div className="loc-list">
            {filtered.length === 0 ? (
              <div className="loc-empty">No results</div>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt);
                return (
                  <label key={opt} className="loc-item" title={opt}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
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

/* ---------- Page ---------- */
export default function DiscountPage() {
  const [range, setRange] = useState("Current Year");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(15);
  const [locations, setLocations] = useState([]);

  const navigate = useNavigate();                         // ⬅️ add

  const filtered = useMemo(() => {
    let rows = ROWS;
    if (status !== "All") rows = rows.filter((r) => (r.status || "").toUpperCase() === status);
    const s = query.trim().toLowerCase();
    if (s) {
      rows = rows.filter((r) =>
        [r.title, r.createdOn, r.validity, r.discountType, r.createdBy, r.status].some((v) =>
          String(v || "").toLowerCase().includes(s)
        )
      );
    }
    if (locations.length > 0) {
      rows = rows.filter((r) =>
        locations.some((loc) => String(r.title || "").toLowerCase().includes(loc.toLowerCase()))
      );
    }
    return rows;
  }, [status, query, locations]);

  const showingFrom = filtered.length ? 1 : 0;
  const limit = pageSize === "All" ? filtered.length || 0 : Number(pageSize);
  const showingTo = Math.min(filtered.length, limit);

  return (
    <div className="dp-wrap">
      {/* title + breadcrumb + range */}
      <div className="dp-top">
        <div className="dp-left">
          <div className="dp-title">Discount</div>
          <span className="material-icons dp-home" title="Home">
            home
          </span>
        </div>
        <Select value={range} onChange={setRange} options={RANGE_OPTIONS} width={160} ariaLabel="Date Range" />
      </div>

      {/* summary cards */}
      <div className="dp-cards">
        {[
          { n: 0, t: "Total Coupons" },
          { n: 0, t: "Active Coupons" },
          { n: 0, t: "Order with Coupons" },
          { n: 1, t: "Order without Coupons" },
          { n: 0, t: "Revenue from Coupons" },
          { n: 0, t: "Discount Given" },
        ].map((c, i) => (
          <div className="dp-card" key={i}>
            <div className="dp-num">{c.n}</div>
            <div className="dp-sub">{c.t}</div>
          </div>
        ))}
      </div>

      {/* main card */}
      <div className="dp-card box">
        {/* toolbar (exact order like screenshot) */}
        <div className="dp-toolbar">
          <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} width={110} ariaLabel="Status" />

          <div className="dp-search">
            <span className="material-icons">search</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search List..." />
          </div>

          <Select
            className="pagesize"
            value={pageSize}
            onChange={(v) => setPageSize(v === "All" ? "All" : Number(v))}
            options={PAGE_SIZE_OPTIONS}
            width={64}
            ariaLabel="Rows per page"
          />

          <LocationMultiSelect value={locations} onChange={setLocations} options={LOCATION_OPTIONS} />

          <button className="dp-btn primary" onClick={() => navigate("/crm/discount/new")}>
            {/* ⬆️ navigate to New Discount */}
            <span className="material-icons">add</span>
            <span>New Discount</span>
          </button>
        </div>

        {/* table */}
        <div className="table-wrap">
          <table className="dp-table">
            <thead>
              <tr>
                <th className="col-sr">#</th>
                <th>Title</th>
                <th>Created On</th>
                <th>Validity</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Discount</th>
                <th>Discount Type</th>
                <th>Status</th>
                <th>Created By</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit || 0).map((r, idx) => (
                <tr key={r.id || idx}>
                  <td className="col-sr">{idx + 1}</td>
                  <td>{r.title}</td>
                  <td>{r.createdOn}</td>
                  <td>{r.validity}</td>
                  <td>{r.orders ?? 0}</td>
                  <td>{r.revenue ?? 0}</td>
                  <td>{r.discount ?? "-"}</td>
                  <td>{r.discountType ?? "-"}</td>
                  <td>
                    <span className={`dp-status ${String(r.status).toUpperCase() === "ACTIVE" ? "on" : ""}`}>
                      {r.status ?? "-"}
                    </span>
                  </td>
                  <td>{r.createdBy ?? "-"}</td>
                  <td className="col-actions">
                    <button className="ico" title="Edit">
                      <span className="material-icons">edit</span>
                    </button>
                    <button className="ico" title="More">
                      <span className="material-icons">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="dp-empty">
                    No data available in table
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* footer */}
        <div className="dp-foot">
          <div className="left">{`Showing ${showingFrom} to ${showingTo} of ${filtered.length} entries`}</div>
          <div className="right">
            <button className="pg arrow" title="Previous" disabled>
              <span className="material-icons">chevron_left</span>
            </button>
            <button className="pg arrow" title="Next" disabled>
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
