// src/components/ReportCreditNoteItemRegister.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ReportCreditNoteItemRegister.css";

/* ================== Masters ================== */
const FILTER_OPTIONS = [
    "Location",
    "Category",
    "Brand",
    "Sub Brand",
    "Sub Category",
    "Voucher Type",
];
const PAGE_SIZES = [10, 50, 100, 500, 1000];

const ALL_COLUMNS = [
    "Sr No",
    "Date",
    "Voucher No",
    "Voucher Type",
    "Party Name",
    "Customer Number",
    "Mobile No",
    "GSTIN",
    "Department Name",
    "Category Name",
    "Sub Category Name",
    "Brand Name",
    "Sub Brand Name",
    "UOM",
    "HSN",
    "Product Name",
    "Description",
    "Item Code",
    "Batch No",
    "Product Type",
    "Landing Cost",
    "Unit Price",
    "Selling Price",
    "MRP",
    "QTY",
    "Basic Value",
    "TCS Amount",
    "Tax Amount",
    "CGST",
    "SGST",
    "IGST",
    "Cess Rate",
    "Cess Amount",
    "Tax Inclusive Discount",
    "Discount",
    "Other Discount",
    "Taxable Amount",
    "Total Bill Amount",
    "Net Amount",
    "Profit",
    "Profit% On Costing",
    "Profit% On Selling",
    "Sales Man",
    "Created By",
    "Address",
    "Coupon Discount",
    "Coupon Discount Tax Inclusive",
];

const DEFAULT_VISIBLE = [
    "Sr No",
    "Date",
    "Voucher No",
    "Party Name",
    "Customer Number",
    "Product Name",
    "Item Code",
    "Batch No",
    "Landing Cost",
    "MRP",
    "QTY",
    "Basic Value",
    "TCS Amount",
    "Discount",
    "Other Discount",
    "Tax Amount",
    "Net Amount",
    "Profit",
    "Coupon Discount",
    "Coupon Discount Tax Inclusive",
];

