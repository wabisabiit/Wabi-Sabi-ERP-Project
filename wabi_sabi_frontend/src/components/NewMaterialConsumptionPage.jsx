import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/MaterialConsumption.css";

export default function NewMaterialConsumptionPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState("2025-01-01");
  const [prefix, setPrefix] = useState("CONWS");
  const [serial, setSerial] = useState("59");
  const [user, setUser] = useState("WABI SABI SUSTAINABILITY LLP");
  const [type, setType] = useState("Production");
  const [remarks, setRemarks] = useState("");

  return (
    <div className="mc-new">
      <div className="mc-titlebar">
        <div className="crumb">New Material Consumption</div>
      </div>

      <div className="mc-form-card">
        <div className="mc-form-row">
          <div className="mc-field">
            <label>Consumption Date<span className="req">*</span></label>
            <div className="mc-date"><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} /></div>
          </div>

          <div className="mc-field">
            <label>Consumption No.<span className="req">*</span></label>
            <div className="mc-no">
              <input value={prefix} onChange={(e)=>setPrefix(e.target.value)} />
              <input value={serial} onChange={(e)=>setSerial(e.target.value)} />
            </div>
          </div>

          <div className="mc-field">
            <label>Select User</label>
            <select value={user} onChange={(e)=>setUser(e.target.value)}>
              <option>WABI SABI SUSTAINABILITY LLP</option>
            </select>
          </div>

          <div className="mc-field">
            <label>Consumption Type</label>
            <div className="mc-multitag">
              {type && <span className="tag">{type}<button onClick={()=>setType("")}>×</button></span>}
              <select value={type} onChange={(e)=>setType(e.target.value)}>
                <option value="">Select</option>
                <option>Production</option>
                <option>Scrap/Wastage</option>
                <option>Expired</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mc-field full">
          <label>Remarks</label>
          <textarea placeholder="Enter Remark" value={remarks} onChange={(e)=>setRemarks(e.target.value)} />
        </div>
      </div>

      <div className="mc-product-card">
        <div className="mc-card-head">
          <div className="title">Product Details</div>
          <button className="mc-upload">
            <span className="material-icons">file_upload</span> Upload Products
          </button>
        </div>

        <div className="mc-search-line">
          <input placeholder="Search product & barcode" />
        </div>

        <div className="mc-tablewrap">
          <table className="mc-table">
            <thead>
              <tr>
                <th className="w40">#</th>
                <th>Itemcode</th>
                <th>Product<span className="req">*</span></th>
                <th className="num">Qty<span className="req">*</span></th>
                <th className="num">Price</th>
                <th className="num">Total</th>
                <th className="w60">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={7} className="muted center">Total</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mc-bottombar">
        <button className="btn light" onClick={()=>navigate(-1)}>Cancel</button>
        <div className="spacer" />
        <button className="btn primary">Save</button>
        <button className="btn primary ghost">Save &amp; Create New</button>
      </div>
    </div>
  );
}
