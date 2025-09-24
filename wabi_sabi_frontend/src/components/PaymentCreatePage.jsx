import React, { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PaymentCreatePage.css";

export default function PaymentCreatePage() {
  const navigate = useNavigate();

  // top toggle
  const [mode, setMode] = useState("cash"); // 'cash' | 'bank'
  const [cashType, setCashType] = useState("");
  const [party, setParty] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  });

  const toISO = (dmy) => {
  const [d, m, y] = (dmy || "").split("/");
  return y && m && d ? `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}` : "";
};
const toDMY = (iso) => {
  const [y, m, d] = (iso || "").split("-");
  return y && m && d ? `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}` : "";
};

const dateRef = useRef(null);

  const [ptype, setPtype] = useState("on_account"); // on_account | advance | against
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const descLimit = 200;

  // table (bills) – empty by default
  const [rows, setRows] = useState([]);

  const addRow = () =>
    setRows((r) => [
      ...r,
      { id: Date.now(), billNo: "", net: "", paid: "", pending: "", kasar: "", amt: "", payAmt: "" },
    ]);

  const totalPay = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.payAmt) || 0), 0),
    [rows]
  );

  const save = () => {
    // stub: collect data and post later
    const payload = {
      mode, cashType, party, date, ptype, amount: Number(amount || 0), desc,
      bills: rows,
    };
    console.log("SAVE PAYMENT", payload);
    // go back to list for now
    navigate("/bank/payment");
  };

  const saveAndCreateNew = () => {
    save();
    // If you want to stay on page for a new one, comment out navigate above and reset fields here.
  };

  return (
    <div className="payc-wrap">
      <div className="payc-card">
        {/* Mode toggle */}
        <div className="payc-toprow">
          <label className={`rb ${mode === "cash" ? "active" : ""}`}>
            <input
              type="radio"
              name="mode"
              value="cash"
              checked={mode === "cash"}
              onChange={() => setMode("cash")}
            />
            <span className="dot" /> Cash
          </label>
          <label className={`rb ${mode === "bank" ? "active" : ""}`}>
            <input
              type="radio"
              name="mode"
              value="bank"
              checked={mode === "bank"}
              onChange={() => setMode("bank")}
            />
            <span className="dot" /> Bank
          </label>
        </div>

        {/* Cash type */}
        <div className="grid g2">
          <div className="fcol">
            <label>Search Cash Type*</label>
            <div className="inp select">
              <input
                readOnly
                value={cashType}
                placeholder="Search Cash Type*"
                onClick={() => setCashType("Default Cash")}
              />
              <span className="caret">▾</span>
            </div>
          </div>
        </div>

        {/* Party + date */}
        <div className="grid g2">
          <div className="fcol">
            <label>Select Party*</label>
            <div className="inp select">
              <input
                readOnly
                value={party}
                placeholder="Select Party"
                onClick={() => setParty("TN-Store")}
              />
              <span className="caret">▾</span>
            </div>
            <div className="muted"><span className="q">?</span> Closing Balance: ₹0</div>
          </div>

          <div className="fcol">
            <label>Payment Date*</label>
            <div className="inp with-ico">
              <input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="DD/MM/YYYY"
              />
              <span className="ico material-icons">event</span>
            </div>
          </div>
        </div>

        {/* Payment type cards */}
        <div className="grid g3">
          <button
            className={`ptype ${ptype === "on_account" ? "active" : ""}`}
            onClick={() => setPtype("on_account")}
          >
            <span className="rdo" /> <b>On Account</b>
            <div className="sub">Upfront Payment</div>
          </button>

          <button
            className={`ptype ${ptype === "advance" ? "active" : ""}`}
            onClick={() => setPtype("advance")}
          >
            <span className="rdo" /> <b>Advance Payment</b>
            <div className="sub">Will be offset by upcoming bills</div>
          </button>

          <button
            className={`ptype ${ptype === "against" ? "active" : ""}`}
            onClick={() => setPtype("against")}
          >
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
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="fcol">
            <label>Description</label>
            <div className="inp">
              <textarea
                rows={3}
                maxLength={descLimit}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Enter a description (max 2000 characters)"
              />
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
              ) : rows.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td><input className="cell" value={r.billNo} onChange={e => {
                    const v = e.target.value; setRows(s => s.map(x => x.id === r.id ? {...x, billNo:v} : x));
                  }}/></td>
                  <td><input className="cell num" value={r.net} onChange={e => {
                    const v = e.target.value; setRows(s => s.map(x => x.id === r.id ? {...x, net:v} : x));
                  }}/></td>
                  <td><input className="cell num" value={r.paid} onChange={e => {
                    const v = e.target.value; setRows(s => s.map(x => x.id === r.id ? {...x, paid:v} : x));
                  }}/></td>
                  <td><input className="cell num" value={r.pending} onChange={e => {
                    const v = e.target.value; setRows(s => s.map(x => x.id === r.id ? {...x, pending:v} : x));
                  }}/></td>
                  <td><input className="cell num" value={r.kasar} onChange={e => {
                    const v = e.target.value; setRows(s => s.map(x => x.id === r.id ? {...x, kasar:v} : x));
                  }}/></td>
                  <td><input className="cell num" value={r.amt} onChange={e => {
                    const v = e.target.value; setRows(s => s.map(x => x.id === r.id ? {...x, amt:v} : x));
                  }}/></td>
                  <td><input className="cell num" value={r.payAmt} onChange={e => {
                    const v = e.target.value; setRows(s => s.map(x => x.id === r.id ? {...x, payAmt:v} : x));
                  }}/></td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}>
                  <button className="link" type="button" onClick={addRow}>＋ Add More</button>
                </td>
                <td colSpan={5} className="right b">Total</td>
                <td className="right b">{totalPay.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer buttons */}
        <div className="actrow">
          <button className="btn ghost" onClick={() => navigate("/bank/payment")}>Cancel</button>
          <div className="spacer" />
          <button className="btn outline" onClick={save}>Save</button>
          <button className="btn primary" onClick={saveAndCreateNew}>Save & Create New</button>
        </div>
      </div>
    </div>
  );
}
