// components/LoyaltyPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoyaltyPage.css";

/** Replace with API data later */
const SAMPLE_CAMPAIGNS = [];

export default function LoyaltyPage() {
  const navigate = useNavigate();

  // ---- UI state (Campaign-only list)
  const [search, setSearch] = useState("");
  const [rowsTop, setRowsTop] = useState(15);       // visual (top-left)
  const [rowsBottom, setRowsBottom] = useState(15); // actual pagination
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: null, dir: "asc" });

  // ---- Data
  const data = SAMPLE_CAMPAIGNS;

  // ---- Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.type?.toLowerCase().includes(q) ||
        String(d.redemptionPoint).includes(q)
    );
  }, [data, search]);

  // ---- Sort
  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const A = typeof av === "string" ? av.toLowerCase() : av;
      const B = typeof bv === "string" ? bv.toLowerCase() : bv;
      if (A < B) return sort.dir === "asc" ? -1 : 1;
      if (A > B) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort]);

  // ---- Pagination (driven by bottom selector)
  const rpp = rowsBottom;
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / rpp));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * rpp;
  const end = Math.min(start + rpp, total);
  const pageData = sorted.slice(start, end);

  // ---- Helpers
  const toggleSort = (key) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );

  const SortIcon = ({ colKey }) => {
    const is = sort.key === colKey;
    const dir = is ? sort.dir : null;
    return (
      <span className={`crm-sort ${is ? "active" : ""}`} aria-hidden>
        {dir === "desc" ? "south" : "north"}
      </span>
    );
  };

  return (
    <div className="crm-wrap">
      {/* Header card (only for Campaign) */}
      <div className="crm-head-card">
        <div className="crm-head-left">
          <span className="material-icons home-ic">home</span>
          <span className="head-title">Campaign</span>
        </div>
      </div>

      {/* Card with tabs + toolbar + table */}
      <div className="crm-card">
        {/* Tabs */}
        <div className="crm-tabs" role="tablist">
          <button
            className="crm-tab active"
            role="tab"
            aria-selected="true"
            onClick={() => {}}
          >
            Campaign
          </button>

          {/* Point Setup -> navigate to new page */}
          <button
            className="crm-tab"
            role="tab"
            aria-selected="false"
            onClick={() => navigate("/crm/loyalty/point-setup")}
          >
            Point Setup
          </button>
        </div>

        {/* Toolbar */}
        <div className="crm-toolbar inside-card">
          <div className="crm-left">
            <select
              className="crm-native-select small"
              value={rowsTop}
              onChange={(e) => setRowsTop(Number(e.target.value))}
              aria-label="Rows selector (top)"
            >
              {[15, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="crm-right">
            <div className="crm-search">
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search List"
                aria-label="Search list"
              />
              <span className="material-icons">search</span>
            </div>

            <button
              className="crm-add"
              onClick={() => navigate("/crm/loyalty/campaign/new")}
              aria-label="Add new"
              title="Add"
            >
              <span className="material-icons">add</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="crm-table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>Sr. No</th>
                <th onClick={() => toggleSort("name")} role="button">
                  <div className="th-flex">
                    <span>Campaign Name</span>
                    <SortIcon colKey="name" />
                  </div>
                </th>
                <th onClick={() => toggleSort("type")} role="button">
                  <div className="th-flex">
                    <span>Campaign Type</span>
                    <SortIcon colKey="type" />
                  </div>
                </th>
                <th onClick={() => toggleSort("redemptionPoint")} role="button">
                  <div className="th-flex">
                    <span>Redemption Point</span>
                    <SortIcon colKey="redemptionPoint" />
                  </div>
                </th>
                <th style={{ width: 110 }} className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr>
                  <td className="crm-empty" colSpan={5}>No records found</td>
                </tr>
              ) : (
                pageData.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{start + idx + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.type}</td>
                    <td>{row.redemptionPoint}</td>
                    <td className="text-right">{/* actions */}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* grey ghost bar */}
          <div className="crm-ghostbar" />
        </div>

        {/* Bottom bar */}
        <div className="crm-bottom">
          <div className="crm-info">{`Showing ${total === 0 ? 0 : start + 1} to ${end} of ${total} entries`}</div>
          <div className="crm-bottom-right">
            <div className="crm-rows">
              <span>Rows Per Page:</span>
              <select
                className="crm-native-select"
                value={rowsBottom}
                onChange={(e) => { setRowsBottom(Number(e.target.value)); setPage(1); }}
                aria-label="Rows per page"
              >
                {[15, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="crm-pager">
              <button
                className="icon-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={current <= 1}
                aria-label="Previous page"
              >
                <span className="material-icons">chevron_left</span>
              </button>
              <button
                className="icon-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={current >= totalPages}
                aria-label="Next page"
              >
                <span className="material-icons">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
