// src/components/CreditNoteModal.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CreditNoteModal.css";
import { listCreditNotes, deleteCreditNote } from "../api/client";

export default function CreditNoteModal({ open, onClose }) {
  const navigate = useNavigate();

  // lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ---- state ----
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // ✅ default 5 rows
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  // Keep focus on search when opened
  const searchRef = useRef(null);
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  // Fetcher
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        query: search.trim() || undefined,
      };

      console.debug("[CreditNoteModal] listCreditNotes params:", params);

      const res = await listCreditNotes(params);

      console.debug("[CreditNoteModal] listCreditNotes response:", res);

      setRows(res?.results || []);

      // ✅ FIX: DRF usually returns "count" not "total"
      const totalCount =
        Number(res?.count ?? res?.total ?? res?.total_count ?? 0) ||
        (Array.isArray(res?.results) ? res.results.length : 0);

      setTotal(totalCount);
    } catch (e) {
      console.error("[CreditNoteModal] Failed to load credit notes:", e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Load when modal opens / params change
  useEffect(() => {
    if (!open) return;
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, pageSize]);

  // Helpers
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / pageSize)),
    [total, pageSize]
  );

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const showingText = useMemo(() => {
    if (total === 0) return "Showing 0 to 0 of 0 entries";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `Showing ${start} to ${end} of ${total} entries`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, page, pageSize, rows.length]);

  const handleDelete = async (noteNo) => {
    const safe = String(noteNo || "").trim();
    if (!safe) return;

    const ok = window.confirm(`Delete credit note ${safe}? This cannot be undone.`);
    if (!ok) return;

    console.debug("[CreditNoteModal] deleteCreditNote note_no:", safe);

    try {
      await deleteCreditNote(safe);
      console.debug("[CreditNoteModal] deleteCreditNote success:", safe);

      await fetchNotes();
    } catch (e) {
      console.error("[CreditNoteModal] deleteCreditNote failed:", e);
      alert("Failed to delete credit note.");
    }
  };

  const handleView = (noteNo) => {
    const safe = String(noteNo || "").trim();
    if (!safe) return;

    // elegant redirect to PDF page (same pattern as sale receipt)
    try {
      onClose?.();
    } catch {}
    navigate(`/receipt/credit/${encodeURIComponent(safe)}`);
  };

  if (!open) return null;

  return (
    <div
      className="cn-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Credit Note Details"
    >
      <div className="cn-card">
        {/* Header */}
        <div className="cn-header">
          <h3>Credit Note Details</h3>
          <button className="cn-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="cn-body">
          {/* Toolbar */}
          <div className="cn-toolbar">
            <div className="cn-field">
              <label className="cn-label">Display</label>
              <div className="cn-selectwrap">
                <select
                  className="cn-control"
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            <div className="cn-field cn-field-right">
              <label className="cn-label">Search:</label>
              <input
                ref={searchRef}
                className="cn-control"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    fetchNotes();
                  }
                }}
                placeholder=""
              />
            </div>
          </div>

          {/* Table */}
          <div className="cn-tablewrap">
            <table className="cn-table">
              <thead>
                <tr>
                  <th>
                    Sr.<br />
                    No.
                  </th>
                  <th>
                    Credit<br />
                    Note No.
                  </th>
                  <th>Date</th>
                  <th>
                    Customer<br />
                    Name
                  </th>
                  <th>
                    Total<br />
                    Amount
                  </th>
                  <th>
                    Credits<br />
                    Used
                  </th>
                  <th>
                    Credits<br />
                    Remaining
                  </th>
                  <th>Created By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="cn-empty">
                    <td colSpan={9}>Loading…</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr className="cn-empty">
                    <td colSpan={9}>No data available in table</td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const totalAmt = Number(r?.amount || 0);

                    const usedAmt = Number(
                      r?.redeemed_amount ?? r?.credits_used ?? r?.used_amount ?? 0
                    );

                    const remainingAmt = Number(
                      r?.credits_remaining ??
                        r?.remaining ??
                        Math.max(0, totalAmt - usedAmt)
                    );

                    const isUsed =
                      Boolean(r?.is_redeemed) ||
                      String(r?.status || "").toLowerCase().includes("used") ||
                      String(r?.status || "").toLowerCase().includes("not") ||
                      remainingAmt <= 0;

                    const createdBy =
                      r?.created_by_name ||
                      r?.created_by ||
                      r?.created_by_username ||
                      r?.createdBy ||
                      "";

                    return (
                      <tr key={r.id || r.note_no}>
                        <td>{(page - 1) * pageSize + i + 1}</td>
                        <td>{r.note_no}</td>
                        <td>{fmtDate(r.date)}</td>
                        <td>{r.customer_name}</td>
                        <td>{totalAmt.toFixed(2)}</td>
                        <td>{usedAmt.toFixed(2)}</td>

                        <td>
                          {remainingAmt.toFixed(2)}
                          <div style={{ marginTop: 4 }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#fff",
                                background: isUsed ? "#d32f2f" : "#2e7d32",
                              }}
                            >
                              {isUsed ? "USED" : "ACTIVE"}
                            </span>
                          </div>
                        </td>

                        <td>{createdBy || "-"}</td>

                        <td className="cn-actions">
                          <button
                            type="button"
                            onClick={() => handleView(r.note_no)}
                            title="View / Print"
                            className="cn-btn cn-btn-view"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(r.note_no)}
                            title="Delete"
                            className="cn-btn cn-btn-del"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="cn-footer">
            <div className="cn-entries">{showingText}</div>
            <div className="cn-pager">
              <button
                className="cn-page"
                title="Previous"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                ‹
              </button>
              <span style={{ padding: "0 8px" }}>
                {page} / {totalPages}
              </span>
              <button
                className="cn-page"
                title="Next"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
