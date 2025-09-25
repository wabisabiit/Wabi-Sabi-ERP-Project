import React, { useMemo, useRef, useState, useEffect } from "react";
import "../styles/NewReceiptPage.css";

/* ---------- utils ---------- */
const toISO = (dmy) => {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};
const fromISO = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/* ---------- click-outside ---------- */
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const l = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", l);
    document.addEventListener("touchstart", l);
    return () => {
      document.removeEventListener("mousedown", l);
      document.removeEventListener("touchstart", l);
    };
  }, [ref, handler]);
}

/* ---------- icons ---------- */
const Icon = {
  home: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-5v-7H10v7H5a2 2 0 0 1-2-2v-9z" />
    </svg>
  ),
  calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 2v2H5a2 2 0 0 0-2 2v2h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm14 8H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10z" />
    </svg>
  ),
  caret: () => (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.24 4.38a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z" />
    </svg>
  ),
  plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
    </svg>
  ),
  trash: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z" />
    </svg>
  ),
};

/* ---------- generic combobox ---------- */
function Select({ placeholder, options = [], value, onChange, width = 260 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const shown = useMemo(
    () => (q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options),
    [q, options]
  );

  return (
    <div className="nr-select" style={{ width }} ref={ref}>
      <button className={`nr-sbtn ${value ? "has" : ""}`} onClick={() => setOpen((v) => !v)}>
        <span className="nr-sval">{value || placeholder}</span>
        <Icon.caret />
      </button>
      {open && (
        <div className="nr-pop">
          <input
            className="nr-pop-search"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="nr-pop-list">
            {shown.map((o) => (
              <div
                key={o}
                className="nr-pop-item"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
              >
                {o}
              </div>
            ))}
            {!shown.length && <div className="nr-pop-empty">No options</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- date field ---------- */
function DateField({ value, onChange, width = 220 }) {
  const ref = useRef(null);
  const iso = toISO(value);
  const open = () => {
    const el = ref.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else {
      el.focus();
      el.click();
    }
  };
  return (
    <div className="nr-date" style={{ width }}>
      <input ref={ref} type="date" value={iso} onChange={(e) => onChange(fromISO(e.target.value))} />
      <span className="nr-cal" onClick={open}>
        <Icon.calendar />
      </span>
    </div>
  );
}

/* ---------- radio-card ---------- */
function RadioCard({ value, setValue, id, title, subtitle }) {
  const checked = value === id;
  return (
    <button type="button" className={`nr-card ${checked ? "active" : ""}`} onClick={() => setValue(id)}>
      <span className={`nr-dot ${checked ? "on" : ""}`} />
      <div className="nr-card-txt">
        <div className="nr-card-title">{title}</div>
        <div className="nr-card-sub">{subtitle}</div>
      </div>
    </button>
  );
}

/* ===================== PAGE ===================== */
export default function NewReceiptPage({ onBack }) {
  const CASH_TYPES = ["Cash (Cash in Hand)", "Petty Cash", "Store Cash"];
  const BANKS = ["HDFC Bank - 1234", "ICICI Bank - 7788", "SBI - 9900"];
  const PARTIES = ["John Retail", "Acme Corp", "Zed Traders", "Omnia Pvt Ltd"];

  const [tab, setTab] = useState("cash");               // cash | bank
  const [bankMode, setBankMode] = useState("online");   // online | cheque
  const [cashType, setCashType] = useState("");
  const [bankSel, setBankSel] = useState("");
  const [party, setParty] = useState("");
  const [rdate, setRdate] = useState("25/09/2025");
  const [tdate, setTdate] = useState("25/09/2025");
  const [txnNo, setTxnNo] = useState("");

  const [rtype, setRtype] = useState("on");             // on | adv | bill
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");

  // ====== computed for labels ======
  const isBank = tab === "bank";
  const isCheque = isBank && bankMode === "cheque";
  const auxDateLabel = isCheque ? "Cheque Date" : "Transaction Date";
  const auxNoLabel   = isCheque ? "Cheque No."  : "Transaction No.";
  const auxNoPlaceholder = isCheque ? "Cheque No" : "Transaction No";

  /* against-bill rows */
  const [rows, setRows] = useState([]);
  const addRow = () =>
    setRows((r) => [
      ...r,
      { id: Date.now(), billNo: "", taxable: "", net: "", paid: "", pending: "", kasar: "", amount: "", pay: 0 },
    ]);
  const removeRow = (id) => setRows((r) => r.filter((x) => x.id !== id));
  const onRow = (id, key, val) =>
    setRows((r) =>
      r.map((x) => (x.id === id ? { ...x, [key]: val, pay: key === "amount" ? parseFloat(val || 0) || 0 : x.pay } : x))
    );

  const totals = rows.reduce(
    (acc, r) => {
      const n = (k) => parseFloat(r[k]) || 0;
      acc.taxable += n("taxable");
      acc.net     += n("net");
      acc.paid    += n("paid");
      acc.pending += n("pending");
      acc.kasar   += n("kasar");
      acc.amount  += n("amount");
      acc.pay     += n("pay");
      return acc;
    },
    { taxable: 0, net: 0, paid: 0, pending: 0, kasar: 0, amount: 0, pay: 0 }
  );

  const handleCancel = () => onBack?.();
  const handleSave = () => {
    const payload = {
      tab, bankMode, cashType, bankSel, party, rdate, tdate, txnNo, rtype, amount, desc, rows,
    };
    console.log("SAVE:", payload);
    alert("Saved (mock). Check console payload.");
  };
  const handleSaveCreateNew = () => {
    handleSave();
    setCashType(""); setBankSel(""); setParty(""); setAmount(""); setDesc(""); setRows([]);
  };

  return (
    <div className="rc-wrap">
      <div className="rc-head">
        <h3 className="rc-title">New Receipt</h3>
        <span className="rc-home"><Icon.home /></span>
        <span className="nr-bc">– <button className="nr-link" onClick={onBack}>Receipt</button></span>
      </div>

      <div className="nr-card-shell">
        {/* tabs */}
        <div className="nr-tabs">
          <label className={`nr-tab ${tab === "cash" ? "on" : ""}`}>
            <input type="radio" checked={tab === "cash"} onChange={() => setTab("cash")} /> Cash
          </label>
          <label className={`nr-tab ${tab === "bank" ? "on" : ""}`}>
            <input type="radio" checked={tab === "bank"} onChange={() => setTab("bank")} /> Bank
          </label>

          {isBank && (
            <div className="nr-bankm">
              <label className={`nr-tab2 ${bankMode === "online" ? "on" : ""}`}>
                <input type="radio" checked={bankMode === "online"} onChange={() => setBankMode("online")} /> Online
              </label>
              <label className={`nr-tab2 ${bankMode === "cheque" ? "on" : ""}`}>
                <input type="radio" checked={bankMode === "cheque"} onChange={() => setBankMode("cheque")} /> Cheque
              </label>
            </div>
          )}
        </div>

        {/* row: cash/bank + dates */}
        <div className="nr-grid">
          {tab === "cash" ? (
            <div className="nr-col">
              <div className="nr-label">Search Cash Type</div>
              <Select placeholder="Search Cash Type" options={CASH_TYPES} value={cashType} onChange={setCashType} width={300} />
            </div>
          ) : (
            <div className="nr-col">
              <div className="nr-label">Search Bank</div>
              <Select placeholder="Search Bank" options={BANKS} value={bankSel} onChange={setBankSel} width={300} />
            </div>
          )}

          <div className="nr-col">
            <div className="nr-label">Receipt Date<span className="req">*</span></div>
            <DateField value={rdate} onChange={setRdate} width={220} />
          </div>

          {isBank && (
            <>
              <div className="nr-col">
                <div className="nr-label">{auxDateLabel}</div>
                <DateField value={tdate} onChange={setTdate} width={220} />
              </div>
              <div className="nr-col">
                <div className="nr-label">{auxNoLabel}</div>
                <input
                  className="nr-input"
                  placeholder={auxNoPlaceholder}
                  value={txnNo}
                  onChange={(e) => setTxnNo(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* party */}
        <div className="nr-grid">
          <div className="nr-col">
            <div className="nr-label">Select Party<span className="req">*</span></div>
            <Select placeholder="Select Party" options={PARTIES} value={party} onChange={setParty} width={300} />
            <div className="nr-closebal"><span className="nr-help">?</span> Closing Balance: <strong>₹0</strong></div>
          </div>
        </div>

        {/* radio cards */}
        <div className="nr-cards">
          <RadioCard id="on"   value={rtype} setValue={setRtype} title="On Account"      subtitle="Upfront Payment" />
          <RadioCard id="adv"  value={rtype} setValue={setRtype} title="Advance Payment" subtitle="Will be offset by upcoming bills" />
          <RadioCard id="bill" value={rtype} setValue={setRtype} title="Against Bill"    subtitle="Offset against Current Bills" />
        </div>

        {/* amount + description */}
        <div className="nr-grid">
          <div className="nr-col">
            <div className="nr-label">Amount<span className="req">*</span></div>
            <div className="nr-amt">
              <span className="nr-cur">₹</span>
              <input className="nr-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="nr-col nr-col--grow">
            <div className="nr-label">Description</div>
            <textarea
              className="nr-text"
              placeholder="Enter a description (max 200 character)"
              maxLength={200}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <div className="nr-chars">{(desc || "").length}/200 characters</div>
          </div>
        </div>

        {/* AGAINST BILL GRID */}
        {rtype === "bill" && (
          <>
            <div className="nr-bwrap">
              <div className="nr-bthead">
                <div className="c id">#</div>
                <div className="c">Bill No.<span className="req">*</span></div>
                <div className="c">Taxable Amount</div>
                <div className="c">Net Amount</div>
                <div className="c">Paid Amount</div>
                <div className="c">Pending Amount</div>
                <div className="c">Kasar Amount<span className="req">*</span></div>
                <div className="c">Amount<span className="req">*</span></div>
                <div className="c">Payment Amount</div>
                <div className="c actions"></div>
              </div>

              {rows.map((r, idx) => (
                <div className="nr-brow" key={r.id}>
                  <div className="c id">{idx + 1}</div>
                  <div className="c"><input className="nr-input" placeholder="Bill No." value={r.billNo} onChange={(e) => onRow(r.id, "billNo", e.target.value)} /></div>
                  <div className="c"><input className="nr-input" value={r.taxable} onChange={(e) => onRow(r.id, "taxable", e.target.value)} /></div>
                  <div className="c"><input className="nr-input" value={r.net} onChange={(e) => onRow(r.id, "net", e.target.value)} /></div>
                  <div className="c"><input className="nr-input" value={r.paid} onChange={(e) => onRow(r.id, "paid", e.target.value)} /></div>
                  <div className="c"><input className="nr-input" value={r.pending} onChange={(e) => onRow(r.id, "pending", e.target.value)} /></div>
                  <div className="c"><input className="nr-input" value={r.kasar} onChange={(e) => onRow(r.id, "kasar", e.target.value)} /></div>
                  <div className="c"><input className="nr-input" value={r.amount} onChange={(e) => onRow(r.id, "amount", e.target.value)} /></div>
                  <div className="c"><input className="nr-input" value={r.pay} onChange={(e) => onRow(r.id, "pay", e.target.value)} /></div>
                  <div className="c actions">
                    <button className="nr-icon-btn" onClick={() => removeRow(r.id)} title="Remove"><Icon.trash /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="nr-addmore">
              <button className="nr-link" onClick={addRow}><Icon.plus /> Add More</button>
            </div>

            <div className="nr-totalbar">
              <div className="lbl">Total</div>
              <div className="vals">
                <span>{totals.taxable.toFixed(2)}</span>
                <span>{totals.net.toFixed(2)}</span>
                <span>{totals.paid.toFixed(2)}</span>
                <span>{totals.pending.toFixed(2)}</span>
                <span>{totals.kasar.toFixed(2)}</span>
                <span>{totals.amount.toFixed(2)}</span>
                <span className="strong">{totals.pay.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        {/* actions */}
        <div className="nr-actions">
          <button className="nr-btn ghost" onClick={handleCancel}>Cancel</button>
          <button className="nr-btn" onClick={handleSave}>Save</button>
          <button className="nr-btn primary" onClick={handleSaveCreateNew}>Save & Create New</button>
        </div>
      </div>
    </div>
  );
}
