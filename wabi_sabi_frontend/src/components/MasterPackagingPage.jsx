// src/pages/MasterPackagingPage.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "../styles/MasterPackagingPage.css";
import {
  listLocations,
  getProductByBarcode,
  createMasterPack,
  apiMe, // ✅ NEW (used to know admin vs manager)
} from "../api/client";

function useClickOutside(refs, cb) {
  useEffect(() => {
    const onDown = (e) => {
      const t = e.target;
      const hit = refs.some((r) => r?.current && r.current.contains(t));
      if (!hit) cb?.();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [refs, cb]);
}

export default function MasterPackagingPage() {
  const navigate = useNavigate();

  const [scan, setScan] = useState("");
  const [rows, setRows] = useState([]);
  const [station] = useState("PACK-01");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // {type:'ok'|'err', msg:string}
  const [packResult, setPackResult] = useState(null); // server response { pack: {...} }

  // ==== NEW: robust scanner focus & de-dupe ====
  const scanRef = useRef(null);
  const lastScanRef = useRef({ code: "", ts: 0 });
  useEffect(() => {
    // autofocus on mount
    scanRef.current?.focus();
  }, []);
  // keep focus on the scan box so hardware scanners always type there
  const ensureScanFocus = () => {
    if (document.activeElement !== scanRef.current) scanRef.current?.focus();
  };

  // ---- Locations from backend ----
  const [locs, setLocs] = useState([]); // [{code,name}]
  useEffect(() => {
    listLocations()
      .then((r) => setLocs(Array.isArray(r) ? r : []))
      .catch(() => setLocs([]));
  }, []);
  const locMap = useMemo(() => {
    const m = new Map();
    locs.forEach((l) => m.set(l.code, l.name));
    return m;
  }, [locs]);

  /* ───── Header default Location ───── */
  const [defaultLoc, setDefaultLoc] = useState("");
  const [headLocOpen, setHeadLocOpen] = useState(false);
  const [headLocQuery, setHeadLocQuery] = useState("");
  const headBtnRef = useRef(null);
  const [headLocRect, setHeadLocRect] = useState({ top: 0, left: 0, width: 280 });
  const headerFiltered = useMemo(() => {
    const q = headLocQuery.trim().toLowerCase();
    if (!q) return locs;
    return locs.filter((l) => (l.code + " " + l.name).toLowerCase().includes(q));
  }, [headLocQuery, locs]);
  const openHeaderDropdown = () => {
    if (!headBtnRef.current) return;
    const r = headBtnRef.current.getBoundingClientRect();
    const width = Math.min(320, Math.max(r.width, 240));
    setHeadLocRect({ top: Math.round(r.bottom + 6), left: Math.round(r.left), width });
    setHeadLocQuery("");
    setHeadLocOpen(true);
  };
  const pickHeaderLocation = (loc) => {
    setDefaultLoc(loc.code);
    setHeadLocOpen(false);
    setHeadLocQuery("");
    setRows((prev) => prev.map((r) => (r.location_code ? r : { ...r, location_code: loc.code })));
  };
  const headPanelRef = useRef(null);
  useClickOutside([headPanelRef, headBtnRef], () => setHeadLocOpen(false));
  useEffect(() => {
    const cb = () => {
      if (!headBtnRef.current || !headLocOpen) return;
      const r = headBtnRef.current.getBoundingClientRect();
      const width = Math.min(320, Math.max(r.width, 240));
      setHeadLocRect({ top: Math.round(r.bottom + 6), left: Math.round(r.left), width });
    };
    window.addEventListener("resize", cb);
    window.addEventListener("scroll", cb, true);
    return () => {
      window.removeEventListener("resize", cb);
      window.removeEventListener("scroll", cb, true);
    };
  }, [headLocOpen]);

  /* ───── Totals ───── */
  const itemsCount = rows.length;
  const qtyTotal = useMemo(
    () => rows.reduce((t, r) => t + (Number(r.qty) || 0), 0),
    [rows]
  );
  const priceTotal = useMemo(
    () => rows.reduce((t, r) => t + (Number(r.sellingPrice) || 0) * (Number(r.qty) || 0), 0),
    [rows]
  );

  /* ───── Add / Merge scanned barcode ───── */
  async function addScanned() {
    const raw = scan.trim();
    if (!raw) return;

    // prevent accidental double fire from some scanners
    const now = Date.now();
    if (lastScanRef.current.code === raw && now - lastScanRef.current.ts < 400) {
      setScan("");
      ensureScanFocus();
      return;
    }
    lastScanRef.current = { code: raw, ts: now };

    setScan("");
    try {
      const data = await getProductByBarcode(raw); // {barcode, vasyName, sellingPrice, qty...}
      const barcode = String(data.barcode || "").toUpperCase();
      if (!barcode) throw new Error("Barcode not found");

      setRows((prev) => {
        const idx = prev.findIndex((r) => r.barcode === barcode);
        if (idx !== -1) {
          // existing -> qty +1
          const copy = prev.slice();
          copy[idx] = { ...copy[idx], qty: (copy[idx].qty || 0) + 1 };
          return copy;
        }
        // new row
        return [
          ...prev,
          {
            id: Date.now(),
            barcode,
            name: data.vasyName || "",
            size: "", // leave as-is unless you want to snap from product.size
            sellingPrice: Number(data.sellingPrice || 0),
            qty: 1,
            brand: "B4L",
            color: "",
            location_code: defaultLoc || "", // can change row-wise
          },
        ];
      });
    } catch (e) {
      setToast({ type: "err", msg: `Lookup failed: ${e.message || e}` });
      clearToastSoon();
    } finally {
      ensureScanFocus();
    }
  }

  /* ───── Row Location ───── */
  const [locOpenFor, setLocOpenFor] = useState(null);
  const [locQuery, setLocQuery] = useState("");
  const rowLocRef = useRef(null);
  useClickOutside([rowLocRef], () => setLocOpenFor(null));
  const filteredLocations = useMemo(() => {
    const q = locQuery.trim().toLowerCase();
    if (!q) return locs;
    return locs.filter((l) => (l.code + " " + l.name).toLowerCase().includes(q));
  }, [locs, locQuery]);
  const setRowLocation = (rowId, code) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, location_code: code } : r)));
    setLocOpenFor(null);
    setLocQuery("");
  };

  const updateQty = (rowId, value) => {
    const v = Math.max(0, Number(value) || 0);
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, qty: v } : r)));
  };
  const removeRow = (rowId) => setRows((prev) => prev.filter((r) => r.id !== rowId));

  /* ───── Save & Preview -> create master pack ───── */
  async function onSaveAndPreview() {
    if (rows.length === 0) {
      setToast({ type: "err", msg: "Nothing to save." });
      clearToastSoon();
      return;
    }
    if (!defaultLoc) {
      setToast({ type: "err", msg: "Choose a location from the header first." });
      clearToastSoon();
      return;
    }

    const payload = {
      rows: rows.map((r) => ({
        barcode: r.barcode,
        qty: Number(r.qty) || 0,
        // 👇 force all rows to use the header location
        location_code: defaultLoc,
      })),
    };

    setSaving(true);
    try {
      const res = await createMasterPack(payload);
      if (res?.status === "ok" && res?.pack) {
        setPackResult(res.pack);
        setToast({ type: "ok", msg: `Saved successfully as ${res.pack.number}` });

        // 👇 clear the table after successful save
        setRows([]);
        setHeadLocOpen(false);

        // ✅ refresh list table
        fetchPacks();
      } else {
        throw new Error("Unexpected response");
      }
    } catch (e) {
      setToast({ type: "err", msg: `Save failed: ${e.message || e}` });
    } finally {
      setSaving(false);
      clearToastSoon();
    }
  }

  function clearToastSoon() {
    setTimeout(() => setToast(null), 2200);
  }

  // =========================
  // ✅ NEW: MasterPack List (below empty space)
  // =========================
  const [me, setMe] = useState(null);
  const isAdmin = useMemo(() => {
    const role = me?.employee?.role || "";
    return !!me?.is_superuser || role === "ADMIN";
  }, [me]);

  const [listLoading, setListLoading] = useState(false);
  const [packs, setPacks] = useState([]);

  const [fltFromLocs, setFltFromLocs] = useState([]); // admin only
  const [fltToLocs, setFltToLocs] = useState([]); // admin only
  const [fltDateFrom, setFltDateFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });
  const [fltDateTo, setFltDateTo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  });

  useEffect(() => {
    (async () => {
      try {
        const m = await apiMe();
        setMe(m);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  async function fetchPacks() {
    const sp = new URLSearchParams();
    sp.append("date_from", fltDateFrom);
    sp.append("date_to", fltDateTo);

    if (isAdmin && fltFromLocs.length) fltFromLocs.forEach((x) => sp.append("from_location", x));
    if (isAdmin && fltToLocs.length) fltToLocs.forEach((x) => sp.append("to_location", x));

    setListLoading(true);
    try {
      const res = await fetch(`/api/master-packs/?${sp.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Load failed (${res.status}): ${t}`);
      }
      const json = await res.json();
      setPacks(Array.isArray(json) ? json : []);
    } catch (e) {
      setPacks([]);
      setToast({ type: "err", msg: e.message || String(e) });
      clearToastSoon();
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (!me) return;
    fetchPacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  return (
    <div className="mp-wrap">
      {/* Toast */}
      {toast && (
        <div className={`mp-toast ${toast.type === "ok" ? "ok" : "err"}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="mp-head">
        <h1>Master Packaging</h1>
        <div className="mp-station">
          <span className="mp-station-label">Station:</span>
          <span className="mp-station-badge">{station}</span>
        </div>
      </div>

      <div className="mp-grid">
        {/* LEFT */}
        <div className="mp-left-card">
          <div className="mp-section-title">Scan Products</div>
          <div className="mp-scan-row">
            <div className="mp-field grow">
              <label>Barcode / Item Code</label>
              <div className="mp-input">
                <input
                  ref={scanRef}
                  type="text"
                  placeholder="Scan or type code..."
                  value={scan}
                  onChange={(e) => setScan(e.target.value)}
                  onKeyDown={(e) => {
                    // scanners usually send Enter or Tab
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      addScanned();
                    }
                  }}
                  onBlur={ensureScanFocus}
                />
              </div>
            </div>
            <button className="mp-btn mp-btn-dark" onClick={addScanned}>
              Add
            </button>
          </div>

          {/* Table */}
          <div className="mp-table-wrap five-rows">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Name</th>
                  <th>Selling Price</th>
                  <th>Qty</th>
                  <th>Brand</th>
                  <th>Color</th>
                  {/* header default location */}
                  <th className="mp-location-cell mp-th-loc">
                    <button
                      ref={headBtnRef}
                      type="button"
                      className={`mp-loc-btn mp-loc-btn--th ${defaultLoc ? "set" : ""}`}
                      onClick={() => (headLocOpen ? setHeadLocOpen(false) : openHeaderDropdown())}
                      title="Default Location for new rows"
                    >
                      {defaultLoc ? `${defaultLoc} – ${locMap.get(defaultLoc) || ""}` : "Location"}
                      <span className="material-icons-outlined">arrow_drop_down</span>
                    </button>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="mp-empty" colSpan={8}>
                      Scan products to populate the list…
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.barcode}</td>
                      <td className="mp-ellipsis">{r.name}</td>
                      <td className="mp-num">₹{Number(r.sellingPrice || 0).toFixed(2)}</td>
                      <td className="mp-qty">
                        <input
                          type="number"
                          min="0"
                          value={r.qty}
                          onChange={(e) => updateQty(r.id, e.target.value)}
                        />
                      </td>
                      <td>B4L</td>
                      <td></td>
                      {/* fixed header location */}
                      <td className="mp-location-cell">
                        <div className="mp-loc-fixed">
                          {defaultLoc
                            ? `${defaultLoc} – ${locMap.get(defaultLoc) || ""}`
                            : "Location not set"}
                        </div>
                      </td>
                      <td>
                        <button className="mp-icon-btn" onClick={() => removeRow(r.id)}>
                          <span className="material-icons-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom */}
          <div className="mp-bottom">
            <div className="mp-totals">
              <div className="mp-total-row">
                <span>Items</span>
                <b>{itemsCount}</b>
              </div>
              <div className="mp-total-row">
                <span>Quantity</span>
                <b>{qtyTotal}</b>
              </div>
              <div className="mp-total-row">
                <span>Total Price</span>
                <b>₹{priceTotal.toFixed(2)}</b>
              </div>
            </div>
            <div className="mp-actions">
              <button className="mp-btn mp-btn-ghost" onClick={() => setRows([])}>
                Clear
              </button>
              <button className="mp-btn mp-btn-primary" disabled={saving} onClick={onSaveAndPreview}>
                {saving ? "Saving..." : "Save & Preview"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT Preview */}
        <div className="mp-right-card">
          <div className="mp-preview-head">
            <span className="mp-tag">Station {station}</span>
            <span className={`mp-status ${packResult ? "saved" : "open"}`}>
              {packResult ? "Saved" : "Open"}
            </span>
          </div>

          <div className="mp-preview-block">
            <div className="mp-preview-grid">
              <div className="mp-preview-kv">
                <span className="mp-k">Items</span>
                <span className="mp-v">{itemsCount}</span>
              </div>
              <div className="mp-preview-kv">
                <span className="mp-k">Qty</span>
                <span className="mp-v">{qtyTotal}</span>
              </div>
            </div>

            <div className="mp-preview-sum">
              <div className="mp-preview-row">
                <span>Total Price</span>
                <b>₹{priceTotal.toFixed(2)}</b>
              </div>
              <div className="mp-preview-row">
                <span>{packResult ? "Invoice No." : "Open"}</span>
                <span>{packResult ? packResult.number : new Date().toLocaleString()}</span>
              </div>
            </div>

            {packResult && (
              <div className="mp-pack-lines">
                <div className="mp-pack-title">Saved Lines</div>
                <ul>
                  {packResult.lines.map((ln) => (
                    <li key={`${ln.barcode}-${ln.location?.code}`}>
                      {ln.barcode} × {ln.qty} @ ₹{Number(ln.sp).toFixed(2)} — {ln.location?.code}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ NEW: MasterPack List Table (below empty space) */}
      <div className="mp-list-card">
        <div className="mp-list-head">
          <div className="mp-list-title">Master Packs</div>

          <div className="mp-list-filters">
            <div className="mp-flt">
              <label>From Date</label>
              <input type="date" value={fltDateFrom} onChange={(e) => setFltDateFrom(e.target.value)} />
            </div>

            <div className="mp-flt">
              <label>To Date</label>
              <input type="date" value={fltDateTo} onChange={(e) => setFltDateTo(e.target.value)} />
            </div>

            {/* Admin only filters */}
            {isAdmin && (
              <>
                <div className="mp-flt">
                  <label>From Location</label>
                  <select
                    multiple
                    value={fltFromLocs}
                    onChange={(e) =>
                      setFltFromLocs(Array.from(e.target.selectedOptions).map((o) => o.value))
                    }
                  >
                    {locs.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.code} - {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mp-flt">
                  <label>To Location</label>
                  <select
                    multiple
                    value={fltToLocs}
                    onChange={(e) =>
                      setFltToLocs(Array.from(e.target.selectedOptions).map((o) => o.value))
                    }
                  >
                    {locs.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.code} - {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button className="mp-btn mp-btn-primary" onClick={fetchPacks} disabled={listLoading}>
              {listLoading ? "Loading..." : "Apply"}
            </button>
          </div>
        </div>

        <div className="mp-list-tablewrap">
          <table className="mp-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>S.No</th>
                <th>MasterPack No.</th>
                <th>From Location</th>
                <th>To Location</th>
                <th style={{ width: 220 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={5} className="mp-empty">
                    Loading...
                  </td>
                </tr>
              ) : packs.length ? (
                packs.map((p, i) => (
                  <tr key={p.number}>
                    <td>{p.sr || i + 1}</td>
                    <td>
                      <button
                        className="mp-link"
                        onClick={() =>
                          navigate(`/inventory/master-packaging/${encodeURIComponent(p.number)}`)
                        }
                      >
                        {p.number}
                      </button>
                    </td>
                    <td>
                      {(p.from_location?.code || "")}
                      {p.from_location?.name ? ` - ${p.from_location.name}` : ""}
                    </td>
                    <td>
                      {(p.to_location?.code || "")}
                      {p.to_location?.name ? ` - ${p.to_location.name}` : ""}
                    </td>
                    <td>{p.created_at ? new Date(p.created_at).toLocaleString() : ""}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="mp-empty">
                    No master packs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating header dropdown */}
      {headLocOpen &&
        createPortal(
          <div
            ref={headPanelRef}
            className="mp-popover mp-float-panel"
            style={{
              position: "fixed",
              top: headLocRect.top,
              left: headLocRect.left,
              width: headLocRect.width,
            }}
          >
            <div className="mp-pop-search">
              <input
                autoFocus
                placeholder="Search location…"
                value={headLocQuery}
                onChange={(e) => setHeadLocQuery(e.target.value)}
              />
            </div>
            <div className="mp-pop-list">
              {headerFiltered.map((loc) => (
                <button key={loc.code} className="mp-pop-item" onClick={() => pickHeaderLocation(loc)}>
                  {loc.code} – {loc.name}
                </button>
              ))}
              {headerFiltered.length === 0 && <div className="mp-pop-empty">No matches</div>}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
