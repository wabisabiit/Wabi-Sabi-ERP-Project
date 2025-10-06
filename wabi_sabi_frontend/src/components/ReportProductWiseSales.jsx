// src/components/ReportProductWiseSales.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ReportProductWiseSales.css";

/* ===== Masters (match screenshots) ===== */
const LOCATION_OPTIONS = [
  "All",
  "WABI SABI SUSTAINABILITY LLP",
  "Brands 4 less – Ansal Plaza",
  "Brands 4 less – Rajouri Garden",
  "Brand4Less–Tilak Nagar",
  "Brands 4 less– M3M Urbana",
  "Brands 4 less – IFFCO Chowk",
  "Brands Loot – Udyog Vihar",
  "Brands loot – Krishna Nagar",
];

const DEPARTMENT_OPTIONS = ["Other", "Test", "S", "clothes", "Miscellaneous"];

const CATEGORY_OPTIONS = [
  "Accessories",
  "Boys & Girls - Blouse",
  "Boys & Girls - Dress",
  "Boys & Girls - Pant",
  "Boys & Girls - Shirt",
  "Boys & Girls - Shoes",
];

const BRAND_OPTIONS = ["B4L", "ddd", "ff", "ffff", "g", "ggg"];

const SUBCATEGORY_OPTIONS = []; // none -> "No results found"
const SUBBRAND_OPTIONS = []; // none -> "No results found"

const SALES_TYPES = ["Invoice", "POS"];
const PAGE_SIZES = [10, 25, 50, 100];

/* ===== Dummy rows (10) ===== */
const ROWS = Array.from({ length: 10 }, (_, i) => ({
  sr: i + 1,
  department: "Accessories",
  category: "Accessories",
  subCategory: "Hand Bag",
  brand: "B4L",
  subBrand: i % 2 ? "B4L Classic" : "B4L Premium",
  itemcode: `${26570 + i}–F`,
  product: "(860) (L) Hand Bag",
  lastPurchaseDate: "23/07/2025",
  lastPurchaseQty: 0,
  lastSalesDate: "23/07/2025",
  location: "WABI SABI SUSTAINABILITY LLP",
  qtySold: 1,
  customerName: `Customer ${i + 1}`,
  mobile: `98${String(10000000 + i + 1).slice(0, 8)}`,
}));

const COLUMNS = [
  { key: "sr", label: "Sr. No." },
  { key: "department", label: "Department" },
  { key: "category", label: "Category" },
  { key: "subCategory", label: "Sub Category" },
  { key: "brand", label: "Brand" },
  { key: "subBrand", label: "Sub Brand" },
  { key: "itemcode", label: "Itemcode" },
  { key: "product", label: "Product" },
  { key: "lastPurchaseDate", label: "Last Purchase Date" },
  { key: "lastPurchaseQty", label: "Last Purchase Qty" },
  { key: "lastSalesDate", label: "Last Sales Date" },
  { key: "location", label: "Location" },
  { key: "qtySold", label: "Qty Sold" },
  { key: "customerName", label: "Customer Name" },
  { key: "mobile", label: "Mobile Number" },
];

/* ---------- UI primitives to mirror screenshots ---------- */

