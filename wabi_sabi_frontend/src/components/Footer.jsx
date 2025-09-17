// ...existing imports
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/Footer.css";
import CardDetail from "./CardDetail";
import CashPayment from "./CashPayment";
import { useNavigate } from "react-router-dom";
import RedeemCreditModal from "./RedeemCreditModal";   // ✅ NEW

export default function PosFooter({ totalQty = 0, amount = 0, onAction }) {
  // ---------- Toast state ----------
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const idRef = useRef(0);

  // Modals
  const [showCard, setShowCard] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);   // ✅ NEW

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

    if (label.includes("Multiple Pay")) {
      navigate("/multiple-pay");
      return;
    }

    if (label === "Card (F5)" || label === "Card (F3)") {
      setShowCard(true);
      return;
    }

    if (label === "Cash (F4)") {
      setShowCash(true);
      return;
    }

    if (label === "Redeem Credit") {     // ✅ NEW
      setShowRedeem(true);
      return;
    }

    if (typeof onAction === "function") onAction(label);
    else console.log("Action:", label);
  }, [navigate, totalQty, triggerEmptyCartWarning, onAction]);

  return (
    <>
      {/* ====== FOOTER (same as your original) ====== */}
      <footer className="pos-footer">
        {/* Totals / inputs row */}
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
            <button type="button" className="percent">%</button>
            <input className="mini" placeholder="0.00" defaultValue="0.00" />
            <div className="label">Flat Discount</div>
          </div>

          <div className="metric compact">
            <input className="mini" placeholder="0.00" defaultValue="0.00" />
            <div className="label">Round OFF</div>
          </div>

          <div className="amount">
            <div className="amount-value">{Number(amount).toLocaleString()}</div>
            <div className="label">Amount</div>
          </div>
        </div>

        {/* Buttons grid */}
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

        {/* Toast stack */}
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

      {/* ===== Modals ===== */}

      {/* Card Detail */}
      {showCard && (
        <CardDetail
          amount={amount}
          onClose={() => setShowCard(false)}
          onSubmit={(details) => {
            onAction?.("Card (F5)", { method: "card", details });
            setShowCard(false);
          }}
        />
      )}

      {/* Cash Payment */}
      {showCash && (
        <CashPayment
          amount={amount}
          onClose={() => setShowCash(false)}
          onSubmit={(payload) => {
            onAction?.("Cash (F4)", payload);
            setShowCash(false);
          }}
        />
      )}

      {/* ✅ Redeem Credit */}
      {showRedeem && (
        <RedeemCreditModal
          invoiceBalance={amount || 100}
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
