import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CouponPage.css";

/* ----------------------- tiny helpers ----------------------- */
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/* ----------------------- Combobox: Select Coupon ----------------------- */
function ComboSelect({
  placeholder = "Select Coupon",
  options = [],
  value = "",
  onChange,
  width = 210,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrap = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const s = q.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(s));
  }, [q, options]);

  return (
    <div
      className={`dd ${open ? "open" : ""}`}
      ref={wrap}
      style={{ width }}
      role="combobox"
      aria-expanded={open}
    >
      <button type="button" className="dd-btn" onClick={() => setOpen((v) => !v)}>
        <span className={`dd-placeholder ${value ? "has" : ""}`}>
          {value || placeholder}
        </span>
        <span className="material-icons dd-caret">expand_more</span>
      </button>

      {open && (
        <div className="dd-pop dd-pop--search">
          <div className="dd-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder=""
              aria-label="Search"
            />
          </div>

          <div className="dd-list">
            {filtered.length === 0 ? (
              <div className="dd-empty">No results found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="dd-opt"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  title={opt}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------- Dropdown: Assign Type ----------------------- */
function AssignType({ value, onChange, width = 210 }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  const opts = ["Assigned", "UnAssigned"];
  return (
    <div className={`dd ${open ? "open" : ""}`} ref={wrap} style={{ width }}>
      <button type="button" className="dd-btn" onClick={() => setOpen((v) => !v)}>
        <span className={`dd-placeholder ${value ? "has" : ""}`}>
          {value || "Asign Type"}
        </span>
        <span className="material-icons dd-caret">expand_more</span>
      </button>

      {open && (
        <div className="dd-pop">
          <div className="dd-list">
            <div className="dd-ghost" />
            {opts.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`dd-opt ${value === opt ? "active" : ""}`}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------- Location selector (Coupons tab) ----------------------- */
function LocationSelect({ value = [], onChange, options = [] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrap = useRef(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.toLowerCase().includes(s));
  }, [q, options]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
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
    <div className="loc-wrap" ref={wrap}>
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
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="" />
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

/* ----------------------- Generate Coupon POPUP ----------------------- */
function GenerateCouponModal({ open, onClose, onGenerate }) {
  const [coupon, setCoupon] = useState("");
  const [qty, setQty] = useState("");

  // empty list so default is "No results found" (like screenshot)
  const COUPON_OPTIONS = [];

  useEffect(() => {
    if (!open) {
      setCoupon("");
      setQty("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="gc-backdrop" onClick={onClose} />
      <div className="gc-modal" role="dialog" aria-modal="true">
        <div className="gc-header">
          <div className="gc-title">Generate Coupon</div>
          <button className="gc-x" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        <div className="gc-body">
          <div className="gc-field">
            <label className="gc-label">Coupon<span className="gc-req">*</span></label>
            <ComboSelect
              placeholder="Select Coupon"
              options={COUPON_OPTIONS}
              value={coupon}
              onChange={setCoupon}
              width={520}
            />
          </div>

          <div className="gc-field">
            <label className="gc-label">Qty<span className="gc-req">*</span></label>
            <input
              className="gc-input"
              placeholder="Enter No. of Qty"
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
        </div>

        <div className="gc-footer">
          <button type="button" className="gc-btn gc-btn-muted" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="gc-btn gc-btn-primary"
            onClick={() => onGenerate?.({ coupon, qty })}
          >
            Generate
          </button>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------
   Column configs (SEPARATE per tab)
--------------------------------------------------------------*/

/* Columns for the COUPONS tab (matches your first table) */
const COUPONS_COLUMNS = [
  { key: "sr", label: "#" },
  { key: "name", label: "Coupon Name" },
  { key: "price", label: "Coupon Price" },
  { key: "redeemValue", label: "Redeem Value" },
  { key: "redeemType", label: "Redeem Type" },
  { key: "monthlyBasis", label: "Monthly Basis" },
  { key: "numMonths", label: "Number Of Month" },
  { key: "singleUse", label: "Single Use In Month" },
  { key: "toIssue", label: "To Issue Coupon" },
  { key: "toRedeem", label: "To Redeem Coupon" },
  { key: "entireBill", label: "Entire Bill" },
  { key: "createdOn", label: "Created On" },
  { key: "endDate", label: "End Date" },
  { key: "expiryDays", label: "Expiry Days" },
];

const DEFAULT_VISIBLE_COUPONS = COUPONS_COLUMNS.map((c) => c.key);

/* Columns for the GENERATED COUPONS tab (your long table) */
const GENERATED_COLUMNS = [
  { key: "sr", label: "Sr No." },
  { key: "serial", label: "Serial No." },
  { key: "barcode", label: "Barcode" },
  { key: "name", label: "Coupon Name" },
  { key: "price", label: "Coupon Price" },
  { key: "totalRedeem", label: "Total Redeem Value" },
  { key: "redeemMonthly", label: "Redeem on Monthly Basis?" },
  { key: "monthDivAmt", label: "No. of Month Divided Redeem Amt" },
  { key: "singleUse", label: "Single Use in Month?" },
  { key: "minPurchase", label: "Minimum Purchase limit" },
  { key: "applyEntire", label: "Apply on Entire Bill" },
  { key: "assignedTo", label: "Assigned to (Customer)" },
  { key: "custNo", label: "Customer No" },
  { key: "issuedBy", label: "Issued By" },
  { key: "usedValue", label: "Used Value" },
  { key: "availRedeem", label: "Available Redeem Value" },
  { key: "createdDate", label: "Created Date" },
  { key: "endDate", label: "End Date" },
  { key: "redemptionDate", label: "Redemption Date" },
  { key: "expiryDays", label: "Expiry Days (Expiry Date)" },
  { key: "status", label: "Status (Available/Redeemed)" },
  { key: "toIssued", label: "To Issued on bill" },
  { key: "toRedeemed", label: "To Redeemed on bill" },
  { key: "actions", label: "Actions" },
];

const DEFAULT_VISIBLE_GENERATED = GENERATED_COLUMNS.map((c) => c.key);

/* ----------------------- Page ----------------------- */
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

  /* Coupons tab state */
  const [locations, setLocations] = useState(["WABI SABI SUSTAINABILITY LLP"]);

  /* Generated Coupons filters */
  const [selectedCoupon, setSelectedCoupon] = useState("");
  const [assignType, setAssignType] = useState("");

  const navigate = useNavigate();

  /* Export dropdown (only used on Generated tab) */
  const [exportOpen, setExportOpen] = useState(false);
  const exportWrap = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (exportWrap.current && !exportWrap.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  /* Columns modal & per-tab visibility */
  const [colOpen, setColOpen] = useState(false);
  const [visibleCoupons, setVisibleCoupons] = useState(DEFAULT_VISIBLE_COUPONS);
  const [visibleGenerated, setVisibleGenerated] = useState(DEFAULT_VISIBLE_GENERATED);

  const currentColumns = activeTab === "coupons" ? COUPONS_COLUMNS : GENERATED_COLUMNS;
  const visibleKeys = activeTab === "coupons" ? visibleCoupons : visibleGenerated;
  const columnsToRender = currentColumns.filter((c) => visibleKeys.includes(c.key));

  const toggleCol = (key) => {
    if (activeTab === "coupons") {
      setVisibleCoupons((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    } else {
      setVisibleGenerated((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    }
  };

  const restoreCols = () => {
    if (activeTab === "coupons") setVisibleCoupons(DEFAULT_VISIBLE_COUPONS);
    else setVisibleGenerated(DEFAULT_VISIBLE_GENERATED);
  };

  /* Dummy coupon list for select (empty to match screenshot) */
  const COUPON_OPTIONS = [];

  /* Export handlers — headers from the Generated tab columns */
  const handleExport = (type) => {
    const header = GENERATED_COLUMNS.map((c) => `"${c.label}"`).join(",") + "\n";
    if (type === "excel") {
      const blob = new Blob([header], { type: "text/csv;charset=utf-8" });
      downloadBlob(blob, "generated_coupons.csv");
    } else {
      const blob = new Blob([new Uint8Array()], { type: "application/pdf" });
      downloadBlob(blob, "generated_coupons.pdf");
    }
    setExportOpen(false);
  };

  /* Which header keys get the little ↕ marker */
  const sortKeys =
    activeTab === "coupons"
      ? new Set(["price", "redeemValue", "singleUse", "toRedeem"])
      : new Set(["redeemMonthly", "singleUse", "applyEntire"]);

  /* ===== Generate Coupon popup control ===== */
  const [genOpen, setGenOpen] = useState(false);

  return (
    <div className="cp-wrap">
      <div className="cp-pagebar">
        <h1>Coupon</h1>
        <span className="material-icons home-ico">home</span>
      </div>

      <div className="cp-card">
        {/* Tabs + right tools */}
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

            <button
              className="mybtn"
              type="button"
              onClick={() => navigate("/crm/coupon/new")}
            >
              New Coupon
            </button>
            <button
              className="mybtn"
              type="button"
              onClick={() => setGenOpen(true)}   /* ← open popup here */
            >
              Generate Coupon
            </button>

            <button
              className="btn cols"
              type="button"
              onClick={() => setColOpen(true)}
              aria-haspopup="dialog"
            >
              Columns <span className="material-icons">arrow_drop_down</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {activeTab === "coupons" ? (
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
        ) : (
          <div className="cp-filter cp-filter--row">
            <div className="gc-left">
              <ComboSelect
                placeholder="Select Coupon"
                options={COUPON_OPTIONS}
                value={selectedCoupon}
                onChange={setSelectedCoupon}
                width={220}
              />
              <AssignType value={assignType} onChange={setAssignType} width={220} />

              <div className="export-wrap" ref={exportWrap}>
                <button
                  type="button"
                  className="btn export"
                  onClick={() => setExportOpen((v) => !v)}
                >
                  <span className="material-icons">file_download</span>
                  Export
                </button>
                {exportOpen && (
                  <div className="export-pop">
                    <button type="button" onClick={() => handleExport("excel")}>
                      <span className="material-icons">description</span> Excel
                    </button>
                    <button type="button" onClick={() => handleExport("pdf")}>
                      <span className="material-icons">picture_as_pdf</span> PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="cp-table-wrap">
          <table className="cp-table cp-table--wide">
            <thead>
              <tr>
                {columnsToRender.map((c, i) => (
                  <th key={c.key} className={i === 0 ? "col-sr" : ""}>
                    {c.label}
                    {sortKeys.has(c.key) ? <span className="sort-arrow">↕</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="empty-row">
                <td colSpan={columnsToRender.length}>No data available in table</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer / pager */}
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

      {/* Columns modal */}
      {colOpen && (
        <>
          <div className="cols-backdrop" onClick={() => setColOpen(false)} />
          <div className="cols-modal" role="dialog" aria-label="Columns">
            <div className="cols-grid">
              {currentColumns.map((c) => {
                const on = visibleKeys.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    className={`cols-chip ${on ? "on" : "off"}`}
                    onClick={() => toggleCol(c.key)}
                    title={c.label}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div className="cols-actions">
              <button type="button" className="restore" onClick={restoreCols}>
                Restore visibility
              </button>
              <button type="button" className="btn primary" onClick={() => setColOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </>
      )}

      {/* Generate Coupon modal */}
      <GenerateCouponModal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onGenerate={(payload) => {
          console.log("GENERATE →", payload);
          setGenOpen(false);
        }}
      />
    </div>
  );
}
