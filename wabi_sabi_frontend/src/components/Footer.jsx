import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/Footer.css";
import CardDetail from "./CardDetail";
import {
  createSale,
  createSalesReturn,
  redeemCreditNote,
  redeemCoupon,            // ← mark coupon redeemed after sale
  getSelectedCustomer,
  clearSelectedCustomer,
} from "../api/client";
import { useNavigate } from "react-router-dom";
import CashPayment from "./CashPayment";
import RedeemCreditModal from "./RedeemCreditModal";

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

export default function Footer({
  items = [],
  customer,
  totalQty = 0,
  amount = 0,          // cart total BEFORE coupon/credit
  onReset,
}) {
  const navigate = useNavigate();

  // Toasts
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const idRef = useRef(0);
  const addToast = useCallback((text) => {
    const id = ++idRef.current;
    setToasts((prev) => [{ id, text }, ...prev].slice(0, 3));
    timersRef.current[id] = setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
      delete timersRef.current[id];
    }, 2000);
  }, []);
  useEffect(() => () => Object.values(timersRef.current).forEach(clearTimeout), []);

  // Modals
  const [showCard, setShowCard] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [showUpi, setShowUpi] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemMode, setRedeemMode] = useState("credit"); // "credit" | "coupon"

  // Discount UI (applied BEFORE coupon/credit)
  const [flatDisc, setFlatDisc] = useState("0.00");
  const [isPercent, setIsPercent] = useState(true);

  // Coupon usage (treat like extra discount)
  // shape: { code, amount }
  const [couponUse, setCouponUse] = useState(null);

  // Credit usage (one note per sale)
  // shape: { noteNo, amount }
  const [creditUse, setCreditUse] = useState(null);

  // 🔔 CURRENT CUSTOMER (reactive to selection)
  const [currentCustomer, setCurrentCustomer] = useState(() => getSelectedCustomer());
  useEffect(() => {
    const handleCust = () => setCurrentCustomer(getSelectedCustomer());
    window.addEventListener("pos:customer", handleCust);
    window.addEventListener("pos:clear-customer", handleCust);
    window.addEventListener("storage", handleCust);
    return () => {
      window.removeEventListener("pos:customer", handleCust);
      window.removeEventListener("pos:clear-customer", handleCust);
      window.removeEventListener("storage", handleCust);
    };
  }, []);
  const canPay = !!(currentCustomer && (currentCustomer.name || currentCustomer.phone));

  // Base after manual flat discount
  const baseAfterFlat = useMemo(() => {
    const baseAmount = Number(amount) || 0;
    const discRaw = Math.max(0, Number(flatDisc) || 0);
    const discAmt = isPercent ? (baseAmount * discRaw) / 100 : discRaw;
    const discCapped = Math.min(baseAmount, discAmt);
    return Math.max(0, Math.round(baseAmount - discCapped));
  }, [amount, flatDisc, isPercent]);

  // Apply coupon like a discount (cap so it never exceeds baseAfterFlat)
  const afterCoupon = useMemo(() => {
    const c = Number(couponUse?.amount || 0);
    return Math.max(0, Math.round(baseAfterFlat - Math.max(0, Math.min(c, baseAfterFlat))));
  }, [baseAfterFlat, couponUse]);

  // Payable BEFORE credit
  const payableAmount = afterCoupon;

  // Remaining after applying credit note (never negative)
  const remainingAfterCredit = useMemo(() => {
    const credit = Number(creditUse?.amount || 0);
    return Math.max(0, Math.round(payableAmount - credit));
  }, [payableAmount, creditUse]);

  // Cart lines builder
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

  // Resolve customer: prefer prop, else session (legacy)
  const effectiveCustomer = (customer && (customer.name || customer.phone)) ? customer : currentCustomer;

  // Finalize: include COUPON + CREDIT row (if any) + chosen payment method row
  async function finalizeSale({ method, paymentDetails, andPrint = false }) {
    try {
      const lines = buildLines();
      if (!lines.length) {
        addToast("Add minimum 1 product.");
        return;
      }

      // Grand total before credit (after discounts + coupon)
      const grandTotal = Number(payableAmount) || 0;

      // Treat coupon as a payment row so backend sum matches
      const couponRow =
        couponUse && Number(couponUse.amount) > 0
          ? [{ method: "COUPON", amount: Number(couponUse.amount), reference: couponUse.code || "" }]
          : [];

      const creditRow =
        creditUse && Number(creditUse.amount) > 0
          ? [{ method: "CREDIT", amount: Number(creditUse.amount), reference: creditUse.noteNo }]
          : [];

      const payRow = {
        method,
        amount: Number(remainingAfterCredit),
        reference:
          paymentDetails?.reference ||
          paymentDetails?.transactionNo ||
          paymentDetails?.cashReference ||
          "",
        card_holder: paymentDetails?.cardHolder || "",
        card_holder_phone: paymentDetails?.cardHolderPhone || "",
        customer_bank: paymentDetails?.customerBankName || "",
        account: paymentDetails?.paymentAccount || "",
      };

      // If nothing remains after coupon/credit, don't send a zero row
      const payments = [
        ...couponRow,
        ...creditRow,
        ...(Number(remainingAfterCredit) > 0 ? [payRow] : []),
      ];

      const customerPayload = {
        name:
          (effectiveCustomer && effectiveCustomer.name) ||
          (method === "CARD" ? (paymentDetails?.cardHolder || "").trim() : "") ||
          "Guest",
        phone:
          (effectiveCustomer && effectiveCustomer.phone) ||
          (method === "CARD" ? (paymentDetails?.cardHolderPhone || "").trim() : "") ||
          "",
        email: (effectiveCustomer && effectiveCustomer.email) || "",
      };

      const payload = {
        customer: customerPayload,
        lines,
        payments,
        store: "Wabi - Sabi",
        note: paymentDetails?.note || "",
        // you can also attach { coupon: couponUse } here if backend wants it
      };

      const res = await createSale(payload);
      addToast(`Payment successful. Invoice: ${res?.invoice_no || "—"}`);

      // Mark credit note redeemed so it can't be reused
      if (creditUse?.noteNo && creditUse.amount > 0 && res?.invoice_no) {
        try {
          await redeemCreditNote(creditUse.noteNo, {
            invoice_no: res.invoice_no,
            amount: creditUse.amount,
          });
        } catch (e) {
          console.warn("Failed to mark credit redeemed:", e);
        }
      }

      // Mark coupon redeemed (link it with invoice & customer)
      if (couponUse?.code && couponUse.amount > 0 && res?.invoice_no) {
        try {
          await redeemCoupon(couponUse.code, {
            invoice_no: res.invoice_no,
            customer: {
              id: effectiveCustomer?.id || null,
              name: effectiveCustomer?.name || "",
              phone: effectiveCustomer?.phone || "",
              email: effectiveCustomer?.email || "",
            },
          });
        } catch (e) {
          console.warn("Failed to mark coupon redeemed:", e);
        }
      }

      if (andPrint) window.print();

      // end POS session so next bill requires picking customer again
      clearSelectedCustomer();

      if (typeof onReset === "function") onReset(res);
      else window.location.reload();
    } catch (err) {
      console.error(err);
      addToast("Error: payment failed.");
    }
  }

  // Return-mode actions
  const returnMode = !!window.__RETURN_MODE__;
  const actions = useMemo(
    () =>
      returnMode
        ? ["Refund", "Sales Return"]
        : [
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
    [returnMode]
  );

  const handleActionClick = useCallback(
    (label) => {
      // ⛔ Block payments until a customer is selected
      const isPaymentAction =
        label.includes("Card") ||
        label.includes("Cash") ||
        label.includes("UPI") ||
        label.startsWith("Multiple Pay") ||
        label === "Redeem Credit";

      if (isPaymentAction && !canPay) {
        addToast("Select the customer first");
        return;
      }

      // Return-mode
      if (label === "Refund") {
        addToast("Refund: coming soon");
        return;
      }
      if (label === "Sales Return") {
        const inv = window.__RETURN_INVOICE__;
        if (!inv) {
          addToast("No invoice loaded.");
          return;
        }
        (async () => {
          try {
            const res = await createSalesReturn(inv);
            const ok = !!res?.ok;
            const msg = res?.msg || (ok ? "Credit note created." : "Failed to create credit note.");
            addToast(msg);
            if (ok && Array.isArray(res?.notes) && res.notes.length) {
              alert(`Credit Note(s): ${res.notes.join(", ")}`);
            }
            setTimeout(() => window.location.reload(), 600);
          } catch (e) {
            console.error(e);
            addToast("Error: credit note not created.");
          }
        })();
        return;
      }

      // Payments
      if (label === "Card (F3)") {
        setShowCard(true);
        return;
      }
      if (label === "Cash (F4)") {
        setShowCash(true);
        window.__AND_PRINT__ = false;
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

      // Multiple Pay
      if (label.startsWith("Multiple Pay")) {
        const cartItems = (items || []).map((r, i) => {
          const qty =
            Number(r.qty ?? r.quantity ?? r.qtyOrdered ?? r.qty_ordered ?? 1) || 1;

          const unit =
            Number(
              r.sellingPrice ??
                r.unitPrice ??
                r.unit_price ??
                r.price ??
                r.sp ??
                r.mrp
            ) ||
            (Number(r.netAmount ?? r.amount ?? 0) / qty) ||
            0;

          return {
            id: r.id ?? i + 1,
            name:
              r.product ||
              r.name ||
              r.vasyName ||
              r.item_print_friendly_name ||
              r.item_vasy_name ||
              r.item_full_name ||
              r.title ||
              r.barcode ||
              "Item",
            qty,
            price: +unit.toFixed(2),
            netAmount: Number(r.netAmount ?? r.amount ?? qty * unit),
            tax: Number(r.tax ?? r.taxAmount ?? 0),
            barcode: r.barcode ?? r.itemCode ?? r.itemcode ?? r.code ?? "",
          };
        });

        // 🔧 PASS FULL CUSTOMER INCLUDING ID
        navigate("/multiple-pay", {
          state: {
            cart: {
              customerType: (effectiveCustomer?.name || "Walk In Customer"),
              items: cartItems,
              roundoff: 0,
              amount: Number(remainingAfterCredit), // remaining after credit
            },
            customer: {
              id: effectiveCustomer?.id || null,
              name: effectiveCustomer?.name || "",
              phone: effectiveCustomer?.phone || "",
              email: effectiveCustomer?.email || "",
            },
            andPrint: false,
          },
        });
        return;
      }

      // Redeem Credit (credit note path)
      if (label === "Redeem Credit") {
        if (creditUse?.noteNo) {
          addToast("A credit note is already applied.");
          return;
        }
        setRedeemMode("credit");
        setShowRedeem(true);
        return;
      }

      // Apply Coupon (coupon path)
      if (label === "Apply Coupon") {
        if (couponUse?.code) {
          addToast("A coupon is already applied.");
          return;
        }
        setRedeemMode("coupon");
        setShowRedeem(true);
        return;
      }

      // Stubs
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
    [navigate, items, effectiveCustomer, remainingAfterCredit, creditUse, couponUse, canPay]
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

          {/* Amount now shows remaining after credit; shows coupon & credit badges for clarity */}
          <div className="amount">
            <div className="amount-value">
              {Number(remainingAfterCredit).toLocaleString()}
            </div>
            <div className="label">
              Amount
              {couponUse?.amount ? ` (after ₹${Number(couponUse.amount).toFixed(2)} coupon` : ""}
              {creditUse?.amount
                ? `${couponUse?.amount ? " & " : " (after "}₹${Number(creditUse.amount).toFixed(2)} credit`
                : ""}
              {(couponUse?.amount || creditUse?.amount) ? ")" : ""}
            </div>
          </div>
        </div>

        <div className="pay-grid">
          {actions.map((text) => {
            const isPaymentBtn =
              text.includes("Card") ||
              text.includes("Cash") ||
              text.includes("UPI") ||
              text.startsWith("Multiple Pay") ||
              text === "Redeem Credit";

            return (
              <button
                key={text}
                className="kbtn"
                onClick={() => handleActionClick(text)}
                disabled={isPaymentBtn && !canPay}
                title={isPaymentBtn && !canPay ? "Select the customer first" : ""}
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
                    <span className="material-icons">pause_presentation</span>
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
            );
          })}
        </div>

        {toasts.length > 0 && (
          <div className="toast-stack" role="region" aria-live="assertive">
            {toasts.map((t) => (
              <div key={t.id} className="toast-item toast-error" role="alert">
                <span className="icon" aria-hidden>❗</span> {t.text}
              </div>
            ))}
          </div>
        )}
      </footer>

      {/* Card */}
      {showCard && (
        <CardDetail
          amount={remainingAfterCredit}
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

      {/* Redeem Credit / Apply Coupon (same modal; initialMode controls tab) */}
      {showRedeem && (
        <RedeemCreditModal
          initialMode={redeemMode}
          invoiceBalance={redeemMode === "credit" ? payableAmount : baseAfterFlat}
          onClose={() => setShowRedeem(false)}
          onApply={({ mode, noteNo, amount, code }) => {
            if (mode === "credit") {
              if (!noteNo || !amount) {
                addToast("No credit used");
                setShowRedeem(false);
                return;
              }
              setCreditUse({ noteNo, amount: Number(amount) });
              addToast(`Credit applied: ₹${Number(amount).toFixed(2)}`);
            } else {
              if (!code || !amount) {
                addToast("No coupon used");
                setShowRedeem(false);
                return;
              }
              setCouponUse({ code, amount: Number(amount) });
              addToast(`Coupon applied: ₹${Number(amount).toFixed(2)}`);
            }
            setShowRedeem(false);
          }}
        />
      )}

      {/* Cash */}
      {showCash && (
        <CashPayment
          amount={remainingAfterCredit}
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
              paymentDetails: {
                cashReference: `Tendered:${Number(payload?.tendered || 0).toFixed(2)}|Change:${Number(payload?.change || 0).toFixed(2)}`,
              },
              andPrint: printFlag,
            });
          }}
        />
      )}

      {/* UPI */}
      {showUpi && (
        <UpiModal
          amount={remainingAfterCredit}
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
