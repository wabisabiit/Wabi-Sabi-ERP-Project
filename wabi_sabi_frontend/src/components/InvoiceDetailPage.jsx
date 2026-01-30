// src/pages/InvoiceViewPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "../styles/InvoiceViewPage.css";
import { getSaleByInvoice, getSaleLinesByInvoice } from "../api/client";

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
  const params = useParams();
  const invoiceNo = String(
    params.invoiceNo ??
      params.invNo ??
      params.invoice_no ??
      params.number ??
      ""
  ).trim();

  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState(null);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const hdr = await getSaleByInvoice(invoiceNo);
        const lns = await getSaleLinesByInvoice(invoiceNo);

        if (!alive) return;

        setSale(hdr || null);
        setLines(Array.isArray(lns) ? lns : lns?.results || []);
      } catch (e) {
        console.error("[InvoiceView] load failed:", e?.message || e);
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
  }, [invoiceNo]);

  const rows = useMemo(() => {
    return (lines || []).map((ln, idx) => {
      const barcode = ln?.barcode || ln?.product?.barcode || "";

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
    const totalAmount = rows.reduce(
      (a, r) => a + (Number(r.lineTotalSp) || 0),
      0
    );
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
          <div className="invno">{invoiceNo}</div>
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
          <div className="invempty">Invoice not found</div>
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
                            <td colSpan={8} className="invnodata">
                              No products
                            </td>
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

                {/* Right totals like Image-2 (ONLY 3 rows) */}
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
