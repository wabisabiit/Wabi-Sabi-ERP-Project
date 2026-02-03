// src/pages/MasterPackagingPage.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import "../styles/MasterPackagingPage.css";
import {
  listLocations,
  getProductByBarcode,
  createMasterPack,
  listMasterPacks,
  apiMe,
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

function fmtDateTime(v) {
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v || "");
    return d.toLocaleString();
  } catch {
    return String(v || "");
  }
}

function yyyyMmDd(d) {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
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
    scanRef.current?.focus();
  }, []);
  const ensureScanFocus = () => {
    if (document.activeElement !== scanRef.current) scanRef.current?.focus();
  };

  // ---- Locations from backend ----
  const [locs, setLocs] = useState([]); // [{id,code,name}]
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

  // ---- Current user (role + outlet location) ----
  const [me, setMe] = useState(null); // expects { role, location_code } (safe fallback)
  useEffect(() => {
    apiMe?.()
      .then((r) => setMe(r || null))
      .catch(() => setMe(null));
  }, []);
  const myLocCode = (me?.location_code || me?.location || me?.loc || "").trim();
  const myRole = (me?.role || me?.user_role || me?.type || "").toUpperCase();
  const isAdmin = myRole === "ADMIN";
  const isManager = myRole === "MANAGER";

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
  const qtyTotal = useMemo(() => rows.reduce((t, r) => t + (Number(r.qty) || 0), 0), [rows]);
  const priceTotal = useMemo(
    () => rows.reduce((t, r) => t + (Number(r.sellingPrice) || 0) * (Number(r.qty) || 0), 0),
    [rows]
  );

  /* ───── Add / Merge scanned barcode ───── */
  async function addScanned() {
    const raw = scan.trim();
    if (!raw) return;

    const now = Date.now();
    if (lastScanRef.current.code === raw && now - lastScanRef.current.ts < 400) {
      setScan("");
      ensureScanFocus();
      return;
    }
    lastScanRef.current = { code: raw, ts: now };

    setScan("");
    try {
      const data = await getProductByBarcode(raw);
      const barcode = String(data.barcode || "").toUpperCase();
      if (!barcode) throw new Error("Barcode not found");

      setRows((prev) => {
        const idx = prev.findIndex((r) => r.barcode === barcode);
        if (idx !== -1) {
          const copy = prev.slice();
          copy[idx] = { ...copy[idx], qty: (copy[idx].qty || 0) + 1 };
          return copy;
        }
        return [
          ...prev,
          {
            id: Date.now(),
            barcode,
            name: data.vasyName || "",
            size: "",
            sellingPrice: Number(data.sellingPrice || 0),
            qty: 1,
            brand: "B4L",
            color: "",
            location_code: defaultLoc || "",
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
        location_code: defaultLoc, // force header location
      })),
    };

    setSaving(true);
    try {
      const res = await createMasterPack(payload);
      if (res?.status === "ok" && res?.pack) {
        setPackResult(res.pack);
        setToast({ type: "ok", msg: `Saved successfully as ${res.pack.number}` });
        setRows([]);
        setHeadLocOpen(false);
        // refresh list
        loadPacks();
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

  /* ==============================
     Master Packs List + Filters
     - Admin: From/To location + date range
     - Manager: date range only
     - Manager sees only packs where FROM or TO == their location
     ============================== */
  const [packsLoading, setPacksLoading] = useState(false);
  const [packs, setPacks] = useState([]);
  const [packsErr, setPacksErr] = useState("");

  // default date filters = today
  const todayStr = useMemo(() => yyyyMmDd(new Date()), []);
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  const [fromLocFilter, setFromLocFilter] = useState("");
  const [toLocFilter, setToLocFilter] = useState("");

  const loadPacks = async (opts = {}) => {
    setPacksLoading(true);
    setPacksErr("");
    try {
      // If your backend supports filters, we pass them.
      // If it ignores them, frontend filtering still works.
      const q = {
        from_date: opts.from_date ?? fromDate,
        to_date: opts.to_date ?? toDate,
        from_location: opts.from_location ?? fromLocFilter,
        to_location: opts.to_location ?? toLocFilter,
      };

      const res = await listMasterPacks(q);
      const arr = Array.isArray(res) ? res : [];

      // Normalize fields safely
      const normalized = arr.map((p) => {
        const number = p.number || p.masterpack_no || p.masterPackNo || "";
        const created_at = p.created_at || p.date || p.created || "";
        const fl = p.from_location || p.fromLocation || p.location_from || p.location || null;
        const tl = p.to_location || p.toLocation || p.location_to || null;

        // IMPORTANT: Fix swapped mapping (reverse) -> ensure:
        // "From" shows the source location, "To" shows destination location.
        // If your API was reversed earlier, this normalization keeps correct keys.
        const from_location = fl && (fl.code || fl.name) ? fl : null;
        const to_location = tl && (tl.code || tl.name) ? tl : null;

        return { ...p, number, created_at, from_location, to_location };
      });

      // Frontend filtering (manager visibility rule)
      let filtered = normalized;

      if (isManager && myLocCode) {
        filtered = filtered.filter((p) => {
          const f = (p.from_location?.code || "").trim();
          const t = (p.to_location?.code || "").trim();
          return f === myLocCode || t === myLocCode;
        });
      }

      // If backend didn’t filter by date/location, apply minimal frontend filters too:
      const fD = (opts.from_date ?? fromDate) || "";
      const tD = (opts.to_date ?? toDate) || "";

      if (fD && tD) {
        const start = new Date(`${fD}T00:00:00`);
        const end = new Date(`${tD}T23:59:59`);
        filtered = filtered.filter((p) => {
          const d = new Date(p.created_at);
          if (Number.isNaN(d.getTime())) return true;
          return d >= start && d <= end;
        });
      }

      if (isAdmin) {
        const flc = (opts.from_location ?? fromLocFilter) || "";
        const tlc = (opts.to_location ?? toLocFilter) || "";
        if (flc) {
          filtered = filtered.filter((p) => (p.from_location?.code || "") === flc);
        }
        if (tlc) {
          filtered = filtered.filter((p) => (p.to_location?.code || "") === tlc);
        }
      }

      setPacks(filtered);
    } catch (e) {
      setPacksErr(e?.message || String(e));
      setPacks([]);
    } finally {
      setPacksLoading(false);
    }
  };

  useEffect(() => {
    // load once after role/location is known (or timeout-safe)
    loadPacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myRole, myLocCode]);

  const onApplyFilters = () => {
    loadPacks({
      from_date: fromDate,
      to_date: toDate,
      from_location: fromLocFilter,
      to_location: toLocFilter,
    });
  };

  // Table vertical scroll after 4 rows
  const packsTableMaxHeight = 52 + 4 * 54; // header ~52 + 4 rows ~54 each (approx)

  return (
    <div className="mp-wrap">
      {/* Toast */}
      {toast && <div className={`mp-toast ${toast.type === "ok" ? "ok" : "err"}`}>{toast.msg}</div>}

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
                      <td className="mp-location-cell">
                        <div className="mp-loc-fixed">
                          {defaultLoc ? `${defaultLoc} – ${locMap.get(defaultLoc) || ""}` : "Location not set"}
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

          {/* ===================== Master Packs Table (NEW) ===================== */}
          <div style={{ marginTop: 14 }}>
            <div className="mp-section-title" style={{ fontSize: 20 }}>
              Master Packs
            </div>

            {/* Filters */}
            <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "1fr 1fr 1fr" : "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    border: "1px solid #d7dde7",
                    borderRadius: 8,
                    padding: "0 10px",
                    outline: "none",
                    background: "#fff",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    border: "1px solid #d7dde7",
                    borderRadius: 8,
                    padding: "0 10px",
                    outline: "none",
                    background: "#fff",
                  }}
                />
              </div>

              {isAdmin && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                      From Location
                    </label>
                    <select
                      value={fromLocFilter}
                      onChange={(e) => setFromLocFilter(e.target.value)}
                      style={{
                        width: "100%",
                        height: 36,
                        border: "1px solid #d7dde7",
                        borderRadius: 8,
                        padding: "0 10px",
                        outline: "none",
                        background: "#fff",
                        fontWeight: 600,
                      }}
                    >
                      <option value="">All</option>
                      {locs.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.code} - {l.name}
                        </option>
                      ))}
                      <option value="HQ">HQ</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                      To Location
                    </label>
                    <select
                      value={toLocFilter}
                      onChange={(e) => setToLocFilter(e.target.value)}
                      style={{
                        width: "100%",
                        height: 36,
                        border: "1px solid #d7dde7",
                        borderRadius: 8,
                        padding: "0 10px",
                        outline: "none",
                        background: "#fff",
                        fontWeight: 600,
                      }}
                    >
                      <option value="">All</option>
                      {locs.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.code} - {l.name}
                        </option>
                      ))}
                      <option value="HQ">HQ</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
              <button className="mp-btn mp-btn-primary" onClick={onApplyFilters} disabled={packsLoading}>
                {packsLoading ? "Loading..." : "Apply"}
              </button>
              {packsErr ? <span style={{ color: "#991b1b", fontWeight: 700 }}>{packsErr}</span> : null}
            </div>

            {/* List table */}
            <div
              style={{
                marginTop: 12,
                border: "1px solid #eef1f6",
                borderRadius: 10,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <div style={{ maxHeight: packsTableMaxHeight, overflowY: "auto" }}>
                <table className="mp-table" style={{ borderRadius: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>S.No</th>
                      <th>MasterPack No.</th>
                      <th>From Location</th>
                      <th>To Location</th>
                      <th style={{ width: 240 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packsLoading ? (
                      <tr>
                        <td colSpan={5} className="mp-empty">
                          Loading…
                        </td>
                      </tr>
                    ) : packs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="mp-empty">
                          No master packs found.
                        </td>
                      </tr>
                    ) : (
                      packs.map((p, idx) => {
                        const fromCode = (p.from_location?.code || "").trim();
                        const fromName = (p.from_location?.name || "").trim();
                        const toCode = (p.to_location?.code || "").trim();
                        const toName = (p.to_location?.name || "").trim();

                        // Show HQ nicely if backend sends blank name
                        const fromLabel =
                          fromCode || fromName ? `${fromCode} - ${fromName}`.trim() : "-";
                        const toLabel =
                          toCode || toName ? `${toCode} - ${toName}`.trim() : "-";

                        return (
                          <tr key={p.number || idx}>
                            <td>{idx + 1}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => navigate(`/inventory/master-packaging/${encodeURIComponent(p.number)}`)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  padding: 0,
                                  color: "#1d4ed8",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                }}
                                title="Open Master Pack"
                              >
                                {p.number}
                              </button>
                            </td>
                            <td>{fromLabel}</td>
                            <td>{toLabel}</td>
                            <td>{fmtDateTime(p.created_at)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* ===================== /Master Packs Table ===================== */}
        </div>

        {/* RIGHT Preview */}
        <div className="mp-right-card">
          <div className="mp-preview-head">
            <span className="mp-tag">Station {station}</span>
            <span className={`mp-status ${packResult ? "saved" : "open"}`}>{packResult ? "Saved" : "Open"}</span>
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

      {/* Floating header dropdown */}
      {headLocOpen &&
        createPortal(
          <div
            ref={headPanelRef}
            className="mp-popover mp-float-panel"
            style={{ position: "fixed", top: headLocRect.top, left: headLocRect.left, width: headLocRect.width }}
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
