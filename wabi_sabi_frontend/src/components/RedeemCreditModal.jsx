// src/components/RedeemCreditModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../styles/RedeemCreditModal.css";
import { getCreditNote, lookupCoupon, listDiscounts } from "../api/client";

export default function RedeemCreditModal({
  invoiceBalance = 0,
  onClose,
  onApply,
  initialMode = "credit", // "credit" | "advance" | "coupon" | "discount"
}) {
  const [mode, setMode] = useState(initialMode);
  const [noteNo, setNoteNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // credit: {note_no,date,amount,is_redeemed,...}
  // coupon: {code,created_date,price,status,is_redeemed?,available_redeem?}
  // discount: {code, title, start_date, end_date, status, value, value_type, mode, applicable, ...}
  const [data, setData] = useState(null);

  // ✅ NEW: discount listing mode
  const [discounts, setDiscounts] = useState([]);
  const [discountsLoading, setDiscountsLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode || "credit");
    setNoteNo("");
    setData(null);
    setErr("");
    setDiscounts([]);
  }, [initialMode]);

  const invBal = Math.max(0, Number(invoiceBalance) || 0);

  // ---------- amount extraction ----------
  const amountNum = useMemo(() => {
    if (!data) return 0;

    if (mode === "coupon") {
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

    if (mode === "discount") {
      // raw discount definition (value & value_type), not the applied amount
      const v = Number(data.value || 0);
      return Number.isFinite(v) ? v : 0;
    }

    // credit
    return Number(data?.amount || 0);
  }, [data, mode]);

  // ---------- validity / unavailability ----------
  const isDiscountExpired = useMemo(() => {
    if (mode !== "discount" || !data) return false;
    const today = new Date();
    const sd = data.start_date ? new Date(data.start_date) : null;
    const ed = data.end_date ? new Date(data.end_date) : null;

    // treat date-only strings as local dates
    const notStarted = sd
      ? today < new Date(sd.getFullYear(), sd.getMonth(), sd.getDate() + 0, 0, 0, 0)
      : false;
    const ended = ed
      ? today > new Date(ed.getFullYear(), ed.getMonth(), ed.getDate(), 23, 59, 59, 999)
      : false;

    // backend may also give a status like "Active"/"Expired"
    const st = String(data.status || "").toLowerCase();
    const notActive = st && st !== "active";

    return notStarted || ended || notActive;
  }, [mode, data]);

  const unavailable = useMemo(() => {
    if (!data) return false;
    if (mode === "coupon") {
      const st = String(data?.status || "").toLowerCase();
      return Boolean(data?.is_redeemed) || st === "redeemed" || st === "used";
    }
    if (mode === "discount") {
      return isDiscountExpired;
    }
    // credit
    return Boolean(data?.is_redeemed);
  }, [data, mode, isDiscountExpired]);

  const available = useMemo(() => {
    if (!data || unavailable) return 0;

    if (mode === "discount") {
      // compute APPLY amount based on invoice balance & discount definition
      const v = Number(data.value || 0);
      const type = String(data.value_type || "").toUpperCase(); // PERCENT | AMOUNT
      if (!invBal || !v) return 0;

      let computed = 0;
      if (type === "PERCENT") {
        computed = (invBal * v) / 100;
      } else {
        computed = v;
      }
      // clamp to invoice balance
      return Math.max(0, Math.min(invBal, Math.round(computed)));
    }

    // coupon / credit available amount
    return Number(amountNum || 0);
  }, [data, mode, amountNum, invBal, unavailable]);

  const applyAmount = useMemo(
    () => Math.max(0, Math.min(invBal, available)),
    [invBal, available]
  );

  // ---------- NEW: load discounts when mode=discount ----------
  useEffect(() => {
    let alive = true;

    async function loadDiscounts() {
      if (mode !== "discount") return;
      setErr("");
      setData(null);
      setNoteNo("");
      setDiscounts([]);
      setDiscountsLoading(true);

      try {
        const list = await listDiscounts();
        const arr = Array.isArray(list) ? list : [];
        if (!alive) return;

        // normalize status locally also using dates (extra safety)
        const normalized = arr.map((d) => {
          const today = new Date();
          const sd = d?.start_date ? new Date(d.start_date) : null;
          const ed = d?.end_date ? new Date(d.end_date) : null;

          const notStarted = sd
            ? today < new Date(sd.getFullYear(), sd.getMonth(), sd.getDate(), 0, 0, 0, 0)
            : false;
          const ended = ed
            ? today > new Date(ed.getFullYear(), ed.getMonth(), ed.getDate(), 23, 59, 59, 999)
            : false;

          const apiStatus = String(d?.status || "").toLowerCase();
          const notActive = apiStatus && apiStatus !== "active";

          const expired = notStarted || ended || notActive;

          return {
            ...d,
            __expired: expired,
          };
        });

        setDiscounts(normalized);
      } catch (e) {
        if (!alive) return;
        setErr("Failed to load discounts.");
      } finally {
        if (alive) setDiscountsLoading(false);
      }
    }

    loadDiscounts();
    return () => {
      alive = false;
    };
  }, [mode]);

  // ---------- lookups ----------
  async function lookup(codeOrNo) {
    const n = (codeOrNo || "").trim();
    setErr("");
    setData(null);
    if (!n) return;

    setLoading(true);
    try {
      if (mode === "coupon") {
        const raw = await lookupCoupon(n);
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
          status: raw?.status ?? (raw?.is_redeemed ? "Redeemed" : "Available"),
          is_redeemed: Boolean(raw?.is_redeemed),
          created_date:
            raw?.created_date ||
            raw?.created_at ||
            raw?.date ||
            raw?.issued_at ||
            null,
          available_redeem:
            raw?.available_redeem ?? raw?.balance ?? raw?.remaining_value ?? null,
        };
        if (!normalized.price) setErr("Coupon has no redeemable value.");
        setData(normalized);
      } else if (mode === "discount") {
        // (typing disabled now in UI, but keep logic untouched)
        const list = await listDiscounts();
        const found = (Array.isArray(list) ? list : []).find(
          (d) => String(d.code || "").toUpperCase() === n.toUpperCase()
        );

        if (!found) {
          setErr("Discount not found.");
          setData(null);
        } else {
          const expired = (() => {
            const today = new Date();
            const sd = found.start_date ? new Date(found.start_date) : null;
            const ed = found.end_date ? new Date(found.end_date) : null;
            const st = String(found.status || "").toLowerCase();

            const notStarted = sd
              ? today < new Date(sd.getFullYear(), sd.getMonth(), sd.getDate(), 0, 0, 0, 0)
              : false;
            const ended = ed
              ? today > new Date(ed.getFullYear(), ed.getMonth(), ed.getDate(), 23, 59, 59, 999)
              : false;
            const notActive = st && st !== "active";
            return notStarted || ended || notActive;
          })();

          if (expired) {
            setErr("This discount has expired or is not active.");
          }
          setData(found);
        }
      } else {
        // credit note
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
      const msg = String(e?.message || "").match(/\b\d{3}\b/)
        ? `Not found (${String(e.message).match(/\b\d{3}\b/)[0]}).`
        : "Lookup failed.";
      let label = "Credit note";
      if (mode === "coupon") label = "Coupon";
      if (mode === "discount") label = "Discount";
      setErr(`${label} ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  // ---------- formatting ----------
  const formatDate = () => {
    if (!data) return "—";
    if (mode === "coupon") {
      return data?.created_date ? new Date(data.created_date).toLocaleDateString() : "—";
    }
    if (mode === "discount") {
      return data?.start_date ? new Date(data.start_date).toLocaleDateString() : "—";
    }
    return data?.date ? new Date(data.date).toLocaleDateString() : "—";
  };

  const formatAmt = (v) =>
    Number(v ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const statusText = (() => {
    if (!data) return "—";
    if (mode === "coupon") {
      return unavailable ? "Already used" : "Available";
    }
    if (mode === "discount") {
      return isDiscountExpired ? "Expired" : "Active";
    }
    return unavailable ? "Already used" : "Available";
  })();

  const placeholderText =
    mode === "credit"
      ? "Credit Note No."
      : mode === "coupon"
      ? "Coupon Code"
      : mode === "discount"
      ? "Discount Code"
      : "Advance Ref No.";

  const ctaText =
    loading
      ? "Checking..."
      : mode === "coupon"
      ? "Apply Coupon"
      : mode === "discount"
      ? "Apply Discount"
      : "Apply Credit";

  // ✅ NEW: apply a selected discount from list
  function applySelectedDiscount(d) {
    if (!d) return;

    const v = Number(d.value || 0);
    const type = String(d.value_type || "").toUpperCase(); // PERCENT | AMOUNT
    if (!invBal || !v) return;

    let computed = 0;
    if (type === "PERCENT") computed = (invBal * v) / 100;
    else computed = v;

    const amt = Math.max(0, Math.min(invBal, Math.round(computed)));
    if (amt <= 0) return;

    onApply?.({
      mode: "discount",
      noteNo: "",
      amount: amt,
      code: d?.code || "",
    });
  }

  const topThreeDiscounts = useMemo(() => discounts.slice(0, 3), [discounts]);
  const remainingDiscounts = useMemo(() => discounts.slice(3), [discounts]);

  return (
    <div className="rc-overlay" role="dialog" aria-modal="true">
      <div className="rc-modal">
        <div className="rc-head">
          <div className="rc-title">Redeem Credit / Coupon / Discount</div>
          <button className="rc-x" aria-label="Close" onClick={onClose}>×</button>
        </div>

        {/* Alert banner */}
        {unavailable && (
          <div className="rc-alert rc-alert-error" role="alert">
            {mode === "coupon"
              ? "This coupon is already redeemed and cannot be used."
              : mode === "discount"
              ? "This discount has expired or is not active."
              : "This credit note is already redeemed and cannot be used."}
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
              onChange={() => { setMode("credit"); setData(null); setErr(""); setNoteNo(""); }}
            />
            <span>Credit note</span>
          </label>
          <label className="rc-radio">
            <input
              type="radio"
              name="rc_mode"
              checked={mode === "advance"}
              onChange={() => { setMode("advance"); setData(null); setErr(""); setNoteNo(""); }}
            />
            <span>Advance Payment</span>
          </label>
          <label className="rc-radio">
            <input
              type="radio"
              name="rc_mode"
              checked={mode === "coupon"}
              onChange={() => { setMode("coupon"); setData(null); setErr(""); setNoteNo(""); }}
            />
            <span>Coupon</span>
          </label>
          <label className="rc-radio">
            <input
              type="radio"
              name="rc_mode"
              checked={mode === "discount"}
              onChange={() => { setMode("discount"); setData(null); setErr(""); setNoteNo(""); }}
            />
            <span>Discount</span>
          </label>
        </div>

        <div className="rc-balance">
          <span className="pill">Invoice Balance: {formatAmt(invBal)}</span>
        </div>

        {/* ✅ DISCOUNT MODE: show list instead of typing */}
        {mode === "discount" ? (
          <div className="rc-discount-wrap">
            <div className="rc-discount-head">
              <div className="rc-label rc-label-tight">Available Discounts</div>
              {discountsLoading ? <div className="rc-mini">Loading...</div> : null}
            </div>

            {/* Top 3 always visible */}
            <div className="rc-discount-list">
              {topThreeDiscounts.map((d) => {
                const expired = Boolean(d.__expired) || String(d.status || "").toLowerCase() !== "active";
                return (
                  <div className={`rc-discount-item ${expired ? "is-expired" : ""}`} key={d.id || d.code}>
                    <div className="rc-discount-main">
                      <div className="rc-discount-title">{d.title || d.code || "Discount"}</div>
                      <div className="rc-discount-sub">
                        <span className={`rc-badge ${expired ? "rc-badge-expired" : "rc-badge-active"}`}>
                          {expired ? "Expired" : "Active"}
                        </span>
                        <span className="rc-discount-code">{String(d.code || "").toUpperCase()}</span>
                      </div>
                    </div>

                    <button
                      className="rc-apply-btn"
                      disabled={expired || invBal <= 0}
                      onClick={() => applySelectedDiscount(d)}
                      title={expired ? "Expired" : "Apply"}
                    >
                      Apply
                    </button>
                  </div>
                );
              })}

              {!discountsLoading && topThreeDiscounts.length === 0 && (
                <div className="rc-empty">No discounts found.</div>
              )}
            </div>

            {/* Remaining in scroll */}
            {remainingDiscounts.length > 0 && (
              <>
                <div className="rc-more">More</div>
                <div className="rc-discount-scroll">
                  {remainingDiscounts.map((d) => {
                    const expired = Boolean(d.__expired) || String(d.status || "").toLowerCase() !== "active";
                    return (
                      <div className={`rc-discount-item ${expired ? "is-expired" : ""}`} key={d.id || d.code}>
                        <div className="rc-discount-main">
                          <div className="rc-discount-title">{d.title || d.code || "Discount"}</div>
                          <div className="rc-discount-sub">
                            <span className={`rc-badge ${expired ? "rc-badge-expired" : "rc-badge-active"}`}>
                              {expired ? "Expired" : "Active"}
                            </span>
                            <span className="rc-discount-code">{String(d.code || "").toUpperCase()}</span>
                          </div>
                        </div>

                        <button
                          className="rc-apply-btn"
                          disabled={expired || invBal <= 0}
                          onClick={() => applySelectedDiscount(d)}
                          title={expired ? "Expired" : "Apply"}
                        >
                          Apply
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="rc-row">
              <div className="rc-label">Scan Barcode/Type Number</div>
              <input
                type="text"
                className="rc-input"
                value={noteNo}
                onChange={(e) => setNoteNo(e.target.value)}
                onBlur={() => lookup(noteNo)}
                onKeyDown={(e) => { if (e.key === "Enter") lookup(noteNo); }}
                placeholder={placeholderText}
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
                  <div className="rc-k">
                    {mode === "coupon" ? "Coupon Date" : mode === "discount" ? "Discount Start Date" : "Credit Note Date"}
                  </div>
                  <div className="rc-v">{formatDate()}</div>
                </div>

                {mode === "discount" ? (
                  <>
                    <div className="rc-line">
                      <div className="rc-k">Discount Value</div>
                      <div className="rc-v">
                        {String(data?.value_type).toUpperCase() === "PERCENT"
                          ? `${Number(data?.value || 0).toFixed(2)}%`
                          : `₹${formatAmt(data?.value || 0)}`}
                      </div>
                    </div>
                    <div className="rc-line">
                      <div className="rc-k">Apply Discount</div>
                      <div className="rc-v">
                        <input className="rc-amt" type="number" value={applyAmount} readOnly />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
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
              </>
            )}

            <button
              className="rc-cta"
              disabled={loading || !data || err || unavailable || applyAmount <= 0}
              onClick={() => {
                if (mode === "discount") {
                  onApply?.({
                    mode: "discount",
                    noteNo: "",
                    amount: applyAmount,
                    code: data?.code || noteNo,
                  });
                } else if (mode === "coupon") {
                  onApply?.({
                    mode: "coupon",
                    noteNo: "",
                    amount: applyAmount,
                    code: data?.code || noteNo,
                  });
                } else {
                  onApply?.({ mode: "credit", noteNo: data?.note_no || noteNo, amount: applyAmount });
                }
              }}
            >
              {ctaText}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
