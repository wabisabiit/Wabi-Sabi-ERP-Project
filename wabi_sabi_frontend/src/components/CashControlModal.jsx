import React, { useEffect, useState } from "react";
import "../styles/CashControlModal.css";

export default function CashControlModal({ open, onClose }) {
  const [mode, setMode] = useState("opening");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");

  // ⬇️ background fixed & no scrollbar when modal is open
  useEffect(() => {
    if (open) {
      document.body.classList.add("ccm-no-scroll");
    } else {
      document.body.classList.remove("ccm-no-scroll");
    }
    return () => document.body.classList.remove("ccm-no-scroll");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ccm-overlay" role="dialog" aria-modal="true" aria-label="Cash Control">
      <div className="ccm-modal">
        <div className="ccm-header">
          <h3 className="ccm-title">Cash Control</h3>
          <button className="ccm-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="ccm-radio-row">
          <label className={`ccm-radio ${mode === "opening" ? "is-active" : ""}`}>
            <input type="radio" name="ccm-mode" checked={mode === "opening"} onChange={() => setMode("opening")} />
            <span className="ccm-dot" />
            <span>Opening Balance</span>
          </label>

          <label className={`ccm-radio ${mode === "add" ? "is-active" : ""}`}>
            <input type="radio" name="ccm-mode" checked={mode === "add"} onChange={() => setMode("add")} />
            <span className="ccm-dot" />
            <span>Add Money In</span>
          </label>
        </div>

        {mode === "opening" && (
          <div className="ccm-opening">
            <div className="ccm-row">
              <span className="ccm-label">Today's opening Cash In Hand:</span>
              <span className="ccm-value">
                0
                <button className="ccm-pencil" aria-label="Edit">
                  <span className="material-icons" style={{ fontSize: 18 }}>edit</span>
                </button>
              </span>
            </div>

            <div className="ccm-meta">
              <div className="ccm-meta-line"><span className="ccm-meta-label">Last changes made by</span></div>
              <div className="ccm-meta-line"><span className="ccm-k">User:</span><span className="ccm-v">—</span></div>
              <div className="ccm-meta-line"><span className="ccm-k">Date and Time:</span><span className="ccm-v">—</span></div>
            </div>
          </div>
        )}

        {mode === "add" && (
          <div className="ccm-add">
            <div className="ccm-form">
              <div className="ccm-field">
                <label>Amount<span className="ccm-req">*</span></label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="ccm-field">
                <label>Remark</label>
                <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} />
              </div>
              <div className="ccm-form-actions">
                <button className="ccm-save" onClick={() => { /* API hook */ }}>
                  Save
                </button>
              </div>
            </div>

            <div className="ccm-table-wrap">
              <div className="ccm-table-title">Cash In Hand</div>
              <table className="ccm-table">
                <thead>
                  <tr>
                    <th>Sr No.</th>
                    <th>Opening Amount</th>
                    <th>Created On</th>
                    <th>Updated On</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>0</td>
                    <td>09/09/2025 12:30:10 pm</td>
                    <td>09/09/2025 12:30:10 pm</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              <div className="ccm-pager">
                <button className="ccm-page-btn" disabled>&lt;</button>
                <button className="ccm-page-btn is-current">1</button>
                <button className="ccm-page-btn" disabled>&gt;</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
