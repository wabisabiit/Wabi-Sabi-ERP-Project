// src/components/RedeemCreditModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../styles/RedeemCreditModal.css";
import { getCreditNote, lookupCoupon } from "../api/client";

export default function RedeemCreditModal({
  invoiceBalance = 0,
  onClose,
  onApply,
  initialMode = "credit", // "credit" | "advance" | "coupon"
}) {
  const [mode, setMode] = useState(initialMode);
  const [noteNo, setNoteNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  // credit: {note_no,date,amount,is_redeemed,...}
  // coupon: {code,created_date,price,status,is_redeemed?,available_redeem?}
  const [data, setData] = useState(null);

  useEffect(() => {
    setMode(initialMode || "credit");
    // clear previous state when the modal is reopened with a different mode
    setNoteNo("");
    setData(null);
    setErr("");
  }, [initialMode]);

  const invBal = Math.max(0, Number(invoiceBalance) || 0);

  // ----- amounts / availability (works for credit + coupon) -----
  const amountNum = useMemo(() => {
    if (!data) return 0;
    if (mode === "coupon") {
      // prefer explicit available field if backend exposes it
      const val =
        data.available_redeem ??
        data.balance ??
        data.remaining_value ??
        data.price ??
        data.value ??
        data.amount ??
        0;
      return Number(val || 0);
    }
    return Number(data?.amount || 0); // credit note amount
  }, [data, mode]);

  const unavailable = useMemo(() => {
    if (!data) return false;
    if (mode === "coupon") {
      const st = String(data?.status || "").toLowerCase();
      return Boolean(data?.is_redeemed) || st === "redeemed" || st === "used";
    }
    return Boolean(data?.is_redeemed);
  }, [data, mode]);

  const available = useMemo(
    () => (data && !unavailable ? amountNum : 0),
    [data, amountNum, unavailable]
  );

  const applyAmount = useMemo(
    () => Math.max(0, Math.min(invBal, available)),
    [invBal, available]
  );

  // ----- lookups -----
  async function lookup(note) {
    const n = (note || "").trim();
    setErr("");
    setData(null);
    if (!n) return;
    setLoading(true);
    try {
      if (mode === "coupon") {
        // use the SINGLE canonical helper so API_BASE / auth / errors are consistent
        const raw = await lookupCoupon(n);
        // normalize various backends -> a single shape
        const normalized = {
          code: raw?.code || raw?.coupon_code || n,
          price: Number(
            raw?.available_redeem ??
              raw?.balance ??
              raw?.remaining_value ??
              raw?.price ??
              raw?.value ??
              raw?.amount ??
              0
          ),
          status:
            raw?.status ??
            (raw?.is_redeemed ? "Redeemed" : "Available"),
          is_redeemed: Boolean(raw?.is_redeemed),
          created_date:
            raw?.created_date || raw?.created_at || raw?.date || raw?.issued_at || null,
          available_redeem:
            raw?.available_redeem ?? raw?.balance ?? raw?.remaining_value ?? null,
        };

        if (!normalized.price) {
          setErr("Coupon has no redeemable value.");
        }
        setData(normalized);
      } else {
        // credit note path (existing)
        const res = await getCreditNote(n);
        if (!res?.ok) {
          setErr(res?.msg || "Credit note not found.");
        } else if (res.is_redeemed) {
          setErr("This credit note is already redeemed and not available.");
          setData(res);
        } else {
          setData(res);
        }
      }
    } catch (e) {
      // our http() throws "404 Not Found – <body>", simplify the message
      const msg = String(e?.message || "").match(/\b\d{3}\b/)
        ? `Not found (${String(e.message).match(/\b\d{3}\b/)[0]}).`
        : "Lookup failed.";
      setErr(mode === "coupon" ? `Coupon ${msg}` : `Credit note ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  // ----- formatting -----
  const formatDate = () => {
    if (!data) return "—";
    if (mode === "coupon") {
      return data?.created_date ? new Date(data.created_date).toLocaleDateString() : "—";
    }
    return data?.date ? new Date(data.date).toLocaleDateString() : "—";
  };

  const formatAmt = (v) =>
    Number(v ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const statusText = unavailable ? "Already used" : data ? "Available" : "—";

  return (
    <div className="rc-overlay" role="dialog" aria-modal="true">
      <div className="rc-modal">
        <div className="rc-head">
          <div className="rc-title">Redeem Credit / Coupon</div>
          <button className="rc-x" aria-label="Close" onClick={onClose}>×</button>
        </div>

        {/* Alert banner */}
        {unavailable && (
          <div className="rc-alert rc-alert-error" role="alert">
            {mode === "coupon"
              ? "This coupon is already redeemed and cannot be used again."
              : "This credit note is already redeemed and cannot be used again."}
          </div>
        )}
        {err && !unavailable && (
          <div className="rc-alert rc-alert-error" role="alert">{err}</div>
        )}

        <div className="rc-row rc-modes">
          <label className="rc-radio">
            <input
              type="radio"
              name="rc_mode"
              checked={mode === "credit"}
              onChange={() => { setMode("credit"); setData(null); setErr(""); }}
            />
            <span>Credit note</span>
          </label>
          <label className="rc-radio">
            <input
              type="radio"
              name="rc_mode"
              checked={mode === "advance"}
              onChange={() => { setMode("advance"); setData(null); setErr(""); }}
            />
            <span>Advance Payment</span>
          </label>
          <label className="rc-radio">
            <input
              type="radio"
              name="rc_mode"
              checked={mode === "coupon"}
              onChange={() => { setMode("coupon"); setData(null); setErr(""); }}
            />
            <span>Coupon</span>
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
            placeholder={
              mode === "credit"
                ? "Credit Note No."
                : mode === "coupon"
                ? "Coupon Code"
                : "Advance Ref No."
            }
            aria-invalid={Boolean(err)}
          />
        </div>

        {/* Status pill */}
        <div className="rc-status">
          <span className={`pill ${unavailable ? "pill-red" : data ? "pill-green" : ""}`}>
            Status: {statusText}
          </span>
        </div>

        {mode === "advance" ? (
          <>
            <div className="rc-line"><div className="rc-k">Adv Payment Date</div><div className="rc-v">—</div></div>
            <div className="rc-line"><div className="rc-k">Adv Payment Amt</div><div className="rc-v">—</div></div>
            <div className="rc-line"><div className="rc-k">Amount Available</div><div className="rc-v">—</div></div>
            <div className="rc-line"><div className="rc-k">Apply Amount</div><div className="rc-v"><input className="rc-amt" type="number" value={0} readOnly /></div></div>
          </>
        ) : (
          <>
            <div className="rc-line">
              <div className="rc-k">{mode === "coupon" ? "Coupon Date" : "Credit Note Date"}</div>
              <div className="rc-v">{formatDate()}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">{mode === "coupon" ? "Coupon Value" : "Credit Amount"}</div>
              <div className="rc-v">{formatAmt(amountNum)}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">{mode === "coupon" ? "Coupon Available" : "Credit Available"}</div>
              <div className="rc-v">{formatAmt(available)}</div>
            </div>
            <div className="rc-line">
              <div className="rc-k">Apply {mode === "coupon" ? "Coupon" : "Credit"}</div>
              <div className="rc-v">
                <input className="rc-amt" type="number" value={applyAmount} readOnly />
              </div>
            </div>
          </>
        )}

        <button
          className="rc-cta"
          disabled={loading || !data || err || unavailable || applyAmount <= 0}
          onClick={() => {
            const payload =
              mode === "coupon"
                ? { mode: "coupon", noteNo: "", amount: applyAmount, code: data?.code || noteNo }
                : { mode, noteNo: data?.note_no, amount: applyAmount };
            onApply?.(payload);
          }}
        >
          {loading ? "Checking..." : (mode === "coupon" ? "Apply Coupon" : "Apply Credit")}
        </button>
      </div>
    </div>
  );
}
