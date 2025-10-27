import React, { useEffect, useMemo, useState, useRef } from "react";
import "../styles/CreditNoteModal.css";
import { listCreditNotes } from "../api/client";

export default function CreditNoteModal({ open, onClose }) {
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
      const res = await listCreditNotes({
        page,
        page_size: pageSize,
        query: search.trim() || undefined,
      });
      setRows(res?.results || []);
      setTotal(res?.total || 0);
    } catch (e) {
      console.error("Failed to load credit notes:", e);
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

  if (!open) return null;

  return (
    <div className="cn-overlay" role="dialog" aria-modal="true" aria-label="Credit Note Details">
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
                  {/* keep small options; default 5 */}
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
                  <th>Sr.<br />No.</th>
                  <th>Credit<br />Note No.</th>
                  <th>Date</th>
                  <th>Customer<br />Name</th>
                  <th>Total<br />Amount</th>
                  <th>Credits<br />Used</th>
                  <th>Credits<br />Remaining</th>
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
                  rows.map((r, i) => (
                    <tr key={r.id || r.note_no}>
                      <td>{(page - 1) * pageSize + i + 1}</td>
                      <td>{r.note_no}</td>
                      <td>{fmtDate(r.date)}</td>
                      <td>{r.customer_name}</td>
                      <td>{Number(r.amount || 0).toFixed(2)}</td>
                      {/* Leave these blank for now */}
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))
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
              <span style={{ padding: "0 8px" }}>{page} / {totalPages}</span>
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