/* ================== Component ================== */
export default function ReportCreditNoteItemRegister() {
    const navigate = useNavigate();

    // toolbar state
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValue, setFilterValue] = useState("");
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

    // rows empty initially (so export creates empty file)
    const [rows] = useState([]);

    // column visibility
    const [visibleCols, setVisibleCols] = useState(new Set(DEFAULT_VISIBLE));
    const [colPopup, setColPopup] = useState(false);

    // horizontal scroll controls
    const scrollerRef = useRef(null);
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);

    const syncCanScroll = () => {
        const el = scrollerRef.current;
        if (!el) return;
        setCanLeft(el.scrollLeft > 0);
        setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    const scrollByX = (dx) => {
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollBy({ left: dx, behavior: "smooth" });
    };
    useEffect(() => {
        syncCanScroll();
        const el = scrollerRef.current;
        if (!el) return;
        const onScroll = () => syncCanScroll();
        el.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            el.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, []);


    // top of component
    const splitRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const onDocClick = (e) => {
            if (splitRef.current && !splitRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);



    const headers = useMemo(() => {
        const base = Array.from(visibleCols);
        return ALL_COLUMNS.filter((c) => base.includes(c));
    }, [visibleCols]);

    const toggleColumn = (label) => {
        setVisibleCols((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    };
    const restoreColumns = () => setVisibleCols(new Set(DEFAULT_VISIBLE));

    // downloads
    const downloadBlob = (blob, filename) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    const downloadExcel = () => {
        const csv = headers.join(",") + "\n";
        downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "credit-note-item-register.csv");
    };
    const downloadAllDataExcel = () => {
        const csv = ALL_COLUMNS.join(",") + "\n";
        downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "credit-note-item-register-all-data.csv");
    };
    const downloadPDF = () => {
        downloadBlob(new Blob([], { type: "application/pdf" }), "credit-note-item-register.pdf");
    };

    return (
        <div className="cnir-wrap">
            {/* breadcrumb/title */}
            <div className="cnir-top">
                <div className="cnir-title">Credit Note Item Register</div>
                <div className="cnir-crumb" aria-label="breadcrumb">
                    <span
                        className="material-icons-outlined cnir-crumb-link"
                        role="link"
                        tabIndex={0}
                        aria-label="Go to Home"
                        onClick={() => navigate("/")}
                    >
                        home
                    </span>
                    <span className="cnir-crumb-sep">-</span>
                    <span className="cnir-crumb-dim">Report</span>
                </div>
            </div>

            {/* card */}
            <div className="cnir-card">
                {/* toolbar */}
                <div className="cnir-toolbar">
                    <div className="cnir-field">
                        <label>From Date</label>
                        <div className="cnir-input with-icon">
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                placeholder="dd-mm-yyyy"
                            />
                            <span className="material-icons-outlined">calendar_month</span>
                        </div>
                    </div>

                    <div className="cnir-field">
                        <label>To Date</label>
                        <div className="cnir-input with-icon">
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                placeholder="dd-mm-yyyy"
                            />
                            <span className="material-icons-outlined">calendar_month</span>
                        </div>
                    </div>

                    {/* Narrower filter width via inline maxWidth (no global changes) */}
                    <div className="cnir-field cnir-grow" style={{ maxWidth: 540 }}>
                        <label>Select Filter Options</label>
                        <div
                            className={`cnir-select ${filterOpen ? "open" : ""}`}
                            onClick={() => setFilterOpen((s) => !s)}
                            role="button"
                        >
                            <span className={`cnir-select-text ${filterValue ? "has" : ""}`}>
                                {filterValue || "Select Filter Options"}
                            </span>
                            {filterOpen && (
                                <div className="cnir-pop" onClick={(e) => e.stopPropagation()}>
                                    {FILTER_OPTIONS.map((o) => (
                                        <button
                                            key={o}
                                            type="button"
                                            className={`cnir-pop-item ${o === filterValue ? "selected" : ""}`}
                                            onClick={() => {
                                                setFilterValue(o);
                                                setFilterOpen(false);
                                            }}
                                        >
                                            {o}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="cnir-field cnir-ps">
                        <label aria-hidden>Page Size</label>
                        <div className="cnir-ps-select">
                            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                                {PAGE_SIZES.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                            <span className="material-icons-outlined">expand_more</span>
                        </div>
                    </div>

                    <div className="cnir-actions">
                        {/* Download split */}
                        <div className="cnir-split" ref={splitRef}>
                            <button type="button" className="cnir-split-main" onClick={downloadExcel}>
                                <span className="material-icons-outlined">download</span>
                            </button>

                            <button
                                type="button"
                                className="cnir-split-caret"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen((s) => !s);
                                }}
                            >
                                <span className="material-icons-outlined">expand_more</span>
                            </button>

                            <div className={`cnir-menu ${menuOpen ? "show" : ""}`}>
                                <button type="button" onClick={downloadExcel}>
                                    <span className="material-icons-outlined">article</span> Excel
                                </button>
                                <button type="button" onClick={downloadPDF}>
                                    <span className="material-icons-outlined">picture_as_pdf</span> PDF
                                </button>
                                <button type="button" onClick={downloadAllDataExcel}>
                                    <span className="material-icons-outlined">library_add</span> All Data Excel
                                </button>
                            </div>
                        </div>


                        {/* Columns popup */}
                        <button type="button" className="cnir-columns" onClick={() => setColPopup(true)}>
                            Columns <span className="material-icons-outlined">arrow_drop_down</span>
                        </button>
                    </div>
                </div>

                {/* ===== Table with horizontal scroll & overlay buttons ===== */}
                <div className="cnir-table-outer" style={{ position: "relative", marginTop: 8 }}>
                    {/* overlay nudge buttons */}
                    <div
                        className="cnir-hbtn left"
                        hidden={!canLeft}
                        onClick={() => scrollByX(-320)}
                        style={{
                            position: "absolute",
                            top: "50%",
                            transform: "translateY(-50%)",
                            left: 6,
                            width: 36,
                            height: 36,
                            display: "grid",
                            placeItems: "center",
                            background: "#fff",
                            border: "1px solid #e3e7ee",
                            borderRadius: "50%",
                            boxShadow: "0 2px 10px rgba(15,23,42,.12)",
                            zIndex: 5,
                            cursor: "pointer",
                        }}
                    >
                        <span className="material-icons-outlined">chevron_left</span>
                    </div>
                    <div
                        className="cnir-hbtn right"
                        hidden={!canRight}
                        onClick={() => scrollByX(320)}
                        style={{
                            position: "absolute",
                            top: "50%",
                            transform: "translateY(-50%)",
                            right: 6,
                            width: 36,
                            height: 36,
                            display: "grid",
                            placeItems: "center",
                            background: "#fff",
                            border: "1px solid #e3e7ee",
                            borderRadius: "50%",
                            boxShadow: "0 2px 10px rgba(15,23,42,.12)",
                            zIndex: 5,
                            cursor: "pointer",
                        }}
                    >
                        <span className="material-icons-outlined">chevron_right</span>
                    </div>

                    {/* scroller */}
                    <div
                        className="cnir-table-scroll"
                        ref={scrollerRef}
                        style={{
                            overflowX: "auto",
                            overflowY: "hidden",
                            borderRadius: 8,
                            border: "1px solid #e7eaef",
                            background: "#fff",
                        }}
                    >
                        <table className="cnir-table" style={{ minWidth: 1480 }}>
                            <thead>
                                <tr>
                                    {headers.map((h) => (
                                        <th key={h}>
                                            {h}
                                            {h === "Profit" && <i className="material-icons-outlined info">info</i>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="cnir-empty">
                                    <td colSpan={headers.length}>No data available in table</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="cnir-total">
                                    <td className="label">Total</td>
                                    {headers.slice(1).map((h) => (
                                        <td key={h}>
                                            {[
                                                "QTY",
                                                "Basic Value",
                                                "TCS Amount",
                                                "Discount",
                                                "Other Discount",
                                                "Tax Amount",
                                                "Net Amount",
                                                "MRP",
                                                "Landing Cost",
                                                "Coupon Discount",
                                                "Profit",
                                            ].includes(h)
                                                ? 0
                                                : ""}
                                        </td>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="cnir-meta" style={{ margin: "10px 2px", color: "#475569" }}>
                        Showing 0 to 0 of 0 entries
                    </div>

                    {/* pager (kept visually over the card bottom-right) */}
                    <div
                        className="cnir-pager"
                        style={{ position: "absolute", right: 10, bottom: 10, display: "flex", gap: 12 }}
                    >
                        <button type="button" disabled>
                            <span className="material-icons-outlined">chevron_left</span>
                        </button>
                        <button type="button" disabled>
                            <span className="material-icons-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Columns popup */}
            {colPopup && (
                <div className="cnir-overlay" onClick={() => setColPopup(false)}>
                    <div className="cnir-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="cnir-grid">
                            {ALL_COLUMNS.map((label) => (
                                <button
                                    key={label}
                                    type="button"
                                    className={`cnir-tile ${visibleCols.has(label) ? "on" : ""}`}
                                    onClick={() => toggleColumn(label)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="cnir-modal-actions">
                            <button className="cnir-restore" type="button" onClick={restoreColumns}>
                                Restore visibility
                            </button>
                            <button className="cnir-close" type="button" onClick={() => setColPopup(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
