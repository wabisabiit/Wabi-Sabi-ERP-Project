// src/components/ReportsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ReportsPage.css";
import {
  listDaywiseSalesSummary,
  getDaywiseSalesPdf,
  getDaywiseSalesExcel
} from "../api/client";
import { useAuth } from "../auth/AuthContext";

/* ───────────────── Report Data Constants ───────────────── */

/**
 * Main Report Tabs
 */
const TABS = [
  { key: "fav", label: "Favourite", icon: "grade" },
  { key: "sales", label: "Sales", icon: "shopping_cart" },
  { key: "purchase", label: "Purchase", icon: "shopping_bag" },
  { key: "inventory", label: "Inventory", icon: "inventory_2" },
  { key: "accounts", label: "Accounts", icon: "badge" },
  { key: "gst", label: "GST Returns", icon: "assignment" },
  { key: "other", label: "Other", icon: "show_chart" },
];

/**
 * Sales Report Items
 */
const SALES_ITEMS = [
  { key: "daywise", title: "Day wise Sales Summary" },
  { key: "register", title: "Sales Register" },
  { key: "category", title: "Category Wise Sales Summary" },
  { key: "salesman", title: "Sales Man Report" },
  { key: "creditNoteItemReg", title: "Credit Note Item Register" },
  { key: "productWise", title: "Product Wise Sales Summary" },
  { key: "wowbill", title: "Wow Bill Report" },
  { key: "taxwise", title: "Tax Wise Sales Summary" },
  { key: "salesSummary", title: "Sales Summary" },
  { key: "customerWiseOrder", title: "Customer Wise Sales Order Report" },
];

/**
 * Inventory Report Items
 */
const INVENTORY_ITEMS = [
  { key: "mpItemwise", title: "Master Packing - Item wise Summary" },
  { key: "invSalesReg", title: "Stock Register" },
  { key: "invReport", title: "Inventory Report" },
  { key: "stockSummary", title: "Stock Summary" },
];

/* ───────────────── Helper Components ───────────────── */

const asLinkKeys = (fn) => (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
};

