import React, { useEffect, useState, useCallback } from "react";
import "../styles/ProductPanel.css";
import { listProducts } from "../api/client";

export default function ProductPanel({ open, onClose }) {
  if (!open) return null;

  const PAGE_SIZE = 500;

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ESC to close
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const fetchPage = useCallback(
    async (pg, { reset = false } = {}) => {
      if (loading) return;
      setLoading(true);
      setErr("");

      try {
        const res = await listProducts({ page: pg, page_size: PAGE_SIZE });

        const results = Array.isArray(res) ? res : (res?.results || []);
        const next = Array.isArray(res) ? null : (res?.next || null);

        setRows((prev) => (reset ? results : prev.concat(results)));
        setHasNext(!!next && results.length > 0);
        setPage(pg);
      } catch (e) {
        setErr(e?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  // Load first page when opened
  useEffect(() => {
    setRows([]);
    setPage(1);
    setHasNext(true);
    setErr("");

    fetchPage(1, { reset: true });
  }, [open, fetchPage]);

  const loadNext = () => {
    if (!hasNext || loading) return;
    fetchPage(page + 1);
  };

  return (
    <div className="prod-overlay" role="presentation" onClick={onClose}>
      <aside
        className="prod-drawer open"
        role="dialog"
        aria-label="Product List"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="prod-header">
          <span className="prod-title">Product List</span>
          <button type="button" className="prod-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="prod-body">
          <div className="field">
            <select className="select" defaultValue="">
              <option value="">Select Category and Subcategory</option>
            </select>
          </div>

          {err ? <div className="nodata">{err}</div> : null}

          {/* Minimal list (keep your styling) */}
          <div style={{ overflow: "auto", maxHeight: "65vh" }}>
            {rows.length === 0 && !loading ? (
              <div className="nodata">No Data Available</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                  <div style={{ fontWeight: 600 }}>{r.name || "-"}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {r.barcode || r.itemCode || ""} • {r.location || ""} • Qty: {r.qty ?? 0}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Arrow / load more */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <button
              type="button"
              onClick={loadNext}
              disabled={!hasNext || loading}
              className="btn"
              aria-label="Load next 500"
              title="Load next 500"
            >
              {loading ? "Loading..." : hasNext ? "→ Load next 500" : "All loaded"}
            </button>

            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Loaded: {rows.length}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}