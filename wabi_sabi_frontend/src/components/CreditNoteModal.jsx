import React, { useEffect } from "react";
import "../styles/CreditNoteModal.css";

export default function CreditNoteModal({ open, onClose }) {
  // lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="cn-overlay" role="dialog" aria-modal="true" aria-label="Credit Note Details">
      <div className="cn-card">
        {/* Header */}
        <div className="cn-header">
          <h3>Credit Note Details</h3>
          <button className="cn-close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="cn-body">
          {/* Toolbar */}
          <div className="cn-toolbar">
            <div className="cn-field">
              <label className="cn-label">Display</label>
              <div className="cn-selectwrap">
                <select className="cn-control">
                  <option>100</option>
                  <option>200</option>
                  <option>500</option>
                  <option>1000</option>
                </select>
                {/* <span className="cn-caret" aria-hidden>▾</span> */}
              </div>
            </div>

            <div className="cn-field cn-field-right">
              <label className="cn-label">Search:</label>
              <input className="cn-control" type="text" />
            </div>
          </div>

          {/* Table */}
          <div className="cn-tablewrap">
            <table className="cn-table">
              <thead>
                <tr>
                  <th>Sr.<br/>No.</th>
                  <th>Credit<br/>Note No.</th>
                  <th>Date</th>
                  <th>Customer<br/>Name</th>
                  <th>Total<br/>Amount</th>
                  <th>Credits<br/>Used</th>
                  <th>Credits<br/>Remaining</th>
                  <th>Created By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr className="cn-empty">
                  <td colSpan={9}>No data available in table</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="cn-footer">
            <div className="cn-entries">Showing 0 to 0 of 0 entries</div>
            <div className="cn-pager">
              <button className="cn-page" title="Previous">‹</button>
              <button className="cn-page" title="Next">›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