const ItemButton = ({ it, onClick, fav, setFav }) => {
  const isFav = !!fav[it.key];
  return (
    <button
      key={it.key}
      className="rp-item"
      type="button"
      onClick={onClick}
    >
      <span className="rp-item-left">
        <span className="material-icons-outlined rp-item-icon" aria-hidden="true">
          stacked_line_chart
        </span>
        <span className="rp-item-title">{it.title}</span>
      </span>
      <span
        className={`rp-item-star ${isFav ? "active" : ""}`}
        onClick={(e) => { e.stopPropagation(); setFav((p) => ({ ...p, [it.key]: !p[it.key] })); }}
        role="checkbox"
        aria-checked={isFav}
        aria-label={`Toggle favourite for ${it.title}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFav((p) => ({ ...p, [it.key]: !p[it.key] }));
          }
        }}
      >
        <span className="material-icons-outlined">
          {isFav ? "star" : "star_border"}
        </span>
      </span>
    </button>
  );
};

/* ───────────────── Main Report Listing Page ───────────────── */

export default function ReportsPage() {
  const { user } = useAuth();
  const role = user?.role || "";
  const isManager = role === "MANAGER";

  const [active, setActive] = useState(isManager ? "sales" : "fav");
  const [fav, setFav] = useState({});
  const navigate = useNavigate();

  // ensure managers never stay on "fav" tab if role changes
  useEffect(() => {
    if (isManager && active === "fav") {
      setActive("sales");
    }
  }, [isManager, active]);

  const visibleTabs = isManager
    ? TABS.filter((t) => t.key === "sales")
    : TABS;

  const onSalesNavigate = (key) => {
    switch (key) {
      case "daywise":
        navigate("/reports/day-wise-sales-summary");
        break;
      case "register":
        navigate("/reports/sales-register");
        break;
      case "category":
        navigate("/reports/category-wise-sales-summary");
        break;
      case "salesman":
        navigate("/reports/salesman");
        break;
      case "creditNoteItemReg":
        navigate("/reports/credit-note-item-register");
        break;
      case "productWise":
        navigate("/reports/product-wise-sales-summary");
        break;
      case "wowbill":
        navigate("/reports/wow-bill-report");
        break;
      case "taxwise":
        navigate("/reports/tax-wise-sales-summary");
        break;

      case "salesSummary": navigate("/reports/sales-summary"); break;
      case "customerWiseOrder": navigate("/reports/customer-wise-sales-order-report"); break;
      default:
        console.warn("Unknown sales report key:", key);
    }
  };

  const onInventoryNavigate = (key) => {
    switch (key) {
      case "mpItemwise":
        navigate("/inventory/master-packing-itemwise-summary");
        break;
      case "invSalesReg":
        navigate("/inventory/sales-register");
        break;
      case "invReport":
        navigate("/inventory/inventory-report");
        break;
      case "stockSummary":
        navigate("/inventory/stock-summary");
        break;
      default:
        console.warn("Unknown inventory report key:", key);
    }
  };

  return (
    <div className="rp-wrap">
      {/* breadcrumb/title row */}
      <div className="rp-top">
        <div className="rp-title">Reports</div>
        <div className="rp-crumb" aria-label="breadcrumb">
          <span
            className="material-icons-outlined rp-crumb-link"
            role="link"
            tabIndex={0}
            aria-label="Go to Home"
            onClick={() => navigate("/")}
            onKeyDown={asLinkKeys(() => navigate("/"))}
          >
            home
          </span>
        </div>
      </div>

      {/* Blue tab strip */}
      <div className="rp-strip" role="tablist" aria-label="Report groups">
        {visibleTabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              className={`rp-tab ${isActive ? "active" : ""}`}
              onClick={() => setActive(t.key)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${t.key}`}
              tabIndex={isActive ? 0 : -1}
            >
              <div className="rp-tab-icon" aria-hidden="true">
                <span className="material-icons-outlined">{t.icon}</span>
              </div>
              <div className="rp-tab-label">{t.label}</div>
            </button>
          );
        })}
      </div>

      {/* Section headline */}
      <div className="rp-section-title">
        {visibleTabs.find((x) => x.key === active)?.label?.toUpperCase() ?? ""}
      </div>

      {/* Content surface */}
      <div id={`panel-${active}`} className="rp-surface" role="tabpanel">
        {/* SALES (no subtabs) */}
        {active === "sales" && (
          <div className="rp-list">
            {(isManager
              ? SALES_ITEMS.filter((it) =>
                ["daywise", "salesSummary", "salesman"].includes(it.key)
              )
              : SALES_ITEMS
            ).map((it) => (
              <ItemButton
                key={it.key}
                it={it}
                onClick={() => onSalesNavigate(it.key)}
                fav={fav}
                setFav={setFav}
              />
            ))}
          </div>
        )}

        {/* INVENTORY */}
        {active === "inventory" && (
          <div className="rp-list">
            {INVENTORY_ITEMS.map((it) => (
              <ItemButton
                key={it.key}
                it={it}
                onClick={() => onInventoryNavigate(it.key)}
                fav={fav}
                setFav={setFav}
              />
            ))}
          </div>
        )}

        {/* FAVOURITES: shows starred from all groups */}
        {active === "fav" && (
          <div className="rp-list">
            {[...SALES_ITEMS, ...INVENTORY_ITEMS]
              .filter((it) => fav[it.key])
              .map((it) => (
                <ItemButton
                  key={it.key}
                  it={it}
                  fav={fav}
                  setFav={setFav}
                  onClick={() =>
                    SALES_ITEMS.some((s) => s.key === it.key)
                      ? onSalesNavigate(it.key)
                      : onInventoryNavigate(it.key)
                  }
                />
              ))}
            {!Object.values(fav).some(Boolean) && (
              <div className="rp-empty">Mark any report as ★ to see it here.</div>
            )}
          </div>
        )}

        {/* Placeholder for other tabs (purchase, accounts, gst, other) */}
        {["purchase", "accounts", "gst", "other"].includes(active) && (
          <div
            className="rp-surface"
            style={{ minHeight: 240, display: "grid", placeItems: "center" }}
          >
            <div className="rp-empty">
              {TABS.find((x) => x.key === active)?.label} reports coming soon…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Individual Report Pages (named exports) ───────────────── */

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

export function DayWiseSalesSummaryPage() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherTypes, setVoucherTypes] = useState(["Invoice", "POS"]);

  const [locOpen, setLocOpen] = useState(false);
  const [selectedLocs, setSelectedLocs] = useState([]);

  // NEW state for data + UX
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // init default dates to today
  React.useEffect(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}`;
    setFromDate(iso);
    setToDate(iso);
  }, []);

  const toggleVoucher = (v) => {
    setVoucherTypes((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const toggleLocation = (l) => {
    if (l === "All") {
      setSelectedLocs((p) =>
        p.length === ALL_LOCATIONS_COUNT ? [] : [...LOCATIONS]
      );
    } else {
      setSelectedLocs((p) =>
        p.includes(l) ? p.filter((x) => x !== l) : [...p, l]
      );
    }
  };

  // helper to show DD/MM/YYYY like your screenshot
  const dmy = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  // --- SEARCH handler (calls backend) ---
  const onSearch = async () => {
    if (!fromDate || !toDate) {
      alert("Please select From Date and To Date.");
      return;
    }
    setLoading(true);
    try {
      const locationParam =
        selectedLocs.length > 0 ? selectedLocs : undefined;

      const res = await listDaywiseSalesSummary({
        date_from: fromDate,
        date_to: toDate,
        location: locationParam,
      });

      setRows(res?.rows || []);
      setTotals(res?.totals || {});
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotals({});
      alert("Failed to load Day-wise Sales Summary.");
    } finally {
      setLoading(false);
    }
  };

  const onPdf = async () => {
    if (!fromDate || !toDate) return alert("Select From Date and To Date first.");
    try {
      const url = await getDaywiseSalesPdf({
        date_from: fromDate,
        date_to: toDate,
        location: selectedLocs.length > 0 ? selectedLocs : undefined,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF.");
    }
  };

  const onExcel = async () => {
    if (!fromDate || !toDate) return alert("Select From Date and To Date first.");
    try {
      const url = await getDaywiseSalesExcel({
        date_from: fromDate,
        date_to: toDate,
        location: selectedLocs.length > 0 ? selectedLocs : undefined,
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      alert("Failed to export Excel.");
    }
  };

  return (
    <div className="rp-wrap">
      {/* breadcrumb/title row */}
      <div className="rp-top">
        <div className="rp-title">Day Wise Sales Summary</div>
        <div className="rp-crumb" aria-label="breadcrumb">
          <span
            className="material-icons-outlined rp-crumb-link"
            role="link"
            tabIndex={0}
            aria-label="Go to Home"
            onClick={() => navigate("/")}
            onKeyDown={asLinkKeys(() => navigate("/"))}
          >
            home
          </span>
          <span className="rp-crumb-sep">›</span>
          <span
            className="rp-crumb-link"
            role="link"
            tabIndex={0}
            onClick={() => navigate("/reports")}
            onKeyDown={asLinkKeys(() => navigate("/reports"))}
          >
            Reports
          </span>
          <span className="rp-crumb-sep">›</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rp-toolbar rp-toolbar--grid">
        <div className="rp-field">
          <label>From Date</label>
          <div className="rp-input with-icon">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="material-icons-outlined" aria-hidden="true">
              calendar_month
            </span>
          </div>
        </div>

        <div className="rp-field">
          <label>To Date</label>
          <div className="rp-input with-icon">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <span className="material-icons-outlined" aria-hidden="true">
              calendar_month
            </span>
          </div>
        </div>

        <div className="rp-field rp-field-grow">
          <label>Select Voucher Type</label>
          <div
            className="rp-multiselect"
            onClick={() => setVoucherOpen((s) => !s)}
            tabIndex={0}
          >
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
              <input
                className="rp-chip-input"
                readOnly
                placeholder=""
                aria-label="Selected Voucher Types"
              />
            </div>
            {voucherOpen && (
              <div className="rp-popover">
                {["Invoice", "POS"].map((v) => (
                  <button
                    key={v}
                    className={`rp-popover-item ${
                      voucherTypes.includes(v) ? "selected" : ""
                    }`}
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
          <div
            className="rp-select"
            onClick={() => setLocOpen((s) => !s)}
            tabIndex={0}
          >
            <span className="rp-select-text">
              {selectedLocs.length
                ? `${selectedLocs.length} selected`
                : "Select Location"}
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
              <div
                className="rp-popover rp-popover-loc"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="rp-popover-search">
                  <input placeholder="Search..." aria-label="Search Locations" />
                </div>
                <div className="rp-popover-list">
                  {["All", ...LOCATIONS].map((l) => (
                    <label key={l} className="rp-check">
                      <input
                        type="checkbox"
                        checked={
                          l === "All"
                            ? selectedLocs.length === ALL_LOCATIONS_COUNT
                            : selectedLocs.includes(l)
                        }
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
          <button
            className="btn btn-primary"
            type="button"
            onClick={onSearch}
            disabled={loading}
          >
            {loading ? "Loading…" : "Search"}
          </button>
          <button className="btn btn-success" type="button" onClick={onPdf} disabled={loading}>
            PDF
          </button>
          <button className="btn btn-warning" type="button" onClick={onExcel} disabled={loading}>
            Excel
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="rp-surface rp-result-surface">
        <div className="dss-wrap">
          <div className="dss-letterhead">
            <div className="dss-title">Daily Sales Summary</div>
            <div className="dss-dates">
              {fromDate && toDate ? `${dmy(fromDate)} to ${dmy(toDate)}` : ""}
            </div>
          </div>

          <div className="dss-table-scroll">
            <table className="dss-table">
              <thead>
                <tr>
                  <th>Sr.No</th>
                  <th>Sales Date</th>
                  <th>Gross<br />Amount</th>
                  <th>Tax<br />Amount</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                  <th>5%</th>
                  <th>18%</th>
                  <th>Discount</th>
                  <th>Bank</th>
                  <th>Cash</th>
                  <th>Credit<br />Note</th>
                  <th>Coupon<br />Discount</th>
                  <th>Additional<br />Charge</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {rows && rows.length > 0 ? (
                  <>
                    {rows.map((r) => (
                      <tr key={`${r.sr_no}-${r.sales_date}`}>
                        <td>{r.sr_no}</td>
                        <td>{dmy(r.sales_date)}</td>
                        <td>{r.gross_amount ?? ""}</td>
                        <td>{r.tax_amount ?? ""}</td>
                        <td>{r.cgst ?? ""}</td>
                        <td>{r.sgst ?? ""}</td>
                        <td>{r.igst ?? ""}</td>
                        <td>{r.tax_5 ?? ""}</td>
                        <td>{r.tax_18 ?? ""}</td>
                        <td>{r.discount ?? ""}</td>
                        <td>{r.bank ?? ""}</td>
                        <td>{r.cash ?? ""}</td>
                        <td>{r.credit_notes ?? ""}</td>
                        <td>{r.coupon_discount ?? ""}</td>
                        <td>{r.additional_charge ?? ""}</td>
                        <td>{r.total ?? ""}</td>
                      </tr>
                    ))}

                    <tr>
                      <td className="dss-strong" colSpan={2}>TOTAL</td>
                      <td>{totals?.gross_amount ?? ""}</td>
                      <td>{totals?.tax_amount ?? ""}</td>
                      <td>{totals?.cgst ?? ""}</td>
                      <td>{totals?.sgst ?? ""}</td>
                      <td>{totals?.igst ?? ""}</td>
                      <td>{totals?.tax_5 ?? ""}</td>
                      <td>{totals?.tax_18 ?? ""}</td>
                      <td>{totals?.discount ?? ""}</td>
                      <td>{totals?.bank ?? ""}</td>
                      <td>{totals?.cash ?? ""}</td>
                      <td>{totals?.credit_notes ?? ""}</td>
                      <td>{totals?.coupon_discount ?? ""}</td>
                      <td>{totals?.additional_charge ?? ""}</td>
                      <td>{totals?.total ?? ""}</td>
                    </tr>
                  </>
                ) : (
                  <tr className="cws-empty">
                    <td colSpan={16}>
                      {loading ? "Loading…" : "No data. Select dates and Search."}
                    </td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductWiseSalesSummaryPage() {
  const navigate = useNavigate();
  return (
    <div className="rp-wrap">
      <div className="rp-top">
        <div className="rp-title">Product Wise Sales Summary</div>
        <div className="rp-crumb" aria-label="breadcrumb">
          <span
            className="material-icons-outlined rp-crumb-link"
            role="link"
            tabIndex={0}
            aria-label="Go to Home"
            onClick={() => navigate("/")}
          >
            home
          </span>
          <span className="rp-crumb-sep">›</span>
          <span
            className="rp-crumb-link"
            role="link"
            tabIndex={0}
            onClick={() => navigate("/reports")}
          >
            Reports
          </span>
          <span className="rp-crumb-sep">›</span>
        </div>
      </div>

      <div
        className="rp-surface"
        style={{ minHeight: 240, display: "grid", placeItems: "center" }}
      >
        <div className="rp-empty">Setup coming soon…</div>
      </div>
    </div>
  );
}

/* ───────────────── NEW: Tax Wise Sales Summary page ───────────────── */
export function TaxWiseSalesSummaryPage() {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherTypes, setVoucherTypes] = useState(["Invoice", "POS"]);
  const toggleVoucher = (s) =>
    setVoucherTypes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const [locOpen, setLocOpen] = useState(false);
  const [selectedLocs, setSelectedLocs] = useState([]);

  const toggleLocation = (l) => {
    if (l === "All") {
      setSelectedLocs((p) =>
        p.length === ALL_LOCATIONS_COUNT ? [] : [...LOCATIONS]
      );
    } else {
      setSelectedLocs((p) =>
        p.includes(l) ? p.filter((x) => x !== l) : [...p, l]
      );
    }
  };

  const [taxOpen, setTaxOpen] = useState(false);
  const TAX_SLABS = ["0%", "5%", "12%", "18%", "28%"];
  const [selectedSlabs, setSelectedSlabs] = useState(["5%", "12%", "18%"]);
  const toggleSlab = (s) =>
    setSelectedSlabs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  return (
    <div className="rp-wrap">
      {/* breadcrumb/title row */}
      <div className="rp-top">
        <div className="rp-title">Tax Wise Sales Summary</div>
        <div className="rp-crumb" aria-label="breadcrumb">
          <span
            className="material-icons-outlined rp-crumb-link"
            role="link"
            tabIndex={0}
            aria-label="Go to Home"
            onClick={() => navigate("/")}
            onKeyDown={asLinkKeys(() => navigate("/"))}
          >
            home
          </span>
          <span className="rp-crumb-sep">›</span>
          <span
            className="rp-crumb-link"
            role="link"
            tabIndex={0}
            onClick={() => navigate("/reports")}
          >
            Reports
          </span>
          <span className="rp-crumb-sep">›</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rp-toolbar rp-toolbar--grid">
        <div className="rp-field">
          <label>From Date</label>
          <div className="rp-input with-icon">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="material-icons-outlined" aria-hidden="true">
              calendar_month
            </span>
          </div>
        </div>

        <div className="rp-field">
          <label>To Date</label>
          <div className="rp-input with-icon">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <span className="material-icons-outlined" aria-hidden="true">
              calendar_month
            </span>
          </div>
        </div>

        <div className="rp-field rp-field-grow">
          <label>Select Voucher Type</label>
          <div
            className="rp-multiselect"
            onClick={() => setVoucherOpen((s) => !s)}
            tabIndex={0}
          >
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
              <input
                className="rp-chip-input"
                readOnly
                placeholder=""
                aria-label="Selected Voucher Types"
              />
            </div>
            {voucherOpen && (
              <div className="rp-popover">
                {["Invoice", "POS"].map((v) => (
                  <button
                    key={v}
                    className={`rp-popover-item ${voucherTypes.includes(v) ? "selected" : ""
                      }`}
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
          <div
            className="rp-select"
            onClick={() => setLocOpen((s) => !s)}
            tabIndex={0}
          >
            <span className="rp-select-text">
              {selectedLocs.length
                ? `${selectedLocs.length} selected`
                : "Select Location"}
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
              <div
                className="rp-popover rp-popover-loc"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="rp-popover-search">
                  <input placeholder="Search..." aria-label="Search Locations" />
                </div>
                <div className="rp-popover-list">
                  {["All", ...LOCATIONS].map((l) => (
                    <label key={l} className="rp-check">
                      <input
                        type="checkbox"
                        checked={
                          l === "All"
                            ? selectedLocs.length === ALL_LOCATIONS_COUNT
                            : selectedLocs.includes(l)
                        }
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

        {/* Tax slab multiselect */}
        <div className="rp-field rp-field-grow">
          <label>Tax Slab</label>
          <div
            className="rp-multiselect"
            onClick={() => setTaxOpen((s) => !s)}
            tabIndex={0}
          >
            <div className="rp-chips">
              {selectedSlabs.map((s) => (
                <span className="rp-chip" key={s}>
                  {s}
                  <button
                    className="rp-chip-x"
                    type="button"
                    aria-label={`Remove ${s}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSlab(s);
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                className="rp-chip-input"
                readOnly
                placeholder=""
                aria-label="Selected Tax Slabs"
              />
            </div>
            {taxOpen && (
              <div className="rp-popover">
                {TAX_SLABS.map((s) => (
                  <button
                    key={s}
                    className={`rp-popover-item ${selectedSlabs.includes(s) ? "selected" : ""
                      }`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSlab(s);
                    }}
                  >
                    {s}
                  </button>
                ))}
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

      <div className="rp-surface rp-result-surface" />
    </div>
  );
}
