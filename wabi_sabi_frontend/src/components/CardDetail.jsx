import React, { useEffect, useState } from "react";
import "../styles/Card-detail.css";

/**
 * Card payment modal
 * Emits onSubmit({...}) with:
 *  - paymentAccount
 *  - customerBankName
 *  - amount
 *  - cardHolder
 *  - cardHolderPhone  <-- NEW
 *  - transactionNo
 */
export default function CardDetail({ amount = 0, onClose, onSubmit }) {
  const [form, setForm] = useState({
    paymentAccount: "AXIS BANK UDYOG VIHAR",
    customerBankName: "",
    cardAmount: Number(amount || 0).toFixed(2),
    cardHolder: "",
    cardHolderPhone: "",               // <-- NEW
    transactionNo: "",
  });

  // lock body scroll while modal is open
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

  const update = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const finalize = (e) => {
    e.preventDefault();
    onSubmit?.({
      paymentAccount: form.paymentAccount.trim(),
      customerBankName: form.customerBankName.trim(),
      amount: parseFloat(form.cardAmount || 0),
      cardHolder: form.cardHolder.trim(),
      cardHolderPhone: form.cardHolderPhone.trim(), // <-- NEW
      transactionNo: form.transactionNo.trim(),
    });
  };

  const close = () => {
    if (onClose) onClose();
    else window.history.back();
  };

  return (
    <div
      className="cd-backdrop"
      data-backdrop
      onMouseDown={(e) => {
        if (e.target.dataset.backdrop) close();
      }}
    >
      <div
        className="cd-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cd-header">
          <h3 id="cd-title">Card Details</h3>
          <button className="cd-close" aria-label="Close" onClick={close}>
            ×
          </button>
        </div>

        <form className="cd-body" onSubmit={finalize}>
          <label className="cd-field">
            <span>Payment Account</span>
            <select
              value={form.paymentAccount}
              onChange={update("paymentAccount")}
            >
              <option>AXIS BANK UDYOG VIHAR</option>
              <option>HDFC POS MAIN</option>
              <option>ICICI MERCHANT</option>
            </select>
          </label>

          <label className="cd-field">
            <span>Customer Bank Name</span>
            <input
              type="text"
              placeholder="Customer bank name"
              value={form.customerBankName}
              onChange={update("customerBankName")}
            />
          </label>

          <label className="cd-field">
            <span>Card Payment Amount</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.cardAmount}
              onChange={update("cardAmount")}
            />
          </label>

          <label className="cd-field">
            <span>Card Holder Name</span>
            <input
              type="text"
              placeholder="Card holder name"
              value={form.cardHolder}
              onChange={update("cardHolder")}
            />
          </label>

          <label className="cd-field">
            <span>Card Holder Mobile No.</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 9876543210"
              value={form.cardHolderPhone}
              onChange={update("cardHolderPhone")}
              pattern="[0-9]{10,}"
              title="Enter a valid mobile number"
            />
          </label>

          <label className="cd-field">
            <span>Card Transaction No.</span>
            <input
              type="text"
              placeholder="POS RRN / Auth code"
              value={form.transactionNo}
              onChange={update("transactionNo")}
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
