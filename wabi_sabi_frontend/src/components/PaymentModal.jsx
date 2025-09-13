import React, { useEffect, useState } from "react";
import "../styles/PaymentModal.css";

export default function PaymentModal({ open, onClose }) {
  const [voucherType, setVoucherType] = useState("sales");   // sales | purchase | expense
  const [paymentType, setPaymentType] = useState("against"); // advance | against

  // lock background scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="payx-overlay" role="dialog" aria-modal="true">
      <div className="payx-card">
        {/* Header */}
        <div className="payx-header">
          <h3>Payment</h3>
          <button className="payx-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="payx-body">
          {/* Voucher type */}
          <div className="payx-row">
            <span className="payx-title">Select Voucher Type</span>
            <div className="payx-radios">
              <label className="payx-radio">
                <input type="radio" name="vtype" checked={voucherType==="sales"} onChange={()=>setVoucherType("sales")} />
                <span>Sales</span>
              </label>
              <label className="payx-radio">
                <input type="radio" name="vtype" checked={voucherType==="purchase"} onChange={()=>setVoucherType("purchase")} />
                <span>Purchase</span>
              </label>
              <label className="payx-radio">
                <input type="radio" name="vtype" checked={voucherType==="expense"} onChange={()=>setVoucherType("expense")} />
                <span>Expense</span>
              </label>
            </div>
          </div>

          {/* SALES / PURCHASE */}
          {voucherType !== "expense" && (
            <>
              <div className="payx-row">
                <span className="payx-title">Select Payment Type</span>
                <div className="payx-radios">
                  <label className="payx-radio">
                    <input type="radio" name="ptype" checked={paymentType==="advance"} onChange={()=>setPaymentType("advance")} />
                    <span>Advance Payment</span>
                  </label>
                  <label className="payx-radio">
                    <input type="radio" name="ptype" checked={paymentType==="against"} onChange={()=>setPaymentType("against")} />
                    <span>Against Bill</span>
                  </label>
                </div>
              </div>

              <div className="payx-grid2">
                {/* LEFT: Party (NO black caret per screenshot) */}
                <div className="payx-field">
                  <label>Select Party Name <span className="payx-req">*</span></label>
                  <select className="payx-control">
                    <option>Search Party</option>
                  </select>
                </div>

                {/* RIGHT: Sales/Bill (WITH black caret) */}
                <div className="payx-field">
                  <label>{voucherType==="sales" ? "Select Sales" : "Select Bill"} <span className="payx-req">*</span></label>
                  <div className="payx-selectwrap">
                    <select className="payx-control">
                      <option>{voucherType==="sales" ? "Select Sales" : "Select Bill"}</option>
                    </select>
                    <button className="payx-caret" aria-label="More">
                      <span className="material-icons">arrow_drop_down</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Mode (WITH black caret) */}
              <div className="payx-field">
                <label>Payment Mode <span className="payx-req">*</span></label>
                <div className="payx-selectwrap">
                  <select className="payx-control">
                    <option>Payment</option>
                  </select>
                  <button className="payx-caret" aria-label="More">
                    <span className="material-icons">arrow_drop_down</span>
                  </button>
                </div>
              </div>

              {/* Totals (disabled grey, ₹ chip) */}
              <div className="payx-grid3">
                <div className="payx-field">
                  <label>Total Payment</label>
                  <div className="payx-currency">
                    <span>₹</span>
                    <input className="payx-control" type="text" value="0.00" disabled />
                  </div>
                </div>
                <div className="payx-field">
                  <label>Paid Amount</label>
                  <div className="payx-currency">
                    <span>₹</span>
                    <input className="payx-control" type="text" value="0.00" disabled />
                  </div>
                </div>
                <div className="payx-field">
                  <label>Pending Amount</label>
                  <div className="payx-currency">
                    <span>₹</span>
                    <input className="payx-control" type="text" value="0.00" disabled />
                  </div>
                </div>
              </div>

              <div className="payx-grid2">
                <div className="payx-field">
                  <label>Kasar</label>
                  <input className="payx-control" type="text" defaultValue="0.00" />
                </div>
                <div className="payx-field">
                  <label>Amount <span className="payx-req">*</span></label>
                  <input className="payx-control" type="text" defaultValue="0.00" />
                </div>
              </div>

              <div className="payx-field">
                <label>Remark</label>
                <input className="payx-control" type="text" placeholder="Enter Remark" />
              </div>
            </>
          )}

          {/* EXPENSE */}
          {voucherType === "expense" && (
            <>
              <div className="payx-grid2">
                <div className="payx-field">
                  <label>Select Party Name <span className="payx-req">*</span></label>
                  <div className="payx-selectwrap">
                    <select className="payx-control"><option>Select Party</option></select>
                    <button className="payx-caret" aria-label="More"><span className="material-icons">arrow_drop_down</span></button>
                  </div>
                </div>
                <div className="payx-field">
                  <label>Account <span className="payx-req">*</span></label>
                  <div className="payx-selectwrap">
                    <select className="payx-control"><option>Search Account</option></select>
                    <button className="payx-caret" aria-label="More"><span className="material-icons">arrow_drop_down</span></button>
                  </div>
                </div>
              </div>

              <div className="payx-grid2">
                <div className="payx-field">
                  <label>Amount <span className="payx-req">*</span></label>
                  <input className="payx-control" type="text" placeholder="Enter Amount" />
                </div>
                <div className="payx-field payx-checkfield">
                  <label>&nbsp;</label>
                  <label className="payx-check"><input type="checkbox" /> <span>Non-GST</span></label>
                </div>
              </div>

              <div className="payx-field">
                <label>Remark</label>
                <input className="payx-control" type="text" placeholder="Enter remark" />
              </div>
            </>
          )}

          <div className="payx-actions">
            <button className="payx-btn">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
