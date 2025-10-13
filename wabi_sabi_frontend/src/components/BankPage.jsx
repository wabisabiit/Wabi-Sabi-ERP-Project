import React, { useMemo, useState, useEffect } from "react";
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
const LOCATIONS = ["WABI SABI SUSTAINABILITY LLP (HQ – UDYOG VIHAR, GURUGRAM)"];

export default function BankPage() {
  const navigate = useNavigate();

  // keep data in state so we can delete a row in-place
  const [data, setData] = useState(ROWS);

  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState([LOCATIONS[0]]);
  const [search, setSearch] = useState("");

  const [locOpen, setLocOpen] = useState(false);

  // delete modal state
  const [toDelete, setToDelete] = useState(null); // row object or null
  const isModalOpen = !!toDelete;

  const toggleFilter = () => setFilterOpen((v) => !v);

  const toggleLocation = (loc) => {
    setSelectedLocations((prev) => {
      const exists = prev.includes(loc);
      const next = exists ? prev.filter((l) => l !== loc) : [...prev, loc];
      return next;
    });
  };

  const filteredRows = useMemo(() => {
    let out = data;

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
  }, [data, selectedLocations, search]);

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

  const openDetail = (row) => {
    const slug = row.bankName.toLowerCase().replace(/\s+/g, "-");
    navigate(`/bank/${encodeURIComponent(slug)}`, {
      state: {
        bankName: row.bankName,
        branchName: row.location,
        accountHolder: row.accountHolder,
        accountNo: row.accountNo,
      },
    });
  };

  const openEdit = (row) => {
    const slug = row.bankName.toLowerCase().replace(/\s+/g, "-");
    navigate(`/bank/${encodeURIComponent(slug)}/edit`, {
      state: {
        bankName: row.bankName,
        branchName: row.location,
        accountHolder: row.accountHolder,
        accountNo: row.accountNo,
      },
    });
  };

  // ---- Delete modal handlers ----
  const onDeleteClick = (row) => setToDelete(row);
  const closeModal = () => setToDelete(null);
  const confirmDelete = () => {
    if (toDelete) {
      setData((d) => d.filter((r) => r.id !== toDelete.id));
      closeModal();
      // reset pagination if needed
      setPage(1);
    }
  };

  // ESC to close; Enter to confirm
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "Enter") confirmDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, toDelete]);

  return (
    <div className="bank-wrap">
      {/* Title row */}
      <div className="bank-header">
        <h2 className="bank-title">Bank</h2>
        <span className="bank-home-ic material-icons" title="Home">home</span>
      </div>

      <div className="bank-card">
        {/* toolbar */}
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
                    setFilterOpen(false);
                  }}
                >
                  ×
                </span>
              </button>
            </div>

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

                    <td
                      className="linkish"
                      onClick={() => openDetail(r)}
                      title="Open details"
                      style={{ cursor: "pointer" }}
                    >
                      {r.bankName}
                    </td>

                    <td>{r.location}</td>
                    <td>{r.accountHolder}</td>
                    <td>{r.accountNo}</td>
                    <td>{r.createdBy}</td>
                    <td className="actions">
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => openEdit(r)}
                      >
                        <span className="material-icons">edit</span>
                      </button>

                      <button
                        className="icon-btn"
                        title="Delete"
                        onClick={() => onDeleteClick(r)}
                      >
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
            <button
              className="nav-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
            >
              <span className="material-icons">chevron_left</span>
            </button>
            <span className="page-badge">{pageSafe}</span>
            <button
              className="nav-btn"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={pageSafe === pageCount}
            >
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== Delete Confirm Modal ===== */}
      {isModalOpen && (
        <div className="del-overlay" role="dialog" aria-modal="true">
          <div className="del-modal">
            <div className="del-icon">!</div>
            <h3 className="del-title">Are You Sure?</h3>
            <p className="del-sub">You Won’t Be Able To Revert This!</p>

            <div className="del-actions">
              <button className="btn btn-green" onClick={confirmDelete}>
                Yes, Delete It!
              </button>
              <button className="btn btn-red" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
