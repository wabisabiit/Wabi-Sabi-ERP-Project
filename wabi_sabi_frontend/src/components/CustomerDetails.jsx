import React, { useEffect, useState, useCallback } from "react";
import "../styles/CustomerDetails.css";
import { listSales } from "../api/client";

const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "₹-";
  return `₹${n.toFixed(2)}`;
};

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  // dd/mm/yyyy
  return d.toLocaleDateString("en-GB");
};

export default function CustomerDetails() {
  const [last, setLast] = useState({
    lastVisited: "-",
    lastBillAmount: "₹-",
    lastBillNo: "-",
    paymentMode: "-",
  });

  const loadLast = useCallback(async () => {
    try {
      const res = await listSales({ page: 1, page_size: 1 });
      const row = Array.isArray(res?.results) && res.results.length ? res.results[0] : null;

      if (!row) {
        setLast({
          lastVisited: "-",
          lastBillAmount: "₹-",
          lastBillNo: "-",
          paymentMode: "-",
        });
        return;
      }

      setLast({
        lastVisited: formatDate(row.transaction_date),
        lastBillAmount: money(row.total_amount),
        lastBillNo: row.invoice_no || "-",
        paymentMode: row.payment_method || "-",
      });
    } catch (e) {
      // keep UI stable on error
      setLast({
        lastVisited: "-",
        lastBillAmount: "₹-",
        lastBillNo: "-",
        paymentMode: "-",
      });
    }
  }, []);

  useEffect(() => {
    loadLast();

    // light refresh when tab focus returns (no other app changes needed)
    const onFocus = () => loadLast();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [loadLast]);

  return (
    <div className="customer-details">
      <h3>Customer Details</h3>

      <div className="cd-row">
        <span className="cd-label">Last Visited:</span>
        <span className="cd-value">{last.lastVisited}</span>
      </div>

      <div className="cd-row">
        <span className="cd-label">Last Bill Amount:</span>
        <span className="cd-value">{last.lastBillAmount}</span>
      </div>

      <div className="cd-row">
        <span className="cd-label">Most Purchased Item:</span>
        <span className="cd-value"></span>
      </div>

      <div className="cd-row">
        <span className="cd-label">Payment Mode:</span>
        <span className="cd-value">{last.paymentMode}</span>
      </div>

      <div className="cd-row">
        <span className="cd-label">Due Payment:</span>
        <span className="cd-value"></span>
      </div>

      <div className="cd-row">
        <span className="cd-label">Total Purchase:</span>
        <span className="cd-value"></span>
      </div>

      <div className="cd-row">
        <span className="cd-label">Loyalty Points:</span>
        <span className="cd-value"></span>
      </div>

      <hr />

      <div className="cd-row">
        <span className="cd-label">Last Bill No.:</span>
        <span className="cd-value">{last.lastBillNo}</span>
      </div>

      <div className="cd-row">
        <span className="cd-label">Last Bill Amount:</span>
        <span className="cd-value">{last.lastBillAmount}</span>
      </div>

      <button className="last-bill-print">
        <span className="material-icons">print</span>
        Last Bill Print
      </button>
    </div>
  );
}
