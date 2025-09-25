import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PaymentCreatePage.css";

/* ---------------- Common helpers ---------------- */
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

function scrollIntoView(listRef, index) {
  const list = listRef.current;
  if (!list) return;
  const node = list.children[index];
  if (!node) return;
  const nodeTop = node.offsetTop;
  const nodeBottom = nodeTop + node.offsetHeight;
  const viewTop = list.scrollTop;
  const viewBottom = viewTop + list.clientHeight;
  if (nodeTop < viewTop) list.scrollTop = nodeTop;
  else if (nodeBottom > viewBottom) list.scrollTop = nodeBottom - list.clientHeight;
}

/* ---------------- Reusable Combo (Select + Search) ---------------- */
function ComboSelect({ placeholder="Select…", options=[], value="", onChange, minChars=1 }) {
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(-1);
  useOnClickOutside(wrapRef, () => setOpen(false));

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < minChars) return [];
    return options.filter((o) => o.toLowerCase().includes(term));
  }, [q, options, minChars]);

  const openPop = () => {
    setOpen(true);
    setTimeout(() => wrapRef.current?.querySelector(".pop-search")?.focus(), 0);
  };

  const pick = (v) => {
    onChange && onChange(v);
    setQ(""); setIdx(-1); setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, items.length - 1));
      scrollIntoView(listRef, Math.min(idx + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
      scrollIntoView(listRef, Math.max(idx - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (idx >= 0 && items[idx]) pick(items[idx]);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className={`inp select ${open ? "open" : ""}`} ref={wrapRef} onKeyDown={onKeyDown}>
      <input readOnly value={value} placeholder={placeholder} onClick={openPop} />
      <span className="caret">▾</span>
      <div className="select-pop" role="dialog" aria-label={placeholder}>
        <input className="pop-search" value={q} onChange={(e)=>{setQ(e.target.value); setIdx(-1);}} />
        <div className="pop-list" role="listbox" ref={listRef}>
          {q.trim().length < minChars ? (
            <div className="empty">Please enter {minChars} or more characters</div>
          ) : items.length === 0 ? (
            <div className="empty">No matches</div>
          ) : (
            items.map((opt,i)=>(
              <div
                key={opt+i}
                className={`opt ${value===opt?"active":""} ${idx===i?"hovering":""}`}
                role="option"
                aria-selected={value===opt}
                onMouseEnter={()=>setIdx(i)}
                onMouseLeave={()=>setIdx(-1)}
                onClick={()=>pick(opt)}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page Data ---------------- */
const CASH_TYPES = ["Cash (Cash in Hand)", "Petty Cash", "Store Cash"];

// Include the exact default label you want visible by default.
const DEFAULT_BANK = "AXIS BANK UDYOG BIHAR";
const BANKS = [
  DEFAULT_BANK,
  "HDFC Bank – 1234",
  "ICICI Bank – 5678",
  "SBI – 4321",
  "Axis Bank – 8765",
  "Yes Bank – 9988",
];

const PARTIES = [
  "TN-Store",
  "Wabi Sabi Sustainability LLP",
  "Brands 4 Less – IFFCO Chowk",
  "Brands Loot – Udyog Vihar",
  "Rajouri Garden Inside",
  "Rajouri Garden Outside",
  "Tilak Nagar",
  "M3M Urbana",
];

/* ---------------- Page ---------------- */
export default function PaymentCreatePage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("cash");                 // 'cash' | 'bank'
  const [cashType, setCashType] = useState("");
  const [bank, setBank] = useState(DEFAULT_BANK);           // Default bank set here
  const [bankMethod, setBankMethod] = useState("online");   // 'online' | 'cheque'

  const [party, setParty] = useState("");

  const [date, setDate] = useState(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  });
  const [txnDate, setTxnDate] = useState("");
  const [txnNo, setTxnNo] = useState("");

  const dateRef = useRef(null);
  const txnDateRef = useRef(null);

  const toISO = (dmy) => {
    const [d,m,y] = (dmy||"").split("/");
    return y && m && d ? `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}` : "";
  };
  const toDMY = (iso) => {
    const [y,m,d] = (iso||"").split("-");
    return y && m && d ? `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}` : "";
  };
  const openPicker = (ref) => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  // If user switches to Bank and the value is empty for some reason, set default.
  useEffect(() => {
    if (mode === "bank" && !bank) setBank(DEFAULT_BANK);
  }, [mode, bank]);

  const [ptype, setPtype] = useState("on_account");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const descLimit = 200;

  const [rows, setRows] = useState([]);
  const addRow = () =>
    setRows((r)=>[...r, { id:Date.now(), billNo:"", net:"", paid:"", pending:"", kasar:"", amt:"", payAmt:"" }]);
  const totalPay = useMemo(()=>rows.reduce((s,r)=>s+(Number(r.payAmt)||0),0),[rows]);

  const save = () => {
    const payload = {
      mode,
      cashType: mode==="cash" ? cashType : null,
      bank: mode==="bank" ? bank : null,
      bankMethod: mode==="bank" ? bankMethod : null,
      party, date,
      txnDate: mode==="bank" ? txnDate : null,
      txnNo: mode==="bank" ? txnNo : null,
      ptype,
      amount: Number(amount||0),
      desc,
      bills: rows,
    };
    console.log("SAVE PAYMENT", payload);
    navigate("/bank/payment");
  };

  // Label text switches when Cheque is selected
  const isCheque = mode === "bank" && bankMethod === "cheque";
  const txnDateLabel = isCheque ? "Cheque Date" : "Transaction Date";
  const txnNoLabel = isCheque ? "Cheque No." : "Transaction No.";

  return (
    <div className="payc-wrap">
      <div className="payc-card">
        {/* Top: Cash/Bank */}
        <div className="payc-toprow">
          <label className={`rb ${mode==="cash" ? "active" : ""}`}>
            <input type="radio" name="mode" value="cash" checked={mode==="cash"} onChange={()=>setMode("cash")} />
            <span className="dot" /> Cash
          </label>
          <label className={`rb ${mode==="bank" ? "active" : ""}`}>
            <input type="radio" name="mode" value="bank" checked={mode==="bank"} onChange={()=>setMode("bank")} />
            <span className="dot" /> Bank
          </label>
        </div>

        {/* Row 1 */}
        {mode === "cash" ? (
          <div className="grid g2">
            <div className="fcol">
              <label>Search Cash Type*</label>
              <ComboSelect placeholder="Search Cash Type*" options={CASH_TYPES} value={cashType} onChange={setCashType} />
              <div className="hint"><span className="q">?</span> Closing Balance: ₹0</div>
            </div>
          </div>
        ) : (
          <div className="grid bank-first">
            <div className="fcol">
              <label>Search Bank</label>
              <ComboSelect placeholder="Search Bank" options={BANKS} value={bank} onChange={setBank} />
            </div>
            <div className="fcol">
              <label className="fake">&nbsp;</label>
              <div className="bank-methods">
                <label className={`rb sm ${bankMethod==="online"?"active":""}`}>
                  <input type="radio" name="bm" value="online" checked={bankMethod==="online"} onChange={()=>setBankMethod("online")} />
                  <span className="dot" /> Online
                </label>
                <label className={`rb sm ${bankMethod==="cheque"?"active":""}`}>
                  <input type="radio" name="bm" value="cheque" checked={bankMethod==="cheque"} onChange={()=>setBankMethod("cheque")} />
                  <span className="dot" /> Cheque
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Row 2 */}
        <div className={`grid ${mode==="bank" ? "g4" : "g2"}`}>
          <div className="fcol">
            <label>Select Party*</label>
            <ComboSelect placeholder="Select Party" options={PARTIES} value={party} onChange={setParty} />
            {mode==="cash" && (
              <div className="hint"><span className="q">?</span> Closing Balance: ₹0</div>
            )}
          </div>

          <div className="fcol">
            <label>Payment Date*</label>
            <div className="inp with-ico" style={{position:"relative"}}>
              <input readOnly value={date} onClick={()=>openPicker(dateRef)} placeholder="DD/MM/YYYY" />
              <input ref={dateRef} type="date" value={toISO(date)} onChange={(e)=>setDate(toDMY(e.target.value))}
                     style={{position:"absolute",opacity:0,width:0,height:0,pointerEvents:"none"}} tabIndex={-1}/>
              <span className="ico material-icons" role="button" tabIndex={0} onClick={()=>openPicker(dateRef)}>event</span>
            </div>
          </div>

          {mode==="bank" && (
            <>
              <div className="fcol">
                <label>{txnDateLabel}</label>
                <div className="inp with-ico" style={{position:"relative"}}>
                  <input readOnly value={txnDate} onClick={()=>openPicker(txnDateRef)} placeholder="DD/MM/YYYY" />
                  <input ref={txnDateRef} type="date" value={toISO(txnDate)} onChange={(e)=>setTxnDate(toDMY(e.target.value))}
                         style={{position:"absolute",opacity:0,width:0,height:0,pointerEvents:"none"}} tabIndex={-1}/>
                  <span className="ico material-icons" role="button" tabIndex={0} onClick={()=>openPicker(txnDateRef)}>event</span>
                </div>
              </div>

              <div className="fcol">
                <label>{txnNoLabel}</label>
                <div className="inp">
                  <input value={txnNo} onChange={(e)=>setTxnNo(e.target.value)} placeholder={isCheque ? "Cheque No" : "Transaction No"} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Payment type cards */}
        <div className="grid g3">
          <button className={`ptype ${ptype==="on_account"?"active":""}`} onClick={()=>setPtype("on_account")} type="button">
            <span className="rdo" /> <b>On Account</b>
            <div className="sub">Upfront Payment</div>
          </button>
          <button className={`ptype ${ptype==="advance"?"active":""}`} onClick={()=>setPtype("advance")} type="button">
            <span className="rdo" /> <b>Advance Payment</b>
            <div className="sub">Will be offset by upcoming bills</div>
          </button>
          <button className={`ptype ${ptype==="against"?"active":""}`} onClick={()=>setPtype("against")} type="button">
            <span className="rdo" /> <b>Against Voucher</b>
            <div className="sub">Make Payment Against Voucher</div>
          </button>
        </div>

        {/* Amount + Description */}
        <div className="grid g2">
          <div className="fcol">
            <label>Amount*</label>
            <div className="inp amt">
              <span className="prefix">₹</span>
              <input value={amount} onChange={(e)=>setAmount(e.target.value.replace(/[^\d.]/g,""))} placeholder="0" inputMode="decimal" />
            </div>
          </div>
          <div className="fcol">
            <label>Description</label>
            <div className="inp">
              <textarea rows={3} maxLength={descLimit} value={desc} onChange={(e)=>setDesc(e.target.value)}
                        placeholder="Enter a description (max 2000 characters)" />
            </div>
            <div className="muted">{desc.length}/{descLimit} characters</div>
          </div>
        </div>

        {/* Bills table */}
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Bill No.*</th>
                <th>Net Amount</th>
                <th>Paid Amount</th>
                <th>Pending Amount</th>
                <th>Kasar Amount*</th>
                <th>Amount*</th>
                <th>Payment Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="nodata">—</td></tr>
              ) : rows.map((r,i)=>(
                <tr key={r.id}>
                  <td>{i+1}</td>
                  <td><input className="cell" value={r.billNo} onChange={(e)=>setRows(s=>s.map(x=>x.id===r.id?{...x,billNo:e.target.value}:x))}/></td>
                  <td><input className="cell num" value={r.net} onChange={(e)=>setRows(s=>s.map(x=>x.id===r.id?{...x,net:e.target.value}:x))}/></td>
                  <td><input className="cell num" value={r.paid} onChange={(e)=>setRows(s=>s.map(x=>x.id===r.id?{...x,paid:e.target.value}:x))}/></td>
                  <td><input className="cell num" value={r.pending} onChange={(e)=>setRows(s=>s.map(x=>x.id===r.id?{...x,pending:e.target.value}:x))}/></td>
                  <td><input className="cell num" value={r.kasar} onChange={(e)=>setRows(s=>s.map(x=>x.id===r.id?{...x,kasar:e.target.value}:x))}/></td>
                  <td><input className="cell num" value={r.amt} onChange={(e)=>setRows(s=>s.map(x=>x.id===r.id?{...x,amt:e.target.value}:x))}/></td>
                  <td><input className="cell num" value={r.payAmt} onChange={(e)=>setRows(s=>s.map(x=>x.id===r.id?{...x,payAmt:e.target.value}:x))}/></td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}><button className="link" type="button" onClick={addRow}>＋ Add More</button></td>
                <td colSpan={5} className="right b">Total</td>
                <td className="right b">{totalPay.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="actrow">
          <button className="btn ghost" onClick={()=>navigate("/bank/payment")} type="button">Cancel</button>
          <div className="spacer" />
          <button className="btn outline" onClick={save} type="button">Save</button>
          <button className="btn primary" onClick={save} type="button">Save & Create New</button>
        </div>
      </div>
    </div>
  );
}
