// src/components/RegisterOpenModal.jsx
import React, { useEffect, useRef, useState } from "react";
import "../styles/RegisterOpenModal.css";
import { openRegisterSession } from "../api/client";

export default function RegisterOpenModal({ open, onClose, onOpened }) {
  const [amount, setAmount] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const okRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    setAmount("0");
    setSubmitting(false);
    setErrorMsg("");

    const onEsc = (e) => e.key === "Escape" && !submitting && onClose?.();
    document.addEventListener("keydown", onEsc);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => okRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  const submit = async () => {
    setSubmitting(true);
    setErrorMsg("");

    const opening_cash = String(amount || "0");

    try {
      const data = await openRegisterSession({ opening_cash });
      // data should include opening_cash, business_date, etc.
      await Promise.resolve(onOpened?.(data));
      onClose?.();
    } catch (err) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to open register. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rom-backdrop">
      <div className="rom-modal" role="dialog" aria-modal="true" aria-label="Open Register">
        <div className="rom-header">
          <h3 className="rom-title">Enter In-hand Cash</h3>
          <button
            className="rom-x"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <div className="rom-body">
          <label className="rom-label">In-hand Cash (₹)</label>
          <input
            className="rom-input"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
          />

          <div className="rom-hint">
            This will start today’s selling till for your location.
          </div>

          {errorMsg && <div className="rom-error">{errorMsg}</div>}
        </div>

        <div className="rom-footer">
          <button
            ref={okRef}
            className="rom-btn primary"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
