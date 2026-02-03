import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/SalesRegisterPage.css";

import { apiMe, listLocations } from "../api/client";

export default function SalesRegisterPage() {
  // ------------------- role / user -------------------
  const [me, setMe] = useState(null);
  const isAdmin = useMemo(() => {
    const role = me?.employee?.role || "";
    return !!me?.is_superuser || role === "ADMIN";
  }, [me]);

  // ------------------- locations (real API) -------------------
  const [locations, setLocations] = useState([]); // [{id, code, name}]
  const [locOpen, setLocOpen] = useState(false);
  const [selectedLocs, setSelectedLocs] = useState([]); // store codes OR names; we will send code preferred
  const locRef = useRef(null);

  const toggleLoc = (val) =>
    setSelectedLocs((prev) =>
      prev.includes(val) ? prev.filter((n) => n !== val) : [...prev, val]
    );
  const clearLoc = () => setSelectedLocs([]);

  // ------------------- date presets -------------------
  const DATE_PRESETS = [
    "Today",
    "Yesterday",
    "Last 7 Days",
    "Last 30 Days",
    "This Month",
    "Last Month",
    "This Quarter",
    "Custom Range",
  ];
  const [dateOpen, setDateOpen] = useState(false);
  const [dateText, setDateText] = useState("");
  const [activePreset, setActivePreset] = useState("Today");
  const [customRange, setCustomRange] = useState([null, null]);
  const [startDate, endDate] = customRange;
  const dateRef = useRef(null);

  const fmt = (d) =>
    d
      ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}/${d.getFullYear()}`
      : "";

  const toYMD = (d) => {
    if (!d) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  function applyPreset() {
    const today = new Date();
    let from = null,
      to = null;

    const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const quarter = Math.floor(today.getMonth() / 3);
    const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
    const endOfQuarter = new Date(today.getFullYear(), quarter * 3 + 3, 0);

    switch (activePreset) {
      case "Today":
        from = to = today;
        break;
      case "Yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        from = to = y;
        break;
      }
      case "Last 7 Days": {
        const s = new Date(today);
        s.setDate(s.getDate() - 6);
        from = s;
        to = today;
        break;
      }
      case "Last 30 Days": {
        const s = new Date(today);
        s.setDate(s.getDate() - 29);
        from = s;
        to = today;
        break;
      }
      case "This Month":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "Last Month": {
        const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = startOfMonth(lm);
        to = endOfMonth(lm);
        break;
      }
      case "This Quarter":
        from = startOfQuarter;
        to = endOfQuarter;
        break;
      case "Custom Range":
        if (startDate && endDate) {
          from = startDate;
          to = endDate;
        }
        break;
      default:
        break;
    }

    if (from && to) {
      setCustomRange([from, to]);
      setDateText(`${fmt(from)} - ${fmt(to)}`);
      setDateOpen(false);
      // reset pagination when applying filter
      setPage(1);
    }
  }

  // ------------------- cashier combobox (keep it) -------------------
  const CASHIERS = [
    "All Users",
    "Rajdeep",
    "IT Account",
    "Nishant Jha",
    "Krishna Pandit",
    "WABI SABI SUSTAINABILITY LLP",
  ];
  const [cashOpen, setCashOpen] = useState(false);
  const [cashQuery, setCashQuery] = useState("");
  const [cashier, setCashier] = useState("All Users");
  const cashRef = useRef(null);
  const filteredCashiers = CASHIERS.filter((c) =>
    c.toLowerCase().includes(cashQuery.toLowerCase())
  );

  // ------------------- rows dropdown -------------------
  const ROWS = ["10", "100", "200", "500", "1000"];
  const [rows, setRows] = useState("10");
  const [rowsOpen, setRowsOpen] = useState(false);
  const rowsRef = useRef(null);

  // ------------------- export dropdown -------------------
  const [expOpen, setExpOpen] = useState(false);
  const expRef = useRef(null);

  // ------------------- table data -------------------
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({
    cash_in_hand: "0.00",
    cash: "0.00",
    card: "0.00",
    upi: "0.00",
    total_sales: "0.00",
    credit_applied_amount: "0.00",
    sales_return_amount: "0.00",
    closing_amount: "0.00",
  });

  // pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = Number(rows || 10);

  // ------------------- click outside -------------------
  useEffect(() => {
    function clickAway(e) {
      if (locRef.current && !locRef.current.contains(e.target)) setLocOpen(false);
      if (dateRef.current && !dateRef.current.contains(e.target)) setDateOpen(false);
      if (cashRef.current && !cashRef.current.contains(e.target)) setCashOpen(false);
      if (rowsRef.current && !rowsRef.current.contains(e.target)) setRowsOpen(false);
      if (expRef.current && !expRef.current.contains(e.target)) setExpOpen(false);
    }
    document.addEventListener("mousedown", clickAway);
    return () => document.removeEventListener("mousedown", clickAway);
  }, []);

  // ------------------- init: me + locations + default date -------------------
  useEffect(() => {
    (async () => {
      try {
        const m = await apiMe();
        setMe(m);

        // default preset = Today
        const t = new Date();
        setCustomRange([t, t]);
        setDateText(`${fmt(t)} - ${fmt(t)}`);

        // only admin needs location filter
        if (m?.is_superuser || m?.employee?.role === "ADMIN") {
          const locs = await listLocations();
          setLocations(Array.isArray(locs) ? locs : []);
        }
      } catch (e) {
        console.error("SalesRegister init failed:", e);
      }
    })();
  }, []);

  // ------------------- build query + fetch -------------------
  async function fetchRegister(opts = {}) {
    const s = opts.startDate ?? customRange[0];
    const e = opts.endDate ?? customRange[1];

    const date_from = toYMD(s);
    const date_to = toYMD(e);

    if (!date_from || !date_to) return;

    const sp = new URLSearchParams();
    sp.append("date_from", date_from);
    sp.append("date_to", date_to);
    sp.append("page", String(page));
    sp.append("page_size", String(pageSize));

    // admin location filter only
    if (isAdmin && selectedLocs.length) {
      selectedLocs.forEach((x) => {
        const v = String(x || "").trim();
        if (v) sp.append("location", v);
      });
    }

    const url = `/api/reports/sales-register/?${sp.toString()}`;

    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Load failed (${res.status}): ${text}`);
      }

      const json = await res.json();
      setData(json?.results || []);
      setTotals(json?.totals || totals);
      setTotalCount(Number(json?.total || 0));
    } catch (e) {
      console.error("SalesRegister fetch failed:", e);
      setData([]);
      setTotalCount(0);
      setTotals({
        cash_in_hand: "0.00",
        cash: "0.00",
        card: "0.00",
        upi: "0.00",
        total_sales: "0.00",
        credit_applied_amount: "0.00",
        sales_return_amount: "0.00",
        closing_amount: "0.00",
      });
    } finally {
      setLoading(false);
    }
  }

  // auto refresh on filters/pagination
  useEffect(() => {
    if (!me) return;
    fetchRegister();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, isAdmin, page, pageSize, selectedLocs, customRange]);

  // ------------------- export (real PDF/Excel) -------------------
  async function download(kind) {
    const s = customRange[0];
    const e = customRange[1];
    const date_from = toYMD(s);
    const date_to = toYMD(e);
    if (!date_from || !date_to) return;

    const sp = new URLSearchParams();
    sp.append("date_from", date_from);
    sp.append("date_to", date_to);
    sp.append("export", kind === "excel" ? "excel" : "pdf");

    if (isAdmin && selectedLocs.length) {
      selectedLocs.forEach((x) => {
        const v = String(x || "").trim();
        if (v) sp.append("location", v);
      });
    }

    const url = `/api/reports/sales-register/?${sp.toString()}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "*/*" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Export failed (${res.status}): ${text}`);
      }

      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = obj;
      a.download = kind === "excel" ? "sales-register.xlsx" : "sales-register.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(obj);
      setExpOpen(false);
    } catch (e) {
      console.error("Export failed:", e);
      setExpOpen(false);
    }
  }

  // ------------------- computed footer label -------------------
  const showingFrom = totalCount ? (page - 1) * pageSize + 1 : 0;
  const showingTo = Math.min(page * pageSize, totalCount);

  return (
    <div className="sr-page">
      <section className="sr-card">
        {/* top row */}
        <div className="sr-top">
          {/* Location (ADMIN ONLY) */}
          {isAdmin && (
            <div className="sr-field" ref={locRef}>
              <label className="sr-label">Location</label>

              <div
                role="button"
                tabIndex={0}
                className={"sr-input like-select" + (locOpen ? " is-open" : "")}
                onClick={() => setLocOpen((v) => !v)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && setLocOpen((v) => !v)
                }
                aria-haspopup="listbox"
                aria-expanded={locOpen}
              >
                <span className="sr-placeholder">
                  {selectedLocs.length
                    ? `${selectedLocs.length} selected`
                    : "Select Location"}
                </span>
                {selectedLocs.length > 0 && (
                  <span className="sr-chip">{selectedLocs.length}</span>
                )}
              </div>

              {selectedLocs.length > 0 && (
                <button
                  type="button"
                  className="sr-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearLoc();
                    setPage(1);
                  }}
                  aria-label="Clear locations"
                >
                  ×
                </button>
              )}

              {locOpen && (
                <div className="sr-menu sr-loc-menu">
                  <ul className="sr-list" role="listbox" aria-multiselectable="true">
                    {locations.map((x) => {
                      const label = x?.name || x?.code || "";
                      const value = x?.code || x?.name || "";
                      const checked = selectedLocs.includes(value);
                      return (
                        <li key={x.id || value} className="sr-item">
                          <label className="sr-check">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                toggleLoc(value);
                                setPage(1);
                              }}
                            />
                            <span>{label}</span>
                          </label>
                        </li>
                      );
                    })}
                    {!locations.length && (
                      <li className="sr-item" style={{ opacity: 0.7, padding: 10 }}>
                        No locations found
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Date */}
          <div className="sr-field" ref={dateRef}>
            <label className="sr-label">Date</label>
            <div
              className={"sr-datebox" + (dateOpen ? " is-open" : "")}
              onClick={() => setDateOpen((v) => !v)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && setDateOpen((v) => !v)
              }
              aria-haspopup="dialog"
              aria-expanded={dateOpen}
            >
              <input
                value={dateText}
                onChange={() => {}}
                placeholder="dd/mm/yyyy - dd/mm/yyyy"
                readOnly
              />
              <span className="sr-cal-ic">📅</span>
            </div>

            {dateOpen && (
              <div className="sr-menu sr-date-menu" role="dialog" aria-label="Select date range">
                <ul className="sr-date-list">
                  {DATE_PRESETS.map((p) => (
                    <li
                      key={p}
                      className={"sr-date-item" + (activePreset === p ? " is-active" : "")}
                      onClick={() => setActivePreset(p)}
                    >
                      {p}
                    </li>
                  ))}
                </ul>

                {activePreset === "Custom Range" && (
                  <div className="sr-custom">
                    <DatePicker
                      selectsRange
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(update) => setCustomRange(update)}
                      inline
                    />
                  </div>
                )}

                <div className="sr-date-actions">
                  <button
                    className="sr-btn sr-btn-primary"
                    onClick={() => {
                      applyPreset();
                      setPage(1);
                    }}
                  >
                    Apply
                  </button>
                  <button className="sr-btn sr-btn-ghost" onClick={() => setDateOpen(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cashier (keep it as UI only) */}
          <div className="sr-field" ref={cashRef}>
            <label className="sr-label">Cashier</label>
            <button
              type="button"
              className={"sr-input like-select" + (cashOpen ? " is-open" : "")}
              onClick={() => setCashOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={cashOpen}
            >
              <span className="sr-value">{cashier}</span>
              <span className="sr-caret">▾</span>
            </button>

            {cashOpen && (
              <div className="sr-menu sr-cash-menu">
                <div className="sr-cash-search">
                  <input
                    placeholder=""
                    value={cashQuery}
                    onChange={(e) => setCashQuery(e.target.value)}
                  />
                </div>
                <ul className="sr-cash-list" role="listbox">
                  {filteredCashiers.map((c) => (
                    <li
                      key={c}
                      className={"sr-cash-item" + (c === cashier ? " is-active" : "")}
                      onClick={() => {
                        setCashier(c);
                        setCashOpen(false);
                        setCashQuery("");
                      }}
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* right controls */}
          <div className="sr-right">
            {/* rows */}
            <div className="sr-rows" ref={rowsRef}>
              <button
                className="sr-rows-btn"
                onClick={() => setRowsOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={rowsOpen}
              >
                {rows}
                <span className="sr-caret">▾</span>
              </button>
              {rowsOpen && (
                <div className="sr-menu sr-rows-menu">
                  <ul className="sr-list" role="listbox">
                    {ROWS.map((r) => (
                      <li
                        key={r}
                        className={"sr-item" + (rows === r ? " is-active" : "")}
                        onClick={() => {
                          setRows(r);
                          setRowsOpen(false);
                          setPage(1);
                        }}
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* export */}
            <div className="sr-export" ref={expRef}>
              <button
                className="sr-export-btn"
                onClick={() => setExpOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={expOpen}
              >
                <span className="material-icons">file_download</span>
                <span className="sr-caret">▾</span>
              </button>
              {expOpen && (
                <div className="sr-menu sr-export-menu" role="menu">
                  <button className="sr-menu-item" onClick={() => download("excel")}>
                    📄 Excel
                  </button>
                  <button className="sr-menu-item" onClick={() => download("pdf")}>
                    📄 PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* table */}
        <div className="sr-tablewrap">
          <table className="sr-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Cashier</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Cash In Hand</th>
                <th>Cash</th>
                <th>Card</th>
                <th>UPI</th>
                <th>Total Sales</th>
                <th>Credit Applied Amount</th>
                <th>Sales Return Amount</th>
                <th>Closing Amount</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="sr-empty">
                    Loading...
                  </td>
                </tr>
              ) : data.length ? (
                data.map((r) => (
                  <tr key={`${r.sr}-${r.from_date}-${r.cashier}`}>
                    <td>{r.sr}</td>
                    <td>{r.cashier || ""}</td>
                    <td>{r.from_date || ""}</td>
                    <td>{r.to_date || ""}</td>
                    <td>{r.cash_in_hand}</td>
                    <td>{r.cash}</td>
                    <td>{r.card}</td>
                    <td>{r.upi}</td>
                    <td>{r.total_sales}</td>
                    <td>{r.credit_applied_amount}</td>
                    <td>{r.sales_return_amount}</td>
                    <td>{r.closing_amount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="sr-empty">
                    No data available in table
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr className="sr-total">
                <td></td>
                <td>Total</td>
                <td colSpan={2}></td>
                <td>{totals.cash_in_hand}</td>
                <td>{totals.cash}</td>
                <td>{totals.card}</td>
                <td>{totals.upi}</td>
                <td>{totals.total_sales}</td>
                <td>{totals.credit_applied_amount}</td>
                <td>{totals.sales_return_amount}</td>
                <td>{totals.closing_amount}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* footer/pager */}
        <div className="sr-footer">
          <div>
            Showing {showingFrom} to {showingTo} of {totalCount} entries
          </div>

          <div className="sr-pager">
            <button
              className="sr-pgbtn"
              disabled={page <= 1}
              aria-label="Previous"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            <button
              className="sr-pgbtn"
              disabled={page * pageSize >= totalCount}
              aria-label="Next"
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