/** Searchable single-select (Dept/Category/Brand/SubBrand/SalesType) */
function SearchSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  emptyText = "No results found",
  searchPlaceholder = "",
  width,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())),
    [options, q]
  );

  return (
    <div className="pwss-field" style={{ width }} ref={ref}>
      <label>{label}</label>
      <button type="button" className={`ss-head ${open ? "open" : ""}`} onClick={() => setOpen((v) => !v)}>
        <span className={`ss-head-text ${value ? "" : "dim"}`}>{value || placeholder}</span>
        <span className="material-icons-outlined">expand_more</span>
      </button>

      <div className={`ss-pop ${open ? "show" : ""}`}>
        <input
          className="ss-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
        />
        <div className="ss-list">
          {filtered.length === 0 ? (
            <div className="ss-empty">{emptyText}</div>
          ) : (
            filtered.map((o) => (
              <div
                key={o}
                className={`ss-item ${o === value ? "active" : ""}`}
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                  setQ("");
                }}
              >
                {o}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** Multi-select for Location (checkbox list + badge + close button) */
function MultiSelectLocation({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())),
    [options, q]
  );

  const toggle = (opt) => {
    if (opt === "All") {
      onChange(["All"]);
      return;
    }
    const next = new Set(value);
    next.has(opt) ? next.delete(opt) : next.add(opt);
    next.delete("All");
    onChange([...next]);
  };

  const badge = value.length ? value.length : 0;

  return (
    <div className="pwss-field" ref={ref}>
      <label>{label}</label>

      <button type="button" className={`ms-head ${open ? "open" : ""}`} onClick={() => setOpen((v) => !v)}>
        <span className={`ms-text ${badge ? "" : "dim"}`}>Select Location</span>
        {badge ? <span className="ms-badge">{badge}</span> : null}
        <span className="ms-close" onClick={(e) => { e.stopPropagation(); onChange([]); }} />
      </button>

      <div className={`ms-pop ${open ? "show" : ""}`}>
        <input
          className="ss-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder=""
        />
        <div className="ms-list">
          {filtered.map((opt) => {
            const checked = value.includes(opt) || (opt === "All" && value.includes("All"));
            return (
              <label key={opt} className="ms-row">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt)}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Product box (requires >=3 chars, shows helper text like screenshot) */
function ProductSearchBox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="pwss-field" ref={ref}>
      <label>Select Product</label>
      <button type="button" className={`ss-head ${open ? "open" : ""}`} onClick={() => setOpen((v) => !v)}>
        <span className={`ss-head-text ${value ? "" : "dim"}`}>{value || "Search Product"}</span>
        <span className="material-icons-outlined">expand_more</span>
      </button>

      <div className={`ss-pop ${open ? "show" : ""}`}>
        <input
          className="ss-search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=""
        />
        {(!value || value.length < 3) ? (
          <div className="ss-empty">Please enter 3 or more characters</div>
        ) : (
          <div className="ss-list">{/* (intentionally blank for demo) */}</div>
        )}
      </div>
    </div>
  );
}

export default function ReportProductWiseSales() {
  const navigate = useNavigate();

  /* Toolbar state */
  const [locations, setLocations] = useState([]); // multi-select
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [subBrand, setSubBrand] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");
  const [salesType, setSalesType] = useState("");
  const [pageSize, setPageSize] = useState(10);

  /* Download split menu (unchanged) */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* Filtering (now accepts multi-location) */
  const filtered = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return ROWS.filter((r) => {
      if (q) {
        const hay = `${r.product} ${r.brand} ${r.category} ${r.department} ${r.location} ${r.customerName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (locations.length && !locations.includes("All") && !locations.includes(r.location)) return false;
      if (department && r.department !== department) return false;
      if (category && r.category !== category) return false;
      if (subCategory && r.subCategory !== subCategory) return false;
      if (brand && r.brand !== brand) return false;
      if (subBrand && r.subBrand !== subBrand) return false;
      return true;
    });
  }, [productSearch, locations, department, category, subCategory, brand, subBrand]);

  /* Horizontal scroll buttons (unchanged) */
  const scrollerRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const syncBtns = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };
  useEffect(() => {
    syncBtns();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => syncBtns();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  const scrollByX = (dx) => scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  /* Downloads — EMPTY files (unchanged) */
  const downloadEmpty = (filename, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([], { type }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 300);
  };
  const onExcel = () => downloadEmpty("product-wise-sales-summary.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const onPDF = () => downloadEmpty("product-wise-sales-summary.pdf", "application/pdf");
  const onAllDataExcel = () => downloadEmpty("product-wise-sales-summary-all-data.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const onAllDataPDF = () => downloadEmpty("product-wise-sales-summary-all-data.pdf", "application/pdf");

  const showing = Math.min(filtered.length, pageSize);

  return (
    <div className="pwss-wrap">
      <div className="pwss-top">
        <div className="pwss-title">Product Wise Sales Summary</div>
        <div className="pwss-crumb" aria-label="breadcrumb">
          <span className="material-icons-outlined pwss-crumb-link" role="link" tabIndex={0} onClick={() => navigate("/")} title="Home">home</span>
          <span className="pwss-crumb-sep">|</span>
          <span className="pwss-crumb-dim">Reports</span>
        </div>
      </div>

      <div className="pwss-card">
        <div className="pwss-toolbar">
          {/* Row 1 */}
          <div className="pwss-row">
            <MultiSelectLocation
              label="Select Location"
              options={LOCATION_OPTIONS}
              value={locations}
              onChange={setLocations}
            />

            <SearchSelect
              label="Select Department"
              placeholder="Select Department"
              options={DEPARTMENT_OPTIONS}
              value={department}
              onChange={setDepartment}
            />

            <SearchSelect
              label="Select Category"
              placeholder="Select Category"
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
            />

            <SearchSelect
              label="Select Sub Category"
              placeholder="Select Sub Category"
              options={SUBCATEGORY_OPTIONS}
              value={subCategory}
              onChange={setSubCategory}
            />
          </div>

          {/* Row 2 */}
          <div className="pwss-row">
            <SearchSelect
              label="Select Brand"
              placeholder="Select Brand"
              options={BRAND_OPTIONS}
              value={brand}
              onChange={setBrand}
            />

            <SearchSelect
              label="Select Sub Brand"
              placeholder="Select Sub Brand"
              options={SUBBRAND_OPTIONS}
              value={subBrand}
              onChange={setSubBrand}
            />

            <ProductSearchBox value={productSearch} onChange={setProductSearch} />

            <div className="pwss-field">
              <label>From Date</label>
              <div className="with-icon">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <span className="material-icons-outlined">calendar_month</span>
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="pwss-row">
            <div className="pwss-field">
              <label>To Date</label>
              <div className="with-icon">
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <span className="material-icons-outlined">calendar_month</span>
              </div>
            </div>

            <SearchSelect
              label="Select Sales Type"
              placeholder="Select Sales Type"
              options={SALES_TYPES}
              value={salesType}
              onChange={setSalesType}
            />

            <div className="pwss-spacer" />

            <div className="pwss-actions" ref={menuRef}>
              <button
                type="button"
                className="dl-btn"
                title="Download"
                onClick={() => setMenuOpen(v => !v)}
              >
                <span className="material-icons-outlined">download</span>
              </button>
              <div className={`menu ${menuOpen ? "show" : ""}`}>
                <button type="button" onClick={onExcel}>
                  <span className="material-icons-outlined">article</span> Excel
                </button>
                <button type="button" onClick={onPDF}>
                  <span className="material-icons-outlined">picture_as_pdf</span> PDF
                </button>
                <button type="button" onClick={onAllDataExcel}>
                  <span className="material-icons-outlined">library_add</span> All Excel
                </button>
              </div>

              <div className="psize">
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="material-icons-outlined">expand_more</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Table (unchanged) ===== */}
        <div className="pwss-table-outer">
          <button className="hbtn left" onClick={() => scrollByX(-320)}>
            <span className="material-icons-outlined">chevron_left</span>
          </button>
          <button className="hbtn right" onClick={() => scrollByX(320)}>
            <span className="material-icons-outlined">chevron_right</span>
          </button>

          <div className="pwss-table-scroll" ref={scrollerRef} onScroll={syncBtns}>
            <table className="pwss-table">
              <thead>
                <tr>{COLUMNS.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.slice(0, pageSize).map((r) => (
                  <tr key={r.sr}>{COLUMNS.map((c) => <td key={c.key}>{r[c.key]}</td>)}</tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="total-label">Total</td>
                  {COLUMNS.slice(1).map((c) => <td key={c.key} />)}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pwss-meta">Showing 1 to {Math.min(filtered.length, pageSize)} of {filtered.length} entries</div>
        </div>
      </div>
    </div>
  );
}
