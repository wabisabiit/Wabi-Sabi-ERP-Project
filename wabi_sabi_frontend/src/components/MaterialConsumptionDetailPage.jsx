import React from "react";
import { useParams, Link } from "react-router-dom";
import "../styles/MaterialConsumptionDetail.css";

/* Dummy payloads keyed by consumption no. */
const DETAILS = {
  CONWS58: {
    date: "23/10/2025",
    no: "CONWS58",
    user: "Krishna Pandit",
    type: "Scrap/Wastage",
    remarks: "",
    items: [
      { idx:1, code:"113320-F", name:"(141) (B&G) Bottoms (Pants, Jogging & Pyjama)", qty:1, price:240, total:240 },
      { idx:2, code:"113313-F", name:"(141) (B&G) Bottoms (Pants, Jogging & Pyjama)", qty:1, price:200, total:200 },
      { idx:3, code:"113312-F", name:"(141) (B&G) Bottoms (Pants, Jogging & Pyjama)", qty:1, price:200, total:200 },
      { idx:4, code:"113315-F", name:"(141) (B&G) Bottoms (Pants, Jogging & Pyjama)", qty:1, price:240, total:240 },
      { idx:5, code:"113318-F", name:"(141) (B&G) Bottoms (Pants, Jogging & Pyjama)", qty:1, price:240, total:240 },
      { idx:6, code:"113314-F", name:"(141) (B&G) Bottoms (Pants, Jogging & Pyjama)", qty:1, price:240, total:240 },
      { idx:7, code:"113317-F", name:"(141) (B&G) Bottoms (Pants, Jogging & Pyjama)", qty:1, price:240, total:240 },
      { idx:8, code:"113316-F", name:"(141) (B&G) Bottoms (Pants, Jogging & Pyjama)", qty:1, price:240, total:240 },
      { idx:9, code:"113319-F", name:"(141) (B&G) Bottoms (Pants, Jogging & Pyjama)", qty:1, price:240, total:240 },
    ],
  },
};

export default function MaterialConsumptionDetailPage() {
  const { consNo } = useParams();
  const data = DETAILS[consNo] || DETAILS.CONWS58;
  const sum = (arr, k) => arr.reduce((s, r) => s + Number(r[k] || 0), 0);

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
          <div className="mcd-entries">Showing 1 to {data.items.length} of {data.items.length} entries</div>
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
