// src/components/InvoiceDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "../styles/InvoiceDetailPage.css";
import { getMasterPack } from "../api/client";

/* ==== helpers ==== */
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n || 0));
const sum = (arr, k) => arr.reduce((a, r) => a + Number(r[k] || 0), 0);

function downloadBlob(name, mime, content) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function itemsToCSV(items) {
  const headers = [
    "#","Sales By","Itemcode","Product","Batch",
    "Invoiced Qty","Invoiced Free Qty","Price","Dis1","Dis2","Taxable","Tax","Total"
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const lines = [headers.map(esc).join(",")];
  items.forEach(r=>{
    lines.push([
      r.idx,"-",r.itemCode,r.itemName,r.batch,
      r.qty,r.free,r.price.toFixed(2),"0.00₹","0.00₹",
      r.taxable.toFixed(2),r.tax.toFixed(2),r.total.toFixed(2)
    ].map(esc).join(","));
  });
  return lines.join("\r\n");
}

/* date helpers */
const toDMY = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
const toReadableDT = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const dt = d.toLocaleDateString("en-GB");
  const tm = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${dt} ${tm}`;
};

export default function InvoiceDetailPage() {
  const { invNo } = useParams();
  const [topTab, setTopTab] = useState("general");
  const [tab, setTab] = useState("product");

  // ---- NEW: fetch MasterPack detail and normalize into your previous shape ----
  const [pack, setPack] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let on = true;
    setErr("");
    (async () => {
      try {
        const raw = await getMasterPack(invNo);
        const p = raw && raw.pack ? raw.pack : raw; // accept wrapped or raw
        if (!on) return;
        setPack(p || null);
      } catch (e) {
        if (!on) return;
        setErr(e?.message || "Failed to load invoice");
      }
    })();
    return () => { on = false; };
  }, [invNo]);

  const data = useMemo(() => {
    // If backend not loaded yet OR error, keep a safe fallback so page renders
    const mp = pack || {};
    const lines = Array.isArray(mp.lines) ? mp.lines : [];

    const invoiceNo = mp.number || invNo || "INV-NA";
    const invoiceDate = toDMY(mp.created_at);
    const createdTime = toReadableDT(mp.created_at);
    const dueDate = invoiceDate;
    const totalAmount = Number(mp.amount_total ?? 0);

    // Use first line's location as "Created By"/Place of Supply
    const firstLoc = lines[0]?.location || {};
    const locName = firstLoc.name || firstLoc.code || "WABI SABI LLP";

    // Build items (keep numeric fields since your table/CSV calls .toFixed())
    const items = lines.map((ln, i) => ({
      idx: i + 1,
      itemCode: ln?.barcode || "",
      itemName: ln?.name || "",
      batch: "",          // empty
      qty: 1,             // default 1
      free: 0,
      price: Number(ln?.sp ?? 0),
      taxable: 0,         // keep numeric to avoid .toFixed crash
      tax: 0,             // keep blank in UI by rendering 0 with your existing cells
      total: Number(ln?.sp ?? 0),
    }));

    // Build object the rest of your JSX already expects
    return {
      party: {
        name: locName || "Unknown Customer –",
        slug: encodeURIComponent(locName || "unknown-customer"),
        placeOfSupply: locName,
        billing: {
          line1: "J-1/61, RAJORI GARDEN, New Delhi West Delhi – 110027 Delhi India",
          line2: "",
          gstin: "07AADFW9945P1Z6",
          phone: "+91-9599883461",
        },
        shipping: {
          line1: "J-1/61, RAJORI GARDEN, New Delhi West Delhi – 110027 Delhi India",
          line2: "",
          gstin: "07AADFW9945P1Z6",
          phone: "Mobile no. is not provided",
        },
      },
      meta: {
        invoiceNo,
        invoiceDate,
        dueDate,
        reverseCharge: "No",
        paymentTerm: "N/A",
        exportSez: "No",
        paymentReminder: "No",
        accountLedger: "Sales",
        createdBy: "Krishna Pandit",
        createdTime,
        paidAmount: 0,
        dueAmount: totalAmount,   // Due same as total
        totalAmount,
      },
      items,
      terms: ["Goods once sold, cannot be returned. Wabi Sabi xxxxxx"],
      note: "",
      receipts: [],
      credits: [],
      shipping: {
        type: "Delivery",
        shipDate: invoiceDate,
        refNo: "",
        transportDate: invoiceDate,
        mode: "",
        transporter: "",
        weight: "",
        vehicle: "",
      },
      summary: {
        grossAmount: totalAmount,
        discount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        roundoff: 0,
        netAmount: totalAmount,
      },
      history: [{
        dt: createdTime || invoiceDate,
        action: "Invoice created Of Amount",
        amount: totalAmount,
        by: "krishna Pandit",
      }],
    };
  }, [pack, invNo]);

  /* icon handlers */
  const onPrint = () => window.print();
  const onPDF = () => {
    const head = `Invoice ${data.meta.invoiceNo}\nCustomer: ${data.party.name}\nDate: ${data.meta.invoiceDate}\n\nItems:\n`;
    const body = data.items.map(r=>`${r.idx}. ${r.itemName} x${r.qty}  ₹${r.total.toFixed(2)}`).join("\n");
    const foot = `\n\nNet Amount: ${fmt(data.summary.netAmount)}`;
    downloadBlob(`${data.meta.invoiceNo}.pdf`,"application/pdf",head+body+foot);
  };
  const onCSV = () => downloadBlob(`${data.meta.invoiceNo}_items.csv`,"text/csv;charset=utf-8",itemsToCSV(data.items));
  const onCopy  = async () => {
    try { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
    catch { alert("Copy failed"); }
  };
  const onEmail = () => {
    const s=encodeURIComponent(`Invoice ${data.meta.invoiceNo}`);
    const b=encodeURIComponent(`Please find Invoice ${data.meta.invoiceNo}.\n\nLink: ${window.location.href}`);
    window.location.href=`mailto:?subject=${s}&body=${b}`;
  };

  return (
    <div className="invd-root">
      {/* header */}
      <div className="invd-header">
        <div className="crumb">
          <span className="code">{data.meta.invoiceNo}</span>
          <Link className="crumb-link" to="/sales/invoice">- Invoice</Link>
        </div>
        <div className="header-actions">
          <button className="ico b" title="Delivery/Ship (disabled)" disabled><span className="mi">local_shipping</span></button>
          <button className="ico b" title="Print" onClick={onPrint}><span className="mi">print</span></button>
          <button className="ico g" title="Email" onClick={onEmail}><span className="mi">mail</span></button>
          <button className="ico y" title="Download PDF" onClick={onPDF}><span className="mi">picture_as_pdf</span></button>
          <button className="ico p" title="Export CSV" onClick={onCSV}><span className="mi">table_view</span></button>
          <button className="ico s" title="Copy Link" onClick={onCopy}><span className="mi">link</span></button>
        </div>
      </div>

      {/* status + top tabs */}
      <div className="invd-ribbon"><span className="pill green">INVOICED</span></div>
      <div className="invd-tabs1">
        <button className={topTab==="general"?"active":""} onClick={()=>setTopTab("general")}>General</button>
        <button className={topTab==="history"?"active":""} onClick={()=>setTopTab("history")}>History</button>
      </div>

      {/* top content (general / history) */}
      {topTab === "general" ? (
        <div className="invd-grid">
          <div className="invd-card">
            <div className="invd-row"><div className="invd-col">
              <div className="invd-label">Customer</div>
              <Link
                className="invd-link"
                to={`/customer/${encodeURIComponent(data.party.slug || data.party.name)}?inv=${encodeURIComponent(data.meta.invoiceNo)}`}
                state={{ fromInvoice: data }}
              >
                {data.party.name}
              </Link>
            </div></div>
            <div className="invd-row"><div className="invd-col">
              <div className="invd-label">Place of Supply</div>
              <div>{data.party.placeOfSupply}</div>
            </div></div>
            <div className="invd-row"><div className="invd-col">
              <div className="invd-label">Billing Address</div>
              <div className="invd-addr">
                <div>{data.party.billing.line1}</div>
                <div>{data.party.billing.line2}</div>
                <div>GSTIN – {data.party.billing.gstin}</div>
                <div>📞 {data.party.billing.phone}</div>
              </div>
            </div></div>
            <div className="invd-row"><div className="invd-col">
              <div className="invd-label">Shipping Address</div>
              <div className="invd-addr">
                <div>{data.party.shipping.line1}</div>
                <div>{data.party.shipping.line2}</div>
                <div>GSTIN – {data.party.shipping.gstin}</div>
                <div>📞 {data.party.shipping.phone}</div>
              </div>
            </div></div>
          </div>

          <div className="invd-card">
            <div className="invd-meta">
              <Meta label="Invoice Date" value={data.meta.invoiceDate} />
              <Meta label="Invoice No." value={data.meta.invoiceNo} />
              <Meta label="Reverse Charge" value={data.meta.reverseCharge} />
            </div>
            <div className="invd-meta">
              <Meta label="Payment Term" value={data.meta.paymentTerm} />
              <Meta label="Due Date" value={data.meta.dueDate} />
              <Meta label="Export/SEZ" value={data.meta.exportSez} />
              <Meta label="Payment Reminder" value={data.meta.paymentReminder} />
              <Meta label="Account Ledger" value={data.meta.accountLedger} />
              <Meta label="Created By" value={data.meta.createdBy} />
              <Meta label="Created Time" value={data.meta.createdTime} />
            </div>
            <div className="invd-status">
              <div>
                <div className="muted">Payment status</div>
                <div className="rows"><span>Due Amount</span><strong className="amt">{fmt(data.meta.dueAmount)}</strong></div>
                <div className="rows"><span>Paid Amount</span><strong className="amt">{fmt(data.meta.paidAmount)}</strong></div>
                <div className="rows total"><span>Total Amount</span><strong className="amt">{fmt(data.meta.totalAmount)}</strong></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="invd-card invd-historycard">
          {data.history.map((h, i)=>(
            <div key={i} className="hist-row">
              <div className="time">{h.dt}</div>
              <div className="dotline" aria-hidden />
              <div className="text">
                <span className="bold">Invoice</span> created Of Amount <span className="bold">{fmt(h.amount)}</span> by <span className="bold">{h.by}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* bottom tabs */}
      <div className="invd-tabs2">
        <button className={tab==="product"?"active":""} onClick={()=>setTab("product")}>Product Details</button>
        <button className={tab==="terms"?"active":""} onClick={()=>setTab("terms")}>Terms & Condition / Note</button>
        <button className={tab==="receipt"?"active":""} onClick={()=>setTab("receipt")}>Receipt</button>
        <button className={tab==="credit"?"active":""} onClick={()=>setTab("credit")}>Credit Note</button>
        <button className={tab==="ship"?"active":""} onClick={()=>setTab("ship")}>Shipping Details</button>
      </div>

      {/* tab content */}
      {tab === "product" && (
        <div className="invd-card">
          <div className="invd-table-wrap">
            <table className="invd-table">
              <thead>
                <tr>
                  <th className="w40">#</th>
                  <th>Sales By</th>
                  <th>Itemcode</th>
                  <th>Product</th>
                  <th>Batch</th>
                  <th className="num">Invoiced Qty</th>
                  <th className="num">Invoiced Free Qty</th>
                  <th className="num">Price</th>
                  <th className="num">Dis1</th>
                  <th className="num">Dis2</th>
                  <th className="num">Taxable</th>
                  <th>Tax</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(r=>(
                  <tr key={r.idx}>
                    <td>{r.idx}</td><td>-</td><td>{r.itemCode}</td><td>{r.itemName}</td><td>{r.batch}</td>
                    <td className="num">{r.qty}</td><td className="num">{r.free}</td>
                    <td className="num">{r.price.toFixed(2)}</td>
                    <td className="num">0.00₹</td><td className="num">0.00₹</td>
                    <td className="num linkish">{r.taxable.toFixed(2)}</td>
                    <td><div className="tax-lines"><div>GST 5%</div><div className="muted">cess 0%</div><div className="muted">Rs. {r.tax.toFixed(2)}</div></div></td>
                    <td className="num">{r.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}/>
                  <td className="num strong">{sum(data.items,"qty")}</td>
                  <td className="num strong">{sum(data.items,"free")}</td>
                  <td/><td/><td/>
                  <td className="num strong">{sum(data.items,"taxable").toFixed(2)}</td>
                  <td/>
                  <td className="num strong">{sum(data.items,"total").toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {tab === "terms" && (
        <div className="invd-termwrap">
          <div className="invd-card">
            <div className="invd-subtitle">Terms & Condition</div>
            <table className="invd-table mini">
              <thead>
                <tr><th className="w40">#</th><th>Terms & Condition</th></tr>
              </thead>
              <tbody>
                {data.terms.map((t,i)=>(
                  <tr key={i}><td className="num">{i+1}</td><td>{t}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="invd-card invd-note">
            <div className="note-head">Note</div>
            <textarea className="note-ta" value={data.note} readOnly placeholder=""/>
          </div>
        </div>
      )}

      {tab === "receipt" && (
        <div className="invd-card">
          <div className="invd-table-wrap">
            <table className="invd-table">
              <thead>
                <tr><th className="w40">#</th><th>Receipt No</th><th>Date</th><th>Payment Mode</th><th>Amount</th><th>Action</th></tr>
              </thead>
              <tbody>
                <tr><td colSpan={6} className="muted center">No data available in table</td></tr>
              </tbody>
            </table>
            <div className="mini-foot">
              <span>Showing 0 to 0 of 0 entries</span>
              <div className="pager-mini"><button disabled>‹</button><button disabled>›</button></div>
            </div>
          </div>
        </div>
      )}

      {tab === "credit" && (
        <div className="invd-card">
          <div className="invd-table-wrap">
            <table className="invd-table">
              <thead>
                <tr><th className="w40">#</th><th>Sales No</th><th>Date</th><th>Paid Amount</th><th>Total</th><th>Action</th></tr>
              </thead>
              <tbody>
                <tr><td colSpan={6} className="muted center">No data available in table</td></tr>
              </tbody>
            </table>
            <div className="mini-foot">
              <span>Showing 0 to 0 of 0 entries</span>
              <div className="pager-mini"><button disabled>‹</button><button disabled>›</button></div>
            </div>
          </div>
        </div>
      )}

      {tab === "ship" && (
        <div className="invd-shipwrap">
          <div className="invd-shipcard">
            <table className="invd-shiptable">
              <tbody>
                <ShRow k1="Shipping Type:" v1={data.shipping.type} k2="Shipping Date:" v2={data.shipping.shipDate} />
                <ShRow k1="Reference No. :" v1={data.shipping.refNo} k2="Transport Date:" v2={data.shipping.transportDate} />
                <ShRow k1="Mode of Transport. :" v1={data.shipping.mode} k2="Transporter Name:" v2={data.shipping.transporter} />
                <ShRow k1="Weight:" v1={data.shipping.weight} k2="Vehicle No. :" v2={data.shipping.vehicle} />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* bottom: Additional & summary */}
      <div className="invd-south">
        <div className="invd-card">
          <div className="invd-subtitle">Additional Charge</div>
          <table className="invd-table small">
            <thead><tr><th className="w40">#</th><th>Additional Charge</th><th className="num">Value</th><th>Tax</th><th className="num">Total</th></tr></thead>
            <tbody><tr><td colSpan={5} className="muted">No Additional Charges</td></tr></tbody>
            <tfoot><tr><td colSpan={4} className="strong" style={{textAlign:"right"}}>Total</td><td className="num strong">0.0</td></tr></tfoot>
          </table>
        </div>

        <div className="invd-summary">
          <table>
            <tbody>
              <Row k="Flat Discount" v="0.00 %" />
              <Row k="Gross Amount" v={data.summary.grossAmount} money />
              <Row k="Discount" v={data.summary.discount} money />
              <Row k="Taxable Amount" v={data.summary.taxableAmount} money />
              <Row k="Tax Amount" v={data.summary.taxAmount} money highlight />
              <Row k="Roundoff" v={data.summary.roundoff} money />
              <Row k="Net Amount" v={data.summary.netAmount} money big />
            </tbody>
          </table>
        </div>
      </div>
      {err && <div className="muted" style={{padding:"8px 16px"}}>Note: {err}</div>}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div className="meta">
      <div className="muted">{label}</div>
      <div>{value}</div>
    </div>
  );
}
function Row({ k, v, money, big, highlight }) {
  const render = money ? fmt(v) : v;
  return (
    <tr className={big ? "big" : ""}>
      <td className="key">{k}</td>
      <td className={`val ${highlight ? "hl" : ""}`}>{render}</td>
    </tr>
  );
}
function ShRow({ k1, v1, k2, v2 }) {
  return (
    <tr>
      <td className="k">{k1}</td>
      <td className="v">{v1}</td>
      <td className="k">{k2}</td>
      <td className="v">{v2}</td>
    </tr>
  );
}
