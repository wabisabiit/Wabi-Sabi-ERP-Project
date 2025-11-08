import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/MaterialConsumption.css";
import { listLocations, getProductByBarcode, mcGetNextNumber, mcCreate } from "../api/client";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewMaterialConsumptionPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [seq, setSeq] = useState({ prefix:"CONWS", next: 59, preview:"CONWS59" });
  const [locations, setLocations] = useState([]);
  const [loc, setLoc] = useState("");  // location code
  const [type, setType] = useState("Production");
  const [remark, setRemark] = useState("");
  const [barcode, setBarcode] = useState("");
  const [rows, setRows] = useState([]); // {barcode, name, qty, price, total}

  // ---- scanner helpers ----
  const inputRef = useRef(null);
  const lastScanRef = useRef({ code: "", ts: 0 });

  const ensureFocus = useCallback(() => {
    if (document.activeElement !== inputRef.current) {
      inputRef.current?.focus();
    }
  }, []);

  // load locations + next number
  useEffect(() => {
    listLocations().then(setLocations).catch(()=>{});
    mcGetNextNumber().then(setSeq).catch(()=>{});
  }, []);

  // autofocus scan box on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // totals
  const total = useMemo(() => rows.reduce((s,r)=>s + Number(r.total||0), 0), [rows]);

  // add barcode
  const addBarcode = useCallback(async () => {
    const b = String(barcode || "").trim();
    if (!b) { ensureFocus(); return; }

    // debounce duplicate fast scans (e.g., gun firing Enter + Tab quickly)
    const now = Date.now();
    if (lastScanRef.current.code === b && (now - lastScanRef.current.ts) < 400) {
      ensureFocus();
      return;
    }
    lastScanRef.current = { code: b, ts: now };

    // fire a DOM event (optional compatibility)
    try {
      window.dispatchEvent(new CustomEvent("pos:scan", { detail: { barcode: b, ts: now } }));
    } catch {}

    setBarcode("");
    try {
      const p = await getProductByBarcode(b);
      const name = p.vasyName || "";
      const price = Number(p.sellingPrice || 0);

      // if exists, bump qty
      setRows(prev => {
        const idx = prev.findIndex(x => x.barcode === p.barcode);
        if (idx >= 0) {
          const copy = [...prev];
          const r = { ...copy[idx] };
          r.qty += 1;
          r.total = r.qty * r.price;
          copy[idx] = r;
          return copy;
        }
        return [...prev, { barcode: p.barcode, name, qty: 1, price, total: price }];
      });
    } catch (e) {
      alert(`Not found: ${b}`);
    } finally {
      // keep focus in the scan box for continuous scanning
      ensureFocus();
    }
  }, [barcode, ensureFocus]);

  // Treat Enter or Tab as "Add"
  const onScanKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      addBarcode();
    }
  };

  const onQtyChange = (i, v) => {
    setRows(prev => {
      const copy = [...prev];
      const q = Math.max(1, Number(v||1));
      copy[i] = { ...copy[i], qty: q, total: q * Number(copy[i].price||0) };
      return copy;
    });
  };
  const removeRow = (i) => setRows(prev => prev.filter((_,j)=>j!==i));

  const onSave = async () => {
    if (!loc) { alert("Please select user (location)."); return; }
    if (rows.length === 0) { alert("Please add at least one barcode."); return; }
    try {
      const payload = {
        date,
        location_code: loc,
        consumption_type: type,
        remark,
        rows: rows.map(r => ({ barcode: r.barcode, qty: r.qty, price: r.price })),
      };
      const res = await mcCreate(payload);
      alert(res?.message || "Saved successfully.");
      navigate("/inventory/material-consumption");
    } catch (e) {
      alert(`Save failed: ${e.message || e}`);
    }
  };

  return (
    <div className="mc-new">
      <div className="mc-titlebar">
        <div className="crumb">New Material Consumption</div>
      </div>

      <div className="mc-form-card">
        <div className="mc-form-row">
          {/* Date */}
          <div className="mc-field">
            <label>Consumption Date<span className="req">*</span></label>
            <div className="mc-date">
              <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
            </div>
          </div>

          {/* Number (read-only) */}
          <div className="mc-field">
            <label>Consumption No.<span className="req">*</span></label>
            <div className="mc-no">
              <input value={seq.prefix} disabled />
              <input value={String(seq.next)} disabled />
            </div>
          </div>

          {/* User -> Location dropdown */}
          <div className="mc-field">
            <label>Select User</label>
            <select value={loc} onChange={(e)=>setLoc(e.target.value)}>
              <option value="">Select location</option>
              {locations.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Type */}
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
          <textarea placeholder="Enter Remark" value={remark} onChange={(e)=>setRemark(e.target.value)} />
        </div>
      </div>

      <div className="mc-product-card">
        <div className="mc-card-head">
          <div className="title">Product Details</div>
          <button className="mc-upload" type="button" disabled>
            <span className="material-icons">file_upload</span> Upload Products
          </button>
        </div>

        <div className="mc-search-line">
          <input
            ref={inputRef}
            placeholder="Search product & barcode"
            value={barcode}
            onChange={(e)=>setBarcode(e.target.value)}
            onKeyDown={onScanKeyDown}
            onFocus={ensureFocus}
          />
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
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="muted center">Total</td></tr>
              ) : rows.map((r, i) => (
                <tr key={r.barcode}>
                  <td className="num">{i+1}</td>
                  <td>{r.barcode}</td>
                  <td>{r.name}</td>
                  <td className="num">
                    <input
                      type="number" min="1"
                      value={r.qty}
                      onChange={(e)=>onQtyChange(i, e.target.value)}
                      style={{ width: 64, textAlign:"right" }}
                    />
                  </td>
                  <td className="num">{Number(r.price || 0).toFixed(2)}</td>
                  <td className="num">{Number(r.total || 0).toFixed(2)}</td>
                  <td className="center">
                    <button className="icon-btn" onClick={()=>removeRow(i)} title="Delete">
                      <span className="material-icons">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="right strong">Total</td>
                  <td className="num strong">{total.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="mc-bottombar">
        <button className="btn light" onClick={()=>navigate(-1)}>Cancel</button>
        <div className="spacer" />
        <button className="btn primary" onClick={onSave}>Save</button>
        <button className="btn primary ghost" onClick={onSave}>Save &amp; Create New</button>
      </div>
    </div>
  );
}
