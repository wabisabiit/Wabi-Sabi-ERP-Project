// src/components/OrderListModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../styles/OrderListModal.css";
import { listSales } from "../api/client";
import { useNavigate } from "react-router-dom";

export default function OrderListModal({ open, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fixed page size = 5
  const pageSize = 5;
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");

  const navigate = useNavigate();

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Fetch same data as SaleListPage
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listSales({ all: 1 });
        if (!cancelled) setRows(res?.results || []);
      } catch (e) {
        if (!cancelled) setRows([]);
        console.error("OrderListModal: failed to load sales", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const fmtDateCell = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Client-side search
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.invoice_no,
        r.customer_name,
        r.customer_phone,
        r.payment_method,
        r.order_type,
        r.payment_status,
        String(r.total_amount ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, searchText]);

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const start = (clampedPage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = filtered.slice(start, end);

  const showingFrom = filtered.length === 0 ? 0 : start + 1;
  const showingTo = filtered.length === 0 ? 0 : Math.min(end, filtered.length);

  if (!open) return null;

  return (
    <div className="orders-modal__backdrop" role="dialog" aria-modal="true">
      <div className="orders-modal__dialog">
        {/* Header */}
        <div className="orders-modal__header">
          <h2>POS Details</h2>
          <button
            className="orders-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Filters row */}
        <div className="orders-modal__filters">
          <div className="orders-modal__filter-left">
            <label className="orders-modal__label">Display</label>
            <span
              className="orders-modal__select"
              style={{ padding: "8px 12px", pointerEvents: "none" }}
            >
              5
            </span>
          </div>

          <div className="orders-modal__filter-right">
            <label className="orders-modal__label">Search:</label>
            <input
              className="orders-modal__search"
              type="text"
              placeholder=""
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="orders-modal__tablewrap">
          <table className="orders-modal__table">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Customer Mo.Number</th>
                <th>Total Amount</th>
                <th>Due Amount</th>
                <th>Order Type</th>
                <th>Payment Mode</th>
                <th>Created By</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="orders-modal__empty">
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan="11" className="orders-modal__empty">
                    No matching records found
                  </td>
                </tr>
              ) : (
                pageRows.map((r, i) => (
                  <tr key={r.id || r.invoice_no}>
                    <td>{start + i + 1}</td>
                    <td>{r.invoice_no}</td>
                    <td>{fmtDateCell(r.transaction_date)}</td>
                    <td>{r.customer_name}</td>
                    <td>{r.customer_phone || ""}</td>
                    <td>{Number(r.total_amount || 0).toFixed(2)}</td>
                    <td>{Number(r.due_amount || 0).toFixed(2)}</td>
                    <td>{r.order_type || "In-Store"}</td>
                    <td>{r.payment_method}</td>
                    <td>{r.created_by || "-"}</td>
                    <td>
                      <button
                        className="orders-modal__action"
                        type="button"
                        onClick={() => {
                          const inv = String(r.invoice_no || "").trim();

                          if (!inv) {
                            console.error(
                              "[OrderListModal] ❌ Redirect failed: invoice number missing",
                              r
                            );
                            return;
                          }

                          const target = `/receipt/sale/${encodeURIComponent(inv)}`;

                          console.log(
                            "[OrderListModal] ✅ Redirecting to receipt",
                            {
                              invoice_no: inv,
                              path: target,
                            }
                          );

                          onClose?.();

                          try {
                            navigate(target);
                          } catch (err) {
                            console.error(
                              "[OrderListModal] ❌ Navigation error",
                              err
                            );
                          }
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="orders-modal__footer">
            <span>{`Showing ${showingFrom} to ${showingTo} of ${filtered.length || 0
              } entries`}</span>

            <div className="orders-modal__pager">
              <button
                className="pg-btn"
                aria-label="Previous"
                disabled={clampedPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              <button className="pg-btn pg-current" aria-current="page">
                {clampedPage}
              </button>
              <button
                className="pg-btn"
                aria-label="Next"
                disabled={clampedPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="orders-modal__strip" />
      </div>
    </div>
  );
}
