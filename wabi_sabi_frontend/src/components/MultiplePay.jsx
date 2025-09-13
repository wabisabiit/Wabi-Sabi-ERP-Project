import React, { useMemo, useState } from "react";
import "../styles/MultiplePay.css";

/**
 * Props
 * - cart: { customerType, customerName?, items: [{id,name,qty,price,tax}], roundoff?:number }
 * - onBack: () => void         // back to sale
 * - onProceed: (payload) => void
 *      payload = {
 *        total, taxAmount, roundoff, payableAmount,
 *        customerType, customerName,
 *        payments: [{ id, method, channel, account, amount, cardHolder, cardTxnNo }]
 *        remaining // >0 means Pay Later will be created by caller
 *      }
 */
export default function MultiplePay({
  cart = {
    customerType: "Walk In Customer",
    items: [{ id: 1, name: "(120)(G) Shirt & Blouse", qty: 1, price: 285, tax: 14.29 }],
    roundoff: 0
  },
  onBack,
  onProceed
}) {
  const banks = ["AXIS BANK UDYOG VIHAR", "SBI", "HDFC", "Punjab National Bank"];
  const upiApps = ["Google Pay", "Paytm", "PhonePe", "Amazon Pay"];

  const totals = useMemo(() => {
    const taxAmount = cart.items.reduce((s, it) => s + (it.tax || 0), 0);
    const total = cart.items.reduce((s, it) => s + (it.price || 0), 0) + taxAmount;
    const roundoff = cart.roundoff || 0;
    const payableAmount = +(total + roundoff).toFixed(2);
    return { taxAmount, total: +total.toFixed(2), roundoff, payableAmount };
  }, [cart]);

  const [payments, setPayments] = useState([
    // row 0: Cash
    { id: 1, method: "Cash", channel: "Cash", account: "", amount: "", cardHolder: "", cardTxnNo: "" },
    // row 1: Card/UPI example
    { id: 2, method: "Card", channel: "Card", account: banks[0], amount: "", cardHolder: "", cardTxnNo: "" }
  ]);

  const totalReceived = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = +(totals.payableAmount - totalReceived).toFixed(2);
  const overpay = Math.max(0, -remaining);

  const addPayment = () => {
    const id = (payments.at(-1)?.id || 0) + 1;
    setPayments(p => [...p, { id, method: "Card", channel: "Card", account: banks[0], amount: "", cardHolder: "", cardTxnNo: "" }]);
  };

  const removePayment = (id) => setPayments(p => (p.length > 1 ? p.filter(x => x.id !== id) : p));

  const update = (id, patch) =>
    setPayments(p => p.map(row => (row.id === id ? { ...row, ...patch } : row)));

  const handleProceed = () => {
    const payload = {
      customerType: cart.customerType,
      customerName: cart.customerName || "",
      total: totals.total,
      taxAmount: totals.taxAmount,
      roundoff: totals.roundoff,
      payableAmount: totals.payableAmount,
      payments: payments.map(p => ({
        ...p,
        amount: +(parseFloat(p.amount) || 0).toFixed(2)
      })),
      remaining: remaining > 0 ? remaining : 0
    };
    onProceed?.(payload);
  };

  return (
    <div className="mp-layout">
      <header className="mp-topbar">
        <button className="mp-back" onClick={onBack}>⟵ Back to Sale</button>
        <div />
      </header>

      <div className="mp-body">
        {/* LEFT: Sale Summary */}
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
              {cart.items.map((it, idx) => (
                <div key={it.id ?? idx} className="mp-row">
                  <div className="c1">{idx + 1}</div>
                  <div className="c2">{it.name}</div>
                  <div className="c3">{it.qty?.toFixed(2) ?? it.qty}</div>
                </div>
              ))}
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

        {/* RIGHT: Pay Area */}
        <main className="mp-right">
          <div className="mp-pay-header">
            <div className="mp-title">Pay</div>
            <div className="mp-total-input">
              <span className="rupee">₹</span>
              <input
                value={totals.payableAmount.toFixed(2)}
                readOnly
                className="readonly"
                aria-label="Total amount to pay"
              />
            </div>
          </div>

          {/* Payment rows */}
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
                            account:
                              m === "Card" ? banks[0] :
                              m === "UPI" ? upiApps[0] : "",
                          });
                        }}
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
                        >
                          {(isCard ? banks : upiApps).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
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
                          />
                        </div>

                        <div className="mp-field span2">
                          <label>Card Transaction No:</label>
                          <input
                            placeholder="Card Transaction No."
                            value={row.cardTxnNo}
                            onChange={(e) => update(row.id, { cardTxnNo: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    <button className="mp-del" onClick={() => removePayment(row.id)} aria-label="Remove row">✕</button>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="mp-add" onClick={addPayment}><span id="plus">+</span> Add More Payment</button>

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

          <button style={{backgroundColor:"black",color:"white"}} className="mp-proceed" onClick={handleProceed}> {/*disabled={totalReceived <= 0}--use this later ...*/ }
            Proceed To Pay →
          </button>
        </main>
      </div>
    </div>
  );
}
