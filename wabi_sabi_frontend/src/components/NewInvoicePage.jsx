// src/components/NewInvoicePage.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "../styles/NewInvoicePage.css";

/* ---------------- Demo data (replace with API) ---------------- */
const CUSTOMERS = [
  {
    id: 1,
    name: "DHEERAJ 9911905095",
    phone: "+91-9911905095",
    billing: { line1: "DHEERAJ", line2: "West Delhi,", line3: "Delhi , India", city: "Delhi", state: "Delhi" },
    shipping:{ line1: "DHEERAJ", line2: "West Delhi,", line3: "Delhi , India", city: "Delhi", state: "Delhi" },
  },
  {
    id: 2,
    name: "DHIRENDRA 7667580928",
    phone: "+91-7667580928",
    billing: { line1: "DHIRENDRA", line2: "Kanpur,", line3: "UP , India", city: "Kanpur", state: "Uttar Pradesh" },
    shipping:{ line1: "DHIRENDRA", line2: "Kanpur,", line3: "UP , India", city: "Kanpur", state: "Uttar Pradesh" },
  },
];

const PAYMENT_TERMS = ["90 Days", "60 Days", "30 Days", "15 Days", "7 Days"];
const CREATE_FROM   = ["Sales Order", "Delivery Challan"];
const SALESMEN      = ["IT Account", "Select Employee", "sandeep", "Rajdeep", "Nishant", "Krishna Pandit"];
const TAX_TYPES     = ["Default", "Tax Inclusive", "Tax Exclusive", "Out of Scope"];
const LEDGERS       = ["Sales"];

const AC_TAXES = [
  { key: "gst15", label: "Gst 15 (15.0%)", pct: 15 },
  { key: "gst12", label: "Gst 12 (12.0%)", pct: 12 },
  { key: "gst5",  label: "Gst 5 (5.0%)",   pct: 5 },
  { key: "none",  label: "None",           pct: 0 },
];

/* ---------------- Helpers ---------------- */
const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/* ---------------- Popover ---------------- */
function Popover({ open, anchorRef, onClose, children, width, align = "left" }) {
  const [style, setStyle] = useState({ top: 0, left: 0, width: width || undefined });

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const w = width || r.width;
    setStyle({
      top: Math.round(r.bottom + 6),
      left: Math.round(align === "right" ? r.right - w : r.left),
      width: Math.round(w),
    });
  }, [open, anchorRef, width, align]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    const onAway = (e) => {
      const inAnchor = anchorRef?.current?.contains(e.target);
      const inPop = e.target.closest?.(".pop");
      if (!inAnchor && !inPop) onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    window.addEventListener("mousedown", onAway);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("mousedown", onAway);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return <div className="pop" style={style}>{children}</div>;
}

