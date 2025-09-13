import React from "react";
import "../styles/HoldBillPanel.css";

export default function HoldBillPanel({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="holdbill-overlay">
      <aside className="holdbill-panel">
        {/* Header */}
        <div className="holdbill-header">
          <h3>On Hold</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="holdbill-search">
          <input type="text" placeholder="Search" />
          <button className="dropdown-btn" aria-label="More">
            <span className="material-icons">arrow_drop_down</span>
          </button>
        </div>

        {/* Body */}
        <div className="holdbill-body">
          <p>No Data Available</p>
        </div>
      </aside>
    </div>
  );
}
