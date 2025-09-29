// src/components/ExpandedLabelsPage.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/BarcodePrintConfirmPage.css"; // compact styles + (updated) bc-card styles

export default function ExpandedLabelsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Expanded unit-level rows (one per label)
  const rows = Array.isArray(state?.expanded) ? state.expanded : [];
  // Editor rows (so user can reopen in editor)
  const fromRows = Array.isArray(state?.fromRows) ? state.fromRows : [];
  // Also allow returning the stored rows if you passed them along
  const stored = Array.isArray(state?.stored) ? state.stored : [];

  // Paging
  const [page, setPage] = useState(1);
  const rowsPerPage = 25;
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const view = rows.slice(start, start + rowsPerPage);

  // Selected row for barcode preview
  const [selected, setSelected] = useState(view[0] || rows[0] || null);
  useEffect(() => {
    setSelected(
      (prev) =>
        view.find(
          (v) => prev && v.itemCode === prev.itemCode && v.size === prev.size
        ) || view[0] || rows[0] || null
    );
  }, [page, rows]); // reselect when page/rows change

  // Summary
  const summary = useMemo(() => {
    const count = rows.length;
    const uniqueItems = new Set(rows.map((r) => `${r.itemCode}|${r.size}`)).size;
    const totalMrp = rows.reduce((s, r) => s + Number(r.mrp || 0), 0);
    const totalSp = rows.reduce((s, r) => s + Number(r.salesPrice || 0), 0);
    const totalDisc = rows.reduce((s, r) => s + Number(r.discount || 0), 0);
    return { count, uniqueItems, totalMrp, totalSp, totalDisc };
  }, [rows]);

  const printNow = () => window.print?.();
  const formatINR = (n) =>
    `₹ ${Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getBarcodeNumber = (r) =>
    r?.barcodeNumber ?? r?.barcodeName ?? r?.itemCode ?? "";

  // Total Amt (same logic used earlier)
  const totalAmt = (r) =>
    Math.max(0, Number(r?.salesPrice || 0) - Number(r?.discount || 0));

  const handleGenerate = () => {
    if (!selected) return;
    // TODO: hook your real generator here
    console.log("Generate for:", selected);
    alert(`Generating barcode for ${getBarcodeNumber(selected) || "(no code)"}`);
  };

  return (
    <div className="sit-wrap confirm-page">
      {/* top bar */}
      <div className="sit-bc">
        <div className="sit-bc-left">
          <span className="sit-title">Expanded Labels</span>
          <span className="sit-sep">|</span>
          <span className="t-dim">
            {summary.count} rows · {summary.uniqueItems} unique (item+size)
          </span>
        </div>
        <div className="sit-home" aria-label="Home">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
          </svg>
        </div>
      </div>

      {/* two-column layout with sidebar (now hosting barcode preview) */}
      <div className="sit-card confirm-grid">
        {/* SIDEBAR with Summary + Barcode Preview */}
        <aside className="confirm-side">
          <div className="side-box">
            <div className="side-title">Summary</div>
            <div className="side-stats">
              <div>
                <span className="t-dim">Expanded Rows:</span> {summary.count}
              </div>
              <div>
                <span className="t-dim">Unique (Item+Size):</span>{" "}
                {summary.uniqueItems}
              </div>
              <div>
                <span className="t-dim">Total Discount:</span>{" "}
                {formatINR(summary.totalDisc)}
              </div>
              <div>
                <span className="t-dim">Total SP:</span>{" "}
                {formatINR(summary.totalSp)}
              </div>
              <div>
                <span className="t-dim">Total MRP:</span>{" "}
                {formatINR(summary.totalMrp)}
              </div>
            </div>

            {/* Barcode Preview moved here */}
            <div className="bc-card" style={{ marginTop: 10 }}>
              <div className="bc-title">{selected?.product || "-"}</div>
              <div className="bc-mrp">
                Total Amt : {formatINR(totalAmt(selected))}
              </div>
              <div className="bc-bars" aria-hidden="true">
                {[...Array(26)].map((_, i) => (
                  <span
                    key={i}
                    className={`bar ${i % 5 === 0 ? "bar-thick" : ""}`}
                  />
                ))}
              </div>
              <div className="bc-code">{getBarcodeNumber(selected)}</div>
            </div>

            <button
              className="btn btn-primary bc-generate"
              onClick={handleGenerate}
              style={{ marginTop: 8 }}
            >
              Generate Barcode
            </button>

            <div className="side-title" style={{ marginTop: 10 }}>
              Actions
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>
              Back to Edit
            </button>
            <button
              className="btn btn-outline btn-sm"
              title="Open Excel-like editor"
              onClick={() =>
                navigate("/utilities/barcode2/confirm", {
                  state: { initialRows: stored.length ? stored : fromRows },
                })
              }
            >
              Open Editor
            </button>
            <button className="btn btn-primary btn-sm" onClick={printNow}>
              Print
            </button>
          </div>
        </aside>

        {/* MAIN: Expanded table (click a row to preview its barcode) */}
        <div className="confirm-main">
          <div className="sit-table-wrap confirm-narrow">
            <table className="sit-table confirm-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>S.No</th>
                  <th style={{ width: 110 }}>Item Code</th>
                  <th style={{ minWidth: 160 }}>Product Name</th>
                  <th style={{ width: 90 }}>Size</th>
                  <th style={{ width: 122 }}>Location</th>
                  <th style={{ width: 90 }}>Discount</th>
                  <th style={{ width: 104 }}>Selling Price</th>
                  <th style={{ width: 100 }}>MRP</th>
                  {/* ✅ Added Qty column */}
                  <th style={{ width: 64 }}>Qty</th>
                  <th style={{ width: 130 }}>Barcode Number</th>
                </tr>
              </thead>
              <tbody>
                {view.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="t-dim" style={{ padding: "12px 8px" }}>
                      No expanded rows. Go back and expand first.
                    </td>
                  </tr>
                ) : (
                  view.map((r, i) => (
                    <tr
                      key={`${start + i}-${r.itemCode}-${r.size}-${r.location}-${getBarcodeNumber(r)}`}
                      onClick={() => setSelected(r)}
                      style={{ cursor: "pointer" }}
                      className={
                        selected &&
                        getBarcodeNumber(selected) === getBarcodeNumber(r)
                          ? "row-active"
                          : ""
                      }
                    >
                      <td className="t-right">{start + i + 1}</td>
                      <td className="t-mono">{r.itemCode}</td>
                      <td>{r.product}</td>
                      <td>{r.size}</td>
                      <td className="t-dim">{r.location}</td>
                      <td className="t-right">{formatINR(r.discount || 0)}</td>
                      <td className="t-right">{formatINR(r.salesPrice || 0)}</td>
                      <td className="t-right t-dim">{formatINR(r.mrp || 0)}</td>
                      {/* ✅ Qty cell (unit-level rows => default 1) */}
                      <td className="t-right">{Number(r.qty ?? 1)}</td>
                      <td className="t-mono">{getBarcodeNumber(r)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className="confirm-pagination"
            style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}
          >
            <button className="pg-btn" onClick={() => setPage(1)} disabled={page === 1}>
              «
            </button>
            <button
              className="pg-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹
            </button>
            <span className="pg-current">{page}</span>
            <button
              className="pg-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              ›
            </button>
            <button
              className="pg-btn"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              »
            </button>
            <span className="pg-info">Page {page} of {totalPages}</span>
          </div>

          {/* Bottom actions */}
          <div className="sit-actions confirm-actions equal-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={printNow}>
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
