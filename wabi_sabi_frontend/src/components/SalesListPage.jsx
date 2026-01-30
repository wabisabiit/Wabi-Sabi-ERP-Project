// src/components/SaleListPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/SalesListPage.css";
// import { listSales, apiMe } from "../api/client";
import { listSales, apiMe, deleteSale } from "../api/client";
import { useNavigate } from "react-router-dom";


/* ---------- Columns config (Created Date & Due Date removed) ---------- */
const COLS = [
    { id: "sr", label: "Sr. No." },
    { id: "inv", label: "Invoice No" },
    { id: "date", label: "Date" },
    { id: "cust", label: "Customer Name" },
    { id: "custNo", label: "Customer Number" }, // ✅ NEW
    { id: "total", label: "Total Amount" },
    { id: "dueAmt", label: "Due Amount" },
    { id: "mode", label: "Payment Mode" },
    { id: "pstatus", label: "Payment Status" },
    { id: "credit", label: "Credit Applied Amt" },
    { id: "otype", label: "Order Type" },
    { id: "fb", label: "Feedback" },
];

const DEFAULT_VISIBLE = COLS.map((c) => c.id);
const MAX_VISIBLE = null;

/* 🔹 Inline loading spinner for table */
function SaleListLoadingInline() {
    return (
        <span className="loading-inline">
            <span className="spinner" />
            Loading…
        </span>
    );
}

/* =========================
   Small UI helper components
   ========================= */

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
            listRef.current?.children[Math.min(hover + 1, filtered.length - 1)]?.scrollIntoView({
                block: "nearest",
            });
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
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setHover(0);
                            }}
                        />
                        <span className="material-icons">search</span>
                    </div>

                    <div className="pmode-list" ref={listRef}>
                        {filtered.length === 0 && <div className="pmode-empty">No results</div>}
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
            listRef.current?.children[Math.min(hover + 1, filtered.length - 1)]?.scrollIntoView({
                block: "nearest",
            });
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
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setHover(0);
                            }}
                        />
                    </div>

                    <div className="sselect-list" ref={listRef}>
                        {filtered.length === 0 && <div className="sselect-empty">No results</div>}
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

