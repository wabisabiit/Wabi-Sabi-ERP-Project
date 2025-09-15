import React, { useEffect } from "react";
import "../styles/OrderListModal.css";


export default function OrderListModal({ open, onClose }) {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="orders-modal__backdrop" role="dialog" aria-modal="true">
      <div className="orders-modal__dialog">
        {/* Header */}
        <div className="orders-modal__header">
          <h2>POS Details</h2>
          <button className="orders-modal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Filters row */}
        <div className="orders-modal__filters">
          <div className="orders-modal__filter-left">
            <label className="orders-modal__label">Display</label>
            <select className="orders-modal__select" defaultValue="10">
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
          </div>

          <div className="orders-modal__filter-right">
            <label className="orders-modal__label">Search:</label>
            <input className="orders-modal__search" type="text" placeholder="" />
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
              {/* Empty state exactly like screenshot */}
              <tr>
                <td colSpan="11" className="orders-modal__empty">
                  No matching records found
                </td>
              </tr>
            </tbody>
          </table>

          {/* “Showing 1 to 1 of 1 entries” (same look) */}
          <div className="orders-modal__footer">
            <span>Showing 1 to 1 of 1 entries</span>

            {/* Pagination – centered with current page black */}
            <div className="orders-modal__pager">
              <button className="pg-btn" aria-label="Previous" disabled>
                ‹
              </button>
              <button className="pg-btn pg-current" aria-current="page">1</button>
              <button className="pg-btn" aria-label="Next" disabled>
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Bottom black strip (as seen in screenshot) */}
        <div className="orders-modal__strip" />
      </div>
    </div>
  );
}
