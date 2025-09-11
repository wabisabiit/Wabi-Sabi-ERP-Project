import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/RegisterCloseModal.css";

const DENOMS = [1,2,5,10,20,50,100,200,500];

export default function RegisterCloseModal({
  open,
  onClose,
  onSubmit,
  rangeLabel,
  openingCash = 0,
}) {
  // keep as strings so blank allowed; parse on calc
  const [counts, setCounts] = useState(DENOMS.reduce((a,d)=>({ ...a, [d]:"0"}),{}));
  const [bank, setBank] = useState("");
  const [bankTransfer, setBankTransfer] = useState("");
  const [cashFlow, setCashFlow] = useState("");
  const [physicalDrawer, setPhysicalDrawer] = useState("Total Cash");
  const [closingNote, setClosingNote] = useState("");
  const okRef = useRef(null);

  const toInt = (v)=> {
    const n = parseInt(String(v ?? "").replace(/\D/g,""),10);
    return Number.isFinite(n) ? n : 0;
  };
  const fmt  = (n)=> (Number.isFinite(n) ? n.toFixed(2) : "0.00");

  const denomTotal = useMemo(()=> DENOMS.reduce((s,d)=> s + d*toInt(counts[d]),0), [counts]);

  useEffect(()=> {
    if(!open) return;
    const onEsc = e => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(()=> okRef.current?.focus(), 0);
    return ()=> {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if(!open) return null;

  const fallback = new Date().toLocaleString("en-IN",{
    day:"2-digit", month:"short", year:"numeric", hour:"numeric", minute:"2-digit"
  });
  const title = `Current Register (${rangeLabel || fallback})`;

  const onNosChange = (den, val)=> setCounts(p=>({ ...p, [den]: val.replace(/\D/g,"") }));

  const submit = ()=> {
    onSubmit?.({
      openingCash,
      denominations: DENOMS.reduce((a,d)=>({ ...a, [d]: toInt(counts[d])}),{}),
      denomTotal,
      bank,
      bankTransfer: Number(bankTransfer || 0),
      cashFlow: Number(cashFlow || 0),
      physicalDrawer,
      closingNote,
    });
    onClose?.();
  };

  return (
    <div className="rcm-backdrop">
      <div className="rcm-modal" role="dialog" aria-modal="true" aria-label={title}>
        {/* Header bar with title + X */}
        <div className="rcm-header">
          <h3 className="rcm-title">{title}</h3>
          <button className="rcm-x" aria-label="Close" onClick={onClose}>×</button>
        </div>

        {/* Scrollable body */}
        <div className="rcm-content">
          {/* LEFT (grey summary) */}
          <div className="rcm-col rcm-col-left">
            {[
              "Opening Cash","Cash Payment","Cheque Payment","Card Payment",
              "Bank Transfer","UPI Payment","Wallet Payment","Sales Return",
              "  Cash Refund","  Bank Refund","Credit Applied","Pay Later",
              "Expense","Purchase Payment","Total Sales",
            ].map((label,i)=>(
              <div className="rcm-row" key={i}>
                <span className={label.startsWith("  ") ? "sub" : ""}>{label}</span>
                <input className="rcm-input r" value="0.00" readOnly />
              </div>
            ))}
          </div>

          {/* MIDDLE (denoms) */}
          <div className="rcm-col rcm-col-mid">
            <table className="rcm-table">
              <thead>
                <tr><th>Currency</th><th>Nos</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {DENOMS.map(d=>{
                  const nos = toInt(counts[d]);
                  return (
                    <tr key={d}>
                      <td>₹{d}</td>
                      <td>
                        <input
                          className="rcm-input"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={counts[d]}
                          onChange={e=>onNosChange(d, e.target.value)}
                        />
                      </td>
                      <td className="r">₹{fmt(d*nos)}</td>
                    </tr>
                  );
                })}
                <tr className="rcm-total">
                  <td colSpan={2}>Total</td>
                  <td className="r">₹{fmt(denomTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT (form) */}
          <div className="rcm-col rcm-col-right">
            <label className="rcm-lab">Bank Account</label>
            <select className="rcm-input" value={bank} onChange={e=>setBank(e.target.value)}>
              <option value="">Select Bank</option>
              <option value="hdfc">HDFC Bank</option>
              <option value="sbi">SBI</option>
              <option value="icici">ICICI Bank</option>
            </select>

            <label className="rcm-lab">Bank Transfer</label>
            <input className="rcm-input" type="number" step="0.01"
                   value={bankTransfer} onChange={e=>setBankTransfer(e.target.value)} />

            <label className="rcm-lab">Cash Flow</label>
            <input className="rcm-input" type="number" step="0.01"
                   value={cashFlow} onChange={e=>setCashFlow(e.target.value)} />

            <label className="rcm-lab">Total Cash Left In Drawer</label>
            <input className="rcm-input" value={`₹${fmt(denomTotal)}`} readOnly />

            <label className="rcm-lab">Physical Drawer <span className="req">*</span></label>
            <select className="rcm-input" value={physicalDrawer} onChange={e=>setPhysicalDrawer(e.target.value)}>
              <option>Total Cash</option><option>Short</option><option>Excess</option>
            </select>

            <label className="rcm-lab">Closing Note</label>
            <textarea className="rcm-textarea" rows={3} placeholder="Closing Note"
                      value={closingNote} onChange={e=>setClosingNote(e.target.value)} />
          </div>
        </div>

        {/* Footer — single centered button */}
        <div className="rcm-footer">
          <button ref={okRef} className="rcm-btn primary" onClick={submit}>Close Register</button>
        </div>
      </div>
    </div>
  );
}
