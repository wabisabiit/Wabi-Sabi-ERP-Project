// src/components/Footer.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "../styles/Footer.css";
import CardDetail from "./CardDetail";
import {
  createSale,
  createSalesReturn,
  redeemCreditNote,
  redeemCoupon,
  getSelectedCustomer,
  clearSelectedCustomer,
  createHoldBill,
} from "../api/client";
import { useNavigate } from "react-router-dom";
import CashPayment from "./CashPayment";
import RedeemCreditModal from "./RedeemCreditModal";

function UpiModal({ amount = 0, onClose, onSubmit, busy = false }) {
  const [upiAmount, setUpiAmount] = useState(Number(amount || 0).toFixed(2));
  const [txnId, setTxnId] = useState("");

  useEffect(() => {
    const scrollY =
      window.scrollY || document.documentElement.scrollTop || 0;
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
    if (busy) return;
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
              disabled={busy}
            />
          </label>

          <label className="cd-field">
            <span>UPI Txn ID</span>
            <input
              type="text"
              placeholder="e.g. 2351AXYZ984"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              disabled={busy}
            />
          </label>

          <div className="cd-actions">
            <button type="submit" className="cd-primary" disabled={busy}>
              {busy && <span className="cd-spinner" aria-hidden="true" />}
              <span>{busy ? "Processing..." : "Finalize Payment"}</span>
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
  amount = 0,
  onReset,
}) {
  const navigate = useNavigate();

  // Toasts
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});
  const idRef = useRef(0);

  const addToast = useCallback((text, type = "error") => {
    const id = ++idRef.current;
    setToasts((prev) => [{ id, text, type }, ...prev].slice(0, 3));
    timersRef.current[id] = setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
      delete timersRef.current[id];
    }, 2000);
  }, []);

  useEffect(
    () => () => Object.values(timersRef.current).forEach(clearTimeout),
    []
  );

  // Modals
  const [showCard, setShowCard] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [showUpi, setShowUpi] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemMode, setRedeemMode] = useState("credit");

  // UPI-specific busy flag
  const [upiBusy, setUpiBusy] = useState(false);

  // Hold-bill busy flag
  const [holdBusy, setHoldBusy] = useState(false);

  // Discount UI
  const [flatDisc, setFlatDisc] = useState("0.00");
  const [isPercent, setIsPercent] = useState(true);

  // Coupon usage
  const [couponUse, setCouponUse] = useState(null);

  // Credit usage
  const [creditUse, setCreditUse] = useState(null);

  // Current customer
  const [currentCustomer, setCurrentCustomer] = useState(() =>
    getSelectedCustomer()
  );

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

  // 🔵 Current salesman (selected in header; required for payment)
  const [currentSalesman, setCurrentSalesman] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pos.currentSalesman") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handler = (e) => {
      if (e?.type === "storage") {
        try {
          setCurrentSalesman(
            JSON.parse(localStorage.getItem("pos.currentSalesman") || "null")
          );
        } catch {
          setCurrentSalesman(null);
        }
      } else if (e?.type === "pos:salesman") {
        setCurrentSalesman(e.detail || null);
      }
    };
    window.addEventListener("pos:salesman", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("pos:salesman", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  // ✅ Payment allowed only if customer AND salesman selected
  const canPay =
    !!(currentCustomer && (currentCustomer.name || currentCustomer.phone)) &&
    !!currentSalesman;

  // ✅ NEW: compute cart base amount from items (so footer updates on row discounts)
  const cartAmount = useMemo(() => {
    return (items || []).reduce((sum, r) => {
      const qty = Number(
        r.qty ?? r.quantity ?? r.qtyOrdered ?? r.qty_ordered ?? 1
      );
      const q = Number.isFinite(qty) && qty > 0 ? qty : 1;

      const unit = Number(
        r.sellingPrice ??
          r.unitPrice ??
          r.unit_price ??
          r.price ??
          r.sp ??
          r.netAmount ??
          0
      );
      const baseUnit = Number.isFinite(unit) ? unit : 0;

      // ₹ discount per unit
      const discRaw = Number(r.lineDiscountAmount ?? 0) || 0;
      const disc = Math.max(0, Math.min(baseUnit, discRaw));
      const netUnit = Math.max(0, baseUnit - disc);

      return sum + netUnit * q;
    }, 0);
  }, [items]);

  // Base after manual flat discount (NO integer rounding)
  const baseAfterFlat = useMemo(() => {
    const baseAmount = Number(cartAmount || 0);
    const discRaw = Math.max(0, Number(flatDisc) || 0);
    const discAmt = isPercent ? (baseAmount * discRaw) / 100 : discRaw;
    const discCapped = Math.min(baseAmount, discAmt);
    return Math.max(0, +(baseAmount - discCapped).toFixed(2));
  }, [cartAmount, flatDisc, isPercent]);

  // Apply coupon (NO integer rounding)
  const afterCoupon = useMemo(() => {
    const c = Number(couponUse?.amount || 0);
    return Math.max(
      0,
      +(baseAfterFlat - Math.max(0, Math.min(c, baseAfterFlat))).toFixed(2)
    );
  }, [baseAfterFlat, couponUse]);

  const payableAmount = afterCoupon;

  // Remaining after credit (NO integer rounding)
  const remainingAfterCredit = useMemo(() => {
    const credit = Number(creditUse?.amount || 0);
    return Math.max(0, +(payableAmount - credit).toFixed(2));
  }, [payableAmount, creditUse]);

  // Cart lines builder
  const buildLines = useCallback(() => {
    return (items || [])
      .map((r) => {
        const code = r.itemcode ?? r.itemCode ?? r.barcode ?? r.code ?? r.id ?? "";
        const qtyNum = Number(
          r.qty ?? r.quantity ?? r.qtyOrdered ?? r.qty_ordered ?? 1
        );
        const qty = Number.isFinite(qtyNum) ? qtyNum : 1;
        return code ? { barcode: String(code), qty: qty > 0 ? qty : 1 } : null;
      })
      .filter(Boolean);
  }, [items]);

  const effectiveCustomer =
    customer && (customer.name || customer.phone) ? customer : currentCustomer;

  // Finalize sale
  async function finalizeSale({ method, paymentDetails, andPrint = false }) {
    try {
      const lines = buildLines();
      if (!lines.length) {
        addToast("Add minimum 1 product.");
        return;
      }

      const couponRow =
        couponUse && Number(couponUse.amount) > 0
          ? [
              {
                method: "COUPON",
                amount: Number(couponUse.amount),
                reference: couponUse.code || "",
              },
            ]
          : [];

      const creditRow =
        creditUse && Number(creditUse.amount) > 0
          ? [
              {
                method: "CREDIT",
                amount: Number(creditUse.amount),
                reference: creditUse.noteNo,
              },
            ]
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
          (method === "CARD"
            ? (paymentDetails?.cardHolderPhone || "").trim()
            : "") ||
          "",
        email: (effectiveCustomer && effectiveCustomer.email) || "",
      };

      // ✅ attach per-line ₹ discounts (per unit * qty sent as discount_amount)
            // ✅ attach per-line ₹ discounts (per unit * qty sent as discount_amount)
      // inside Footer.jsx -> linesWithDiscount mapping
const linesWithDiscount = lines.map((ln) => {
  const row = (items || []).find((r) => {
    const code =
      r.itemcode ?? r.itemCode ?? r.barcode ?? r.code ?? r.id ?? "";
    return String(code) === String(ln.barcode);
  });

  const qty = Number(ln.qty || 1) || 1;

  const unit = Number(
    row?.sellingPrice ??
      row?.unitPrice ??
      row?.unit_price ??
      row?.price ??
      row?.sp ??
      row?.netAmount ??
      0
  );
  const baseUnit = Number.isFinite(unit) ? unit : 0;

  // ₹ discount per unit (this is what your CartTable uses)
  const discRaw = Number(row?.lineDiscountAmount ?? 0) || 0;
  const discPerUnit = Math.max(0, Math.min(baseUnit, discRaw));

  return {
    ...ln,
    discount_percent: 0,
    discount_amount: +discPerUnit.toFixed(2), // ✅ SEND PER UNIT (NOT total)
  };
});



      const payload = {
        customer: customerPayload,
        lines: linesWithDiscount,
        payments,
        store: "Wabi - Sabi",
        note: paymentDetails?.note || "",
        salesman_id: currentSalesman?.id || null,

        // bill discount
        bill_discount_value: Number(flatDisc || 0) || 0,
        bill_discount_is_percent: !!isPercent,
      };

      const res = await createSale(payload);

      addToast(
        `Payment successful. Invoice: ${res?.invoice_no || "—"}`,
        "success"
      );

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

      clearSelectedCustomer();
      if (typeof onReset === "function") onReset(res);
      else window.location.reload();
    } catch (err) {
      console.error(err);
      addToast("Error: payment failed.");
    }
  }

  // Save bill on hold
  const saveHoldBill = useCallback(
    async (andPrint = false) => {
      setHoldBusy(true);
      try {
        const lines = buildLines();
        if (!lines.length) {
          addToast("Add minimum 1 product.");
          setHoldBusy(false);
          return;
        }

        const customerPayload = {
          name: (effectiveCustomer && effectiveCustomer.name) || "Walk In Customer",
          phone: (effectiveCustomer && effectiveCustomer.phone) || "",
          email: (effectiveCustomer && effectiveCustomer.email) || "",
        };

        const payload = { customer: customerPayload, lines };
        const res = await createHoldBill(payload);

        if (!res || res.ok === false) {
          addToast(res?.message || "Hold bill not saved.");
          setHoldBusy(false);
          return;
        }

        addToast(res.message || `Bill saved on hold as ${res.number}.`, "success");

        if (andPrint) window.print();

        clearSelectedCustomer();
        if (typeof onReset === "function") {
          onReset({ type: "HOLD", number: res.number });
        } else {
          window.location.reload();
        }
      } catch (err) {
        console.error(err);
        addToast("Error: hold bill not saved.");
      } finally {
        setHoldBusy(false);
      }
    },
    [buildLines, effectiveCustomer, onReset, addToast]
  );

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
      const isPaymentAction =
        label.includes("Card") ||
        label.includes("Cash") ||
        label.includes("UPI") ||
        label.startsWith("Multiple Pay") ||
        label === "Redeem Credit";

      if (isPaymentAction && !canPay) {
        addToast("Select the customer and salesman first");
        return;
      }

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
            const msg =
              res?.msg ||
              (ok ? "Credit note created." : "Failed to create credit note.");
            addToast(msg, ok ? "success" : "error");
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

      if (label.startsWith("Multiple Pay")) {
        const cartItems = (items || []).map((r, i) => {
          const qty =
            Number(r.qty ?? r.quantity ?? r.qtyOrdered ?? r.qty_ordered ?? 1) ||
            1;

          const unit =
            Number(
              r.sellingPrice ??
                r.unitPrice ??
                r.unit_price ??
                r.price ??
                r.sp ??
                r.mrp
            ) ||
            Number(r.netAmount ?? r.amount ?? 0) / qty ||
            0;

          // ✅ NEW: compute discounted amounts for multipay screen + backend
          const baseUnit = Number.isFinite(unit) ? unit : 0;
          const discRaw = Number(r.lineDiscountAmount ?? 0) || 0;
          const discPerUnit = Math.max(0, Math.min(baseUnit, discRaw));
          const netUnit = Math.max(0, baseUnit - discPerUnit);

          const lineNet = +(netUnit * qty).toFixed(2);
          const totalDisc = +(discPerUnit * qty).toFixed(2);

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
            price: +baseUnit.toFixed(2),

            // ✅ NEW: pass discounted values
            priceAfterDiscount: +netUnit.toFixed(2),
            netAmount: lineNet,
            discount_amount: totalDisc,

            tax: Number(r.tax ?? r.taxAmount ?? 0),
            barcode: r.barcode ?? r.itemCode ?? r.itemcode ?? r.code ?? "",
          };
        });

        navigate("/multiple-pay", {
          state: {
            cart: {
              customerType: effectiveCustomer?.name || "Walk In Customer",
              items: cartItems,
              roundoff: 0,
              amount: Number(remainingAfterCredit),
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

      if (label === "Redeem Credit") {
        if (creditUse?.noteNo) {
          addToast("A credit note is already applied.");
          return;
        }
        setRedeemMode("credit");
        setShowRedeem(true);
        return;
      }

      if (label === "Apply Coupon") {
        if (couponUse?.code) {
          addToast("A coupon is already applied.");
          return;
        }
        setRedeemMode("coupon");
        setShowRedeem(true);
        return;
      }

      if (label === "Hold (F6)") {
        if (holdBusy) return;
        saveHoldBill(false);
        return;
      }
      if (label === "Hold & Print (F7)") {
        if (holdBusy) return;
        saveHoldBill(true);
        return;
      }

      if (label === "Pay Later (F11)") {
        addToast("Pay Later: coming soon");
        return;
      }
    },
    [
      navigate,
      items,
      effectiveCustomer,
      remainingAfterCredit,
      creditUse,
      couponUse,
      canPay,
      addToast,
      saveHoldBill,
      holdBusy,
    ]
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
              {Number(remainingAfterCredit).toLocaleString()}
            </div>
            <div className="label">
              Amount{" "}
              {couponUse?.amount
                ? `(after ₹${Number(couponUse.amount).toFixed(2)} coupon`
                : ""}
              {creditUse?.amount
                ? `${couponUse?.amount ? " & " : " (after "}₹${Number(
                    creditUse.amount
                  ).toFixed(2)} credit`
                : ""}
              {couponUse?.amount || creditUse?.amount ? ")" : ""}
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
            const isHoldBtn = text === "Hold (F6)" || text === "Hold & Print (F7)";

            return (
              <button
                key={text}
                className="kbtn"
                onClick={() => handleActionClick(text)}
                disabled={(isPaymentBtn && !canPay) || (isHoldBtn && holdBusy)}
                title={isPaymentBtn && !canPay ? "Select the customer and salesman first" : ""}
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
                {text.includes("Hold") && !text.includes("Multiple") && (
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
                {isHoldBtn && holdBusy && (
                  <span
                    className="cd-spinner"
                    style={{ marginLeft: 6 }}
                    aria-hidden="true"
                  />
                )}
                {text}
              </button>
            );
          })}
        </div>

        {toasts.length > 0 && (
          <div className="toast-stack" role="region" aria-live="assertive">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`toast-item ${
                  t.type === "success" ? "toast-success" : "toast-error"
                }`}
                role="alert"
              >
                <span className="icon" aria-hidden>
                  {t.type === "success" ? "✅" : "❗"}
                </span>{" "}
                {t.text}
              </div>
            ))}
          </div>
        )}
      </footer>

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
              addToast(`Credit applied: ₹${Number(amount).toFixed(2)}`, "success");
            } else {
              if (!code || !amount) {
                addToast("No coupon used");
                setShowRedeem(false);
                return;
              }
              setCouponUse({ code, amount: Number(amount) });
              addToast(`Coupon applied: ₹${Number(amount).toFixed(2)}`, "success");
            }
            setShowRedeem(false);
          }}
        />
      )}

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
                cashReference: `Tendered:${Number(payload?.tendered || 0).toFixed(
                  2
                )}|Change:${Number(payload?.change || 0).toFixed(2)}`,
              },
              andPrint: printFlag,
            });
          }}
        />
      )}

      {showUpi && (
        <UpiModal
          amount={remainingAfterCredit}
          busy={upiBusy}
          onClose={() => {
            if (upiBusy) return;
            setShowUpi(false);
            window.__AND_PRINT__ = false;
          }}
          onSubmit={async (payload) => {
            const printFlag = !!window.__AND_PRINT__;
            window.__AND_PRINT__ = false;
            setUpiBusy(true);
            try {
              await finalizeSale({
                method: "UPI",
                paymentDetails: payload,
                andPrint: printFlag,
              });
              setShowUpi(false);
            } finally {
              setUpiBusy(false);
            }
          }}
        />
      )}
    </>
  );
}
