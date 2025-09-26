import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/BarcodePrintConfirmPage.css";

export default function BarcodePrintConfirmPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const allRows = Array.isArray(state?.rows) ? state.rows : [];

  /* --- pagination --- */
  const [page, setPage] = useState(1);
  const rowsPerPage = 8;                          // like your screenshot
  const totalPages = Math.max(1, Math.ceil(allRows.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const rows = allRows.slice(start, end);

  /* totals (optional, if you want to show somewhere later) */
  const totals = useMemo(() => {
    const qty = rows.reduce((s, r) => s + Number(r.qty || 0), 0);
    const sp  = rows.reduce((s, r) => s + Number(r.salesPrice ?? r.sp ?? 0), 0);
    return { qty, sp };
  }, [rows]);

  const goPrev = () => setPage(p => Math.max(1, p - 1));
  const goNext = () => setPage(p => Math.min(totalPages, p + 1));

  return (
    <div className="sit-wrap confirm-page">
      {/* Top bar */}
      <div className="sit-bc">
        <div className="sit-bc-left">
          <span className="sit-title">Barcode Print – Review</span>
          <span className="sit-sep">|</span>
          <span className="t-dim">Confirm items before printing</span>
        </div>
        <div className="sit-home" aria-label="Home">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
          </svg>
        </div>
      </div>

      <div className="sit-card">
        <div className="sit-table-wrap">
          <table className="sit-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>S.No</th>
                <th style={{ minWidth: 220 }}>Product Name</th>
                <th style={{ width: 120 }}>Size</th>
                <th style={{ width: 130 }}>Sales Price</th>
                <th style={{ width: 110 }}>MRP</th>
                <th style={{ width: 80 }}>Qty</th>
                <th style={{ minWidth: 160 }}>Location</th>
                <th style={{ minWidth: 160 }}>Barcode Name</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="t-dim" style={{ padding: "14px 10px" }}>
                    No items to review. Go back and select quantity.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.itemCode ?? r.barcodeName}-${start + i}`}>
                    <td className="t-right">{start + i + 1}</td>
                    <td>{r.product}</td>
                    <td>{r.size || "-"}</td>
                    <td className="t-right">₹ {Number(r.salesPrice ?? r.sp ?? 0).toFixed(2)}</td>
                    <td className="t-right t-dim">₹ {Number(r.mrp ?? 0).toFixed(2)}</td>
                    <td className="t-right">{Number(r.qty ?? 0)}</td>
                    <td className="t-dim">{r.location || "-"}</td>
                    <td className="t-mono">{r.barcodeName || r.itemCode || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination under table, right-aligned */}
        <div className="confirm-pagination">
          <button className="pg-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="pg-btn" onClick={goPrev} disabled={page === 1}>‹</button>
          <span className="pg-current">{page}</span>
          <button className="pg-btn" onClick={goNext} disabled={page === totalPages}>›</button>
          <button className="pg-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          <span className="pg-info">Page {page} of {totalPages}</span>
        </div>

        {/* Actions */}
        <div className="sit-actions confirm-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print?.()}>
            Submit &amp; Print
          </button>
        </div>
      </div>
    </div>
  );
}
