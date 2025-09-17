import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/OrderListPage.css";

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

function PaymentModeSelect({ value, onChange, options }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hover, setHover] = React.useState(-1);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  React.useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commit = (val) => {
    onChange(val);
    setOpen(false);
    setQuery("");
    setHover(-1);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHover((h) => Math.min(h + 1, filtered.length - 1));
      listRef.current?.children[Math.min(hover + 1, filtered.length - 1)]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHover((h) => Math.max(h - 1, 0));
      listRef.current?.children[Math.max(hover - 1, 0)]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[hover]) commit(filtered[hover]);
    }
  };

  return (
    <div className="pmode-dd" ref={wrapRef}>
      <button
        type="button"
        className={`ol-control pmode-btn ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="pmode-value">{value}</span>
        <span className="material-icons pmode-caret">expand_more</span>
      </button>

      {open && (
        <div className="pmode-pop" role="listbox" onKeyDown={onKeyDown}>
          <div className="pmode-search">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHover(0); }}
            />
            <span className="material-icons">search</span>
          </div>

          <div className="pmode-list" ref={listRef}>
            {filtered.length === 0 && (
              <div className="pmode-empty">No results</div>
            )}
            {filtered.map((opt, i) => {
              const selected = value === opt;
              return (
                <div
                  key={opt}
                  className={`pmode-item ${selected ? "is-selected" : ""} ${i === hover ? "is-hover" : ""}`}
                  onMouseEnter={() => setHover(i)}
                  onClick={() => commit(opt)}
                >
                  {opt}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


function SearchableSelect({ value, onChange, options, width = "100%" }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hover, setHover] = React.useState(-1);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  React.useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const commit = (val) => {
    onChange(val);
    setOpen(false);
    setQuery("");
    setHover(-1);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHover((h) => Math.min(h + 1, filtered.length - 1));
      listRef.current?.children[Math.min(hover + 1, filtered.length - 1)]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHover((h) => Math.max(h - 1, 0));
      listRef.current?.children[Math.max(hover - 1, 0)]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[hover]) commit(filtered[hover]);
    }
  };

  return (
    <div className="sselect-dd" ref={wrapRef} style={{ width }}>
      <button
        type="button"
        className={`ol-control sselect-btn ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="sselect-value">{value}</span>
        <span className="material-icons sselect-caret">expand_more</span>
      </button>

      {open && (
        <div className="sselect-pop" role="listbox" onKeyDown={onKeyDown}>
          <div className="sselect-search">
            <input
              ref={inputRef}
              type="text"
              placeholder=""
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHover(0); }}
            />
          </div>

          <div className="sselect-list" ref={listRef}>
            {filtered.length === 0 && (
              <div className="sselect-empty">No results</div>
            )}
            {filtered.map((opt, i) => {
              const selected = value === opt;
              return (
                <div
                  key={opt}
                  className={`sselect-item ${selected ? "is-selected" : ""} ${i === hover ? "is-hover" : ""}`}
                  onMouseEnter={() => setHover(i)}
                  onClick={() => commit(opt)}
                >
                  {opt}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DiscountSelect({
  value,
  onChange,
  options = [],                 // pass your discounts; [] will show "No results found"
  placeholder = "Select Discount",
  width = "100%",
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hover, setHover] = React.useState(-1);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  React.useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const label = value || placeholder;

  const commit = (val) => {
    onChange(val);
    setOpen(false);
    setQuery("");
    setHover(-1);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHover((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
      listRef.current?.children[Math.min(hover + 1, Math.max(filtered.length - 1, 0))]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHover((h) => Math.max(h - 1, 0));
      listRef.current?.children[Math.max(hover - 1, 0)]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[hover]) commit(filtered[hover]);
    }
  };

  return (
    <div className="dselect-dd" ref={wrapRef} style={{ width }}>
      <button
        type="button"
        className={`ol-control dselect-btn ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="dselect-value">{label}</span>
        <span className="material-icons dselect-caret">expand_more</span>
      </button>

      {open && (
        <div className="dselect-pop" role="listbox" onKeyDown={onKeyDown}>
          <div className="dselect-search">
            <input
              ref={inputRef}
              type="text"
              placeholder=""                // empty placeholder – matches your screenshot
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHover(0); }}
            />
          </div>

          <div className="dselect-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="dselect-empty">No results found</div>
            ) : (
              filtered.map((opt, i) => {
                const selected = value === opt;
                return (
                  <div
                    key={opt}
                    className={`dselect-item ${selected ? "is-selected" : ""} ${i === hover ? "is-hover" : ""}`}
                    onMouseEnter={() => setHover(i)}
                    onClick={() => commit(opt)}
                  >
                    {opt}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function LocationSelect({ value = [], onChange, options = [] }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  // close on outside / esc
  React.useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const toggleOpt = (opt) => {
    const set = new Set(value);
    if (set.has(opt)) set.delete(opt);
    else set.add(opt);
    onChange(Array.from(set));
  };

  return (
    <div className="loc-dd" ref={wrapRef}>
      {/* Pill button (same dull gray look) */}
      <button className="ol-locbtn" type="button" onClick={() => setOpen((v) => !v)}>
        <span className="ol-loctext">Select Location</span>
        <span className="ol-locbadge">{value.length}</span>
        <span className="material-icons ol-locclose">close</span>
      </button>

      {open && (
        <div className="loc-pop">
          <div className="loc-search">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="loc-list">
            {filtered.length === 0 ? (
              <div className="loc-empty">No results</div>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt);
                return (
                  <label key={opt} className="loc-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOpt(opt)}
                    />
                    {/* horizontally scrollable text for long names */}
                    <span className="loc-text" title={opt}>{opt}</span>
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


function ExportMenu() {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    const onDoc = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  const download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Excel (empty workbook via SpreadsheetML .xls)
  const exportExcel = () => {
    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Orders"><Table/></Worksheet>
</Workbook>`;
    download(new Blob([xml], { type: "application/vnd.ms-excel" }), `orders.xls`);
    setOpen(false);
  };

  // Tiny valid 1-page PDF (blank)
  const exportPDF = () => {
    const header = `%PDF-1.4\n`;
    const objs = [];
    let pdf = header;
    const add = (s) => { const off = pdf.length; pdf += s; objs.push(off); };

    const stream = `BT /F1 12 Tf 72 800 Td ( ) Tj ET`;
    add(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
    add(`2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n`);
    add(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`);
    add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
    add(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

    const xrefStart = pdf.length;
    const pad = (n) => String(n).padStart(10, "0");
    pdf += `xref\n0 6\n`;
    pdf += `0000000000 65535 f \n`;
    for (let i = 0; i < objs.length; i++) pdf += `${pad(objs[i])} 00000 n \n`;
    pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    download(new Blob([pdf], { type: "application/pdf" }), `orders.pdf`);
    setOpen(false);
  };

  return (
    <div className="ol-export" ref={wrapRef}>
      <button className="ol-iconbtn" type="button" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}>
        <span className="material-icons">file_download</span>
        <span className="material-icons">arrow_drop_down</span>
      </button>

      {open && (
        <div className="ol-export-pop" role="menu">
          <button className="ol-export-item" onClick={exportExcel}>
            {/* <span className="material-icons ol-export-ic">grid_on</span> */}
            <span>Excel</span>
          </button>
          <button className="ol-export-item" onClick={exportPDF}>
            {/* <span className="material-icons ol-export-ic">picture_as_pdf</span> */}
            <span>PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}


function OrderStatusSelect({ value, onChange }) {
  const STATUSES = [
    "pending",
    "Order confirmed",
    "In progress",
    "Out for delivery",
    "Delivered",
    "Cancelled",
  ];

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hover, setHover] = React.useState(-1);
  const wrapRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATUSES;
    return STATUSES.filter((o) => o.toLowerCase().includes(q));
  }, [query]);

  React.useEffect(() => {
    const onDoc = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  React.useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const commit = (val) => { onChange(val); setOpen(false); setQuery(""); setHover(-1); };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHover(h => Math.min(h + 1, filtered.length - 1));
      listRef.current?.children[Math.min(hover + 1, filtered.length - 1)]
        ?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHover(h => Math.max(h - 1, 0));
      listRef.current?.children[Math.max(hover - 1, 0)]
        ?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[hover]) commit(filtered[hover]);
    }
  };

  return (
    <div className="ostatus-dd" ref={wrapRef}>
      <button
        type="button"
        className={`ol-control ostatus-btn ${open ? "is-open" : ""}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ostatus-value">{value}</span>
        <span className="material-icons ostatus-caret">expand_more</span>
      </button>

      {open && (
        <div className="ostatus-pop" role="listbox" onKeyDown={onKeyDown}>
          <div className="ostatus-search">
            <input
              ref={inputRef}
              type="text"
              placeholder=""
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHover(0); }}
            />
          </div>

          <div className="ostatus-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="ostatus-empty">No results</div>
            ) : (
              filtered.map((opt, i) => {
                const selected = value === opt;
                return (
                  <div
                    key={opt}
                    className={`ostatus-item ${selected ? "is-selected" : ""} ${i === hover ? "is-hover" : ""}`}
                    onMouseEnter={() => setHover(i)}
                    onClick={() => commit(opt)}
                  >
                    {opt}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}



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
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [discount, setDiscount] = useState("");
  const [orderType, setOrderType] = useState("All");
  const [store, setStore] = useState("All");
  const [channel, setChannel] = useState("All");
  const [orderStatus, setOrderStatus] = useState("All");
  const [paymentStatus, setPaymentStatus] = useState("All");

  const [startDate, setStartDate] = useState(new Date(2025, 3, 1)); // 01/04/2025
  const [endDate, setEndDate] = useState(new Date(2026, 2, 31)); // 31/03/2026
  const [dateOpen, setDateOpen] = useState(false);

  const [custOpen, setCustOpen] = useState(false);
  const [custQuery, setCustQuery] = useState("");
  const custRef = useRef(null);
  const custSearchRef = useRef(null);

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

  useEffect(() => {
    const onDoc = (e) => {
      if (!custRef.current) return;
      if (!custRef.current.contains(e.target)) setCustOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setCustOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (custOpen && custSearchRef.current) custSearchRef.current.focus();
  }, [custOpen]);

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
            <ExportMenu />

            <div className="ol-select">
              <select defaultValue="10" aria-label="Rows per page">
                <option>100</option>
                <option>200</option>
                <option>500</option>
                <option>1000</option>
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

                <div className="ol-selectwrap" ref={custRef}>
                  <input
                    className="ol-control ol-input-cust"
                    placeholder="Search Customer"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    onFocus={() => setCustOpen(true)}
                    onClick={() => setCustOpen(true)}
                  />
                  <span className="material-icons ol-dd-caret">expand_more</span>

                  {custOpen && (
                    <div className="cust-pop">
                      <div className="cust-search">
                        <input
                          ref={custSearchRef}
                          value={custQuery}
                          onChange={(e) => setCustQuery(e.target.value)}
                          placeholder="Search customer..."
                          onKeyDown={(e) => e.key === "Escape" && setCustOpen(false)}
                        />
                      </div>
                      <div className="cust-list">
                        <div className="cust-hint">Please enter 1 or more characters</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="ol-field">
                <label className="ol-label">Payment Mode</label>
                <PaymentModeSelect
                  value={payMode}
                  onChange={setPayMode}
                  options={[
                    "All",
                    "Cash",
                    "Cheque",
                    "Pay Later",
                    "Bank",
                    "Card",
                    "Upi",
                    "Wallet",
                  ]}
                />
              </div>

              <div className="ol-field">
                <label className="ol-label">Location</label>
                <LocationSelect
                  value={selectedLocations}
                  onChange={setSelectedLocations}
                  options={[
                    "WABI SABI SUSTAINABILITY LLP",
                    "Brands4Less - Tilak Nagar",
                     "Brands4Less - M3M Urbana",
                     "Brands4Less-Rajori Garden inside (RJR)",
                     "Rajori Garden outside (RJO)",
                     "Brands4Less-Iffco Chock",
                     "Brands4Less-Krishna Nagar",
                     "Brands4Less-UP-AP",
                     "Brands4Less-Udhyog Vihar",
                  ]}
                />
              </div>


              <div className="ol-field">
                <label className="ol-label">Discount</label>
                <DiscountSelect
                  value={discount}
                  onChange={setDiscount}
                  options={[]}
                // later you can pass: ["All","10% Off","BOGO","FESTIVE50", ...]
                />
              </div>


              {/* Row 2 */}
              <div className="ol-field">
                <label className="ol-label">Order Type</label>
                <SearchableSelect
                  value={orderType}
                  onChange={setOrderType}
                  options={["All", "Walk In", "Take Away", "Delivery", "Self Checkout"]}
                />
              </div>


              <div className="ol-field">
                <label className="ol-label">Store</label>
                <SearchableSelect
                  value={store}
                  onChange={setStore}
                  options={["All", "In-Store", "Online"]}
                />
              </div>


              <div className="ol-field">
                <label className="ol-label">Channel</label>
                <SearchableSelect
                  value={channel}
                  onChange={setChannel}
                  options={[
                    "All",
                    "Woo Commerce",
                    "Shopify",
                    "Vasy Ecommerce",
                    "MPOS",
                    "POS",
                    "VORDER",
                  ]}
                />
              </div>


              <div className="ol-field">
                <label className="ol-label">Order Status</label>
                <OrderStatusSelect value={orderStatus} onChange={setOrderStatus} />
              </div>


              <div className="ol-field">
                <label className="ol-label">Payment Status</label>
                <SearchableSelect
                  value={paymentStatus}
                  onChange={setPaymentStatus}
                  options={[
                    "All",
                    "Paid",
                    "Due",
                    "Overdue",
                    "Refunded",
                    "Credit Note Generated",
                  ]}
                />
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
                    setLocationCount([]);
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
