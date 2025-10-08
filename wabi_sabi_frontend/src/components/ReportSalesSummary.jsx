import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ReportSalesSummary.css";

const LOCATIONS = [
  "WABI SABI SUSTAINABILITY",
  "Brands 4 less – Ansal Plaza",
  "Brands 4 less – Rajouri Garden",
  "Brand4Less – Tilak Nagar",
  "Brands 4 less – M3M Urbana",
  "Brands 4 less – IFFCO Chowk",
  "Brands Loot – Udyog Vihar",
  "Brands loot – Krishna Nagar",
];
const ALL_LOCATIONS_COUNT = LOCATIONS.length;

export default function ReportSalesSummary() {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherTypes, setVoucherTypes] = useState(["Invoice", "POS"]);
  const toggleVoucher = (v) =>
    setVoucherTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const [locOpen, setLocOpen] = useState(false);
  const [selectedLocs, setSelectedLocs] = useState([]);
  const toggleLocation = (l) => {
    if (l === "All") {
      setSelectedLocs((p) => (p.length === ALL_LOCATIONS_COUNT ? [] : [...LOCATIONS]));
    } else {
      setSelectedLocs((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));
    }
  };

  // dummy aggregates
  const cards = useMemo(
    () => [
      { k: "orders", label: "Total Orders", val: 127 },
      { k: "qty", label: "Total Qty", val: 512 },
      { k: "net", label: "Net Amount", val: "₹ 6,42,580" },
      { k: "tax", label: "Total Tax", val: "₹ 78,320" },
    ],
    []
  );

  const rows = useMemo(
    () =>
      [
        { label: "Cash", orders: 38, qty: 152, net: 182450, tax: 21450 },
        { label: "Card", orders: 34, qty: 140, net: 175900, tax: 19820 },
        { label: "UPI", orders: 41, qty: 176, net: 203100, tax: 24310 },
        { label: "Credit", orders: 14, qty: 44, net: 814, tax: 740 }, // demo
      ].map((r) => ({ ...r, netFmt: `₹ ${r.net.toLocaleString()}`, taxFmt: `₹ ${r.tax.toLocaleString()}` })),
    []
  );

  return (
    <div className="rp-wrap">
      {/* breadcrumb/title row */}
      <div className="rp-top">
        <div className="rp-title">Sales Summary</div>
        <div className="rp-crumb" aria-label="breadcrumb">
          <span className="material-icons-outlined rp-crumb-link" role="link" tabIndex={0} onClick={() => navigate("/")}>
            home
          </span>
          <span className="rp-crumb-sep">›</span>
          <span className="rp-crumb-link" role="link" tabIndex={0} onClick={() => navigate("/reports")}>
            Reports
          </span>
          <span className="rp-crumb-sep">›</span>
        </div>
      </div>

      {/* Filters */}
      <div className="rp-toolbar rp-toolbar--grid">
        <div className="rp-field">
          <label>From Date</label>
          <div className="rp-input with-icon">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span className="material-icons-outlined">calendar_month</span>
          </div>
        </div>

        <div className="rp-field">
          <label>To Date</label>
          <div className="rp-input with-icon">
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <span className="material-icons-outlined">calendar_month</span>
          </div>
        </div>

        <div className="rp-field rp-field-grow">
          <label>Select Voucher Type</label>
          <div className="rp-multiselect" onClick={() => setVoucherOpen((s) => !s)} tabIndex={0}>
            <div className="rp-chips">
              {voucherTypes.map((v) => (
                <span className="rp-chip" key={v}>
                  {v}
                  <button
                    className="rp-chip-x"
                    type="button"
                    aria-label={`Remove ${v}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVoucher(v);
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input className="rp-chip-input" readOnly aria-label="Selected Voucher Types" />
            </div>
            {voucherOpen && (
              <div className="rp-popover">
                {["Invoice", "POS"].map((v) => (
                  <button
                    key={v}
                    className={`rp-popover-item ${voucherTypes.includes(v) ? "selected" : ""}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVoucher(v);
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rp-field rp-field-loc">
          <label>Location</label>
          <div className="rp-select" onClick={() => setLocOpen((s) => !s)} tabIndex={0}>
            <span className="rp-select-text">
              {selectedLocs.length ? `${selectedLocs.length} selected` : "Select Location"}
            </span>
            <span
              className="material-icons-outlined rp-clear"
              aria-label="Clear selected locations"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLocs([]);
              }}
            >
              close
            </span>
            {locOpen && (
              <div className="rp-popover rp-popover-loc" onClick={(e) => e.stopPropagation()}>
                <div className="rp-popover-search">
                  <input placeholder="Search..." aria-label="Search Locations" />
                </div>
                <div className="rp-popover-list">
                  {["All", ...LOCATIONS].map((l) => (
                    <label key={l} className="rp-check">
                      <input
                        type="checkbox"
                        checked={l === "All" ? selectedLocs.length === ALL_LOCATIONS_COUNT : selectedLocs.includes(l)}
                        onChange={() => toggleLocation(l)}
                      />
                      <span>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rp-actions">
          <button className="btn btn-primary" type="button">
            Search
          </button>
          <button className="btn btn-success" type="button">
            PDF
          </button>
          <button className="btn btn-warning" type="button">
            Excel
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="rp-surface">
        <div className="rss-cards">
          {cards.map((c) => (
            <div className="rss-card" key={c.k}>
              <div className="rss-card-label">{c.label}</div>
              <div className="rss-card-val">{c.val}</div>
            </div>
          ))}
        </div>

        <div className="rss-table-wrap">
          <table className="rss-table">
            <thead>
              <tr>
                <th>Mode</th>
                <th>Orders</th>
                <th>Qty</th>
                <th>Net Amount</th>
                <th>Tax</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.label}</td>
                  <td>{r.orders}</td>
                  <td>{r.qty}</td>
                  <td className="num">{r.netFmt}</td>
                  <td className="num">{r.taxFmt}</td>
                </tr>
              ))}
              <tr className="rss-total">
                <td>Total</td>
                <td>{rows.reduce((a, b) => a + b.orders, 0)}</td>
                <td>{rows.reduce((a, b) => a + b.qty, 0)}</td>
                <td className="num">
                  ₹{" "}
                  {rows
                    .reduce((a, b) => a + b.net, 0)
                    .toLocaleString()}
                </td>
                <td className="num">
                  ₹{" "}
                  {rows
                    .reduce((a, b) => a + b.tax, 0)
                    .toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
