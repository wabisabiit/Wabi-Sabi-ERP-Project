// src/components/MultiplePay.jsx
import React, { useMemo, useState } from "react";
import "../styles/MultiplePay.css";
import { useLocation, useNavigate } from "react-router-dom";
import { createSale, getSelectedCustomer, clearSelectedCustomer } from "../api/client";

function n(v, fb = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fb;
}

function clamp(v, min, max) {
  const x = n(v, 0);
  return Math.max(min, Math.min(max, x));
}

export default function MultiplePay({
  cart: cartProp = {
    customerType: "Walk In Customer",
    items: [],
    roundoff: 0,
    amount: 0,
  },
  onBack,
  onProceed,
  redirectPath = "/new",
  successDelayMs = 1200,
}) {
  const { state } = useLocation();
  const navigate = useNavigate();

  // Prefer router state first, then prop
  const cart = state?.cart || cartProp;

  const customer =
    getSelectedCustomer() ||
    state?.customer || {
      name: cart.customerName || "",
      phone: "",
      email: "",
    };

  const banks = ["AXIS BANK UDYOG VIHAR", "SBI", "HDFC", "Punjab National Bank"];
  const upiApps = ["Google Pay", "Paytm", "PhonePe", "Amazon Pay"];

  // ✅ Totals aligned with POS (sellingPrice - lineDiscountAmount) * qty
  const totals = useMemo(() => {
    const items = cart.items || [];

    const total = items.reduce((acc, it) => {
      const qty = n(it.qty ?? 1, 1) || 1;

      // unit base selling price
      const unit = n(
        it.sellingPrice ??
          it.sp ??
          it.selling_price ??
          it.unitCost ??
          it.unit_cost ??
          it.unitPrice ??
          it.unit_price ??
          it.price ??
          it.netAmount ??
          0,
        0
      );

      // discount ₹ PER UNIT (this is what POS uses)
      const discPerUnit = n(
        it.lineDiscountAmount ??
          it.line_discount_amount ??
          it.discountPerUnit ??
          it.discount_per_unit ??
          0,
        0
      );

      const disc = clamp(discPerUnit, 0, unit);
      const netUnit = Math.max(0, unit - disc);
      return acc + netUnit * qty;
    }, 0);

    const fixed = +total.toFixed(2);

    return {
      taxAmount: 0,
      total: fixed,
      roundoff: 0,
      payableAmount: fixed,
    };
  }, [cart]);

  // ===== Payment rows UI =====
  const [payments, setPayments] = useState([
    {
      id: 1,
      method: "Cash",
      channel: "Cash",
      account: "",
      amount: "",
      cardHolder: "",
      cardTxnNo: "",
    },
    {
      id: 2,
      method: "Card",
      channel: "Card",
      account: banks[0],
      amount: "",
      cardHolder: "",
      cardTxnNo: "",
    },
  ]);

  const totalReceived = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = +(totals.payableAmount - totalReceived).toFixed(2);
  const overpay = Math.max(0, -remaining);

  const addPayment = () => {
    const id = (payments.at(-1)?.id || 0) + 1;
    setPayments((p) => [
      ...p,
      {
        id,
        method: "Card",
        channel: "Card",
        account: banks[0],
        amount: "",
        cardHolder: "",
        cardTxnNo: "",
      },
    ]);
  };

  const removePayment = (id) =>
    setPayments((p) => (p.length > 1 ? p.filter((x) => x.id !== id) : p));

  const update = (id, patch) =>
    setPayments((p) => p.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  // ===== UX state =====
  const [banner, setBanner] = useState(null); // {type:'success'|'error', text}
  const [busy, setBusy] = useState(false);

  const showBanner = (type, text) => setBanner({ type, text });

  const handleProceed = async () => {
    if (busy) return;

    const hasCustomer = !!(customer?.id || customer?.phone || customer?.name);
    if (!hasCustomer) {
      showBanner("error", "Please select the customer first.");
      return;
    }

    // Must equal backend payable
    if (Math.round(totalReceived * 100) !== Math.round(totals.payableAmount * 100)) {
      showBanner("error", "Payments total must equal payable amount.");
      return;
    }

    // ✅ Build lines with correct TOTAL discount_amount per line
    const lines = (cart.items || [])
      .map((it) => {
        const code =
          it.barcode ??
          it.itemCode ??
          it.itemcode ??
          it.item_code ??
          it.code ??
          it.id ??
          "";

        const qty = n(it.qty ?? 1, 1) || 1;
        if (!code) return null;

        // per-unit discount from POS
        const discPerUnit = n(
          it.lineDiscountAmount ??
            it.line_discount_amount ??
            it.discountPerUnit ??
            it.discount_per_unit ??
            0,
          0
        );

        // sometimes other pages store total discount already
        const discTotalMaybe = n(
          it.discount_amount ??
            it.discountAmount ??
            it.line_discount_total ??
            NaN,
          NaN
        );

        // ✅ send TOTAL discount for the line
        const discount_amount = Number.isFinite(discTotalMaybe)
          ? +discTotalMaybe.toFixed(2)
          : +(Math.max(0, discPerUnit) * qty).toFixed(2);

        return {
          barcode: String(code),
          qty,
          discount_percent: 0,
          discount_amount,
        };
      })
      .filter(Boolean);

    if (!lines.length) {
      showBanner("error", "No items in cart.");
      return;
    }

    const pays = payments.map((p) => ({
      method: (p.method || "Cash").toUpperCase(),
      amount: +(parseFloat(p.amount) || 0).toFixed(2),
      reference: p.cardTxnNo || "",
      card_holder: p.cardHolder || "",
      card_holder_phone: p.cardHolderPhone || "",
      customer_bank: p.customerBankName || "",
      account: p.account || "",
    }));

    const payload = {
      customer: {
        name: customer?.name || cart.customerType || "Walk In Customer",
        phone: customer?.phone || "",
        email: customer?.email || "",
      },
      lines,
      payments: pays,
      store: "Wabi - Sabi",
      note: "",
    };

    // external hook
    try {
      const handled =
        typeof onProceed === "function" &&
        (await onProceed({
          customerType: cart.customerType,
          customerName: customer?.name || "",
          total: totals.total,
          taxAmount: totals.taxAmount,
          roundoff: totals.roundoff,
          payableAmount: totals.payableAmount,
          payments: payments.map((p) => ({
            ...p,
            amount: +(parseFloat(p.amount) || 0).toFixed(2),
          })),
          remaining: remaining > 0 ? remaining : 0,
          payload,
        }));

      if (handled === true) return;
    } catch (e) {
      console.warn("onProceed threw, continuing with local submit:", e);
    }

    try {
      setBusy(true);
      setBanner(null);

      const res = await createSale(payload);

      const firstRef =
        Array.isArray(res?.payments) && res.payments.length
          ? res.payments[0].reference || ""
          : pays[0]?.reference || "";

      const msg =
        `Payment successful. Invoice: ${res?.invoice_no || "—"}` +
        (firstRef ? ` | Txn: ${firstRef}` : "");

      showBanner("success", msg);
      clearSelectedCustomer();

      // ✅ FIX redirect glitch:
      // if redirectPath is the default "/new", go back to POS instead of triggering session-check/home redirect
      const target = redirectPath === "/new" ? -1 : redirectPath;

      setTimeout(() => {
        if (target === -1) {
          navigate(-1, { replace: true, state: { flash: { type: "success", text: msg } } });
        } else {
          navigate(target, { replace: true, state: { flash: { type: "success", text: msg } } });
        }
      }, successDelayMs);
    } catch (e) {
      console.error(e);

      let msg = "Payment failed: could not update the database. Please try again.";
      if (typeof e?.message === "string" && e.message) {
        const parts = e.message.split("–");
        if (parts[1]) {
          try {
            const j = JSON.parse(parts[1].trim());
            const serverMsg =
              j?.detail ||
              j?.non_field_errors?.[0] ||
              j?.payments?.[0] ||
              j?.lines?.[0] ||
              j?.error ||
              null;
            if (serverMsg) msg = String(serverMsg);
          } catch {
            msg = parts[1].trim();
          }
        }
      }
      showBanner("error", msg);
      setBusy(false);
    }
  };

  const listItems = cart.items || [];

  return (
    <div className="mp-layout">
      <header className="mp-topbar">
        <button className="mp-back" onClick={onBack || (() => navigate(-1))}>
          ⟵ Back to Sale
        </button>
        <div />
      </header>

      <div className="mp-body">
        {/* LEFT: summary */}
        <aside className="mp-left">
          <div className="mp-section-title">Sale Summary</div>
          <div className="mp-subtitle">
            Customer: <span className="mp-link">{cart.customerType || "Walk In Customer"}</span>
          </div>

          <div className="mp-table">
            <div className="mp-thead">
              <div className="c1">#</div>
              <div className="c2">Product</div>
              <div className="c3">Qty</div>
            </div>
            <div className="mp-tbody">
              {listItems.map((it, idx) => {
                const qty = n(it.qty ?? 1, 1) || 1;
                const name =
                  it.name ||
                  it.product ||
                  it.vasyName ||
                  it.item_print_friendly_name ||
                  it.item_vasy_name ||
                  it.item_full_name ||
                  it.barcode ||
                  "—";
                return (
                  <div key={it.id ?? idx} className="mp-row">
                    <div className="c1">{idx + 1}</div>
                    <div className="c2">{name}</div>
                    <div className="c3">{qty.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mp-totals">
            <div className="line">
              <span>Tax Amount</span>
              <span>{totals.taxAmount.toFixed(2)}</span>
            </div>
            <div className="line">
              <span>Total Amounts</span>
              <span>{totals.total.toFixed(2)}</span>
            </div>
            <div className="line">
              <span>Roundoff</span>
              <span>{(totals.roundoff || 0).toFixed(2)}</span>
            </div>
            <div className="payable">
              <div className="amt">{totals.payableAmount.toFixed(2)}</div>
              <div className="lbl">Payable Amount</div>
            </div>
          </div>
        </aside>

        {/* RIGHT: pay */}
        <main className="mp-right">
          <div className="mp-pay-header">
            <div className="mp-title">Pay</div>
            <div className="mp-total-input">
              <span className="rupee">₹</span>
              <input value={totals.payableAmount.toFixed(2)} readOnly className="readonly" />
            </div>
          </div>

          <div className="mp-payrows">
            {payments.map((row) => {
              const isCash = row.method === "Cash";
              const isCard = row.method === "Card";
              const isUpi = row.method === "UPI";

              return (
                <div key={row.id} className="mp-rowcard">
                  <div className="mp-rowgrid">
                    <div className="mp-field">
                      <label>Received Amount:</label>
                      <input
                        inputMode="decimal"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) => update(row.id, { amount: e.target.value })}
                        disabled={busy}
                      />
                    </div>

                    <div className="mp-field">
                      <label>Payment Method:</label>
                      <select
                        value={row.method}
                        onChange={(e) => {
                          const m = e.target.value;
                          update(row.id, {
                            method: m,
                            channel: m === "Cash" ? "Cash" : m,
                            account: m === "Card" ? banks[0] : m === "UPI" ? upiApps[0] : "",
                          });
                        }}
                        disabled={busy}
                      >
                        <option>Cash</option>
                        <option>Card</option>
                        <option>UPI</option>
                      </select>
                    </div>

                    {(isCard || isUpi) && (
                      <div className="mp-field">
                        <label>{isCard ? "Payment Account:" : "UPI App:"}</label>
                        <select
                          value={row.account}
                          onChange={(e) => update(row.id, { account: e.target.value })}
                          disabled={busy}
                        >
                          {(isCard ? banks : upiApps).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isCash && (
                      <>
                        <div className="mp-field">
                          <label>Card holder name:</label>
                          <input
                            placeholder="Card holder name"
                            value={row.cardHolder}
                            onChange={(e) => update(row.id, { cardHolder: e.target.value })}
                            disabled={busy}
                          />
                        </div>

                        <div className="mp-field span2">
                          <label>Card Transaction No:</label>
                          <input
                            placeholder="Card Transaction No."
                            value={row.cardTxnNo}
                            onChange={(e) => update(row.id, { cardTxnNo: e.target.value })}
                            disabled={busy}
                          />
                        </div>
                      </>
                    )}

                    <button
                      className="mp-del"
                      onClick={() => removePayment(row.id)}
                      aria-label="Remove row"
                      disabled={busy}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="mp-add" onClick={addPayment} disabled={busy}>
            <span id="plus">+</span> Add More Payment
          </button>

          <div className="mp-note">
            Note : If you don't pay in full, the remaining amount will be considered as <b>Pay Later</b>.
          </div>

          <div className="mp-summary-strip">
            <div>
              <span>Received:</span> {totalReceived.toFixed(2)}
            </div>
            <div className={remaining > 0 ? "due" : "ok"}>
              <span>Remaining:</span> {Math.max(0, remaining).toFixed(2)}
            </div>
            {overpay > 0 && (
              <div className="warn">
                <span>Change:</span> {overpay.toFixed(2)}
              </div>
            )}
          </div>

          <button
            style={{ backgroundColor: "black", color: "white" }}
            className="mp-proceed"
            onClick={handleProceed}
            disabled={busy}
          >
            {busy && <span className="mp-spinner" aria-hidden="true" />}
            <span>{busy ? "Processing Payment..." : "Proceed To Pay →"}</span>
          </button>

          {banner && (
            <div className={`mp-banner ${banner.type === "success" ? "ok" : "err"}`} role="status">
              <div className="mp-banner-icon">{banner.type === "success" ? "✅" : "⚠️"}</div>
              <div className="mp-banner-text">{banner.text}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
