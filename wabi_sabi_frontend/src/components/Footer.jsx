import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/Footer.css";
import CardDetail from "./CardDetail";
import { createSale } from "../api/client";

/* ── Lightweight inline modals for CASH & UPI ─────────────────────────────── */
function CashModal({ amount = 0, onClose, onSubmit }) {
  const [cashAmount, setCashAmount] = useState(Number(amount || 0).toFixed(2));
  const [note, setNote] = useState("");

  useEffect(() => {
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${scrollY}px`;
    return () => {
      const top = document.body.style.top;
      document.body.classList.remove("modal-open");
      document.body.style.top = "";
      const y = Math.abs(parseInt(top || "0", 10)) || 0;
      window.scrollTo(0, y);
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    onSubmit?.({
      amount: parseFloat(cashAmount || 0),
      reference: note.trim(),
    });
  };

  return (
    <div
      className="cd-backdrop"
      data-backdrop
      onMouseDown={(e) => {
        if (e.target.dataset.backdrop) onClose?.();
      }}
    >
      <div
        className="cd-card"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cd-header">
          <h3>Cash Payment</h3>
          <button className="cd-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="cd-body" onSubmit={submit}>
          <label className="cd-field">
            <span>Cash Amount</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
          </label>
          <label className="cd-field">
            <span>Note (optional)</span>
            <input
              type="text"
              placeholder="e.g. ₹500 x 7 + ₹200 x 1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="cd-actions">
            <button type="submit" className="cd-primary">
              Finalize Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UpiModal({ amount = 0, onClose, onSubmit }) {
  const [upiAmount, setUpiAmount] = useState(Number(amount || 0).toFixed(2));
  const [txnId, setTxnId] = useState("");

  useEffect(() => {
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add("modal-open");
    document.body.style.top = `-${scrollY}px`;
    return () => {
      const top = document.body.style.top;
      document.body.classList.remove("modal-open");
      document.body.style.top = "";
      const y = Math.abs(parseInt(top || "0", 10)) || 0;
      window.scrollTo(0, y);
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    onSubmit?.({
      amount: parseFloat(upiAmount || 0),
      reference: txnId.trim(),
    });
  };

  return (
    <div
      className="cd-backdrop"
      data-backdrop
      onMouseDown={(e) => {
        if (e.target.dataset.backdrop) onClose?.();
      }}
    >
      <div
        className="cd-card"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cd-header">
          <h3>UPI Payment</h3>
          <button className="cd-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="cd-body" onSubmit={submit}>
          <label className="cd-field">
            <span>UPI Amount</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={upiAmount}
              onChange={(e) => setUpiAmount(e.target.value)}
            />
          </label>
          <label className="cd-field">
            <span>UPI Txn ID</span>
            <input
              type="text"
              placeholder="e.g. 2351AXYZ984"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
            />
          </label>
          <div className="cd-actions">
            <button type="submit" className="cd-primary">
              Finalize Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Footer ───────────────────────────────────────────────────────────────── */
export default function Footer({
  items = [],
  customer,                // <-- may be undefined; we’ll fall back to Card form
  totalQty = 0,
  amount = 0,
  onReset,
}) {
  // Toasts
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const idRef = useRef(0);

  // Modals
  const [showCard, setShowCard] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [showUpi, setShowUpi] = useState(false);

  // Discounts
  const [flatDisc, setFlatDisc] = useState("0.00");
  const [isPercent, setIsPercent] = useState(true);

  const addToast = useCallback((text) => {
    const id = ++idRef.current;
    setToasts((prev) => [{ id, text }, ...prev].slice(0, 3));
    timersRef.current[id] = setTimeout(() => {
      setToasts((prev2) => prev2.filter((t) => t.id !== id));
      delete timersRef.current[id];
    }, 2000);
  }, []);
  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    },
    []
  );

  // Totals
  const payableAmount = useMemo(() => {
    const baseAmount = Number(amount) || 0;
    const discRaw = Math.max(0, Number(flatDisc) || 0);
    const discAmt = isPercent ? (baseAmount * discRaw) / 100 : discRaw;
    const discCapped = Math.min(baseAmount, discAmt);
    return Math.max(0, Math.round(baseAmount - discCapped));
  }, [amount, flatDisc, isPercent]);

  // Build sale lines (robust to different cart row shapes)
  const buildLines = useCallback(() => {
    return (items || [])
      .map((r) => {
        const code =
          r.itemcode ??
          r.itemCode ??
          r.barcode ??
          r.code ??
          r.id ??
          "";
        const qtyNum = Number(
          r.qty ?? r.quantity ?? r.qtyOrdered ?? r.qty_ordered ?? 1
        );
        const qty = Number.isFinite(qtyNum) ? qtyNum : 1;
        return code ? { barcode: String(code), qty: qty > 0 ? qty : 1 } : null;
      })
      .filter(Boolean);
  }, [items]);

  // Core POST
  async function finalizeSale({ method, paymentDetails, multi = false, andPrint = false }) {
    try {
      const lines = buildLines();
      if (!lines.length) {
        addToast("Add minimum 1 product.");
        return;
      }

      // Prefer explicit customer prop; fall back to Card holder when paying by CARD
      const customerPayload = {
        name:
          (customer && customer.name) ||
          (method === "CARD" ? (paymentDetails?.cardHolder || "").trim() : "") ||
          "Guest",
        phone:
          (customer && customer.phone) ||
          (method === "CARD" ? (paymentDetails?.cardHolderPhone || "").trim() : "") ||
          "",
        email: (customer && customer.email) || "",
      };

      const payments = multi
        ? paymentDetails?.payments || []
        : [
            {
              method,
              amount: Number(payableAmount),
              reference:
                paymentDetails?.reference ||
                paymentDetails?.transactionNo ||
                "",
              card_holder: paymentDetails?.cardHolder || "",
              card_holder_phone: paymentDetails?.cardHolderPhone || "",
              customer_bank: paymentDetails?.customerBankName || "",
              account: paymentDetails?.paymentAccount || "",
            },
          ];

      const payload = {
        customer: customerPayload,
        lines,
        payments,
        store: "Wabi - Sabi",
        note: paymentDetails?.note || "",
      };

      const res = await createSale(payload);
      addToast(`Payment successful. Invoice: ${res?.invoice_no || "—"}`);

      if (andPrint) {
        // window.open(`/receipt/${res?.invoice_no}`, "_blank");
        window.print();
      }

      if (typeof onReset === "function") onReset(res);
      else window.location.reload();
    } catch (err) {
      console.error(err);
      addToast("Error: payment failed.");
    }
  }

  /* Full action list restored */
  const actions = useMemo(
    () => [
      "Multiple Pay (F12)",
      "Redeem Credit",
      "Hold (F6)",
      "UPI (F5)",
      "Card (F3)",
      "Cash (F4)",
      "Apply Coupon",
      "Pay Later (F11)",
      "Hold & Print (F7)",
      "UPI & Print (F10)",
      "Card & Print (F9)",
      "Cash & Print (F8)",
    ],
    []
  );

  const handleActionClick = useCallback(
    (label) => {
      // Payment actions
      if (label === "Card (F3)") {
        setShowCard(true);
        return;
      }
      if (label === "Cash (F4)") {
        setShowCash(true);
        return;
      }
      if (label === "UPI (F5)") {
        setShowUpi(true);
        return;
      }

      // Print variants
      if (label === "Card & Print (F9)") {
        setShowCard(true);
        window.__AND_PRINT__ = true;
        return;
      }
      if (label === "Cash & Print (F8)") {
        setShowCash(true);
        window.__AND_PRINT__ = true;
        return;
      }
      if (label === "UPI & Print (F10)") {
        setShowUpi(true);
        window.__AND_PRINT__ = true;
        return;
      }

      // Multiple pay demo (split 50/50)
      if (label.startsWith("Multiple Pay")) {
        const total = Number(payableAmount);
        if (!total) {
          addToast("Nothing to pay.");
          return;
        }
        const cash = Math.floor(total / 2);
        const card = total - cash;
        finalizeSale({
          multi: true,
          andPrint: false,
          paymentDetails: {
            payments: [
              { method: "CASH", amount: cash, reference: "Split cash" },
              { method: "CARD", amount: card, reference: "Split card" },
            ],
          },
        });
        return;
      }

      // Stubs for now
      if (label === "Redeem Credit") {
        addToast("Redeem Credit: coming soon");
        return;
      }
      if (label === "Apply Coupon") {
        addToast("Apply Coupon: coming soon");
        return;
      }
      if (label === "Hold (F6)") {
        addToast("Hold: coming soon");
        return;
      }
      if (label === "Pay Later (F11)") {
        addToast("Pay Later: coming soon");
        return;
      }
      if (label === "Hold & Print (F7)") {
        addToast("Hold & Print: coming soon");
        return;
      }
    },
    [payableAmount, buildLines, customer]
  );

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
            <button type="button" className="badge">
              Add.Charges+
            </button>
            <div className="label">Discount</div>
          </div>
          <div className="metric compact">
            <button
              type="button"
              className={`percent${isPercent ? " active" : ""}`}
              aria-pressed={isPercent}
              onClick={() => setIsPercent((v) => !v)}
              title={
                isPercent
                  ? "Percent mode (click to switch to rupees)"
                  : "Rupee mode (click to switch to percent)"
              }
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
            <div className="amount-value">
              {Number(payableAmount).toLocaleString()}
            </div>
            <div className="label">Amount</div>
          </div>
        </div>

        <div className="pay-grid">
          {actions.map((text) => (
            <button
              key={text}
              className="kbtn"
              onClick={() => handleActionClick(text)}
            >
              {text.includes("Card") && (
                <span className="material-icons">credit_card</span>
              )}
              {text.includes("Cash") && (
                <span className="material-icons">currency_rupee</span>
              )}
              {text.includes("UPI") && (
                <span className="material-icons">near_me</span>
              )}
              {text.includes("Hold") &&
                !text.includes("Multiple") && (
                  <span className="material-icons">
                    pause_presentation
                  </span>
                )}
              {text.includes("Multiple") && (
                <span className="material-icons">view_week</span>
              )}
              {text.includes("Coupon") && (
                <span className="material-icons">local_offer</span>
              )}
              {text.includes("Pay Later") && (
                <span className="material-icons">event</span>
              )}
              {text}
            </button>
          ))}
        </div>

        {toasts.length > 0 && (
          <div className="toast-stack" role="region" aria-live="assertive">
            {toasts.map((t) => (
              <div key={t.id} className="toast-item toast-error" role="alert">
                <span className="icon" aria-hidden>
                  ❗
                </span>{" "}
                {t.text}
              </div>
            ))}
          </div>
        )}
      </footer>

      {showCard && (
        <CardDetail
          amount={payableAmount}
          onClose={() => {
            setShowCard(false);
            window.__AND_PRINT__ = false;
          }}
          onSubmit={(details) => {
            const printFlag = !!window.__AND_PRINT__;
            window.__AND_PRINT__ = false;
            setShowCard(false);
            finalizeSale({
              method: "CARD",
              paymentDetails: details,
              andPrint: printFlag,
            });
          }}
        />
      )}

      {showCash && (
        <CashModal
          amount={payableAmount}
          onClose={() => {
            setShowCash(false);
            window.__AND_PRINT__ = false;
          }}
          onSubmit={(payload) => {
            const printFlag = !!window.__AND_PRINT__;
            window.__AND_PRINT__ = false;
            setShowCash(false);
            finalizeSale({
              method: "CASH",
              paymentDetails: payload,
              andPrint: printFlag,
            });
          }}
        />
      )}

      {showUpi && (
        <UpiModal
          amount={payableAmount}
          onClose={() => {
            setShowUpi(false);
            window.__AND_PRINT__ = false;
          }}
          onSubmit={(payload) => {
            const printFlag = !!window.__AND_PRINT__;
            window.__AND_PRINT__ = false;
            setShowUpi(false);
            finalizeSale({
              method: "UPI",
              paymentDetails: payload,
              andPrint: printFlag,
            });
          }}
        />
      )}
    </>
  );
}