function DiscountSelect({ value, onChange, options = [], placeholder = "Select Discount", width = "100%" }) {
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
            listRef.current?.children[Math.min(hover + 1, Math.max(filtered.length - 1, 0))]?.scrollIntoView({
                block: "nearest",
            });
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
                            placeholder=""
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setHover(0);
                            }}
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

    useEffect(() => {
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

    useEffect(() => {
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
            <button className="ol-locbtn" type="button" onClick={() => setOpen((v) => !v)}>
                <span className="ol-loctext">Select Location</span>
                <span className="ol-locbadge">{value.length}</span>
                <span className="material-icons ol-locclose">close</span>
            </button>

            {open && (
                <div className="loc-pop">
                    <div className="loc-search">
                        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="" />
                    </div>

                    <div className="loc-list">
                        {filtered.length === 0 ? (
                            <div className="loc-empty">No results</div>
                        ) : (
                            filtered.map((opt) => {
                                const checked = value.includes(opt);
                                return (
                                    <label key={opt} className="loc-item">
                                        <input type="checkbox" checked={checked} onChange={() => toggleOpt(opt)} />
                                        <span className="loc-text" title={opt}>
                                            {opt}
                                        </span>
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

    useEffect(() => {
        const onDoc = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    const download = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportExcel = () => {
        const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Orders"><Table/></Worksheet>
</Workbook>`;
        download(new Blob([xml], { type: "application/vnd.ms-excel" }), "orders.xls");
        setOpen(false);
    };

    const exportPDF = () => {
        const pdfContent = "%PDF-1.4\n% Simple placeholder PDF\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF";
        download(new Blob([pdfContent], { type: "application/pdf" }), "orders.pdf");
        setOpen(false);
    };

    return (
        <div className="ol-export" ref={wrapRef}>
            <button
                className="ol-iconbtn"
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <span className="material-icons">file_download</span>
                <span className="material-icons">arrow_drop_down</span>
            </button>

            {open && (
                <div className="ol-export-pop" role="menu">
                    <button className="ol-export-item" onClick={exportExcel}>
                        <span>Excel</span>
                    </button>
                    <button className="ol-export-item" onClick={exportPDF}>
                        <span>PDF</span>
                    </button>
                </div>
            )}
        </div>
    );
}

function OrderStatusSelect({ value, onChange }) {
    const STATUSES = ["pending", "Order confirmed", "In progress", "Out for delivery", "Delivered", "Cancelled"];

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

    useEffect(() => {
        const onDoc = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    useEffect(() => {
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
        <div className="ostatus-dd" ref={wrapRef}>
            <button
                type="button"
                className={`ol-control ostatus-btn ${open ? "is-open" : ""}`}
                onClick={() => setOpen((v) => !v)}
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
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setHover(0);
                            }}
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

/* Date input used by DatePicker */
const DateInput = React.forwardRef(({ value, onClick }, ref) => (
    <input className="ol-control ol-input-date" value={value} onClick={onClick} readOnly ref={ref} />
));
DateInput.displayName = "DateInput";

/* =========================
   Main page
   ========================= */
export default function SaleListPage() {
    const navigate = useNavigate();

    /* columns popover */
    const [openCols, setOpenCols] = useState(false);
    const [visible, setVisible] = useState(() => new Set(DEFAULT_VISIBLE));
    const colPanelRef = useRef(null);

    /* filter panel */
    const [openFilter, setOpenFilter] = useState(false);
    const [dateRange, setDateRange] = useState("01/04/2025 - 31/03/2026");
    const [customer, setCustomer] = useState("");
    const [customerNumber, setCustomerNumber] = useState("");
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

    // admin-only delete UI
    const [isAdmin, setIsAdmin] = useState(false);

    // Hook your customers data here (currently empty)
    const ALL_CUSTOMERS = useMemo(() => [], []);

    const filteredCustomers = useMemo(() => {
        const q = custQuery.trim().toLowerCase();
        if (!q) return [];
        return ALL_CUSTOMERS.filter((c) => c.toLowerCase().includes(q));
    }, [custQuery, ALL_CUSTOMERS]);

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
        const onKey = (e) => {
            if (e.key === "Escape") setCustOpen(false);
        };
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

    useEffect(() => {
        (async () => {
            try {
                const me = await apiMe();
                setIsAdmin(!!me?.is_superuser || !!me?.is_staff);
            } catch {
                setIsAdmin(false);
            }
        })();
    }, []);

    const toggle = (id) => {
        setVisible((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else {
                if (MAX_VISIBLE && next.size >= MAX_VISIBLE) return prev;
                next.add(id);
            }
            return next;
        });
    };

    const restore = () => setVisible(new Set(DEFAULT_VISIBLE));

    const visibleCols = useMemo(() => COLS.filter((c) => visible.has(c.id)), [visible]);
    const colSpan = visibleCols.length + 1 + (isAdmin ? 1 : 0);

    /* ==== DATA (from backend) ==== */
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);
    const [total, setTotal] = useState(0);
    const [searchText, setSearchText] = useState("");

    const fmt = (d) => {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    const toISODate = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const buildParamsFromFilters = () => {
        const params = { all: 1 };

        // ✅ date filter (backend supports date_from/date_to)
        if (startDate && endDate) {
            params.date_from = toISODate(startDate);
            params.date_to = toISODate(endDate);
        }

        // ✅ customer name / mobile filters
        // backend supports `q` (matches customer name/phone/invoice/payment_method)
        const qParts = [];
        if (searchText.trim()) qParts.push(searchText.trim());
        if (customer.trim()) qParts.push(customer.trim());
        if (customerNumber.trim()) qParts.push(customerNumber.trim());
        const q = qParts.filter(Boolean).join(" ").trim();
        if (q) params.q = q;

        // ✅ payment mode (kept as param for backend; also helps if backend expands later)
        const pm = String(payMode || "").trim().toUpperCase();
        if (pm && pm !== "ALL") params.payment_method = pm;

        // ✅ location (kept as param for backend; backend change will use this)
        if (Array.isArray(selectedLocations) && selectedLocations.length) {
            params.location = selectedLocations;
        }

        return params;
    };

    const fetchRows = async () => {
        setLoading(true);
        try {
            const res = await listSales(buildParamsFromFilters());
            setRows(res?.results || []);
            setTotal(res?.total || 0);
        } catch (err) {
            console.error("Failed to load sales:", err);
            setRows([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    // ✅ only initial load (filters should apply only when pressing Apply/Search/Reset)
    useEffect(() => {
        fetchRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fmtDateCell = (iso) => {
        if (!iso) return "";
        const d = new Date(iso);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    /* fake summaries (you can compute from rows if needed) */
    const dueAmtSum = 0;
    const paidAmtSum = 0;
    const totalAmtSum = 0;

    const chooseCustomer = (name) => {
        setCustomer(name);
        setCustOpen(false);
        setCustQuery("");
    };

    const onDeleteInvoice = async (invoiceNo) => {
        const inv = String(invoiceNo || "").trim();
        if (!inv) {
            console.warn("[Sale Delete] Missing invoice number");
            return;
        }

        // eslint-disable-next-line no-alert
        const ok = window.confirm(`Delete invoice ${inv}? This cannot be undone.`);
        if (!ok) {
            console.log(`[Sale Delete] Cancelled: ${inv}`);
            return;
        }

        console.log(`[Sale Delete] Requesting delete for: ${inv}`);

        try {
            await deleteSale(inv);

            // ✅ remove row from UI instantly
            setRows((prev) => prev.filter((x) => String(x.invoice_no || "").trim() !== inv));

            console.log(`[Sale Delete] ✅ Success: ${inv}`);
        } catch (err) {
            console.error(`[Sale Delete] ❌ Failed: ${inv}`, err?.message || err);
        }
    };


    return (
        <div className="ol-wrap">
            {/* header */}
            <div className="ol-header">
                <div className="ol-title">Sale List</div>
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
                            <select
                                value={String(pageSize)}
                                onChange={(e) => {
                                    setPageSize(parseInt(e.target.value, 10));
                                    setPage(1);
                                }}
                                aria-label="Rows per page"
                            >
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
                            <input
                                placeholder="Search List..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        setPage(1);
                                        fetchRows();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="ol-search-btn"
                                onClick={() => {
                                    setPage(1);
                                    fetchRows();
                                }}
                                aria-label="Search"
                            >
                                <span className="material-icons">search</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* FILTER STRIP */}
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
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") setCustOpen(false);
                                                        if (e.key === "Enter" && filteredCustomers.length > 0) {
                                                            chooseCustomer(filteredCustomers[0]);
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="cust-list">
                                                {custQuery.trim().length === 0 ? (
                                                    <div className="cust-hint">Please enter 1 or more characters</div>
                                                ) : filteredCustomers.length === 0 ? (
                                                    <div className="cust-empty">No results found</div>
                                                ) : (
                                                    filteredCustomers.map((name) => (
                                                        <button
                                                            key={name}
                                                            type="button"
                                                            className="cust-item"
                                                            onClick={() => chooseCustomer(name)}
                                                            title={name}
                                                        >
                                                            {name}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="ol-field">
                                <label className="ol-label">Customer Number</label>
                                <input
                                    className="ol-control"
                                    placeholder="e.g. 9876543210"
                                    value={customerNumber}
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D+/g, "").slice(0, 15);
                                        setCustomerNumber(digits);
                                    }}
                                    inputMode="numeric"
                                />
                            </div>

                            <div className="ol-field">
                                <label className="ol-label">Payment Mode</label>
                                <PaymentModeSelect
                                    value={payMode}
                                    onChange={(val) => {
                                        setPayMode(val);
                                        setPage(1);
                                    }}
                                    options={["All", "Cash", "Cheque", "Pay Later", "Bank", "Card", "Upi", "Wallet"]}
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
                                <DiscountSelect value={discount} onChange={setDiscount} options={[]} />
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
                                <SearchableSelect value={store} onChange={setStore} options={["All", "In-Store", "Online"]} />
                            </div>

                            <div className="ol-field">
                                <label className="ol-label">Channel</label>
                                <SearchableSelect
                                    value={channel}
                                    onChange={setChannel}
                                    options={["All", "Woo Commerce", "Shopify", "Vasy Ecommerce", "MPOS", "POS", "VORDER"]}
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
                                    options={["All", "Paid", "Due", "Overdue", "Refunded", "Credit Note Generated"]}
                                />
                            </div>

                            {/* Actions */}
                            <div className="ol-filter-actions">
                                <button
                                    className="ol-btn-apply"
                                    type="button"
                                    onClick={() => {
                                        setPage(1);
                                        fetchRows();
                                    }}
                                >
                                    Apply
                                </button>
                                <button
                                    className="ol-btn-reset"
                                    type="button"
                                    onClick={() => {
                                        setDateRange("01/04/2025 - 31/03/2026");
                                        setCustomer("");
                                        setCustomerNumber("");
                                        setPayMode("All");
                                        setSelectedLocations([]);
                                        setDiscount("");
                                        setOrderType("All");
                                        setStore("All");
                                        setChannel("All");
                                        setOrderStatus("All");
                                        setPaymentStatus("All");
                                        setStartDate(new Date(2025, 3, 1));
                                        setEndDate(new Date(2026, 2, 31));
                                        setSearchText("");
                                        setPage(1);
                                        fetchRows();
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
                <div className="ol-tablewrap" style={{ overflowX: "auto" }}>
                    <table className="ol-table">
                        <thead>
                            <tr>
                                <th className="ol-th-checkbox">
                                    <input type="checkbox" aria-label="Select all" />
                                </th>
                                {visibleCols.map((col) => (
                                    <th key={col.id}>{col.label}</th>
                                ))}
                                {isAdmin && <th className="ol-th-actions">Del</th>}

                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={colSpan}>
                                        <SaleListLoadingInline />
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr className="ol-empty">
                                    <td colSpan={colSpan}>No data available in table</td>
                                </tr>
                            ) : (
                                rows.map((r, i) => (
                                    <tr key={r.id || r.invoice_no}>
                                        <td>
                                            <input type="checkbox" />
                                        </td>

                                        {visible.has("sr") && <td>{(page - 1) * pageSize + i + 1}</td>}

                                        {visible.has("inv") && (
                                            <td>
                                                <button
                                                    type="button"
                                                    className="ol-inv-link"
                                                    onClick={() =>
                                                        navigate(`/sales/invoice-view/${encodeURIComponent(String(r.invoice_no || "").trim())}`)
                                                    }
                                                    title="Open Invoice"
                                                >
                                                    {r.invoice_no}
                                                </button>
                                            </td>
                                        )}

                                        {visible.has("date") && <td>{fmtDateCell(r.transaction_date)}</td>}
                                        {visible.has("cust") && <td>{r.customer_name}</td>}
                                        {visible.has("custNo") && <td>{r.customer_phone || ""}</td>}
                                        {visible.has("total") && <td>{Number(r.total_amount || 0).toFixed(2)}</td>}
                                        {visible.has("dueAmt") && <td>{Number(r.due_amount || 0).toFixed(2)}</td>}
                                        {visible.has("mode") && <td>{r.payment_method}</td>}
                                        {visible.has("pstatus") && <td>{r.payment_status}</td>}
                                        {visible.has("credit") && <td>{Number(r.credit_applied || 0).toFixed(2)}</td>}
                                        {visible.has("otype") && <td>{r.order_type}</td>}
                                        {visible.has("fb") && <td>{r.feedback ?? ""}</td>}

                                        {isAdmin && (
                                            <td className="ol-td-actions">
                                                <button
                                                    type="button"
                                                    className="ol-delete-btn"
                                                    onClick={() => onDeleteInvoice(r.invoice_no)}
                                                    title="Delete invoice"
                                                >
                                                    <span className="material-icons">delete</span>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* footer */}
                <div className="ol-footer">
                    <div className="ol-entries">
                        {rows.length > 0 ? `Showing 1 to ${rows.length} of ${rows.length} entries` : "Showing 0 to 0 of 0 entries"}
                    </div>
                    <div className="ol-pager">
                        <button className="ol-pagebtn" disabled>
                            <span className="material-icons">chevron_left</span>
                        </button>
                        <button className="ol-pagebtn" disabled>
                            <span className="material-icons">chevron_right</span>
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
