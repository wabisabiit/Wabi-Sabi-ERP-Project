import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "../styles/MasterPackagingPage.css";

const ALL_LOCATIONS = [
  "Brands4Less - Tilak Nagar",
  "Brands4Less - M3M Urbana",
  "Brands4Less-Rajori Garden inside (RJR)",
  "Rajori Garden outside (RJO)",
  "Brands4Less-Iffco Chock",
  "Brands4Less-Krishna Nagar",
  "Brands4Less-UP-AP",
  "Brands4Less-Udhyog Vihar",
];

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
  const [scan, setScan] = useState("");
  const [rows, setRows] = useState([]);
  const [station] = useState("PACK-01");

  /* ───── Header Location (default for new rows) ───── */
  const [defaultLoc, setDefaultLoc] = useState("");
  const [headLocOpen, setHeadLocOpen] = useState(false);
  const [headLocQuery, setHeadLocQuery] = useState("");
  const headBtnRef = useRef(null);

  // floating panel position (fixed)
  const [headLocRect, setHeadLocRect] = useState({ top: 0, left: 0, width: 280 });

  const headerFiltered = useMemo(() => {
    const q = headLocQuery.trim().toLowerCase();
    if (!q) return ALL_LOCATIONS;
    return ALL_LOCATIONS.filter((l) => l.toLowerCase().includes(q));
  }, [headLocQuery]);

  const openHeaderDropdown = () => {
    if (!headBtnRef.current) return;
    const r = headBtnRef.current.getBoundingClientRect();
    const width = Math.min(320, Math.max(r.width, 240));
    setHeadLocRect({ top: Math.round(r.bottom + 6), left: Math.round(r.left), width });
    setHeadLocQuery("");
    setHeadLocOpen(true);
  };

  const pickHeaderLocation = (loc) => {
    setDefaultLoc(loc);
    setHeadLocOpen(false);
    setHeadLocQuery("");
    // अगर चाहें तो खाली rows में default भरना:
    setRows((prev) => prev.map((r) => (r.location ? r : { ...r, location: loc })));
  };

  // dropdown बाहर क्लिक पर बंद
  const headPanelRef = useRef(null);
  useClickOutside([headPanelRef, headBtnRef], () => setHeadLocOpen(false));

  // resize/scroll पर panel reposition
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

  /* ───── Add row ───── */
  const addScanned = () => {
    if (!scan.trim()) return;
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        itemCode: scan.trim().toUpperCase(),
        name: "Sample Product",
        size: "M",
        price: 0,
        qty: 1,
        brand: "Brand",
        color: "—",
        location: defaultLoc || "",
      },
    ]);
    setScan("");
  };

  /* ───── Row-wise Location ───── */
  const [locOpenFor, setLocOpenFor] = useState(null);
  const [locQuery, setLocQuery] = useState("");
  const rowLocRef = useRef(null);
  useClickOutside([rowLocRef], () => setLocOpenFor(null));

  const filteredLocations = useMemo(() => {
    const q = locQuery.trim().toLowerCase();
    if (!q) return ALL_LOCATIONS;
    return ALL_LOCATIONS.filter((l) => l.toLowerCase().includes(q));
  }, [locQuery]);

  const setRowLocation = (rowId, value) => {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, location: value } : r)));
    setLocOpenFor(null);
    setLocQuery("");
  };

  const updateQty = (rowId, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, qty: Math.max(0, Number(value) || 0) } : r))
    );
  };

  const removeRow = (rowId) => setRows((prev) => prev.filter((r) => r.id !== rowId));

  return (
    <div className="mp-wrap">
      {/* Header */}
      <div className="mp-head">
        <h1>Master Packaging</h1>
        <div className="mp-station">
          <span className="mp-station-label">Station:</span>
          <span className="mp-station-badge"> {station}</span>
        </div>
      </div>

      <div className="mp-grid">
        {/* LEFT */}
        <div className="mp-left-card">
          <div className="mp-section-title">Scan Products</div>

          <div className="mp-scan-row">
            <div className="mp-field grow">
              <label>Barcode / Item Code (e.g., SKU-TSHIRT-BLKM)</label>
              <div className="mp-input">
                <input
                  type="text"
                  placeholder="Scan or type code..."
                  value={scan}
                  onChange={(e) => setScan(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addScanned()}
                />
              </div>
            </div>

            <button className="mp-btn mp-btn-dark" onClick={addScanned}>Add</button>
          </div>

          <div className="mp-tip">
            Tip: Append <b>*SIZE</b> to barcode to set size in one scan.
          </div>

          {/* Table */}
          <div className="mp-table-wrap">
            <table className="mp-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Product Name</th>
                  <th>Size</th>
                  <th>Selling Price</th>
                  <th>Qty</th>
                  <th>Brand</th>
                  <th>Color</th>

                  {/* Header Location with floating dropdown */}
                  <th className="mp-location-cell mp-th-loc">
                    <button
                      ref={headBtnRef}
                      type="button"
                      className={`mp-loc-btn mp-loc-btn--th ${defaultLoc ? "set" : ""}`}
                      onClick={() => (headLocOpen ? setHeadLocOpen(false) : openHeaderDropdown())}
                      title="Default Location for new scans"
                    >
                      {defaultLoc || "Location"}
                      <span className="material-icons-outlined">arrow_drop_down</span>
                    </button>
                  </th>

                  <th></th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="mp-empty" colSpan={9}>
                      Scan products to populate the list…
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.itemCode}</td>
                      <td className="mp-ellipsis">{r.name}</td>
                      <td>{r.size}</td>
                      <td className="mp-num">{r.price.toFixed(2)}</td>
                      <td className="mp-qty">
                        <input
                          type="number"
                          min="0"
                          value={r.qty}
                          onChange={(e) => updateQty(r.id, e.target.value)}
                        />
                      </td>
                      <td>{r.brand}</td>
                      <td>{r.color}</td>

                      {/* Row Location */}
                      <td className="mp-location-cell">
                        <button
                          className={`mp-loc-btn ${r.location ? "set" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocOpenFor((prev) => (prev === r.id ? null : r.id));
                            setLocQuery("");
                          }}
                        >
                          {r.location || "Select location"}
                          <span className="material-icons-outlined">arrow_drop_down</span>
                        </button>

                        {locOpenFor === r.id && (
                          <div
                            className="mp-popover"
                            ref={rowLocRef}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="mp-pop-search">
                              <input
                                autoFocus
                                placeholder="Search location…"
                                value={locQuery}
                                onChange={(e) => setLocQuery(e.target.value)}
                              />
                            </div>
                            <div className="mp-pop-list">
                              {filteredLocations.map((loc) => (
                                <button
                                  key={loc}
                                  className="mp-pop-item"
                                  onClick={() => setRowLocation(r.id, loc)}
                                >
                                  {loc}
                                </button>
                              ))}
                              {filteredLocations.length === 0 && (
                                <div className="mp-pop-empty">No matches</div>
                              )}
                            </div>
                          </div>
                        )}
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
              <div className="mp-total-row"><span>Items</span><b>{itemsCount}</b></div>
              <div className="mp-total-row"><span>Total Qty</span><b>{qtyTotal}</b></div>
            </div>

            <div className="mp-actions">
              <button className="mp-btn mp-btn-ghost">Close Master Packaging</button>
              <button className="mp-btn mp-btn-primary">Save &amp; Preview</button>
            </div>
          </div>
        </div>

        {/* RIGHT Preview */}
        <div className="mp-right-card">
          <div className="mp-preview-head">
            <span className="mp-tag">Station {station}</span>
            <span className="mp-status open">Open</span>
          </div>

          <div className="mp-preview-block">
            <div className="mp-preview-grid">
              <div className="mp-preview-kv"><span className="mp-k">Items</span><span className="mp-v">{itemsCount}</span></div>
              <div className="mp-preview-kv"><span className="mp-k">Qty</span><span className="mp-v">{qtyTotal}</span></div>
            </div>

            <div className="mp-preview-note">Nothing scanned yet.</div>

            <div className="mp-preview-sum">
              <div className="mp-preview-row"><span>Total Qty</span><b>{qtyTotal}</b></div>
              <div className="mp-preview-row"><span>Open</span><span>{new Date().toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating header dropdown (portal) */}
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
                <button key={loc} className="mp-pop-item" onClick={() => pickHeaderLocation(loc)}>
                  {loc}
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
