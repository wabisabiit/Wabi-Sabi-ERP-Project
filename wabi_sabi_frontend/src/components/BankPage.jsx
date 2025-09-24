import React, { useMemo, useState } from "react";
import "../styles/BankPage.css";
import { useNavigate } from "react-router-dom";


/** Dummy data exactly as shown */
const ROWS = [
    {
        id: 1,
        bankName: "AXIS BANK",
        location: "UDYOG VIHAR",
        accountHolder: "WABI SABI SUSTAINABILITY LLP",
        accountNo: "924020051622894",
        createdBy: "WABI SABI SUSTAINABILITY LLP",
    },
];

const PAGE_SIZES = [10, 50, 100, 500, 1000];
const LOCATIONS = [
    "WABI SABI SUSTAINABILITY LLP (HQ – UDYOG VIHAR, GURUGRAM)",
];


export default function BankPage() {
    const navigate = useNavigate();
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [page, setPage] = useState(1);
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedLocations, setSelectedLocations] = useState([LOCATIONS[0]]);
    const [search, setSearch] = useState("");

    // NEW: controls visibility of the location options list
    const [locOpen, setLocOpen] = useState(false);

    const toggleFilter = () => setFilterOpen((v) => !v);

    const toggleLocation = (loc) => {
        setSelectedLocations((prev) => {
            const exists = prev.includes(loc);
            const next = exists ? prev.filter((l) => l !== loc) : [...prev, loc];
            return next; // <-- allow 0 selected (badge will show 0)
        });
    };

    const filteredRows = useMemo(() => {
        let out = ROWS;

        // demo location filter (loose contains)
        if (selectedLocations.length) {
            out = out.filter((r) =>
                (r.location + " " + r.accountHolder).toLowerCase().includes("udyog vihar")
            );
        }

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            out = out.filter((r) =>
                [r.bankName, r.location, r.accountHolder, r.accountNo, r.createdBy]
                    .join(" ")
                    .toLowerCase()
                    .includes(q)
            );
        }
        return out;
    }, [selectedLocations, search]);

    const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const pageSafe = Math.min(page, pageCount);
    const start = (pageSafe - 1) * pageSize;
    const rows = filteredRows.slice(start, start + pageSize);

    const onChangePageSize = (e) => {
        setPageSize(Number(e.target.value));
        setPage(1);
    };

    const onSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
    };

    return (
        <div className="bank-wrap">
            {/* Title row */}
            <div className="bank-header">
                <h2 className="bank-title">Bank</h2>
                <span className="bank-home-ic material-icons" title="Home">home</span>
            </div>

            <div className="bank-card">
                {/* toolbar (right aligned like image 2) */}
                <div className="bank-toolbar right">
                    <select className="bank-pagesize" value={pageSize} onChange={onChangePageSize}>
                        {PAGE_SIZES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    <button
                        className={`bank-filter-btn ${filterOpen ? "active" : ""}`}
                        onClick={toggleFilter}
                        aria-pressed={filterOpen}
                    >
                        <span className="material-icons">filter_list</span>
                        Filter
                    </button>

                    <form className="bank-search" onSubmit={onSearchSubmit}>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search List"
                        />
                        <button type="submit" aria-label="Search">
                            <span className="material-icons">search</span>
                        </button>
                    </form>

                    <button className="bank-create" onClick={() => navigate("/bank/new")}>
                        Create New
                    </button>
                </div>

                {/* compact filter POPUP */}
                {filterOpen && (
                    <div className="bank-filter-pop">
                        <div className="pop-title">Select Location</div>

                        <div className="pop-chip-row">
                            {/* Clicking the chip toggles the options visibility */}
                            <button
                                type="button"
                                className="pop-chip"
                                onClick={() => setLocOpen((v) => !v)}
                                aria-expanded={locOpen}
                            >
                                <span className="pop-chip-label">Select Location</span>
                                <span className="pop-chip-badge">{selectedLocations.length}</span>
                                <span
                                    className="pop-chip-close"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFilterOpen(false); // close the whole filter
                                    }}
                                >
                                    ×
                                </span>
                            </button>
                        </div>

                        {/* Show the mini input + location list only when chip is opened */}
                        {locOpen && (
                            <>
                                <input className="pop-mini-input" />
                                <div className="pop-loc-list">
                                    {LOCATIONS.map((loc) => {
                                        const checked = selectedLocations.includes(loc);
                                        return (
                                            <label key={loc} className="pop-loc-item" title={loc}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleLocation(loc)}
                                                />
                                                <span className="pop-loc-text">{loc}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* table */}
                <div className="bank-table-wrap">
                    <table className="bank-table">
                        <thead>
                            <tr>
                                <th>Sr. No.</th>
                                <th>Bank Name</th>
                                <th>Location</th>
                                <th>Account Holder Name</th>
                                <th>Account No.</th>
                                <th>Created By</th>
                                <th style={{ width: 110 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="not-found">Result not found</td>
                                </tr>
                            ) : (
                                rows.map((r, idx) => (
                                    <tr key={r.id}>
                                        <td>{start + idx + 1}</td>
                                        <td className="linkish">{r.bankName}</td>
                                        <td>{r.location}</td>
                                        <td>{r.accountHolder}</td>
                                        <td>{r.accountNo}</td>
                                        <td>{r.createdBy}</td>
                                        <td className="actions">
                                            <button className="icon-btn" title="Edit">
                                                <span className="material-icons">edit</span>
                                            </button>
                                            <button className="icon-btn" title="Delete">
                                                <span className="material-icons">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* footer */}
                <div className="bank-foot">
                    <div className="bank-count">
                        Showing {filteredRows.length === 0 ? 0 : start + 1} to {Math.min(start + pageSize, filteredRows.length)} of {filteredRows.length} entries
                    </div>
                    <div className="bank-pager">
                        <button className="nav-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe === 1}>
                            <span className="material-icons">chevron_left</span>
                        </button>
                        <span className="page-badge">{pageSafe}</span>
                        <button className="nav-btn" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={pageSafe === pageCount}>
                            <span className="material-icons">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
