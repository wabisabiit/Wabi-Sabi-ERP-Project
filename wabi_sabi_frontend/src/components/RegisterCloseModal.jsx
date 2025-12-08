// src/components/RegisterCloseModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/RegisterCloseModal.css";
import {
  createRegisterClose,
  getRegisterClosingSummary,
} from "../api/client";

const DENOMS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

const SUMMARY_FIELDS = [
  { key: "openingCash", label: "Opening Cash" },
  { key: "cashPayment", label: "Cash Payment" },
  { key: "chequePayment", label: "Cheque Payment" },
  { key: "cardPayment", label: "Card Payment" },
  { key: "bankTransferPayment", label: "Bank Transfer" },
  { key: "upiPayment", label: "UPI Payment" },
  { key: "walletPayment", label: "Wallet Payment" },
  { key: "salesReturn", label: "Sales Return" },
  { key: "cashRefund", label: "  Cash Refund", indent: true },
  { key: "bankRefund", label: "  Bank Refund", indent: true },
  { key: "creditApplied", label: "Credit Applied" },
  { key: "payLater", label: "Pay Later" },
  { key: "expense", label: "Expense" },
  { key: "purchasePayment", label: "Purchase Payment" },
  { key: "totalSales", label: "Total Sales" },
];

export default function RegisterCloseModal({
  open,
  onClose,
  rangeLabel,
  openingCash = 0,
  onAfterSave,
}) {
  const [summary, setSummary] = useState({});
  const [counts, setCounts] = useState(
    DENOMS.reduce((a, d) => ({ ...a, [d]: "0" }), {})
  );

  const [bank, setBank] = useState("");
  const [bankTransferRegister, setBankTransferRegister] = useState("");
  const [cashFlow, setCashFlow] = useState("");
  const [physicalDrawer, setPhysicalDrawer] = useState("TOTAL_CASH");
  const [closingNote, setClosingNote] = useState("");

  const [closingDate, setClosingDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [closingTime, setClosingTime] = useState(() => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false); // spinner for auto data

  const okRef = useRef(null);

  const toInt = (v) => {
    const n = parseInt(String(v ?? "").replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? n : 0;
  };
  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

  const denomTotal = useMemo(
    () => DENOMS.reduce((s, d) => s + d * toInt(counts[d]), 0),
    [counts]
  );

  // Reset + prefill when modal opens
  useEffect(() => {
    if (!open) return;

    setSummary({
      openingCash: String(openingCash ?? 0),
      cashPayment: "0.00",
      chequePayment: "0.00",
      cardPayment: "0.00",
      bankTransferPayment: "0.00",
      upiPayment: "0.00",
      walletPayment: "0.00",
      salesReturn: "0.00",
      cashRefund: "0.00",
      bankRefund: "0.00",
      creditApplied: "0.00",
      payLater: "0.00",
      expense: "0.00",
      purchasePayment: "0.00",
      totalSales: "0.00",
    });

    setCounts(DENOMS.reduce((a, d) => ({ ...a, [d]: "0" }), {}));
    setBank("");
    setBankTransferRegister("");
    setCashFlow("");
    setPhysicalDrawer("TOTAL_CASH");
    setClosingNote("");
    setSuccessMsg("");
    setErrorMsg("");

    setClosingDate(new Date().toISOString().slice(0, 10));
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    setClosingTime(`${h}:${m}`);

    const onEsc = (e) => e.key === "Escape" && !submitting && onClose?.();
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => okRef.current?.focus(), 0);

    // 🔵 Fetch today's real totals (sales + expense + per payment mode)
    (async () => {
      try {
        setLoadingSummary(true);
        const data = await getRegisterClosingSummary();
        setSummary((prev) => ({
          ...prev,
          totalSales: String(data?.total_sales ?? prev.totalSales ?? 0),
          expense: String(data?.expense ?? prev.expense ?? 0),
          cashPayment: String(data?.cash_payment ?? prev.cashPayment ?? 0),
          cardPayment: String(data?.card_payment ?? prev.cardPayment ?? 0),
          upiPayment: String(data?.upi_payment ?? prev.upiPayment ?? 0),
        }));
      } catch (err) {
        console.error("Failed to load register summary", err);
      } finally {
        setLoadingSummary(false);
      }
    })();

    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, openingCash, onClose, submitting]);

  if (!open) return null;

  const fallback = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const title = `Current Register (${rangeLabel || fallback})`;

  const onNosChange = (den, val) =>
    setCounts((p) => ({ ...p, [den]: val.replace(/\D/g, "") }));

  const handleSummaryChange = (key, value) => {
    setSummary((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    setSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    const closedAt = `${closingDate}T${closingTime}:00`;

    const payload = {
      closed_at: closedAt,

      opening_cash: summary.openingCash || "0",
      cash_payment: summary.cashPayment || "0",
      cheque_payment: summary.chequePayment || "0",
      card_payment: summary.cardPayment || "0",
      bank_transfer_payment: summary.bankTransferPayment || "0",
      upi_payment: summary.upiPayment || "0",
      wallet_payment: summary.walletPayment || "0",
      sales_return: summary.salesReturn || "0",
      cash_refund: summary.cashRefund || "0",
      bank_refund: summary.bankRefund || "0",
      credit_applied: summary.creditApplied || "0",
      pay_later: summary.payLater || "0",
      expense: summary.expense || "0",
      purchase_payment: summary.purchasePayment || "0",
      total_sales: summary.totalSales || "0",

      bank_account: bank,
      bank_transfer_register: bankTransferRegister || "0",
      cash_flow: cashFlow || "0",
      total_cash_left: denomTotal.toFixed(2),
      physical_drawer: physicalDrawer,
      closing_note: closingNote,
    };

    try {
      await createRegisterClose(payload);
      if (onAfterSave) {
        await Promise.resolve(onAfterSave(payload));
      }
      setSuccessMsg("Register closed successfully.");
      setTimeout(() => {
        setSuccessMsg("");
        onClose?.();
      }, 900);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.message || "Failed to close register. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rcm-backdrop">
      <div className="rcm-modal" role="dialog" aria-modal="true" aria-label={title}>
        {/* Header */}
        <div className="rcm-header">
          <h3 className="rcm-title">{title}</h3>

          {/* small blue spinner while summary data loads */}
          {loadingSummary && (
            <div className="rcm-header-loader">
              <span className="rcm-spinner-blue" />
            </div>
          )}

          <button
            className="rcm-x"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="rcm-content">
          {/* LEFT side */}
          <div className="rcm-col rcm-col-left">
            {SUMMARY_FIELDS.map((f) => (
              <div className="rcm-row" key={f.key}>
                <span className={f.indent ? "sub" : ""}>{f.label}</span>
                <input
                  className="rcm-input r"
                  type="number"
                  step="0.01"
                  value={summary[f.key] ?? ""}
                  onChange={(e) => handleSummaryChange(f.key, e.target.value)}
                  disabled={submitting}
                />
              </div>
            ))}
          </div>

          {/* MIDDLE - denominations (UI only) */}
          <div className="rcm-col rcm-col-mid">
            <table className="rcm-table">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Nos</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {DENOMS.map((d) => {
                  const nos = toInt(counts[d]);
                  return (
                    <tr key={d}>
                      <td>₹{d}</td>
                      <td>
                        <input
                          className="rcm-input"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={counts[d]}
                          onChange={(e) => onNosChange(d, e.target.value)}
                          disabled={submitting}
                        />
                      </td>
                      <td className="r">₹{fmt(d * nos)}</td>
                    </tr>
                  );
                })}
                <tr className="rcm-total">
                  <td colSpan={2}>Total</td>
                  <td className="r">₹{fmt(denomTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT side */}
          <div className="rcm-col rcm-col-right">
            <div className="rcm-row-inline">
              <div>
                <label className="rcm-lab">Date</label>
                <input
                  className="rcm-input"
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="rcm-lab">Time</label>
                <input
                  className="rcm-input"
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <label className="rcm-lab">Bank Account</label>
            <select
              className="rcm-input"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              disabled={submitting}
            >
              <option value="">Select Bank</option>
              <option value="HDFC">HDFC Bank</option>
              <option value="SBI">SBI</option>
              <option value="ICICI">ICICI Bank</option>
            </select>

            <label className="rcm-lab">Bank Transfer</label>
            <input
              className="rcm-input"
              type="number"
              step="0.01"
              value={bankTransferRegister}
              onChange={(e) => setBankTransferRegister(e.target.value)}
              disabled={submitting}
            />

            <label className="rcm-lab">Cash Flow</label>
            <input
              className="rcm-input"
              type="number"
              step="0.01"
              value={cashFlow}
              onChange={(e) => setCashFlow(e.target.value)}
              disabled={submitting}
            />

            <label className="rcm-lab">Total Cash Left In Drawer</label>
            <input
              className="rcm-input"
              value={`₹${fmt(denomTotal)}`}
              readOnly
            />

            <label className="rcm-lab">
              Physical Drawer <span className="req">*</span>
            </label>
            <select
              className="rcm-input"
              value={physicalDrawer}
              onChange={(e) => setPhysicalDrawer(e.target.value)}
              disabled={submitting}
            >
              <option value="TOTAL_CASH">Total Cash</option>
              <option value="SHORT">Short</option>
              <option value="EXCESS">Excess</option>
            </select>

            <label className="rcm-lab">Closing Note</label>
            <textarea
              className="rcm-textarea"
              rows={3}
              placeholder="Closing Note"
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="rcm-footer">
          <button
            ref={okRef}
            className="rcm-btn primary"
            onClick={submit}
            disabled={submitting}
          >
            {submitting && <span className="rcm-spinner" />}
            <span>{submitting ? "Closing..." : "Close Register"}</span>
          </button>
        </div>

        {(successMsg || errorMsg) && (
          <div className={`rcm-toast ${errorMsg ? "error" : "success"}`}>
            {errorMsg || successMsg}
          </div>
        )}
      </div>
    </div>
  );
}
