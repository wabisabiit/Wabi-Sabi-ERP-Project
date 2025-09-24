// src/components/NewExpense.jsx
import React, { useMemo, useState } from "react";
import "../styles/NewExpense.css";

const PARTY_OPTIONS = ["Select Party","Wabi Sabi Services","ABC Logistics","City Utilities","Acme Vendor"];
const TAX_TYPES = ["CGST/SGST", "IGST", "No Tax"];
const PRODUCT_TYPES = ["Product", "Service"];
const TAX_RATES = ["GST 15","GST 28","GST 18","GST 12","GST 5","NON GST 0"];

const currency = (n)=>`Rs. ${Number(isNaN(n)?0:n).toFixed(2)}`;

function Row({ idx,row,onChange,onRemove,showErrors }) {
  const taxRate = useMemo(()=> {
    const m=(row.tax||"").match(/(\d+)/); return m?Number(m[1]):0;
  },[row.tax]);

  const amountNum=Number(row.amount||0);
  const discountNum=Number(row.discount||0);
  const base=Math.max(0,amountNum-discountNum);
  const taxVal=Math.max(0, base*(taxRate/100));
  const total=base+taxVal;

  const errAccount = showErrors && !row.account?.trim();
  const errAmount  = showErrors && Number(row.amount) <= 0;
  const errTax     = showErrors && !row.tax?.trim();

  return (
    <tr className="ne-row">
      <td className="ne-td idx">{idx+1}</td>

      <td className="ne-td">
        <div className="acc-cell">
          <div className={["acc-input-wrap",errAccount?"is-error":""].join(" ")}>
            <input className="acc-input" placeholder="Search Account"
              value={row.account} onChange={e=>onChange(idx,{account:e.target.value})}/>
            <span className="dd-caret">▾</span>
          </div>
          {errAccount && <div className="tiny-err">The Account Is Required</div>}
          <button className="hsn-link" type="button">HSN/SAC Code</button>
        </div>
      </td>

      <td className="ne-td">
        <div className="select-wrap">
          <select value={row.kind} onChange={e=>onChange(idx,{kind:e.target.value})}>
            {PRODUCT_TYPES.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
          <span className="dd-caret">▾</span>
        </div>
      </td>

      <td className="ne-td">
        <input className="desc-input" placeholder="Description"
          value={row.desc} onChange={e=>onChange(idx,{desc:e.target.value})}/>
      </td>

      <td className="ne-td num">
        <input className={["num-input",errAmount?"is-error":""].join(" ")} type="number" min="0"
          value={row.amount} onChange={e=>onChange(idx,{amount:e.target.value})}/>
        {errAmount && <div className="tiny-err tiny-err--alone">The Amount Must Be Greater Than 0</div>}
      </td>

      <td className="ne-td">
        <div className="money">
          <span className="rupee">₹</span>
          <input className="num-input" type="number" min="0"
            value={row.discount} onChange={e=>onChange(idx,{discount:e.target.value})}/>
        </div>
      </td>

      <td className="ne-td">
        <div className="select-wrap">
          <select value={row.tax} onChange={e=>onChange(idx,{tax:e.target.value})}>
            <option value="">Select Tax</option>
            {TAX_RATES.map(t=> <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="dd-caret">▾</span>
        </div>
        {errTax && (
          <div className="tiny-err">
            The Tax Is Required
            <div className="tiny-sub">Eligible For ITC</div>
          </div>
        )}
      </td>

      <td className="ne-td num taxval">{currency(taxVal)}</td>
      <td className="ne-td num total">{(total||0).toFixed(2)}</td>

      <td className="ne-td act">
        <button type="button" className="del-btn" onClick={()=>onRemove(idx)} aria-label="Remove row">✕</button>
      </td>
    </tr>
  );
}

export default function NewExpense({ onCancel, onSaved }) {
  const [date,setDate]=useState(()=>{ const d=new Date(); const p=n=>String(n).padStart(2,"0"); return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`;});
  const [expSeries]=useState("EXP");
  const [expNo,setExpNo]=useState("1");
  const [party,setParty]=useState("Select Party");
  const [invoice,setInvoice]=useState("");
  const [reverse,setReverse]=useState("No");
  const [taxType,setTaxType]=useState(TAX_TYPES[0]);
  const [nonGST,setNonGST]=useState(false);
  const [note,setNote]=useState("");

  const [rows,setRows]=useState([{account:"",kind:"Product",desc:"",amount:"0",discount:"0",tax:""}]);
  const [showErrors,setShowErrors]=useState(false);

  const addRow = ()=> setRows(r=>[...r,{account:"",kind:"Product",desc:"",amount:"0",discount:"0",tax:""}]);
  const removeRow = i => setRows(r=> (r.length<=1 ? r : r.filter((_,x)=>x!==i)));
  const patchRow = (i,patch)=> setRows(r=> r.map((row,x)=> x===i?{...row,...patch}:row));

  const summary = useMemo(()=>{
    let gross=0, disc=0, tax=0;
    rows.forEach(r=>{
      const amount=Number(r.amount||0);
      const discount=Number(r.discount||0);
      const base=Math.max(0,amount-discount);
      const m=(r.tax||"").match(/(\d+)/); const rate=m?Number(m[1]):0;
      gross+=amount; disc+=discount; tax+=base*(rate/100);
    });
    const taxable=Math.max(0,gross-disc);
    const net=taxable+tax;
    return {
      gross:gross.toFixed(2), disc:disc.toFixed(2),
      taxable:taxable.toFixed(2), tax:tax.toFixed(2), net:net.toFixed(2)
    };
  },[rows]);

  const save = ()=>{
    const anyBad = !rows.every(r=> r.account && Number(r.amount)>0 && r.tax);
    if (anyBad || party==="Select Party"){ setShowErrors(true); return; }
    onSaved && onSaved();
  };

  return (
    <div className="ne-wrap">
      <div className="ne-bc">
        <span className="ne-title">New Expense</span>
        <span className="ne-sep">–</span>
        <span className="ne-crumb">Expense</span>
      </div>

      <div className="ne-card">
        {/* top grid */}
        <div className="ne-grid">
          <div className="ne-field">
            <label>Expense Date<span className="req">*</span></label>
            <div className="date-wrap">
              <input className="input" value={date} onChange={e=>setDate(e.target.value)} placeholder="dd/mm/yyyy"/>
              <span className="cal-ico">📅</span>
            </div>
          </div>

          <div className="ne-field">
            <label>Expense No.</label>
            <div className="pair">
              <input className="input" value={expSeries} readOnly/>
              <input className="input" value={expNo} onChange={e=>setExpNo(e.target.value)}/>
            </div>
          </div>

          <div className="ne-field">
            <label>Select Party<span className="req">*</span></label>
            <div className={`select-wrap ${showErrors && party==="Select Party" ? "is-error":""}`}>
              <select value={party} onChange={e=>setParty(e.target.value)}>
                {PARTY_OPTIONS.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <span className="dd-caret">▾</span>
            </div>
            {showErrors && party==="Select Party" && <div className="tiny-err">Select Party</div>}
          </div>

          <div className="ne-field">
            <label>Invoice No.</label>
            <input className="input" value={invoice} onChange={e=>setInvoice(e.target.value)} placeholder="Invoice No."/>
          </div>

          <div className="ne-field">
            <label>Reverse Charge <span className="info">i</span></label>
            <div className="select-wrap">
              <select value={reverse} onChange={e=>setReverse(e.target.value)}>
                <option>No</option><option>Yes</option>
              </select>
              <span className="dd-caret">▾</span>
            </div>
          </div>

          <div className="ne-field">
            <label>Applied Tax Type</label>
            <div className="select-wrap">
              <select value={taxType} onChange={e=>setTaxType(e.target.value)}>
                {TAX_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <span className="dd-caret">▾</span>
            </div>
          </div>

          <div className="ne-field ne-field--inline">
            <label>&nbsp;</label>
            <label className="chk">
              <input type="checkbox" checked={nonGST} onChange={e=>setNonGST(e.target.checked)}/>
              <span>Non-GST</span>
            </label>
          </div>

          <div className="ne-field ne-note">
            <label>Note</label>
            <textarea className="ta" value={note} onChange={e=>setNote(e.target.value)}
              placeholder="Enter a note (max 200 characters)" maxLength={200}/>
            <div className="note-count">{note.length}/200 characters</div>
          </div>
        </div>

        {/* table */}
        <div className="table-wrap">
          <table className="ne-table">
            <thead>
              <tr>
                <th className="idx">#</th>
                <th>Account<span className="req">*</span></th>
                <th>Service/Product</th>
                <th>Description</th>
                <th>Amount<span className="req">*</span></th>
                <th>Discount<span className="req">*</span></th>
                <th>Tax<span className="req">*</span></th>
                <th>Tax Value</th>
                <th>Total</th>
                <th className="act" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <Row key={i} idx={i} row={r} showErrors={showErrors}
                  onChange={patchRow} onRemove={removeRow}/>
              ))}
            </tbody>
          </table>

          <button className="add-new" type="button" onClick={addRow}>
            <span className="plus">＋</span> Add New
          </button>

          <div className="table-total">
            <span>Total</span>
            <span className="num">0.00</span>
          </div>
        </div>

        {/* Bottom: left free + right sticky column */}
        <div className="bottom-row">
          <div></div>
          <div className="right-col">
            <div className="summary-card">
              <div className="sum-row"><span>Gross Amount</span><input className="sum-inp" readOnly value={summary.gross}/></div>
              <div className="sum-row"><span>Discount</span><input className="sum-inp" readOnly value={summary.disc}/></div>
              <div className="sum-row"><span>Taxable Amount</span><input className="sum-inp" readOnly value={summary.taxable}/></div>
              <div className="sum-row linkish"><span>Tax</span><input className="sum-inp" readOnly value={summary.tax}/></div>
              <div className="sum-row linkish"><span>Roundoff</span><input className="sum-inp" readOnly value={"0.00"}/></div>
              <div className="net-row"><span>Net Amount</span><span className="net">{summary.net}</span></div>
            </div>

            <div className="btns">
              <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
              <button type="button" className="btn primary" onClick={save}>Save</button>
              <button type="button" className="btn sky" onClick={save}>Save &amp; Create New</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
