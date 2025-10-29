import React, { useEffect, useMemo, useState } from "react";
import "../styles/RedeemCreditModal.css";
import { getCreditNote } from "../api/client";

export default function RedeemCreditModal({ invoiceBalance = 0, onClose, onApply }) {
  const [mode, setMode] = useState("credit");
  const [noteNo, setNoteNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null); // {note_no,date,amount,is_redeemed,...}

  const invBal = Math.max(0, Number(invoiceBalance) || 0);

  const amountNum  = useMemo(() => Number(data?.amount || 0), [data]);
  const available  = useMemo(() => (data && !data.is_redeemed ? amountNum : 0), [data, amountNum]);
  const unavailable = useMemo(() => !!data && !!data.is_redeemed, [data]);

  const applyAmount = useMemo(() => {
    // clamp: min(invoice balance, available), never negative
    return Math.max(0, Math.min(invBal, available));
  }, [invBal, available]);

  async function lookup(note) {
    const n = (note || "").trim();
    setErr("");
    setData(null);
    if (!n) return;
    setLoading(true);
    try {
      const res = await getCreditNote(n);
      if (!res?.ok) {
        setErr(res?.msg || "Credit note not found.");
      } else if (res.is_redeemed) {
        // explicitly signal "already used"
        setErr("This credit note is already redeemed and not available.");
        setData(res);
      } else {
        setData(res);
      }
    } catch (e) {
      setErr("Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  const formatDate = () =>
    data?.date ? new Date(data.date).toLocaleDateString() : "—";
  const formatAmt = (v) =>
    Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusText = unavailable ? "Already used" : data ? "Available" : "—";

  return (
    <div className="rc-overlay" role="dialog" aria-modal="true">
      <div className="rc-modal">
        <div className="rc-head">
          <div className="rc-title">Redeem Credit</div>
          <button className="rc-x" aria-label="Close" onClick={onClose}>×</button>
        </div>

        {/* Alert banner for not-available notes */}
        {unavailable && (
          <div className="rc-alert rc-alert-error" role="alert">
            This credit note is already redeemed and cannot be used again.
          </div>
        )}
        {err && !unavailable && (
          <div className="rc-alert rc-alert-error" role="alert">{err}</div>
        )}

        <div className="rc-row rc-modes">
          <label className="rc-radio">
            <input type="radio" name="rc_mode" checked={mode === "credit"} onChange={() => setMode("credit")} />
            <span>Credit note</span>
          </label>
          <label className="rc-radio">
            <input type="radio" name="rc_mode" checked={mode === "advance"} onChange={() => setMode("advance")} />
            <span>Advance Payment</span>
          </label>
        </div>

        <div className="rc-balance">
          <span className="pill">Invoice Balance: {formatAmt(invBal)}</span>
        </div>

        <div className="rc-row">
          <div className="rc-label">Scan Barcode/Type Number</div>
          <input
            type="text"
            className="rc-input"
            value={noteNo}
            onChange={(e) => setNoteNo(e.target.value)}
            onBlur={() => lookup(noteNo)}
            onKeyDown={(e) => { if (e.key === "Enter") lookup(noteNo); }}
            placeholder={mode === "credit" ? "Credit Note No." : "Advance Ref No."}
            aria-invalid={Boolean(err)}
          />
        </div>

        {/* Status pill */}
        <div className="rc-status">
          <span className={`pill ${unavailable ? "pill-red" : data ? "pill-green" : ""}`}>
            Status: {statusText}
          </span>
        </div>

        {mode === "credit" ? (
          <>
            <div className="rc-line">
              <div className="rc-k">Credit Note Date</div>
              <div className="rc-v">{formatDate()}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">Credit Amount</div>
              <div className="rc-v">{formatAmt(data?.amount)}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">Credit Available</div>
              <div className="rc-v">{formatAmt(available)}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">Apply Credit</div>
              <div className="rc-v">
                <input className="rc-amt" type="number" value={applyAmount} readOnly />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rc-line"><div className="rc-k">Adv Payment Date</div><div className="rc-v">—</div></div>
            <div className="rc-line"><div className="rc-k">Adv Payment Amt</div><div className="rc-v">—</div></div>
            <div className="rc-line"><div className="rc-k">Amount Available</div><div className="rc-v">—</div></div>
            <div className="rc-line"><div className="rc-k">Apply Amount</div><div className="rc-v"><input className="rc-amt" type="number" value={0} readOnly /></div></div>
          </>
        )}

        <button
          className="rc-cta"
          disabled={loading || !data || err || unavailable || applyAmount <= 0}
          onClick={() => onApply?.({ mode, noteNo: data?.note_no, amount: applyAmount })}
        >
          {loading ? "Checking..." : "Apply Credit"}
        </button>
      </div>
    </div>
  );
}
