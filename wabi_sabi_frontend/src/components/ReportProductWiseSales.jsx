// src/components/ReportProductWiseSales.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ReportProductWiseSales.css";
import {
  listProductWiseSales,
  listLocations,
  listDepartments,
  listCategories,
} from "../api/client";

/* ===== Masters ===== */
const SUBCATEGORY_OPTIONS = []; // none
const SUBBRAND_OPTIONS = []; // none
const PAGE_SIZES = [10, 25, 50, 100];

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

/* ---------- UI primitives ---------- */

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

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (options || []).filter((o) => String(o).toLowerCase().includes(qq));
  }, [options, q]);

  return (
    <div className="pwss-field" style={{ width }} ref={ref}>
      <label>{label}</label>
      <button
        type="button"
        className={`ss-head ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
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

        {/* ✅ Show only 5 items then scroll */}
        <div className="ss-list" style={{ maxHeight: 5 * 36, overflowY: "auto" }}>
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

/** Multi-select for Location */
function MultiSelectLocation({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (options || []).filter((o) => String(o?.label || "").toLowerCase().includes(qq));
  }, [options, q]);

  const toggle = (opt) => {
    const val = opt?.value;

    if (val === "All") {
      onChange(["All"]);
      return;
    }
    const next = new Set(value);
    next.has(val) ? next.delete(val) : next.add(val);
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
        <input className="ss-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="" />

        {/* ✅ Show only 5 rows then scroll */}
        <div className="ms-list" style={{ maxHeight: 5 * 36, overflowY: "auto" }}>
          {filtered.map((opt) => {
            const checked = value.includes(opt.value) || (opt.value === "All" && value.includes("All"));
            return (
              <label key={opt.value} className="ms-row">
                <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Product box (typed search) */
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
        <input className="ss-search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="" />
        {!value || value.length < 3 ? (
          <div className="ss-empty">Please enter 3 or more characters</div>
        ) : (
          <div className="ss-list" />
        )}
      </div>
    </div>
  );
}

export default function ReportProductWiseSales() {
  const navigate = useNavigate();

  /* Toolbar state */
  const [locations, setLocations] = useState([]); // multi-select codes
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [subBrand, setSubBrand] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");
  const [pageSize, setPageSize] = useState(10);

  /* ✅ Real dropdown options */
  const [locationOptions, setLocationOptions] = useState([{ value: "All", label: "All" }]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  /* Data */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Download split menu */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* ✅ Load real locations */
  useEffect(() => {
    const load = async () => {
      try {
        const locs = await listLocations(); // [{id, code, name}]
        const opts = [{ value: "All", label: "All" }].concat(
          (locs || []).map((x) => ({
            value: String(x?.code || "").trim(),           // ✅ send code
            label: String(x?.name || x?.code || "").trim() // ✅ show name
          }))
        );
        setLocationOptions(opts);
      } catch {
        setLocationOptions([{ value: "All", label: "All" }]);
      }
    };
    load();
  }, []);

  /* ✅ Load real departments */
  useEffect(() => {
    const load = async () => {
      try {
        const depts = await listDepartments();
        setDepartmentOptions(depts || []);
      } catch {
        setDepartmentOptions([]);
      }
    };
    load();
  }, []);

  /* ✅ Load real categories (filtered by department) */
  useEffect(() => {
    const load = async () => {
      try {
        const cats = await listCategories({ department });
        setCategoryOptions(cats || []);
      } catch {
        setCategoryOptions([]);
      }
    };
    load();
  }, [department]);

  /* Fetch report data whenever filters change */
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await listProductWiseSales({
          location: locations.includes("All") || locations.length === 0 ? null : locations,
          department,
          category,
          brand,
          product: productSearch,
          date_from: fromDate,
          date_to: toDate,
          all: 1,
        });
        setRows(res?.results || []);
      } catch (e) {
        setError(String(e?.message || e));
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [locations, department, category, brand, productSearch, fromDate, toDate]);

  /* Horizontal scroll buttons */
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

  /* Downloads — placeholders */
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

  const showing = Math.min(rows.length, pageSize);

  return (
    <div className="pwss-wrap">
      <div className="pwss-top">
        <div className="pwss-title">Product Wise Sales Summary</div>
        <div className="pwss-crumb" aria-label="breadcrumb">
          <span className="material-icons-outlined pwss-crumb-link" role="link" tabIndex={0} onClick={() => navigate("/")} title="Home">
            home
          </span>
          <span className="pwss-crumb-sep">|</span>
          <span className="pwss-crumb-dim">Reports</span>
        </div>
      </div>

      <div className="pwss-card">
        <div className="pwss-toolbar">
          <div className="pwss-row">
            <MultiSelectLocation label="Select Location" options={locationOptions} value={locations} onChange={setLocations} />

            <SearchSelect
              label="Select Department"
              placeholder="Select Department"
              options={departmentOptions}
              value={department}
              onChange={(v) => { setDepartment(v); setCategory(""); }}
            />

            <SearchSelect
              label="Select Category"
              placeholder="Select Category"
              options={categoryOptions}
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

          <div className="pwss-row">
            <SearchSelect
              label="Select Brand"
              placeholder="Select Brand"
              options={[]}   // unchanged
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

          <div className="pwss-row">
            <div className="pwss-field">
              <label>To Date</label>
              <div className="with-icon">
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <span className="material-icons-outlined">calendar_month</span>
              </div>
            </div>

            <div className="pwss-spacer" />

            <div className="pwss-actions" ref={menuRef}>
              <button type="button" className="dl-btn" title="Download" onClick={() => setMenuOpen((v) => !v)}>
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

        {loading && <div className="pwss-status">Loading…</div>}
        {error && <div className="pwss-error">{error}</div>}

        <div className="pwss-table-outer">
          <button className={`hbtn left ${canLeft ? "" : "dim"}`} onClick={() => scrollByX(-320)}>
            <span className="material-icons-outlined">chevron_left</span>
          </button>
          <button className={`hbtn right ${canRight ? "" : "dim"}`} onClick={() => scrollByX(320)}>
            <span className="material-icons-outlined">chevron_right</span>
          </button>

          <div className="pwss-table-scroll" ref={scrollerRef} onScroll={syncBtns}>
            <table className="pwss-table">
              <thead>
                <tr>{COLUMNS.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, pageSize).map((r, idx) => (
                  <tr key={`${r.itemcode}-${idx}`}>
                    {COLUMNS.map((c) => <td key={c.key}>{r[c.key]}</td>)}
                  </tr>
                ))}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} style={{ textAlign: "center" }}>No data</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="total-label">Total</td>
                  {COLUMNS.slice(1).map((c) => <td key={c.key} />)}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pwss-meta">
            Showing 1 to {showing} of {rows.length} entries
          </div>
        </div>
      </div>
    </div>
  );
}