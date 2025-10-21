// src/components/PosFooter.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/Footer.css";
import CardDetail from "./CardDetail";
import CashPayment from "./CashPayment";
import { useNavigate } from "react-router-dom";
import RedeemCreditModal from "./RedeemCreditModal";

export default function PosFooter({ totalQty = 0, amount = 0, onAction }) {
  const navigate = useNavigate();

  // ---------- Toast state ----------
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const idRef = useRef(0);

  // Modals
  const [showCard, setShowCard] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);

  // ---------- Discount controls ----------
  const [flatDisc, setFlatDisc] = useState("0.00"); // user input
  const [isPercent, setIsPercent] = useState(true); // % vs ₹

  // ---------- Beep ----------
  const beep = useCallback(() => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    o.start(); o.stop(ctx.currentTime + 0.2);
  }, []);

  // ---------- Toast helpers ----------
  const addToast = useCallback((text) => {
    const id = ++idRef.current;
    setToasts(prev => [{ id, text }, ...prev].slice(0, 3));
    timersRef.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timersRef.current[id];
    }, 1800);
  }, []);

  const triggerEmptyCartWarning = useCallback(() => {
    beep();
    addToast("Add minimum 1 product.");
  }, [beep, addToast]);

  // clear timers on unmount
  useEffect(() => () => {
    Object.values(timersRef.current).forEach(clearTimeout);
  }, []);

  // ---------- Actions ----------
  const actions = useMemo(() => ([
    "Multiple Pay(F12)","Redeem Credit","Hold (F6)","UPI (F5)",
    "Card (F3)","Cash (F4)","Apply Coupon","Pay Later (F11)",
    "Hold & Print (F7)","UPI & Print (F10)","Card & Print (F9)","Cash & Print (F8)"
  ]), []);

  const handleActionClick = useCallback((label) => {
    // if (totalQty <= 0) { triggerEmptyCartWarning(); return; }

    if (label.includes("Multiple Pay")) { navigate("/multiple-pay"); return; }
    if (label === "Card (F5)" || label === "Card (F3)") { setShowCard(true); return; }
    if (label === "Cash (F4)") { setShowCash(true); return; }
    if (label === "Redeem Credit") { setShowRedeem(true); return; }

    if (typeof onAction === "function") onAction(label);
    else console.log("Action:", label);
  }, [navigate, totalQty, triggerEmptyCartWarning, onAction]);

  // ---------- Amount math (WHOLE NUMBER) ----------
  const baseAmount = Number(amount) || 0;
  const flatDiscNumRaw = Math.max(0, Number(flatDisc) || 0);
  const discountAmt = isPercent ? (baseAmount * flatDiscNumRaw) / 100 : flatDiscNumRaw;
  const discountCapped = Math.min(baseAmount, discountAmt);
  const payableAmount = Math.max(0, Math.round(baseAmount - discountCapped));

  return (
    <>
      <footer className="pos-footer">
        <div className="totals">
          <div className="metric">
            <div className="value">{Number(totalQty).toFixed(3)}</div>
            <div className="label">Quantity</div>
          </div>

          <div className="metric">
            <div className="value">0.00</div>
            <div className="label">MRP</div>
          </div>

          <div className="metric">
            <div className="value">0.00</div>
            <div className="label">Tax Amount</div>
          </div>

          <div className="metric has-badge">
            <div className="value">0.00</div>
            <button type="button" className="badge">Add.Charges+</button>
            <div className="label">Discount</div>
          </div>

          <div className="metric compact">
            <button
              type="button"
              className={`percent${isPercent ? " active" : ""}`}
              aria-pressed={isPercent}
              onClick={() => setIsPercent(v => !v)}
              title={isPercent ? "Percent mode (click to switch to rupees)"
                               : "Rupee mode (click to switch to percent)"}
            >
              %
            </button>
            <input
              className="mini"
              placeholder={isPercent ? "0" : "0.00"}
              value={flatDisc}
              onChange={(e) => setFlatDisc(e.target.value)}
              inputMode="decimal"
            />
            <div className="label">Flat Discount</div>
          </div>

          <div className="metric compact">
            <input className="mini" placeholder="0.00" defaultValue="0.00" />
            <div className="label">Round OFF</div>
          </div>

          <div className="amount">
            <div className="amount-value">{Number(payableAmount).toLocaleString()}</div>
            <div className="label">Amount</div>
          </div>
        </div>

        <div className="pay-grid">
          {actions.map((text) => (
            <button key={text} className="kbtn" onClick={() => handleActionClick(text)}>
              {text.includes("Card") && <span className="material-icons">credit_card</span>}
              {text.includes("Cash") && <span className="material-icons">currency_rupee</span>}
              {text.includes("UPI") && <span className="material-icons">near_me</span>}
              {text.includes("Hold") && !text.includes("Multiple") && <span className="material-icons">pause_presentation</span>}
              {text.includes("Multiple") && <span className="material-icons">view_week</span>}
              {text.includes("Coupon") && <span className="material-icons">local_offer</span>}
              {text.includes("Pay Later") && <span className="material-icons">event</span>}
              {!/Card|Cash|UPI|Hold|Multiple|Coupon|Pay Later/.test(text) && (
                <span className="material-icons">smart_button</span>
              )}
              {text}
            </button>
          ))}
        </div>

        {toasts.length > 0 && (
          <div className="toast-stack" role="region" aria-live="assertive">
            {toasts.map(t => (
              <div key={t.id} className="toast-item toast-error" role="alert">
                <span className="icon" aria-hidden>❗</span>
                {t.text}
              </div>
            ))}
          </div>
        )}
      </footer>

      {showCard && (
        <CardDetail
          amount={payableAmount}
          onClose={() => setShowCard(false)}
          onSubmit={(details) => {
            onAction?.("Card (F5)", { method: "card", details });
            setShowCard(false);
          }}
        />
      )}

      {showCash && (
        <CashPayment
          amount={payableAmount}
          onClose={() => setShowCash(false)}
          onSubmit={(payload) => {
            onAction?.("Cash (F4)", payload);
            setShowCash(false);
          }}
        />
      )}

      {showRedeem && (
        <RedeemCreditModal
          invoiceBalance={payableAmount || 100}
          onClose={() => setShowRedeem(false)}
          onApply={(payload) => {
            onAction?.("Redeem Credit", payload);
            setShowRedeem(false);
          }}
        />
      )}
    </>
  );
}
