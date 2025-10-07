// Stock REGISTER PAGE

import React, { useMemo, useRef, useState, useEffect } from "react";
import "../styles/InvStockRegister.css";

/* ───────── helpers ───────── */
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const l = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", l);
    document.addEventListener("touchstart", l);
    return () => {
      document.removeEventListener("mousedown", l);
      document.removeEventListener("touchstart", l);
    };
  }, [ref, handler]);
}

const Ic = {
  home: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-5v-7H10v7H5a2 2 0 0 1-2-2v-9z" />
    </svg>
  ),
  caret: () => (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.24 4.38a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z" />
    </svg>
  ),
  export: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 20h14v-2H5v2zM12 2l-5 5h3v6h4V7h3l-5-5z" />
    </svg>
  ),
  filter: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 4h18v2l-7 8v5l-4 1v-6L3 6V4z" />
    </svg>
  ),
  columns: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5h18v14H3V5zm2 2v10h4V7H5zm6 0v10h4V7h-4zm6 0v10h2V7h-2z" />
    </svg>
  ),
  cal: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm14 8H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10z" />
    </svg>
  ),
  search: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  ),
  close: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.29-6.29z" />
    </svg>
  ),
};

/* Simple select (searchable) */
function Select({ placeholder = "All", options = [], value, onChange, width = 240 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  const shown = useMemo(
    () => (q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options),
    [q, options]
  );

  return (
    <div className="sr-combo" style={{ width }} ref={ref}>
      <button
        className={`sr-combo-btn ${value ? "has" : ""}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="sr-combo-val">{value || placeholder}</span>
        <span className="sr-caret">
          <Ic.caret />
        </span>
      </button>
      {open && (
        <div className="sr-pop">
          <input
            className="sr-pop-search"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="sr-pop-list">
            {shown.map((o) => (
              <div
                key={o}
                className="sr-pop-item"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
              >
                {o}
              </div>
            ))}
            {!shown.length && <div className="sr-pop-empty">No options</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* per-page select */
function PerPage({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  const opts = [10, 50, 100, 500];
  return (
    <div className="sr-pp" ref={ref}>
      <button className="sr-pp-btn" onClick={() => setOpen((v) => !v)} type="button">
        {value} <Ic.caret />
      </button>
      {open && (
        <div className="sr-pp-menu">
          {opts.map((n) => (
            <button
              key={n}
              className="sr-pp-item"
              onClick={() => {
                onChange(n);
                setOpen(false);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* export dropdown */
function ExportMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const downloadEmptyCSV = () => {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stock-register.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const downloadEmptyPDF = () => {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Stock Register</title></head><body></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="sr-export" ref={ref}>
      <button className="sr-export-btn" onClick={() => setOpen((v) => !v)} type="button">
        <Ic.export />
        <span className="sr-drop-caret">
          <Ic.caret />
        </span>
      </button>
      {open && (
        <div className="sr-export-menu">
          <button className="sr-export-item" onClick={downloadEmptyCSV}>
            Excel
          </button>
          <button className="sr-export-item" onClick={downloadEmptyPDF}>
            PDF
          </button>
        </div>
      )}
    </div>
  );
}

/* columns dialog */
const ALL_COLUMNS = [
  { key: "sr", label: "Sr No." },
  { key: "name", label: "Product Name" },
  { key: "code", label: "Item Code" },
  { key: "dept", label: "Department" },
  { key: "cat", label: "Category" },
  { key: "subCat", label: "Sub Category" },
  { key: "brand", label: "Brand" },
  { key: "subBrand", label: "Sub Brand" },
  { key: "type", label: "Product Type" },
  { key: "status", label: "Product Status" },
  { key: "hsn", label: "HSN Code" },
  { key: "uom", label: "UOM" },
  { key: "pTax", label: "Purchase Tax" },
  { key: "sTax", label: "Sales Tax" },
  { key: "opQty", label: "Opening Quantity", group: "opening" },
  { key: "inQty", label: "In Quantity", group: "inward" },
  { key: "outQty", label: "Out Quantity", group: "outward" },
  { key: "clQty", label: "Closing Quantity", group: "closing" },
  { key: "opRate", label: "Opening Rate" },
  { key: "opVal", label: "Opening Value" },
  { key: "inRate", label: "In Rate" },
  { key: "inVal", label: "In Value" },
  { key: "outRate", label: "Out Rate" },
  { key: "outVal", label: "Out Value" },
  { key: "clRate", label: "Closing Rate" },
  { key: "clVal", label: "Closing Value" },
];

const DEFAULT_VISIBLE = ["sr", "name", "code", "opQty", "inQty", "outQty", "clQty"];

function ColumnButton({ visible, setVisible }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const toggle = (k) =>
    setVisible((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const restore = () => setVisible(DEFAULT_VISIBLE);

  return (
    <div className="sr-columns" ref={ref}>
      <button className="sr-columns-btn" onClick={() => setOpen((v) => !v)} type="button">
        <Ic.columns /> <span>Columns</span>{" "}
        <span className="sr-caret">
          <Ic.caret />
        </span>
      </button>
      {open && (
        <div className="sr-columns-pop">
          <div className="sr-columns-grid">
            {ALL_COLUMNS.map((col) => (
              <button
                key={col.key}
                className={`sr-col-chip ${visible.includes(col.key) ? "on" : ""}`}
                onClick={() => toggle(col.key)}
                type="button"
              >
                {col.label}
              </button>
            ))}
            <button className="sr-col-restore" onClick={restore} type="button">
              Restore visibility
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── main ───────── */
export default function InvStockRegister() {
  // toolbar
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");
  const [perPage, setPerPage] = useState(25);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");

  /* ▼ exact option lists from screenshots ▼ */
  const DEPT_OPTS = ["All", "Other", "Test", "S", "clothes", "Miscellaneous"];
  const CATEGORY_OPTS = [
    "All",
    "Accessories",
    "Boys & Girls - Blouse",
    "Boys & Girls - Dress",
    "Boys & Girls - Pant",
    "Boys & Girls - Shirt",
  ];
  const SUBCAT_OPTS = ["Select Sub Category"]; // only placeholder shown
  const BRAND_OPTS = ["All", "B4L", "ddd", "ff", "ffff", "g"];
  const SUBBRAND_OPTS = ["Select Sub Brand"]; // only placeholder shown
  const HSN_OPTS = ["All", "90041000", "102", "7117", "64039990", "42022210"];
  const GST_OPTS = ["All", "Gst 15", "GST 28", "GST 18", "GST 12", "GST 5"];
  const PTYPE_OPTS = ["All", "Finished", "SemiFinished", "Packaging", "Raw"];
  const PSTATUS_OPTS = ["All", "Active", "Deactive"];

  // filter selections
  const [dept, setDept] = useState(DEPT_OPTS[0]);
  const [cat, setCat] = useState(CATEGORY_OPTS[0]);
  const [subCat, setSubCat] = useState(SUBCAT_OPTS[0]);
  const [brand, setBrand] = useState(BRAND_OPTS[0]);
  const [subBrand, setSubBrand] = useState(SUBBRAND_OPTS[0]);
  const [hsn, setHsn] = useState(HSN_OPTS[0]);
  const [pTax, setPTax] = useState(GST_OPTS[0]);
  const [sTax, setSTax] = useState(GST_OPTS[0]);
  const [type, setType] = useState(PTYPE_OPTS[0]);
  const [status, setStatus] = useState(PSTATUS_OPTS[0]);

  // column visibility
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE);

  // 10 rows like screenshot
  const data = [
    { name: "(100) (C) Infant Clothes", code: "666855", opQty: "0.00", inQty: "1.00", outQty: "1.00", clQty: "0.00" },
    { name: "(100) (C) Infant Clothes", code: "667036", opQty: "0.00", inQty: "1.00", outQty: "1.00", clQty: "0.00" },
    { name: "(100) (C) Infant Clothes", code: "668499", opQty: "0.00", inQty: "1.00", outQty: "1.00", clQty: "0.00" },
    { name: "(100) (C) Infant Clothes", code: "668507", opQty: "0.00", inQty: "1.00", outQty: "1.00", clQty: "0.00" },
    { name: "(100) (C) Infant Clothes", code: "668509", opQty: "0.00", inQty: "1.00", outQty: "1.00", clQty: "0.00" },
    { name: "(100) (C) Infant Clothes", code: "668514", opQty: "0.00", inQty: "1.00", outQty: "1.00", clQty: "0.00" },
    { name: "(100) (C) Infant Clothes", code: "668556", opQty: "0.00", inQty: "1.00", outQty: "1.00", clQty: "0.00" },
    { name: "(100) (C) Infant Clothes", code: "671790", opQty: "0.00", inQty: "1.00", outQty: "1.00", clQty: "0.00" },
    { name: "(100) (C) Infant Clothes", code: "711165", opQty: "0.00", inQty: "1.00", outQty: "1.00", clQty: "0.00" },
    { name: "(100) (C) Infant Clothes", code: "711210", opQty: "0.00", inQty: "1.00", outQty: "1.00", clQty: "0.00" },
  ];

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }, [search, data]);

  const show = (key) => visibleCols.includes(key);

  return (
    <div className="sr-wrap">
      {/* title row */}
      <div className="sr-head">
        <h3 className="sr-title">Stock Register</h3>
        <span className="sr-home">
          <Ic.home />
        </span>
      </div>

      <div className="sr-card">
        {/* toolbar */}
        <div className="sr-toolbar">
          <div className="sr-row1">
            <div className="sr-field">
              <label>From Date</label>
              <div className="sr-input with-icon">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                <span className="sr-ic">
                  <Ic.cal />
                </span>
              </div>
            </div>

            <div className="sr-field">
              <label>To Date</label>
              <div className="sr-input with-icon">
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <span className="sr-ic">
                  <Ic.cal />
                </span>
              </div>
            </div>

            <PerPage value={perPage} onChange={setPerPage} />
            <ExportMenu />

            <button
              className={`sr-filter ${filterOpen ? "active" : ""}`}
              onClick={() => setFilterOpen((v) => !v)}
              type="button"
              title="Filter"
            >
              <Ic.filter /> <span>Filter</span>
            </button>

            <div className="sr-search">
              <span className="sr-sic">
                <Ic.search />
              </span>
              <input
                placeholder="Search List..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="sr-spacer" />

            <ColumnButton visible={visibleCols} setVisible={setVisibleCols} />
          </div>

          {/* filter area */}
          {filterOpen && (
            <div className="sr-filters">
              <div className="sr-grid">
                <div className="sr-fcol">
                  <label>Department</label>
                  <Select options={DEPT_OPTS} value={dept} onChange={setDept} width={260} />
                </div>
                <div className="sr-fcol">
                  <label>Category</label>
                  <Select options={CATEGORY_OPTS} value={cat} onChange={setCat} width={260} />
                </div>
                <div className="sr-fcol">
                  <label>Sub Category</label>
                  <Select options={SUBCAT_OPTS} value={subCat} onChange={setSubCat} width={260} />
                </div>

                <div className="sr-fcol">
                  <label>Brand</label>
                  <Select options={BRAND_OPTS} value={brand} onChange={setBrand} width={260} />
                </div>
                <div className="sr-fcol">
                  <label>Sub Brand</label>
                  <Select options={SUBBRAND_OPTS} value={subBrand} onChange={setSubBrand} width={260} />
                </div>
                <div className="sr-fcol">
                  <label>HSN</label>
                  <Select options={HSN_OPTS} value={hsn} onChange={setHsn} width={260} />
                </div>

                <div className="sr-fcol">
                  <label>Purchase Tax</label>
                  <Select options={GST_OPTS} value={pTax} onChange={setPTax} width={260} />
                </div>
                <div className="sr-fcol">
                  <label>Sales Tax</label>
                  <Select options={GST_OPTS} value={sTax} onChange={setSTax} width={260} />
                </div>
                <div className="sr-fcol">
                  <label>Product Type</label>
                  <Select options={PTYPE_OPTS} value={type} onChange={setType} width={260} />
                </div>

                <div className="sr-fcol">
                  <label>Product Status</label>
                  <Select options={PSTATUS_OPTS} value={status} onChange={setStatus} width={260} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* table */}
        <div className="sr-table">
          {/* grouped header bar */}
          <div className="sr-group-head">
            {show("sr") && <div />}
            {show("name") && <div />}
            {show("code") && <div />}
            {show("dept") && <div />}
            {show("cat") && <div />}
            {show("subCat") && <div />}
            {show("brand") && <div />}
            {show("subBrand") && <div />}
            {show("type") && <div />}
            {show("status") && <div />}
            {show("hsn") && <div />}
            {show("uom") && <div />}
            {show("pTax") && <div />}
            {show("sTax") && <div />}

            {show("opQty") && <div className="grp">Opening</div>}
            {show("inQty") && <div className="grp">Inward</div>}
            {show("outQty") && <div className="grp">Outward</div>}
            {show("clQty") && <div className="grp">Closing</div>}

            {show("opRate") && <div />}
            {show("opVal") && <div />}
            {show("inRate") && <div />}
            {show("inVal") && <div />}
            {show("outRate") && <div />}
            {show("outVal") && <div />}
            {show("clRate") && <div />}
            {show("clVal") && <div />}
          </div>

          {/* column header row */}
          <div className="sr-thead">
            {show("sr") && <div className="c">Sr No.</div>}
            {show("name") && <div className="c">Product Name</div>}
            {show("code") && <div className="c">Item Code</div>}
            {show("dept") && <div className="c">Department</div>}
            {show("cat") && <div className="c">Category</div>}
            {show("subCat") && <div className="c">Sub Category</div>}
            {show("brand") && <div className="c">Brand</div>}
            {show("subBrand") && <div className="c">Sub Brand</div>}
            {show("type") && <div className="c">Product Type</div>}
            {show("status") && <div className="c">Product Status</div>}
            {show("hsn") && <div className="c">HSN Code</div>}
            {show("uom") && <div className="c">UOM</div>}
            {show("pTax") && <div className="c">Purchase Tax</div>}
            {show("sTax") && <div className="c">Sales Tax</div>}

            {show("opQty") && <div className="c num">Opening Quantity</div>}
            {show("inQty") && <div className="c num">In Quantity</div>}
            {show("outQty") && <div className="c num">Out Quantity</div>}
            {show("clQty") && <div className="c num">Closing Quantity</div>}

            {show("opRate") && <div className="c num">Opening Rate</div>}
            {show("opVal") && <div className="c num">Opening Value</div>}
            {show("inRate") && <div className="c num">In Rate</div>}
            {show("inVal") && <div className="c num">In Value</div>}
            {show("outRate") && <div className="c num">Out Rate</div>}
            {show("outVal") && <div className="c num">Out Value</div>}
            {show("clRate") && <div className="c num">Closing Rate</div>}
            {show("clVal") && <div className="c num">Closing Value</div>}
          </div>

          {/* rows */}
          {filtered.map((r, i) => (
            <div className="sr-row" key={i}>
              {show("sr") && <div className="c id">{i + 1}</div>}
              {show("name") && (
                <div className="c link">
                  <a href="#">{r.name}</a>
                </div>
              )}
              {show("code") && <div className="c">{r.code}</div>}
              {show("dept") && <div className="c">—</div>}
              {show("cat") && <div className="c">—</div>}
              {show("subCat") && <div className="c">—</div>}
              {show("brand") && <div className="c">—</div>}
              {show("subBrand") && <div className="c">—</div>}
              {show("type") && <div className="c">—</div>}
              {show("status") && <div className="c">—</div>}
              {show("hsn") && <div className="c">—</div>}
              {show("uom") && <div className="c">—</div>}
              {show("pTax") && <div className="c">—</div>}
              {show("sTax") && <div className="c">—</div>}

              {show("opQty") && <div className="c num">{r.opQty}</div>}
              {show("inQty") && <div className="c num">{r.inQty}</div>}
              {show("outQty") && <div className="c num">{r.outQty}</div>}
              {show("clQty") && <div className="c num">{r.clQty}</div>}

              {show("opRate") && <div className="c num">0.00</div>}
              {show("opVal") && <div className="c num">0.00</div>}
              {show("inRate") && <div className="c num">0.00</div>}
              {show("inVal") && <div className="c num">0.00</div>}
              {show("outRate") && <div className="c num">0.00</div>}
              {show("outVal") && <div className="c num">0.00</div>}
              {show("clRate") && <div className="c num">0.00</div>}
              {show("clVal") && <div className="c num">0.00</div>}
            </div>
          ))}
        </div>

        {/* footer */}
        <div className="sr-foot">
          <div className="sr-showing">
            Showing 1 to {filtered.length} of {filtered.length} entries
          </div>
          <div className="sr-pager">
            <button className="sr-page-btn" disabled aria-label="Previous">
              ‹
            </button>
            <span className="sr-page-num active">1</span>
            <button className="sr-page-btn" disabled aria-label="Next">
              ›
            </button>
          </div>
        </div>

        <div className="sr-note">
          *Stock is calculated on average price. so, it can be vary.
        </div>
      </div>
    </div>
  );
}
