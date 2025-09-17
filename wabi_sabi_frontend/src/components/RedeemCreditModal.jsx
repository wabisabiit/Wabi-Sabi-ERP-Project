import React, { useState } from "react";
import "../styles/RedeemCreditModal.css";

export default function RedeemCreditModal({ onClose, onApply }) {
  const [mode, setMode] = useState("credit");

  // sirf format placeholders
  const formatDate = () => "DD/MM/YYYY";
  const formatAmt = () => "0.00";

  return (
    <div className="rc-overlay" role="dialog" aria-modal="true">
      <div className="rc-modal">
        {/* Header */}
        <div className="rc-head">
          <div className="rc-title">Redeem Credit</div>
          <button className="rc-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Mode toggle */}
        <div className="rc-row rc-modes">
          <label className="rc-radio">
            <input
              type="radio"
              name="rc_mode"
              checked={mode === "credit"}
              onChange={() => setMode("credit")}
            />
            <span>Credit note</span>
          </label>

          <label className="rc-radio">
            <input
              type="radio"
              name="rc_mode"
              checked={mode === "advance"}
              onChange={() => setMode("advance")}
            />
            <span>Advance Payment</span>
          </label>
        </div>

        {/* Invoice balance pill */}
        <div className="rc-balance">
          <span className="pill">Invoice Balance: {formatAmt()}</span>
        </div>

        {/* Scan input */}
        <div className="rc-row">
          <div className="rc-label">Scan Barcode/Type Number</div>
          <input
            type="text"
            className="rc-input"
            placeholder={mode === "credit" ? "Sales Return" : "Advance payment"}
          />
        </div>

        {/* Details block */}
        {mode === "credit" ? (
          <>
            <div className="rc-line">
              <div className="rc-k">Credit Note Date</div>
              <div className="rc-v">{formatDate()}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">Credit Amount</div>
              <div className="rc-v">{formatAmt()}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">Credit Available</div>
              <div className="rc-v">{formatAmt()}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">Apply Credit</div>
              <div className="rc-v">
                <input className="rc-amt" type="number" placeholder={formatAmt()} disabled />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rc-line">
              <div className="rc-k">Adv Payment Date</div>
              <div className="rc-v">{formatDate()}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">Adv Payment Amt</div>
              <div className="rc-v">{formatAmt()}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">Amount Available</div>
              <div className="rc-v">{formatAmt()}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">Apply Amount</div>
              <div className="rc-v">
                <input className="rc-amt" type="number" placeholder={formatAmt()} disabled />
              </div>
            </div>
          </>
        )}

        {/* CTA */}
        <button className="rc-cta" onClick={() => onApply?.({ mode })}>
          Apply Credit
        </button>
      </div>
    </div>
  );
}
