import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/OrderList.css";

/* ---------- Columns config ---------- */
const COLS = [
  { id: "sr", label: "Sr. No." },
  { id: "inv", label: "Invoice No" },
  { id: "date", label: "Date" },
  { id: "created", label: "Created Date" },
  { id: "due", label: "Due Date" },
  { id: "cust", label: "Customer Name" },
  { id: "total", label: "Total Amount" },
  { id: "dueAmt", label: "Due Amount" },
  { id: "mode", label: "Payment Mode" },
  { id: "pstatus", label: "Payment Status" },
  { id: "credit", label: "Credit Applied Amt" },
  { id: "otype", label: "Order Type" },
  { id: "fb", label: "Feedback" },
];

const DEFAULT_VISIBLE = COLS.map((c) => c.id);
// If you ever want to limit visible columns, set a number here.
const MAX_VISIBLE = null;

export default function OrderList() {
  /* columns popover */
  const [openCols, setOpenCols] = useState(false);
  const [visible, setVisible] = useState(() => new Set(DEFAULT_VISIBLE));
  const colPanelRef = useRef(null);

  /* filter panel */
  const [openFilter, setOpenFilter] = useState(false);
  const [dateRange, setDateRange] = useState("01/04/2025 - 31/03/2026");
  const [customer, setCustomer] = useState("");
  const [payMode, setPayMode] = useState("All");
  const [locationCount, setLocationCount] = useState(1);
  const [discount, setDiscount] = useState("");
  const [orderType, setOrderType] = useState("All");
  const [store, setStore] = useState("All");
  const [channel, setChannel] = useState("All");
  const [orderStatus, setOrderStatus] = useState("All");
  const [paymentStatus, setPaymentStatus] = useState("All");

  const [startDate, setStartDate] = useState(new Date(2025, 3, 1)); // 01/04/2025
  const [endDate, setEndDate] = useState(new Date(2026, 2, 31)); // 31/03/2026
  const [dateOpen, setDateOpen] = useState(false);

  /* close cols panel on ESC / outside click */
  useEffect(() => {
    if (!openCols) return;
    const onKey = (e) => e.key === "Escape" && setOpenCols(false);
    const onDoc = (e) => {
      if (colPanelRef.current && !colPanelRef.current.contains(e.target)) {
        setOpenCols(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [openCols]);

  const toggle = (id) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (MAX_VISIBLE && next.size >= MAX_VISIBLE) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const restore = () => setVisible(new Set(DEFAULT_VISIBLE));

  const visibleCols = useMemo(() => COLS.filter((c) => visible.has(c.id)), [visible]);
  const colSpan = visibleCols.length + 1;

  /* fake summaries (keep 0.00 like screenshot) */
  const dueAmtSum = 0;
  const paidAmtSum = 0;
  const totalAmtSum = 0;

  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const DateInput = React.forwardRef(({ value, onClick }, ref) => (
    <input
      className="ol-control ol-input-date"
      value={value}
      onClick={onClick}
      readOnly
      ref={ref}
    />
  ));

  return (
    <div className="ol-wrap">
      {/* header */}
      <div className="ol-header">
        <div className="ol-title">Order List</div>
        <div className="ol-crumb">
          <span className="material-icons ol-home">home</span>
          <span className="ol-sep">-</span>
          <span className="ol-sec">POS</span>
        </div>
      </div>

      {/* card */}
      <section className="ol-card">
        {/* toolbar */}
        <div className="ol-toolbar">
          <button className="ol-btn" onClick={() => setOpenCols((v) => !v)}>
            <span>Columns</span>
            <span className="material-icons">arrow_drop_down</span>
          </button>

          <div className="ol-right">
            <button className="ol-iconbtn">
              <span className="material-icons">file_download</span>
              <span className="material-icons">arrow_drop_down</span>
            </button>

            <div className="ol-select">
              <select defaultValue="10" aria-label="Rows per page">
                <option>10</option>
                <option>25</option>
                <option>50</option>
                <option>100</option>
              </select>
            </div>

            <button
              className={`ol-btn ol-btn-filter ${openFilter ? "is-active" : ""}`}
              onClick={() => setOpenFilter((v) => !v)}
              type="button"
            >
              <span className="material-icons">filter_alt</span>
              <span>Filter</span>
            </button>

            <div className="ol-search">
              <input placeholder="Search List..." />
              <span className="material-icons">search</span>
            </div>
          </div>
        </div>

        {/* FILTER STRIP (exact layout/colors like screenshot) */}
        {openFilter && (
          <>
            <div className="ol-filters">
              {/* Row 1 */}
              <div className="ol-field ol-field-date">
                <label className="ol-label">Date Range</label>
                <div className="ol-datewrap">
                  <DatePicker
                    selectsRange
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(dates) => {
                      const [start, end] = dates;
                      setStartDate(start);
                      setEndDate(end);
                      if (start && end) setDateRange(`${fmt(start)} - ${fmt(end)}`);
                    }}
                    open={dateOpen}
                    onClickOutside={() => setDateOpen(false)}
                    onCalendarClose={() => setDateOpen(false)}
                    dateFormat="dd/MM/yyyy"
                    customInput={<DateInput />}
                  />
                  <button
                    className="ol-datebtn"
                    type="button"
                    aria-label="Pick dates"
                    onClick={() => setDateOpen((v) => !v)}
                  >
                    <span className="material-icons">calendar_today</span>
                  </button>
                </div>
              </div>

              <div className="ol-field ol-field-cust">
                <label className="ol-label">Customer</label>
                <div className="ol-selectwrap">
                  <input
                    className="ol-control ol-input-cust"
                    placeholder="Search Customer"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                  />
                  <span className="material-icons ol-dd-caret">expand_more</span>
                </div>
              </div>

              <div className="ol-field">
                <label className="ol-label">Payment Mode</label>
                <div className="ol-dd">
                  <select
                    className="ol-control ol-select-el"
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                  >
                    <option>All</option>
                  </select>
                  <span className="material-icons ol-dd-caret">expand_more</span>
                </div>
              </div>

              <div className="ol-field">
                <label className="ol-label">Location</label>
                <button className="ol-locbtn" type="button">
                  <span className="ol-loctext">Select Location</span>
                  <span className="ol-locbadge">{locationCount}</span>
                  <span className="material-icons ol-locclose">close</span>
                </button>
              </div>

              <div className="ol-field">
                <label className="ol-label">Discount</label>
                <div className="ol-dd">
                  <select
                    className="ol-control ol-select-el"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  >
                    <option value="">Select Discount</option>
                  </select>
                  <span className="material-icons ol-dd-caret">expand_more</span>
                </div>
              </div>

              {/* Row 2 */}
              <div className="ol-field">
                <label className="ol-label">Order Type</label>
                <div className="ol-dd">
                  <select
                    className="ol-control ol-select-el"
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value)}
                  >
                    <option>All</option>
                  </select>
                  <span className="material-icons ol-dd-caret">expand_more</span>
                </div>
              </div>

              <div className="ol-field">
                <label className="ol-label">Store</label>
                <div className="ol-dd">
                  <select
                    className="ol-control ol-select-el"
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                  >
                    <option>All</option>
                  </select>
                  <span className="material-icons ol-dd-caret">expand_more</span>
                </div>
              </div>

              <div className="ol-field">
                <label className="ol-label">Channel</label>
                <div className="ol-dd">
                  <select
                    className="ol-control ol-select-el"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  >
                    <option>All</option>
                  </select>
                  <span className="material-icons ol-dd-caret">expand_more</span>
                </div>
              </div>

              <div className="ol-field">
                <label className="ol-label">Order Status</label>
                <div className="ol-dd">
                  <select
                    className="ol-control ol-select-el"
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                  >
                    <option>All</option>
                  </select>
                  <span className="material-icons ol-dd-caret">expand_more</span>
                </div>
              </div>

              <div className="ol-field">
                <label className="ol-label">Payment Status</label>
                <div className="ol-dd">
                  <select
                    className="ol-control ol-select-el"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option>All</option>
                  </select>
                  <span className="material-icons ol-dd-caret">expand_more</span>
                </div>
              </div>

              {/* Actions */}
              <div className="ol-filter-actions">
                <button className="ol-btn-apply" type="button">
                  Apply
                </button>
                <button
                  className="ol-btn-reset"
                  type="button"
                  onClick={() => {
                    setDateRange("01/04/2025 - 31/03/2026");
                    setCustomer("");
                    setPayMode("All");
                    setLocationCount(1);
                    setDiscount("");
                    setOrderType("All");
                    setStore("All");
                    setChannel("All");
                    setOrderStatus("All");
                    setPaymentStatus("All");
                  }}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Summary strip */}
            <div className="ol-agg">
              <div className="ol-agg-col">
                <div className="ol-agg-head">Due Amount</div>
                <div className="ol-agg-val red">{dueAmtSum.toFixed(2)}</div>
              </div>
              <div className="ol-agg-col">
                <div className="ol-agg-head">Paid Amount</div>
                <div className="ol-agg-val">{paidAmtSum.toFixed(2)}</div>
              </div>
              <div className="ol-agg-col">
                <div className="ol-agg-head">Total Amount</div>
                <div className="ol-agg-val">{totalAmtSum.toFixed(2)}</div>
              </div>
            </div>
          </>
        )}

        {/* Columns panel */}
        {openCols && (
          <>
            <div className="ol-col-overlay" onClick={() => setOpenCols(false)} />
            <div className="ol-col-panel" ref={colPanelRef}>
              <div className="ol-col-grid">
                {COLS.map((c) => (
                  <button
                    key={c.id}
                    className={`ol-col-chip ${visible.has(c.id) ? "on" : "off"}`}
                    onClick={() => toggle(c.id)}
                    type="button"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="ol-col-actions">
                <button className="ol-col-restore" onClick={restore} type="button">
                  Restore visibility
                </button>
              </div>
            </div>
          </>
        )}

        {/* table */}
        <div className="ol-tablewrap">
          <table className="ol-table">
            <thead>
              <tr>
                <th className="ol-th-checkbox">
                  <input type="checkbox" aria-label="Select all" />
                </th>
                {visibleCols.map((col) => (
                  <th key={col.id}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="ol-empty">
                <td colSpan={colSpan}>No data available in table</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* footer */}
        <div className="ol-footer">
          <div className="ol-entries">Showing 0 to 0 of 0 entries</div>
          <div className="ol-pager">
            <button className="ol-pagebtn" aria-label="Previous" type="button">
              <span className="material-icons">chevron_left</span>
            </button>
            <button className="ol-pagebtn" aria-label="Next" type="button">
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
