// src/pages/InvoiceViewPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/InvoiceViewPage.css";
import { listSales, getSaleLinesByInvoice } from "../api/client";

function fmtDateTime(v) {
  if (!v) return "";
  const d = new Date(v);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  let hh = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12;
  if (hh === 0) hh = 12;
  const hhs = String(hh).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hhs}:${min} ${ampm}`;
}

function money(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "0.00";
  return x.toFixed(2);
}

export default function InvoiceViewPage() {
  // ✅ FIX: support both route params
  const { invNo, invoiceNo } = useParams();
  const invoice = String(invNo || invoiceNo || "").trim();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState(null);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      if (!invoice) {
        console.error("[InvoiceView] load failed: Missing invoice number.");
        setSale(null);
        setLines([]);
        setLoading(false);
        return;
      }

      try {
        console.log("[InvoiceView] loading invoice:", invoice);

        // ✅ FIX: Use listSales with search query (same as OrderListModal pattern)
        const res = await listSales({ all: 1, q: invoice });
        const salesList = res?.results || [];
        
        // Find exact match
        const hdr = salesList.find(
          (s) => String(s?.invoice_no || "").trim() === invoice
        );

        if (!hdr) {
          console.error("[InvoiceView] ❌ Invoice not found in sales list:", invoice);
          if (!alive) return;
          setSale(null);
          setLines([]);
          setLoading(false);
          return;
        }

        // ✅ Try to fetch lines (might fail if endpoint doesn't exist)
        let lns = [];
        try {
          const lineRes = await getSaleLinesByInvoice(invoice);
          lns = Array.isArray(lineRes) ? lineRes : (lineRes?.results || []);
        } catch (lineErr) {
          console.warn("[InvoiceView] ⚠️  Could not fetch lines, will use items from sale:", lineErr.message);
          // Fallback: use items/lines from the sale object if available
          lns = hdr?.items || hdr?.lines || hdr?.sale_items || [];
        }

        if (!alive) return;

        setSale(hdr || null);
        setLines(lns);

        console.log("[InvoiceView] ✅ loaded", {
          invoice,
          hasSale: !!hdr,
          linesCount: lns.length,
        });
      } catch (e) {
        console.error("[InvoiceView] ❌ load failed:", e?.message || e);
        if (!alive) return;
        setSale(null);
        setLines([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [invoice]);

  const rows = useMemo(() => {
    return (lines || []).map((ln, idx) => {
      const barcode =
        ln?.barcode ||
        ln?.product?.barcode ||
        "";

      const productName =
        ln?.product_name ||
        ln?.product?.task_item?.item_print_friendly_name ||
        ln?.product?.task_item?.item_vasy_name ||
        ln?.product?.task_item?.item_full_name ||
        ln?.product?.name ||
        "";

      const qty = Number(ln?.qty ?? 1) || 1;

      const sp = Number(ln?.sp ?? ln?.selling_price ?? ln?.price ?? 0) || 0;

      // discount per unit (stored as discount_amount in your model)
      const discUnit = Number(ln?.discount_amount ?? 0) || 0;

      const lineTotalSp = sp * qty;
      const lineDisc = discUnit * qty;
      const net = Math.max(0, (sp - discUnit) * qty);

      return {
        sr: idx + 1,
        barcode,
        productName,
        batch: "",
        qty,
        sp,
        discUnit,
        lineTotalSp,
        lineDisc,
        net,
      };
    });
  }, [lines]);

  const totals = useMemo(() => {
    const totalAmount = rows.reduce((a, r) => a + (Number(r.lineTotalSp) || 0), 0);
    const discount = rows.reduce((a, r) => a + (Number(r.lineDisc) || 0), 0);
    const netAmount = rows.reduce((a, r) => a + (Number(r.net) || 0), 0);
    return { totalAmount, discount, netAmount };
  }, [rows]);

  const createdAt = sale?.transaction_date || sale?.created_at || sale?.date || "";
  const createdBy =
    sale?.created_by_name ||
    sale?.created_by ||
    sale?.manager_name ||
    sale?.created_by_username ||
    "";

  const custName = sale?.customer_name || sale?.customer?.name || "";
  const custPhone = sale?.customer_phone || sale?.customer?.phone || "";
  const customerPurchaseAmount =
    sale?.total_amount ?? sale?.grand_total ?? sale?.grandTotal ?? totals.netAmount;

  return (
    <div className="invwrap">
      <div className="invtop">
        <div className="invtitle">
          <div className="invno">{invoice}</div>
          <div className="invcrumb">
            <span className="material-icons invhome">home</span>
            <span className="invsep">-</span>
            <span className="invsec">Invoice</span>
          </div>
        </div>

        <div className="invstatus">
          <span className="invbadge">INVOICED</span>
        </div>
      </div>

      <div className="invcard">
        {loading ? (
          <div className="invloading">
            <span className="spinner" /> Loading…
          </div>
        ) : !sale ? (
          <div className="invempty">
            <p>Invoice not found</p>
            <button 
              onClick={() => navigate(-1)}
              style={{
                marginTop: '1rem',
                padding: '8px 16px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <div className="invmeta">
              <div className="invmetaRow">
                <div className="invmetaItem">
                  <div className="invmetaLbl">Date</div>
                  <div className="invmetaVal">{fmtDateTime(createdAt)}</div>
                </div>

                <div className="invmetaItem">
                  <div className="invmetaLbl">Created By</div>
                  <div className="invmetaVal">{createdBy || "-"}</div>
                </div>

                <div className="invmetaItem">
                  <div className="invmetaLbl">Customer Name</div>
                  <div className="invmetaVal">{custName || "-"}</div>
                </div>

                <div className="invmetaItem">
                  <div className="invmetaLbl">Mobile No.</div>
                  <div className="invmetaVal">{custPhone || "-"}</div>
                </div>

                <div className="invmetaItem">
                  <div className="invmetaLbl">Total Purchase Amount</div>
                  <div className="invmetaVal">₹{money(customerPurchaseAmount)}</div>
                </div>
              </div>
            </div>

            <div className="invsection">
              <div className="invsectionHead">Product Details</div>

              <div className="invgrid">
                <div className="invtableBox">
                  <div className="invtableHead">
                    <table className="invtable">
                      <thead>
                        <tr>
                          <th className="c-sr">Sales By</th>
                          <th className="c-barcode">Barcode</th>
                          <th className="c-prod">Product</th>
                          <th className="c-batch">Batch</th>
                          <th className="c-qty">Invoiced Qty</th>
                          <th className="c-sp">Selling Price</th>
                          <th className="c-disc">Discount Price</th>
                          <th className="c-net">Net Amount</th>
                        </tr>
                      </thead>
                    </table>
                  </div>

                  <div className="invtableBody">
                    <table className="invtable">
                      <tbody>
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="invnodata">No products</td>
                          </tr>
                        ) : (
                          rows.map((r) => (
                            <tr key={`${r.barcode}-${r.sr}`}>
                              <td className="c-sr">{r.sr}</td>
                              <td className="c-barcode">{r.barcode}</td>
                              <td className="c-prod">
                                <div className="invprod">{r.productName || "-"}</div>
                              </td>
                              <td className="c-batch">{r.batch}</td>
                              <td className="c-qty">{r.qty}</td>
                              <td className="c-sp">{money(r.sp)}</td>
                              <td className="c-disc">{money(r.discUnit)}</td>
                              <td className="c-net">{money(r.net)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="invsum">
                  <div className="invsumRow">
                    <div className="invsumLbl">Total Amount</div>
                    <div className="invsumVal">{money(totals.totalAmount)}</div>
                  </div>
                  <div className="invsumRow">
                    <div className="invsumLbl">Discount</div>
                    <div className="invsumVal">{money(totals.discount)}</div>
                  </div>
                  <div className="invsumRow invsumNet">
                    <div className="invsumLbl">Net Amount</div>
                    <div className="invsumVal">{money(totals.netAmount)}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}