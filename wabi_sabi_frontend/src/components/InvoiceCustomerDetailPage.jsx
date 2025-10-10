// src/components/CustomerDetailPage.jsx
import React, { useMemo, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import "../styles/InvoiceDetailPage.css";

/* INR format */
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));

export default function CustomerDetailPage() {
  const { slug } = useParams();
  const { state, search } = useLocation();
  const qs = new URLSearchParams(search);
  const invNo = qs.get("inv") || state?.fromInvoice?.meta?.invoiceNo || "-";

  // पार्टी/ऐड्रेस डेटा invoice-context से
  const { party, meta } = state?.fromInvoice || { party: {}, meta: {} };

  const model = useMemo(() => {
    const p = party || {};
    const bill = p.billing || {};
    const ship = p.shipping || {};
    return {
      name: p.name || decodeURIComponent(slug),
      since: meta?.createdTime || "16/07/2025 11:43 AM",
      company: p.name || "-",
      type: "Retailer",
      code: p.code || "",
      contact: bill.phone || "N/A",
      whatsapp: bill.phone || "N/A",
      email: p.email || "Email is Not Provided",
      pan: p.pan || "N/A",
      due: meta?.dueAmount ?? 0,
      telephone: p.telephone || "N/A",
      dob: p.dob || "N/A",
      anniversary: p.anniversary || "N/A",
      remarks: p.remarks || "N/A",
      accountGroup: p.accountGroup || "Sundry Debtors",

      // Address Details (left block जैसा)
      addrFirstName: p.firstName || `${p.name || ""}`,
      addrLastName: p.lastName || "",
      gstType: p.gstType || "Registered",
      gstin: bill.gstin || "N/A",
      line1: bill.line1 || "N/A",
      line2: bill.line2 || "",
      country: bill.country || "India",
      state: bill.state || "Delhi",
      city: bill.city || "West Delhi",
      zip: bill.zip || "122015",
      mobile: bill.phone ? `+91-${bill.phone}` : "+91–730342070",
    };
  }, [party, meta, slug]);

  // टैब्स
  const TABS = [
    "General Details",
    "Address Details",
    "Invoice",
    "Credit Note",
    "Receipt",
    "Payment",
    "Customer Loyalty Ledger",
  ];
  const [tab, setTab] = useState(TABS[0]);

  return (
    <div className="invd-root">
      {/* breadcrumb + right icons (exact look) */}
      <div className="invd-header">
        <div className="crumb">
          <span className="code">{model.name}</span>
          <span className="crumb-link">- Customer</span>
        </div>
        <div className="header-actions">
          <button className="ico b" title="Statement"><span className="mi">article</span></button>
          <button className="ico g" title="Export"><span className="mi">file_download</span></button>
          <button className="ico y" title="PDF"><span className="mi">picture_as_pdf</span></button>
          <button className="ico s" title="More"><span className="mi">more_horiz</span></button>
        </div>
      </div>

      {/* Tabs – underline style */}
      <div className="cust-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`cust-tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ---- General Details ---- */}
      {tab === "General Details" && (
        <div className="cust-card">
          <div className="cust-title">Since {model.since}</div>

          <div className="cust-grid">
            {/* Left table */}
            <table className="cust-table">
              <tbody>
                <TR k="Name" v={<span className="linkish">{model.name}</span>} />
                <TR k="Company Name" v={model.company} />
                <TR k="Type" v={model.type} />
                <TR k="Code" v={model.code} />
                <TR k="Contact No." v={<a href={`tel:${model.contact}`}>{model.contact}</a>} />
                <TR k="Whatsapp No." v={<a href={`tel:${model.whatsapp}`}>{model.whatsapp}</a>} />
                <TR k="Email" v={model.email} />
                <TR k="PAN No." v={model.pan} />
                <TR k="Due Payment" v={<span className="due-red">{fmt(model.due)}</span>} />
              </tbody>
            </table>

            {/* Right table */}
            <table className="cust-table">
              <tbody>
                <TR k="Telephone No." v={model.telephone} />
                <TR k="Date Of Birth" v={model.dob} />
                <TR k="Anniversary Date" v={model.anniversary} />
                <TR k="Remarks" v={model.remarks} />
                <TR k="Account Group Name" v={model.accountGroup} />
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Address Details ---- */}
      {tab === "Address Details" && (
        <div className="cust-card">
          <table className="cust-table" style={{ width: 480 }}>
            <tbody>
              <TR k="Default Address" v="" />
              <TR k="First Name" v={model.addrFirstName} />
              <TR k="Last Name" v={model.addrLastName} />
              <TR k="Company Name" v={model.company} />
              <TR k="Mobile No." v={model.mobile} />
              <TR k="Email" v={model.email} />
              <TR k="GST Type" v={model.gstType} />
              <TR k="GSTIN" v={model.gstin} />
              <TR k="Address Line 1" v={model.line1} />
              <TR k="Address Line 2" v={model.line2} />
              <TR k="Country" v={model.country} />
              <TR k="State" v={model.state} />
              <TR k="City" v={model.city} />
              <TR k="ZIP/Postal Code" v={model.zip} />
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Invoice (list) – invoice context के साथ single/empty row ठीक है ---- */}
      {tab === "Invoice" && (
        <div className="invd-card">
          <div className="invd-table-wrap">
            <table className="invd-table">
              <thead>
                <tr>
                  <th className="w40">#</th>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Due Amount</th>
                  <th>Created By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {/* एक invoice context उपलब्ध हो तो दिखा दें, वरना empty जैसा स्क्रीनशॉट */}
                {meta?.invoiceNo ? (
                  <tr>
                    <td className="num">1</td>
                    <td>
                      <Link className="invd-link" to={`/sales/invoice/${encodeURIComponent(meta.invoiceNo)}`}>
                        {meta.invoiceNo}
                      </Link>
                    </td>
                    <td>{meta.invoiceDate}</td>
                    <td className="num">{fmt(meta.totalAmount)}</td>
                    <td className="num">{fmt(meta.paidAmount)}</td>
                    <td className="num">{fmt(meta.dueAmount)}</td>
                    <td>{meta.createdBy || "-"}</td>
                    <td className="muted">-</td>
                  </tr>
                ) : (
                  <tr><td colSpan={8} className="muted center">No data available in table</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Credit Note / Receipt / Payment / Loyalty – empty tables बिल्कुल screenshots जैसे ---- */}
      {tab === "Credit Note" && <EmptyTable headers={["#", "Credit Note No.", "Date", "Total Amount", "Paid Amount", "Due Amount", "Created By", "Action"]} />}
      {tab === "Receipt" && <EmptyTable headers={["#", "Receipt No", "Date", "Payment Mode", "Amount", "Created By", "Action"]} />}
      {tab === "Payment" && <EmptyTable headers={["#", "Payment No.", "Date", "Payment Mode", "Amount", "Created By", "Action"]} />}
      {tab === "Customer Loyalty Ledger" && (
        <div className="invd-card">
          <div className="invd-subtitle" style={{ paddingTop: 10, paddingBottom: 0 }}>Customer Loyalty Details</div>
          <div className="invd-table-wrap">
            <table className="invd-table">
              <thead>
                <tr>
                  <th className="w40">#</th>
                  <th>Created Date And Time</th>
                  <th>Bill Reference</th>
                  <th>In Point</th>
                  <th>Out Point</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={6} className="muted center">No data available in table</td></tr>
              </tbody>
            </table>
          </div>
          <div className="mini-foot">
            <span>Available Loyalty Points: <strong>0.00</strong></span>
            <div className="pager-mini"><button disabled>‹</button><button disabled>›</button></div>
          </div>
        </div>
      )}

      {/* back link */}
      <div style={{ marginTop: 12 }}>
        <Link className="invd-link" to={`/sales/invoice/${encodeURIComponent(invNo)}`}>← Back to Invoice {invNo}</Link>
      </div>
    </div>
  );
}

function TR({ k: klabel, v }) {
  return (
    <tr>
      <td className="ck">{klabel}</td>
      <td className="cv">{v}</td>
    </tr>
  );
}

/* re-usable empty table block for credit/receipt/payment  */
function EmptyTable({ headers }) {
  return (
    <div className="invd-card">
      <div className="invd-table-wrap">
        <table className="invd-table">
          <thead>
            <tr>{headers.map((h, i) => <th key={i} className={i === 0 ? "w40" : ""}>{h}</th>)}</tr>
          </thead>
          <tbody>
            <tr><td colSpan={headers.length} className="muted center">No data available in table</td></tr>
          </tbody>
        </table>
        <div className="mini-foot">
          <span>Showing 0 to 0 of 0 entries</span>
          <div className="pager-mini"><button disabled>‹</button><button disabled>›</button></div>
        </div>
      </div>
    </div>
  );
}
