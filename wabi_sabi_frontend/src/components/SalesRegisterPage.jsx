import React, { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/SalesRegisterPage.css";

export default function SalesRegisterPage() {
  // ------- location (multi-select) -------
  const LOCATIONS = ["WABI SABI SUSTAINABILITY LLP"];
  const [locOpen, setLocOpen] = useState(false);
  const [selectedLocs, setSelectedLocs] = useState([]);
  const locRef = useRef(null);

  const toggleLoc = (name) =>
    setSelectedLocs((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  const clearLoc = () => setSelectedLocs([]);

  // ------- date presets -------
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
      ? `${String(d.getDate()).padStart(2, "0")}/${String(
          d.getMonth() + 1
        ).padStart(2, "0")}/${d.getFullYear()}`
      : "";

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
      setDateText(`${fmt(from)} - ${fmt(to)}`);
      setDateOpen(false);
    }
  }

  // ------- cashier combobox -------
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

  // ------- rows dropdown -------
  const ROWS = ["10", "25", "50", "100", "200", "500", "All"];
  const [rows, setRows] = useState("10");
  const [rowsOpen, setRowsOpen] = useState(false);
  const rowsRef = useRef(null);

  // ------- export dropdown -------
  const [expOpen, setExpOpen] = useState(false);
  const expRef = useRef(null);

  // close on outside click
  useEffect(() => {
    function clickAway(e) {
      if (locRef.current && !locRef.current.contains(e.target)) setLocOpen(false);
      if (dateRef.current && !dateRef.current.contains(e.target))
        setDateOpen(false);
      if (cashRef.current && !cashRef.current.contains(e.target))
        setCashOpen(false);
      if (rowsRef.current && !rowsRef.current.contains(e.target))
        setRowsOpen(false);
      if (expRef.current && !expRef.current.contains(e.target)) setExpOpen(false);
    }
    document.addEventListener("mousedown", clickAway);
    return () => document.removeEventListener("mousedown", clickAway);
  }, []);

  // dummy downloads
  function downloadEmpty(kind) {
    const filename =
      kind === "excel" ? "sales-register.xlsx" : "sales-register.pdf";
    const type =
      kind === "excel"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";
    const blob = new Blob([""], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExpOpen(false);
  }

  return (
    <div className="sr-page">
      <section className="sr-card">
        {/* top row */}
        <div className="sr-top">
          {/* Location */}
          <div className="sr-field" ref={locRef}>
            <label className="sr-label">Location</label>
            <button
              type="button"
              className={
                "sr-input like-select" + (locOpen ? " is-open" : "")
              }
              onClick={() => setLocOpen((v) => !v)}
            >
              <span className="sr-placeholder">
                {selectedLocs.length ? "Select Location" : "Select Location"}
              </span>
              {selectedLocs.length > 0 && (
                <span className="sr-chip">{selectedLocs.length}</span>
              )}
              <button
                type="button"
                className="sr-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  clearLoc();
                }}
                aria-label="Clear locations"
              >
                ×
              </button>
            </button>

            {locOpen && (
              <div className="sr-menu sr-loc-menu">
                <ul className="sr-list">
                  {LOCATIONS.map((name) => {
                    const checked = selectedLocs.includes(name);
                    return (
                      <li
                        key={name}
                        className="sr-item"
                        onClick={() => toggleLoc(name)}
                      >
                        <label className="sr-check">
                          <input
                            type="checkbox"
                            checked={checked}
                            readOnly
                          />
                          <span>{name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Date */}
          <div className="sr-field" ref={dateRef}>
            <label className="sr-label">Date</label>
            <div
              className={"sr-datebox" + (dateOpen ? " is-open" : "")}
              onClick={() => setDateOpen((v) => !v)}
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
              <div className="sr-menu sr-date-menu">
                <ul className="sr-date-list">
                  {DATE_PRESETS.map((p) => (
                    <li
                      key={p}
                      className={
                        "sr-date-item" + (activePreset === p ? " is-active" : "")
                      }
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
                      onChange={(update) => {
                        setCustomRange(update);
                      }}
                      inline
                    />
                  </div>
                )}

                <div className="sr-date-actions">
                  <button className="sr-btn sr-btn-primary" onClick={applyPreset}>
                    Apply
                  </button>
                  <button
                    className="sr-btn sr-btn-ghost"
                    onClick={() => setDateOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cashier */}
          <div className="sr-field" ref={cashRef}>
            <label className="sr-label">Cashier</label>
            <button
              type="button"
              className={"sr-input like-select" + (cashOpen ? " is-open" : "")}
              onClick={() => setCashOpen((v) => !v)}
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
                <ul className="sr-cash-list">
                  {filteredCashiers.map((c) => (
                    <li
                      key={c}
                      className={
                        "sr-cash-item" + (c === cashier ? " is-active" : "")
                      }
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
              >
                {rows}
                <span className="sr-caret">▾</span>
              </button>
              {rowsOpen && (
                <div className="sr-menu sr-rows-menu">
                  <ul className="sr-list">
                    {ROWS.map((r) => (
                      <li
                        key={r}
                        className={"sr-item" + (rows === r ? " is-active" : "")}
                        onClick={() => {
                          setRows(r);
                          setRowsOpen(false);
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
              >
                ⬇️
                <span className="sr-caret">▾</span>
              </button>
              {expOpen && (
                <div className="sr-menu sr-export-menu">
                  <button
                    className="sr-menu-item"
                    onClick={() => downloadEmpty("excel")}
                  >
                    📄 Excel
                  </button>
                  <button
                    className="sr-menu-item"
                    onClick={() => downloadEmpty("pdf")}
                  >
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
                <th>Status</th>
                <th>Cash In Hand</th>
                <th>Cash</th>
                <th>Card</th>
                <th>UPI</th>
                <th>Pay Later</th>
                <th>Total Sales</th>
                <th>Credit Applied Amount</th>
                <th>Sales Return Amount</th>
                <th>Cash Transferred To HO</th>
                <th>Closing Amount</th>
                <th>Short/Exceed</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={16} className="sr-empty">
                  No data available in table
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="sr-total">
                <td></td>
                <td>Total</td>
                <td colSpan={3}></td>
                <td>0.00</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>0.00</td>
                <td>0.00</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* footer/pager */}
        <div className="sr-footer">
          <div>Showing 0 to 0 of 0 entries</div>
          <div className="sr-pager">
            <button className="sr-pgbtn" disabled aria-label="Previous">
              ‹
            </button>
            <button className="sr-pgbtn" disabled aria-label="Next">
              ›
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
