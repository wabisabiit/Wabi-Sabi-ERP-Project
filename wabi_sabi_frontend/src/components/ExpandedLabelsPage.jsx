/* global qz */
import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/BarcodePrintConfirmPage.css";
import { printTwoUpLabels, todayDMY, qzConnectSafe } from "../printing/qz-two-up";

export default function ExpandedLabelsPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Expanded unit-level rows (one per label)
  const rowsExpanded = Array.isArray(state?.expanded) ? state.expanded : [];
  // Editor rows (so user can reopen in editor)
  const fromRows = Array.isArray(state?.fromRows) ? state.fromRows : [];
  const stored = Array.isArray(state?.stored) ? state.stored : [];

  // We will display `rows` (prefer expanded; else fall back to fromRows)
  const rows = rowsExpanded.length ? rowsExpanded : fromRows;

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
    const count = rowsExpanded.length ? rowsExpanded.length : rows.reduce((s, r) => s + Math.max(1, Number(r.qty || 1)), 0);
    const uniqueItems = new Set(rows.map((r) => `${r.itemCode}|${r.size}`)).size;
    const totalMrp = rows.reduce((s, r) => s + Number(r.mrp || 0), 0);
    const totalSp = rows.reduce((s, r) => s + Number(r.salesPrice || 0), 0);
    const totalDisc = rows.reduce((s, r) => s + Number(r.discount || 0), 0);
    return { count, uniqueItems, totalMrp, totalSp, totalDisc };
  }, [rows, rowsExpanded]);

  const formatINR = (n) =>
    `₹ ${Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getBarcodeNumber = (r) =>
    r?.barcodeNumber ?? r?.barcodeName ?? r?.barcode ?? r?.itemCode ?? "";

  const totalAmt = (r) =>
    Math.max(0, Number(r?.salesPrice || 0) - Number(r?.discount || 0));

  const handleGenerate = () => {
    if (!selected) return;
    console.log("Generate for:", selected);
    alert(`Generating barcode for ${getBarcodeNumber(selected) || "(no code)"}`);
  };

  // ===== PRINT (QZ Tray + TSPL two-up) =====
  const printNow = async () => {
    // Build a full list to print from ALL rows (not just current page)
    const list = (rows || []).map((r) => ({
      name: r.product || "",
      mrp: Number(r.mrp || 0),
      sp: Number(r.salesPrice || r.sp || 0),
      code: getBarcodeNumber(r),
      location: r.location || r.location_code || "",
      qty: rowsExpanded.length ? 1 : Math.max(1, Number(r.qty || 1)), // if already expanded, 1 each
    }));

    try {
      await qzConnectSafe();
      await printTwoUpLabels(list, { title: "BRANDS 4 LESS", date: todayDMY() });
      alert("Print job(s) sent to QZ Tray.");
    } catch (e) {
      console.error(e);
      alert("Printing failed: " + e.message);
    }
  };

  return (
    <div className="sit-wrap confirm-page">
      {/* top bar */}
      <div className="sit-bc">
        <div className="sit-bc-left">
          <span className="sit-title">Expanded Labels</span>
          <span className="sit-sep">|</span>
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

      {/* two-column layout with sidebar (barcode preview) */}
      <div className="sit-card confirm-grid">
        {/* SIDEBAR with Summary + Barcode Preview */}
        <aside className="confirm-side">
          <div className="side-box">
            <div className="side-title">Summary</div>
            <div className="side-stats">
              <div>
                <span className="t-dim">Pieces to print:</span> {summary.count}
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

            {/* Barcode Preview */}
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