/* ---------------- Customer select (search) ---------------- */
function CustomerSelect({ value, onSelect }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const t = q.toLowerCase();
    return CUSTOMERS.filter((c) => c.name.toLowerCase().includes(t));
  }, [q]);

  useEffect(() => { if (!value) setQ(""); }, [value]);

  return (
    <div className="cust-select">
      <div className="inp-wrap">
        <input
          className="inp"
          placeholder="Search Customer"
          value={q || (value ? value.name : "")}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        />
        <span className="mi">expand_more</span>
      </div>

      {open && (
        <div className="cust-dd">
          {!q && <div className="hint">Please enter 1 or more characters</div>}
          {q && list.length === 0 && <div className="hint">No results</div>}
          {list.map((c) => (
            <div key={c.id} className="cust-item" onMouseDown={() => { onSelect(c); setOpen(false); }}>
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Main Page ---------------- */
export default function NewInvoicePage() {
  const [customer, setCustomer] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate]       = useState(todayISO());
  const [reverseCharge, setReverseCharge] = useState("No");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [invoiceNo, setInvoiceNo]         = useState("960");
  const [taxType, setTaxType]           = useState("Default");
  const [paymentTerm, setPaymentTerm]   = useState("");
  const [createFrom, setCreateFrom]     = useState("Select");
  const [salesman, setSalesman]         = useState("IT Account");
  const [exportSEZ, setExportSEZ]       = useState(false);
  const [ledger, setLedger]             = useState("Sales");
  const [paymentReminder, setPaymentReminder] = useState(false);

  const placeOfSupply = customer?.billing?.state || "-";
  const billing  = customer?.billing;
  const shipping = customer?.shipping;

  /* --------- Product rows --------- */
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (customer && rows.length === 0) {
      setRows([{ id: 1, salesman: "", itemcode: "", product: "", batch: "", qty: 0, free: 0, price: 0, dis1: 0, dis2: 0, taxPct: 0 }]);
    }
  }, [customer, rows.length]);

  const addRow = () =>
    setRows((r) => [...r, {
      id: r.length ? r[r.length - 1].id + 1 : 1, salesman: "", itemcode: "", product: "", batch: "",
      qty: 0, free: 0, price: 0, dis1: 0, dis2: 0, taxPct: 0,
    }]);
  const updateRow = (id, patch) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  /* --------- Additional charges --------- */
  const [acRows, setAcRows] = useState([]);
  const addACRow = () =>
    setAcRows((r) => [...r, { id: r.length ? r[r.length - 1].id + 1 : 1, name: "", value: 0, taxKey: "gst15" }]);
  const updateAC = (id, patch) => setAcRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const acTotals = useMemo(() => {
    let sum = 0, valSum = 0;
    const rows = acRows.map((r) => {
      const taxPct = AC_TAXES.find((t) => t.key === r.taxKey)?.pct ?? 0;
      const val = Number(r.value) || 0;
      const taxAmt = val * (taxPct / 100);
      const total = val + taxAmt;
      valSum += val; sum += total;
      return { ...r, taxAmt, total };
    });
    return { rows, valueSum: valSum, grand: sum };
  }, [acRows]);

  /* --------- Totals from product rows --------- */
  const computed = useMemo(() => {
    let gross = 0, discount = 0, taxable = 0, tax = 0, total = 0, qtySum = 0;

    const items = rows.map((r) => {
      const price = Number(r.price) || 0;
      const qty   = Number(r.qty)   || 0;
      const d1    = Number(r.dis1)  || 0;
      const d2    = Number(r.dis2)  || 0;
      const taxPct= Number(r.taxPct)|| 0;

      const lineGross  = price * qty;
      const afterD1    = lineGross * (1 - d1/100);
      const afterD2    = afterD1   * (1 - d2/100);
      const lineTax    = afterD2   * (taxPct/100);
      const lineTotal  = afterD2 + lineTax;

      qtySum += qty; gross += lineGross; discount += lineGross - afterD2; taxable += afterD2; tax += lineTax; total += lineTotal;

      return { ...r, lineGross, lineTax, lineTotal, taxable: afterD2 };
    });

    return { items, totals: { gross, discount, taxable, tax, roundoff: 0, net: total, qty: qtySum } };
  }, [rows]);

  /* --------- Popover refs --------- */
  const ptBtn = useRef(null); const [ptOpen, setPtOpen] = useState(false);
  const cfBtn = useRef(null); const [cfOpen, setCfOpen] = useState(false);
  const smBtn = useRef(null); const [smOpen, setSmOpen] = useState(false);
  const ttBtn = useRef(null); const [ttOpen, setTtOpen] = useState(false);
  const ledBtn = useRef(null); const [ledOpen, setLedOpen] = useState(false);

  /* --------- Footer button handlers --------- */
  const buildPayload = () => ({
    header: {
      customer: customer?.name || "", invoiceDate, dueDate, reverseCharge,
      invoiceNo: `${invoicePrefix}-${invoiceNo}`, taxType, paymentTerm, createFrom,
      salesman, exportSEZ, ledger, paymentReminder, placeOfSupply,
    },
    addresses: { billing, shipping },
    items: computed.items,
    additionalCharges: acTotals.rows,
    totals: { ...computed.totals, additionalCharges: acTotals.grand, grandNet: computed.totals.net + acTotals.grand },
  });

  const handleClear = () => {
    setCustomer(null); setInvoicePrefix("INV"); setInvoiceNo("960"); setPaymentTerm("");
    setCreateFrom("Select"); setSalesman("IT Account"); setReverseCharge("No"); setTaxType("Default");
    setExportSEZ(false); setPaymentReminder(false); setLedger("Sales");
    setRows([]); setAcRows([]);
    setInvoiceDate(todayISO()); setDueDate(todayISO());
  };

  const save = (mode) => {
    const payload = buildPayload();
    console.log("SAVE MODE:", mode, payload);
    window.alert(
      mode === "print"   ? "Saved! Opening Print/Preview…" :
      mode === "payment" ? "Saved! Redirecting to Payment…" :
      mode === "new"     ? "Saved! Creating new invoice…" :
                           "Saved!"
    );
    if (mode === "new") handleClear();
  };

  const handleCancel = () => {
    if (window.confirm("Discard changes and go back?")) handleClear();
  };

  return (
    <div className="ni-page">
      <div className="ni-bc"><span className="mi">home</span><span>Sales</span><span className="active">New Invoice</span></div>

      {/* ===== TOP CARD ===== */}
      <div className="box">
        <div className="fg">
          {/* Customer */}
          <div className="fld">
            <label> Select Customer <span className="req">*</span> </label>
            <CustomerSelect value={customer} onSelect={setCustomer} />
          </div>

          {/* Invoice Date */}
          <div className="fld">
            <label> Invoice Date <span className="req">*</span> </label>
            <div className="date">
              <input type="date" className="inp" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              <span className="mi">event</span>
            </div>
          </div>

          {/* Reverse Charge */}
          <div className="fld">
            <label>Reverse Charge</label>
            <div className="select">
              <select value={reverseCharge} onChange={(e) => setReverseCharge(e.target.value)}>
                <option>No</option><option>Yes</option>
              </select>
              <span className="mi">expand_more</span>
            </div>
          </div>

          {/* Invoice No */}
          <div className="fld">
            <label> Invoice No. <span className="req">*</span> </label>
            <div className="row">
              <input className="inp" style={{ maxWidth: 88 }} value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
              <input className="inp" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            </div>
          </div>

          {/* Place of Supply */}
          <div className="fld">
            <label>Place of Supply: {placeOfSupply}</label>
            <div className="muted">—</div>
          </div>

          {/* Payment Term */}
          <div className="fld">
            <label>Payment Term</label>
            <button ref={ptBtn} className="btn-sel w" onClick={() => setPtOpen(v => !v)}>
              {paymentTerm || "Select Payment Term"} <span className="mi">expand_more</span>
            </button>
            <Popover open={ptOpen} anchorRef={ptBtn} onClose={() => setPtOpen(false)}>
              <div className="menu">
                {PAYMENT_TERMS.map(t => (
                  <div key={t} className={`mi-item ${paymentTerm===t?"sel":""}`} onMouseDown={() => { setPaymentTerm(t); setPtOpen(false); }}>{t}</div>
                ))}
              </div>
            </Popover>
          </div>

          {/* Due Date */}
          <div className="fld">
            <label> Due Date <span className="req">*</span> </label>
            <div className="date">
              <input type="date" className="inp" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <span className="mi">event</span>
            </div>
          </div>

          {/* Tax Type */}
          <div className="fld">
            <label>Tax Type</label>
            <button ref={ttBtn} className="btn-sel w" onClick={() => setTtOpen(v => !v)}>
              {taxType} <span className="mi">expand_more</span>
            </button>
            <Popover open={ttOpen} anchorRef={ttBtn} onClose={() => setTtOpen(false)}>
              <div className="menu">
                {TAX_TYPES.map(t => (
                  <div key={t} className={`mi-item ${taxType===t?"sel":""}`} onMouseDown={() => { setTaxType(t); setTtOpen(false); }}>{t}</div>
                ))}
              </div>
            </Popover>
          </div>

          {/* Billing Address */}
          <div className="fld">
            <label>Billing Address</label>
            {!billing ? (
              <div className="muted">Billing Address is Not Provided</div>
            ) : (
              <div className="addr">
                <div>{billing.line1}</div><div>{billing.line2}</div><div>{billing.line3}</div>
                <div className="addr-row"><span className="mi">call</span>{customer.phone}</div>
                <button className="addr-link">Change Address</button>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="fld">
            <label>Shipping Address</label>
            {!shipping ? (
              <div className="muted">Shipping Address is Not Provided</div>
            ) : (
              <div className="addr">
                <div>{shipping.line1}</div><div>{shipping.line2}</div><div>{shipping.line3}</div>
                <div className="addr-row"><span className="mi">call</span>{customer.phone}</div>
                <div className="addr-actions">
                  <button className="addr-link">Change Address</button>
                  <button className="addr-link">Edit Shipping Address</button>
                </div>
              </div>
            )}
          </div>

          {/* Create From */}
          <div className="fld">
            <label>Create Invoice From</label>
            <button ref={cfBtn} className="btn-sel w" onClick={() => setCfOpen(v => !v)}>
              {createFrom} <span className="mi">expand_more</span>
            </button>
            <Popover open={cfOpen} anchorRef={cfBtn} onClose={() => setCfOpen(false)}>
              <div className="menu">
                {CREATE_FROM.map(t => (
                  <div key={t} className={`mi-item ${createFrom===t?"sel":""}`} onMouseDown={() => { setCreateFrom(t); setCfOpen(false); }}>{t}</div>
                ))}
              </div>
            </Popover>
          </div>

          {/* Sales Man */}
          <div className="fld">
            <label>Sales Man</label>
            <button ref={smBtn} className="btn-sel w" onClick={() => setSmOpen(v => !v)}>
              {salesman} <span className="mi">expand_more</span>
            </button>
            <Popover open={smOpen} anchorRef={smBtn} onClose={() => setSmOpen(false)}>
              <div className="menu">
                {SALESMEN.map(t => (
                  <div key={t} className={`mi-item ${salesman===t?"sel":""}`} onMouseDown={() => { setSalesman(t); setSmOpen(false); }}>{t}</div>
                ))}
              </div>
            </Popover>
          </div>

          {/* Reminder & Export */}
          <div className="fld chk">
            <label><input type="checkbox" checked={paymentReminder} onChange={(e)=>setPaymentReminder(e.target.checked)} /> Payment Reminder</label>
          </div>
          <div className="fld chk">
            <label><input type="checkbox" checked={exportSEZ} onChange={(e)=>setExportSEZ(e.target.checked)} /> Export/SEZ</label>
          </div>

          {/* Ledger */}
          <div className="fld">
            <label> Select Account Ledger <span className="req">*</span> </label>
            <button ref={ledBtn} className="btn-sel w" onClick={() => setLedOpen(v => !v)}>
              {ledger} <span className="mi">expand_more</span>
            </button>
            <Popover open={ledOpen} anchorRef={ledBtn} onClose={() => setLedOpen(false)}>
              <div className="menu">
                {LEDGERS.map(t => (
                  <div key={t} className={`mi-item ${ledger===t?"sel":""}`} onMouseDown={() => { setLedger(t); setLedOpen(false); }}>{t}</div>
                ))}
              </div>
            </Popover>
          </div>
        </div>
      </div>

      {/* ===== Tabs + Upload ===== */}
      <div className="tabs">
        <button className="on">Product Details</button>
        <button>Terms & Condition/Note</button>
        <button>Shipping Details</button>
        <div className="sp" />
        <button className="upload"><span className="mi">upload</span> Upload Products</button>
      </div>

      {/* ===== Product table ===== */}
      <div className="box table-card">
        <table className="grid">
          <thead>
            <tr>
              <th className="w40"></th>
              <th className="w40">#</th>
              <th>Sales Man</th>
              <th>Itemcode</th>
              <th>Product <span className="req">*</span></th>
              <th>Batch</th>
              <th className="num">Qty <span className="req">*</span></th>
              <th className="num">Free Qty</th>
              <th className="num">Price <span className="req">*</span></th>
              <th className="num">Dis1 <span className="req">*</span></th>
              <th className="num">Dis2 <span className="req">*</span></th>
              <th className="num">Taxable</th>
              <th className="num">Tax</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id}>
                <td className="w40">
                  {idx === 0 ? (
                    <button className="circle add" title="Add row" onClick={addRow}>+</button>
                  ) : (
                    <button className="circle remove" title="Remove row" onClick={() => setRows(rows.filter(x => x.id !== r.id))}>–</button>
                  )}
                </td>
                <td className="w40">{idx + 1}</td>
                <td><input className="inp" value={r.salesman} onChange={(e)=>updateRow(r.id,{salesman:e.target.value})} /></td>
                <td><input className="inp" value={r.itemcode} onChange={(e)=>updateRow(r.id,{itemcode:e.target.value})} placeholder="ItemCode" /></td>
                <td><input className="inp" value={r.product} onChange={(e)=>updateRow(r.id,{product:e.target.value})} placeholder="Search Product" /></td>
                <td><input className="inp" value={r.batch} onChange={(e)=>updateRow(r.id,{batch:e.target.value})} /></td>
                <td className="num"><input className="num-in" value={r.qty} onChange={(e)=>updateRow(r.id,{qty:e.target.value})} /></td>
                <td className="num"><input className="num-in" value={r.free} onChange={(e)=>updateRow(r.id,{free:e.target.value})} /></td>
                <td className="num"><input className="num-in" value={r.price} onChange={(e)=>updateRow(r.id,{price:e.target.value})} /></td>
                <td className="num"><input className="num-in" value={r.dis1} onChange={(e)=>updateRow(r.id,{dis1:e.target.value})} /><span className="pct-cell">%</span></td>
                <td className="num"><input className="num-in" value={r.dis2} onChange={(e)=>updateRow(r.id,{dis2:e.target.value})} /><span className="pct-cell">%</span></td>
                <td className="num">{(computed.items[idx]?.taxable ?? 0).toFixed(2)}</td>
                <td className="num">{(computed.items[idx]?.lineTax ?? 0).toFixed(2)}</td>
                <td className="num">{(computed.items[idx]?.lineTotal ?? 0).toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={14} className="center">Total</td></tr>
            )}
            {rows.length > 0 && (
              <tr className="tfoot">
                <td colSpan={6}>Total</td>
                <td className="num">{computed.totals.qty}</td>
                <td className="num">0</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">{computed.totals.taxable.toFixed(2)}</td>
                <td className="num">{computed.totals.tax.toFixed(2)}</td>
                <td className="num">{computed.totals.net.toFixed(2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Bottom area: Additional charges (left) + Totals (right) ===== */}
      <div className="bottom-two">
        {/* Additional Charges */}
        <div className="box ac-card">
          <div className="ac-top">
            <button
              type="button"
              className="ac-add"
              onClick={() => addACRow()}
            >
              <span className="mi">add_circle</span> Add Additional Charges
            </button>
          </div>

          <div className="ac-body">
            {acTotals.rows.length > 0 && (
              <table className="ac-grid">
                <thead>
                  <tr>
                    <th className="w60"></th>
                    <th className="w60">#</th>
                    <th>Additional Charge <span className="req">*</span></th>
                    <th className="right">Value <span className="req">*</span></th>
                    <th>Tax</th>
                    <th className="right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {acTotals.rows.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="w60">
                        {idx === 0 ? (
                          <button className="circle add" onClick={addACRow}>+</button>
                        ) : (
                          <button className="circle remove" onClick={() => setAcRows(list => list.filter(x => x.id !== r.id))}>–</button>
                        )}
                      </td>
                      <td className="w60">{idx + 1}</td>
                      <td>
                        <div className="sel-input">
                          <input
                            className="inp"
                            placeholder="Search Additional"
                            value={r.name}
                            onChange={(e)=>updateAC(r.id,{name:e.target.value})}
                          />
                          {/* FIX: icon font + absolute centering */}
                          <span className="mi">expand_more</span>
                        </div>
                      </td>
                      <td className="right">
                        <input className="num-in" value={r.value} onChange={(e)=>updateAC(r.id,{value:e.target.value})} />
                      </td>
                      <td>
                        <div className="select">
                          <select value={r.taxKey} onChange={(e)=>updateAC(r.id,{taxKey:e.target.value})}>
                            {AC_TAXES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                          </select>
                          <span className="mi">expand_more</span>
                        </div>
                      </td>
                      <td className="right">{r.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}></td>
                    <td className="right">{acTotals.valueSum.toFixed(2)}</td>
                    <td className="right">—</td>
                    <td className="right">{acTotals.grand.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* Totals Card (right) */}
        <div className="box sum side">
          <div className="row">
            <span>Flat Discount</span>
            <div className="fd-inputs"><input defaultValue={0} /><button className="pct">%</button></div>
          </div>
          <div className="row"><span>Gross Amount</span><b>{computed.totals.gross.toFixed(2)}</b></div>
          <div className="row"><span>Discount</span><b>{computed.totals.discount.toFixed(2)}</b></div>
          <div className="row"><span>Taxable Amount</span><b>{computed.totals.taxable.toFixed(2)}</b></div>
          <div className="row"><span>Tax Amount</span><b>{computed.totals.tax.toFixed(2)}</b></div>
          <div className="row"><span>Roundoff</span><b>{computed.totals.roundoff.toFixed(2)}</b></div>
          <div className="row net"><span>Net Amount</span><b>{(computed.totals.net + acTotals.grand).toFixed(2)}</b></div>
        </div>
      </div>

      {/* ===== Sticky footer ===== */}
      <div className="sticky-actions">
        <div>
          <button className="btn danger" onClick={handleCancel}>Cancel</button>
          <button className="btn warn" style={{ marginLeft: 8 }} onClick={handleClear}>Clear</button>
        </div>
        <button className="btn dark" onClick={() => save("print")}>Save & Print/Preview</button>
        <div>
          <button className="btn primary" onClick={() => save("save")}>Save</button>
          <button className="btn primary" style={{ marginLeft: 8 }} onClick={() => save("new")}>Save & Create New</button>
          <button className="btn primary" style={{ marginLeft: 8 }} onClick={() => save("payment")}>Save & Payment</button>
        </div>
      </div>
    </div>
  );
}
