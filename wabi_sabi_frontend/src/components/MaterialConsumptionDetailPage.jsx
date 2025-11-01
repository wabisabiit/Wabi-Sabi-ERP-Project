// src/components/MaterialConsumptionDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "../styles/MaterialConsumptionDetail.css";
import { mcGet } from "../api/client";

/* helpers */
const toDMY = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
const sum = (arr, k) => arr.reduce((s, r) => s + Number(r[k] || 0), 0);

export default function MaterialConsumptionDetailPage() {
  const { consNo } = useParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await mcGet(consNo); // GET /api/material-consumptions/<number>/
        if (!alive) return;

        // Normalize possible shapes from backend
        // Expect either { number,date,user,type,remarks,items:[{barcode,name,qty,price,total},...] }
        // or { lines:[{ barcode, name, qty, sp }], ... }
        const items = (res.items || res.lines || []).map((ln, i) => ({
          idx: i + 1,
          code: ln.barcode || ln.code || "",
          name: ln.name || "",
          qty: Number(ln.qty || 1),
          price: Number(ln.price ?? ln.sp ?? 0),
          total: Number(ln.total ?? (Number(ln.price ?? ln.sp ?? 0) * Number(ln.qty || 1))),
        }));

        setData({
          date: toDMY(res.date || res.created_at || ""),
          no: res.number || consNo,
          user: res.user || "Krishna Pandit",
          type: res.type || res.consumption_type || "",
          remarks: res.remarks || "",
          items,
        });
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [consNo]);

  if (loading) return <div className="mcd-root"><div className="mcd-card" style={{padding:12}}>Loading…</div></div>;
  if (err)      return <div className="mcd-root"><div className="mcd-card" style={{padding:12}}>Error: {err}</div></div>;
  if (!data)    return null;

  return (
    <div className="mcd-root">
      <div className="mcd-breadcrumb">
        <Link to="/inventory/material-consumption" className="home">
          <span className="mi">home</span>
        </Link>
        <span className="sep">/</span>
        <span>Material Consumption</span>
      </div>
      <h1 className="mcd-title">Material Consumption</h1>

      <div className="mcd-card">
        <div className="mcd-grid">
          <LabelVal label="Consumption Date" value={data.date} />
          <LabelVal label="Consumption No." value={data.no} />
          <LabelVal label="User Name" value={data.user} />
          <LabelVal label="Consumption Type" value={data.type} />
          <LabelVal label="Remarks" value={data.remarks || ""} full />
        </div>
      </div>

      <div className="mcd-card">
        <div className="mcd-subtitle">Product Details</div>
        <div className="mcd-tablewrap">
          <table className="mcd-table">
            <thead>
              <tr>
                <th className="w50">#</th>
                <th>Itemcode</th>
                <th>Product</th>
                <th className="num">Qty</th>
                <th className="num">Price</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r)=>(
                <tr key={r.idx}>
                  <td className="num">{r.idx}</td>
                  <td><a href="#it">{r.code}</a></td>
                  <td><a href="#p">{r.name}</a></td>
                  <td className="num">{r.qty}</td>
                  <td className="num">{r.price.toFixed(1)}</td>
                  <td className="num">{r.total.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="strong">Total</td>
                <td className="num strong">{sum(data.items,"qty")}</td>
                <td />
                <td className="num strong">{sum(data.items,"total").toFixed(1)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mcd-pager">
            <button className="ghost" disabled>‹</button>
            <button className="current">1</button>
            <button className="ghost" disabled>›</button>
          </div>
          <div className="mcd-entries">
            Showing 1 to {data.items.length} of {data.items.length} entries
          </div>
        </div>
      </div>

      <div className="mcd-footer">2025 © VasyERP Solutions Pvt. Ltd.</div>
    </div>
  );
}

function LabelVal({ label, value, full }) {
  return (
    <div className={`lv ${full ? "full" : ""}`}>
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}
