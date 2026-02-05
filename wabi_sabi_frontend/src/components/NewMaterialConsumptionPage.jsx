// src/components/NewMaterialConsumption.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/MaterialConsumption.css";
import {
  listLocations,
  getProductByBarcode,
  mcGetNextNumber,
  mcCreate,
  apiMe,
} from "../api/client";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseCSV(text) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const splitLine = (line) => {
    // supports quoted CSV minimally
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) {
        out.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    out.push(cur.trim());
    return out.map((x) => x.replace(/^"(.*)"$/, "$1").trim());
  };

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  const idxBarcode = headers.findIndex(
    (h) => h === "barcode number" || h === "barcode" || h === "barcodenumber"
  );
  const idxLoc = headers.findIndex(
    (h) => h === "location" || h === "location code" || h === "location_code"
  );

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const barcode = (cols[idxBarcode] || "").trim();
    const location = (cols[idxLoc] || "").trim();
    if (barcode) rows.push({ barcode, location });
  }
  return rows;
}

export default function NewMaterialConsumptionPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [seq, setSeq] = useState({ prefix: "CONWS", next: 59, preview: "CONWS59" });
  const [locations, setLocations] = useState([]);
  const [loc, setLoc] = useState(""); // location code
  const [type, setType] = useState("Production");
  const [remark, setRemark] = useState("");
  const [barcode, setBarcode] = useState("");
  const [rows, setRows] = useState([]); // {barcode, name, qty, price, total, location}
  const [me, setMe] = useState(null);

  // ✅ NEW: UI feedback (spinner + toast)
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ open: false, type: "success", msg: "" });
  const showToast = useCallback((type, msg) => {
    setToast({ open: true, type: type || "success", msg: String(msg || "") });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => {
      setToast((p) => ({ ...p, open: false }));
    }, 2200);
  }, []);

  // ---- scanner helpers ----
  const inputRef = useRef(null);
  const lastScanRef = useRef({ code: "", ts: 0 });

  // upload ref
  const fileRef = useRef(null);

  const ensureFocus = useCallback(() => {
    if (document.activeElement !== inputRef.current) {
      inputRef.current?.focus();
    }
  }, []);

  // load locations + next number + me
  useEffect(() => {
    listLocations().then(setLocations).catch(() => {});
    mcGetNextNumber().then(setSeq).catch(() => {});
    apiMe().then(setMe).catch(() => {});
  }, []);

  // autofocus scan box on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // totals
  const total = useMemo(
    () => rows.reduce((s, r) => s + Number(r.total || 0), 0),
    [rows]
  );

  const upsertRow = useCallback((incoming) => {
    setRows((prev) => {
      const idx = prev.findIndex((x) => x.barcode === incoming.barcode);
      if (idx >= 0) {
        const copy = [...prev];
        const r = { ...copy[idx] };
        r.qty = Math.max(1, Number(r.qty || 1) + Number(incoming.qty || 1));
        r.price = Number(incoming.price || r.price || 0);
        r.name = incoming.name || r.name || "";
        r.location = incoming.location || r.location || "";
        r.total = r.qty * r.price;
        copy[idx] = r;
        return copy;
      }
      return [
        ...prev,
        {
          barcode: incoming.barcode,
          name: incoming.name || "",
          qty: Math.max(1, Number(incoming.qty || 1)),
          price: Number(incoming.price || 0),
          total:
            Math.max(1, Number(incoming.qty || 1)) * Number(incoming.price || 0),
          location: incoming.location || "",
        },
      ];
    });
  }, []);

  // add barcode (manual scan)
  const addBarcode = useCallback(async () => {
    const b = String(barcode || "").trim();
    if (!b) {
      ensureFocus();
      return;
    }

    // debounce duplicate fast scans
    const now = Date.now();
    if (lastScanRef.current.code === b && now - lastScanRef.current.ts < 400) {
      ensureFocus();
      return;
    }
    lastScanRef.current = { code: b, ts: now };

    setBarcode("");

    try {
      const p = await getProductByBarcode(b);
      const name = p.vasyName || "";
      const price = Number(p.sellingPrice || 0);
      upsertRow({ barcode: p.barcode, name, price, qty: 1, location: loc || "" });
    } catch (e) {
      showToast("error", `Not found: ${b}`);
    } finally {
      ensureFocus();
    }
  }, [barcode, ensureFocus, upsertRow, loc, showToast]);

  // Treat Enter or Tab as "Add"
  const onScanKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      addBarcode();
    }
  };

  const onQtyChange = (i, v) => {
    setRows((prev) => {
      const copy = [...prev];
      const q = Math.max(1, Number(v || 1));
      copy[i] = { ...copy[i], qty: q, total: q * Number(copy[i].price || 0) };
      return copy;
    });
  };

  const removeRow = (i) => setRows((prev) => prev.filter((_, j) => j !== i));

  const resetForNew = async () => {
    setRemark("");
    setBarcode("");
    setRows([]);
    setType("Production");
    setDate(todayISO());
    try {
      const next = await mcGetNextNumber();
      setSeq(next);
    } catch {}
    ensureFocus();
  };

  const doSave = async (mode) => {
    if (!loc) {
      showToast("error", "Please select user (location).");
      return;
    }
    if (rows.length === 0) {
      showToast("error", "Please add at least one barcode.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        date,
        location_code: loc,
        consumption_type: type,
        remark,
        rows: rows.map((r) => ({ barcode: r.barcode, qty: r.qty, price: r.price })),
        // optional: backend will also store created_by from session
        created_by: me?.username || "",
      };

      const res = await mcCreate(payload);

      showToast("success", res?.message || "Saved successfully.");

      if (mode === "next") {
        await resetForNew();
        return;
      }
      navigate("/inventory/material-consumption");
    } catch (e) {
      showToast("error", `Save failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const onUploadClick = () => fileRef.current?.click();

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-upload same file
    if (!file) return;

    setBusy(true);
    try {
      const text = await file.text();
      const csvRows = parseCSV(text);

      if (!csvRows.length) {
        showToast("error", "CSV is empty or invalid. Required headers: Barcode Number, location");
        return;
      }

      let added = 0;
      let skipped = 0;

      // fetch details from backend and fill table
      for (const r of csvRows) {
        try {
          const p = await getProductByBarcode(r.barcode);
          upsertRow({
            barcode: p.barcode,
            name: p.vasyName || "",
            price: Number(p.sellingPrice || 0),
            qty: 1,
            location: r.location || loc || "",
          });
          added++;
        } catch {
          skipped++;
          // skip invalid barcode but continue
        }
      }

      showToast("success", `Upload done. Added: ${added}, Skipped: ${skipped}`);
      ensureFocus();
    } catch (err) {
      showToast("error", `Upload failed: ${err?.message || err}`);
    } finally {
      setBusy(false);
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
            <label>
              Consumption Date<span className="req">*</span>
            </label>
            <div className="mc-date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          {/* Number (read-only) */}
          <div className="mc-field">
            <label>
              Consumption No.<span className="req">*</span>
            </label>
            <div className="mc-no">
              <input value={seq.prefix} disabled />
              <input value={String(seq.next)} disabled />
            </div>
          </div>

          {/* User -> Location dropdown */}
          <div className="mc-field">
            <label>Select User</label>
            <select value={loc} onChange={(e) => setLoc(e.target.value)} disabled={busy}>
              <option value="">Select location</option>
              {locations.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="mc-field">
            <label>Consumption Type</label>
            <div className="mc-multitag">
              {type && (
                <span className="tag">
                  {type}
                  <button onClick={() => setType("")} disabled={busy}>×</button>
                </span>
              )}
              <select value={type} onChange={(e) => setType(e.target.value)} disabled={busy}>
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
          <textarea
            placeholder="Enter Remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      <div className="mc-product-card">
        <div className="mc-card-head">
          <div className="title">Product Details</div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={onFileChange}
          />

          <button className="mc-upload" type="button" onClick={onUploadClick} disabled={busy}>
            <span className="material-icons">file_upload</span> Upload Products
          </button>
        </div>

        <div className="mc-search-line">
          <input
            ref={inputRef}
            placeholder="Search product & barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={onScanKeyDown}
            onFocus={ensureFocus}
            disabled={busy}
          />
        </div>

        <div className="mc-tablewrap">
          <table className="mc-table">
            <thead>
              <tr>
                <th className="w40">#</th>
                <th>Itemcode</th>
                <th>
                  Product<span className="req">*</span>
                </th>
                <th>Location</th>
                <th className="num">
                  Qty<span className="req">*</span>
                </th>
                <th className="num">Price</th>
                <th className="num">Total</th>
                <th className="w60">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted center">
                    Total
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.barcode}>
                    <td className="num">{i + 1}</td>
                    <td>{r.barcode}</td>
                    <td>{r.name}</td>
                    <td>{r.location || ""}</td>
                    <td className="num">
                      <input
                        type="number"
                        min="1"
                        value={r.qty}
                        onChange={(e) => onQtyChange(i, e.target.value)}
                        style={{ width: 64, textAlign: "right" }}
                        disabled={busy}
                      />
                    </td>
                    <td className="num">{Number(r.price || 0).toFixed(2)}</td>
                    <td className="num">{Number(r.total || 0).toFixed(2)}</td>
                    <td className="center">
                      <button
                        className="icon-btn"
                        onClick={() => removeRow(i)}
                        title="Delete"
                        disabled={busy}
                      >
                        <span className="material-icons">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={6} className="right strong">
                    Total
                  </td>
                  <td className="num strong">{total.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="mc-bottombar">
        <button className="btn light" onClick={() => navigate(-1)} disabled={busy}>
          Cancel
        </button>
        <div className="spacer" />
        <button className="btn primary" onClick={() => doSave("save")} disabled={busy}>
          Save
        </button>
        <button className="btn primary ghost" onClick={() => doSave("next")} disabled={busy}>
          Save &amp; Create New
        </button>
      </div>

      {/* ✅ Busy overlay */}
      {busy && (
        <div className="mc-overlay">
          <div className="mc-spinnerBox">
            <div className="mc-spinner" />
            <div className="mc-spinText">Please wait...</div>
          </div>
        </div>
      )}

      {/* ✅ Toast popup */}
      {toast.open && <div className={`mc-toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
