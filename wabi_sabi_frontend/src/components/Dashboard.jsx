// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { listTransfers } from "../api/client";
import "../styles/Dashboard.css";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

/* -------------------- Static filters -------------------- */
const LOCATIONS = [
  { id: "TN", name: "Brands4Less - Tilak Nagar" },
  { id: "M3M", name: "Brands4Less - M3M Urbana" },
  { id: "RJR", name: "Brands4Less - Rajori Garden inside (RJR)" },
  { id: "RJO", name: "Rajori Garden outside (RJO)" },
  { id: "IFC", name: "Brands4Less-Iffco Chock" },
  { id: "KN", name: "Brands4Less-Krishna Nagar" },
  { id: "UPAP", name: "Brands4Less-UP-AP" },
  { id: "UV", name: "Brands4Less-Udhyog Vihar" },
];

const CHANNELS = [
  { id: "ONLINE", name: "ONLINE" },
  { id: "OFFLINE", name: "OFFLINE" },
];

/* -------------------- Money helpers -------------------- */
const money0 = (n) =>
  typeof n === "number"
    ? "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
    : String(n);
const money2 = (n) =>
  typeof n === "number"
    ? "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(n);

/* -------------------- KPI mock -------------------- */
function computeMetricsMock({ from, to, locationIds, channelIds }) {
  const loc = Math.max(locationIds.length, 1);
  const ch = Math.max(channelIds.length, 1);
  const days = Math.max(1, Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1);
  const base = 5674 * loc * ch * days;

  const m = {
    totalSales: base + 11073, totalInvoice: 8 * loc * ch, soldQty: 165 * loc,
    totalCustomers: 7 * loc, toReceive: Math.round(base * 0.23), salesReturn: 0,
    totalPurchase: 0, totalBills: 0, purchaseQty: 0, suppliers: 12, toPay: 0,
    purchaseReturn: 0, totalPaid: 0, totalExpense: 0, totalProducts: "1.81 L",
    stockQty: 93, stockValue: "₹1.10 L", cashInHand: "15.41 L", grossProfit: 1199,
    avgProfitMargin: 0, avgProfitMarginPct: 0, avgCartValue: 1199, avgBills: 1, bankAccounts: 0,
  };

  return [
    { label: "Total Sales", value: money0(m.totalSales), tone: "mint" },
    { label: "Total Invoice", value: m.totalInvoice, tone: "mint" },
    { label: "Sold Qty", value: m.soldQty, tone: "mint" },
    { label: "Total Customers", value: m.totalCustomers, tone: "mint" },
    { label: "To Receive", value: money0(m.toReceive), tone: "mint" },
    { label: "Total Sales Return", value: money0(m.salesReturn), tone: "mint" },

    { label: "Total Purchase", value: money0(m.totalPurchase), tone: "sky" },
    { label: "Total Bills", value: m.totalBills, tone: "sky" },
    { label: "Purchase Qty", value: m.purchaseQty, tone: "sky" },
    { label: "Total Suppliers", value: m.suppliers, tone: "sky" },
    { label: "To Pay", value: money0(m.toPay), tone: "sky" },
    { label: "Total Purchase Return", value: m.purchaseReturn, tone: "sky" },

    { label: "Total Paid", value: money0(m.totalPaid), tone: "violet" },
    { label: "Total Expense", value: m.totalExpense, tone: "violet" },
    { label: "Total Products", value: m.totalProducts, tone: "violet" },
    { label: "Stock Qty", value: m.stockQty, tone: "violet" },
    { label: "Stock Value", value: m.stockValue, tone: "violet" },
    { label: "Cash in Hand", value: m.cashInHand, tone: "violet" },

    { label: "Gross Profit", value: m.grossProfit, tone: "rose" },
    { label: "Avg. Profit Margin", value: money0(m.avgProfitMargin), tone: "rose" },
    { label: "Avg. Profit Margin(%)", value: m.avgProfitMarginPct.toFixed(2), tone: "rose" },
    { label: "Avg. Cart Value", value: money0(m.avgCartValue), tone: "rose" },
    { label: "Avg. Bills (Nos.)", value: m.avgBills, tone: "rose" },
    { label: "Bank Accounts", value: m.bankAccounts, tone: "rose" },
  ];
}

/* -------------------- Helpers -------------------- */
function niceStep(target) {
  if (target <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(target));
  const b = target / p;
  return (b > 5 ? 10 : b > 2 ? 5 : b > 1 ? 2 : 1) * p;
}

/* -------------------- SVG Bar Chart -------------------- */
function BarChart({
  xLabels,
  series,
  height = 380,
  pad = { l: 108, r: 180, t: 26, b: 62 },
  zoom = 1,
  pan = 0,
  hoverIndex = -1,
  svgRef,
  forceYMaxWhenEmpty = 0
}) {
  const width = 900;
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const flat = series.flatMap(s => s.data ?? []);
  const ySeed = flat.length ? Math.max(...flat, 0) : (forceYMaxWhenEmpty || 1);
  const segments = 4;
  let step = niceStep(ySeed / segments);
  let yMax = step * segments;
  while (yMax < ySeed) yMax += step;

  const yToPx = v => pad.t + innerH - (v / yMax) * innerH;

  const baseGroupW = innerW / Math.max(1, xLabels.length);
  const groupW = baseGroupW * Math.max(1, zoom);
  const barGap = 10;
  const barW = Math.min(28, (groupW - barGap * (series.length + 1)) / Math.max(1, series.length));
  const minPan = -Math.max(0, groupW * xLabels.length - innerW);
  const panClamped = Math.max(minPan, Math.min(0, pan));

  const clipId = useMemo(() => `plotClip-${Math.random().toString(36).slice(2)}`, []);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="gridchart-svg" ref={svgRef}>
      {Array.from({ length: segments + 1 }).map((_, i) => {
        const val = step * i;
        const y = yToPx(val);
        return (
          <g key={i}>
            <line x1={pad.l} x2={pad.l + innerW} y1={y} y2={y} />
            <text className="y-tick" x={pad.l - 16} y={y + 4} textAnchor="end">
              {Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </text>
          </g>
        );
      })}

      <defs>
        <clipPath id={clipId}>
          <rect x={pad.l} y={pad.t} width={innerW} height={innerH} rx="4" ry="4" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {xLabels.map((_, xi) => {
          const gx = pad.l + panClamped + xi * groupW;
          return series.map((s, si) => {
            const v = (s.data && s.data[xi]) || 0;
            const x = gx + barGap + si * (barW + barGap);
            const y = yToPx(v);
            const h = Math.max(0, pad.t + innerH - y);
            return (
              <rect key={`${xi}-${si}`} x={x} y={y} width={barW} height={h} fill={s.color} rx="3"
                opacity={hoverIndex >= 0 && xi !== hoverIndex ? 0.35 : 1} />
            );
          });
        })}

        {hoverIndex >= 0 && (
          <rect
            x={pad.l + panClamped + hoverIndex * groupW}
            y={pad.t}
            width={groupW} height={innerH}
            fill="rgba(37,99,235,0.08)"
          />
        )}
      </g>

      {/* X labels */}
      {xLabels.map((lbl, i) => {
        const x = pad.l + panClamped + i * groupW + groupW / 2;
        return (
          <text className="x-tick" key={i} x={x} y={pad.t + innerH + 20} textAnchor="middle">
            {lbl}
          </text>
        );
      })}
    </svg>
  );
}

/* -------------------- Date Range Input -------------------- */
function DateRangeInput({ value, onChange, small = false }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  const todayDMY = useMemo(() => {
    const d = new Date(); const p = n => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }, []);

  const normalizeRange = (v) => {
    if (typeof v !== "string" || !v.includes(" - ")) return `${todayDMY} - ${todayDMY}`;
    const [a, b] = v.split(" - ");
    return (a && b) ? v : `${todayDMY} - ${todayDMY}`;
  };

  const norm = normalizeRange(value);
  const [tmp, setTmp] = useState(norm);

  useEffect(() => {
    function h(e) { if (!ref.current) return; if (!ref.current.contains(e.target)) setOpen(false); }
    function onEsc(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", onEsc); };
  }, []);

  const [fromStr, toStr] = norm.split(" - ");
  const toISO = dmy => { const [a, b, c] = dmy.split("/"); return `${c}-${b}-${a}` };
  const toDMY = iso => { if (!iso) return ""; const [a, b, c] = iso.split("-"); return `${c}/${b}/${a}` };

  const [fIso, setFIso] = useState(toISO(fromStr));
  const [tIso, setTIso] = useState(toISO(toStr));

  useEffect(() => {
    const n = normalizeRange(value);
    const [fs, ts] = n.split(" - ");
    setFIso(toISO(fs));
    setTIso(toISO(ts));
    setTmp(n);
  }, [value]);

  const apply = () => { const out = `${toDMY(fIso)} - ${toDMY(tIso)}`; onChange(out); setOpen(false); };

  return (
    <div className={`drp-wrap ${small ? "drp-small" : ""}`} ref={ref}>
      <div className={`drp-input ${open ? "focus" : ""}`} onClick={() => setOpen(true)}>
        <span>{tmp}</span><i className="mi">📅</i>
      </div>
      {open && (
        <div className="drp-pop">
          <div className="drp-cal">
            <div className="drp-col"><div className="drp-lbl">From</div><input type="date" value={fIso} onChange={e => setFIso(e.target.value)} /></div>
            <div className="drp-col"><div className="drp-lbl">To</div><input type="date" value={tIso} onChange={e => setTIso(e.target.value)} /></div>
          </div>
          <div className="drp-footer">
            <span className="drp-preview">{`${toDMY(fIso)} - ${toDMY(tIso)}`}</span>
            <div><button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary" onClick={apply}>Apply</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- Download helpers -------------------- */
function sanitize(name = "chart") {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCSV({ title, xLabels, series }) {
  const headers = ["Label", ...series.map(s => s.name)];
  const rows = xLabels.map((x, i) => [x, ...series.map(s => (s.data?.[i] ?? 0))]);
  const csvLines = [
    `Title,${title}`,
    headers.join(","),
    ...rows.map(r => r.join(","))
  ];
  downloadText(`${sanitize(title)}.csv`, csvLines.join("\n"));
}

function exportPNG({ title, svgEl }) {
  if (!svgEl) return;
  const rect = svgEl.getBoundingClientRect();
  const scale = 2; // retina
  const w = Math.max(900, rect.width) * scale;
  const h = Math.max(360, rect.height) * scale;

  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const svgStr = new XMLSerializer().serializeToString(clone);
  const svg64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png; a.download = `${sanitize(title)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  img.src = svg64;
}

/* -------------------- Chart Card -------------------- */
/** Hand (✋) = enable/disable hover-to-show. Default OFF. */
function ChartCard({ title, legends, xLabels, series = [], rangeValue, onRangeChange, rightSelector = null, forceYMaxWhenEmpty = 0 }) {
  const [zoom] = useState(1);
  const [pan] = useState(0);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [handOn, setHandOn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const svgRef = useRef(null);
  const menuRef = useRef(null);
  const bodyRef = useRef(null);

  const width = 900, pad = { l: 108, r: 180, t: 26, b: 62 }, innerW = width - pad.l - pad.r;

  useEffect(() => {
    const handler = e => { if (!menuRef.current) return; if (!menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    function move(e) {
      if (!handOn) { setHoverIdx(-1); return; }
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const baseGroupW = innerW / Math.max(1, xLabels.length);
      const groupW = baseGroupW * Math.max(1, 1);
      const minPan = -Math.max(0, groupW * xLabels.length - innerW);
      const panClamped = Math.max(minPan, Math.min(0, pan));
      const effectiveX = localX - panClamped;
      const idx = Math.max(0, Math.min(xLabels.length - 1, Math.floor(effectiveX / groupW + 0.5)));
      setHoverIdx(idx);
    }
    function leave() { setHoverIdx(-1); }

    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousemove", move); el.removeEventListener("mouseleave", leave); };
  }, [handOn, pan, xLabels.length, innerW]);

  const activeIdx = hoverIdx;
  const showTip = handOn && activeIdx >= 0;

  const tip = useMemo(() => {
    if (!showTip || !bodyRef.current) return { show: false };
    const rect = bodyRef.current.getBoundingClientRect();
    const left = rect.right - 310;
    const top = rect.top + 56;
    const rows = series.map(s => ({ name: s.name, color: s.color, value: (s.data?.[activeIdx] ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }));
    return { show: true, left, top, date: xLabels[activeIdx], rows };
  }, [showTip, series, xLabels, activeIdx]);

  const onDownloadCSV = () => exportCSV({ title, xLabels, series });
  const onDownloadPNG = () => exportPNG({ title, svgEl: svgRef.current });

  return (
    <div className="chart-card">
      <div className="chart-head">
        <div className="chart-title">{title}</div>
        <div className="chart-head-right">
          {rightSelector}
          <DateRangeInput value={rangeValue} onChange={onRangeChange} small />
        </div>
      </div>

      <div className="chart-body" ref={bodyRef}>
        <BarChart
          xLabels={xLabels}
          series={series.length ? series : [{ color: "transparent", data: Array(xLabels.length).fill(0) }]}
          zoom={1}
          pan={0}
          hoverIndex={activeIdx}
          svgRef={svgRef}
          forceYMaxWhenEmpty={forceYMaxWhenEmpty}
        />

        {/* Tools */}
        <div className="chart-tools" aria-hidden>
          <button className="tool-btn" title="Zoom in" disabled>＋</button>
          <button className="tool-btn" title="Zoom out" disabled>－</button>
          <button className={`tool-btn ${handOn ? "active" : ""}`} title="Show data on hover (toggle)" onClick={() => setHandOn(v => !v)}>✋</button>
          <button className="tool-btn" title="Reset" onClick={() => { setHoverIdx(-1); setHandOn(false); }}>🏠</button>
          <div className="tool-menu" ref={menuRef}>
            <button className="tool-btn" title="More" onClick={() => setMenuOpen(v => !v)}>≡</button>
            {menuOpen && (
              <div className="menu-pop">
                <div className="menu-item" onClick={onDownloadCSV}>Download CSV</div>
                <div className="menu-item" onClick={onDownloadPNG}>Download PNG</div>
              </div>
            )}
          </div>
        </div>

        {/* Legends */}
        <div className="chart-legend">
          {(legends || []).map((lg, i) => (
            <div key={i} className="legend-item">
              <span className="legend-dot" style={{ background: lg.color }} />
              <span>{lg.label}</span>
            </div>
          ))}
        </div>

        {tip.show && (
          <div className="hover-tip" style={{ left: tip.left, top: tip.top }}>
            <div className="tip-head">{tip.date}</div>
            {tip.rows.map(r => (
              <div key={r.name} className="tip-row">
                <span className="tip-dot" style={{ background: r.color }} />
                <span className="tip-name">{r.name}</span>
                <span className="tip-val">{r.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- Simple Table Card -------------------- */
function TableCard({ title, rangeValue, onRangeChange, columns, rows, rightSide = null, scrollY = 0, showDate = true }) {
  return (
    <div className="table-card">
      <div className="table-head">
        <div className="table-title">{title}</div>
        <div className="table-head-right">
          {rightSide}
          {showDate && <DateRangeInput value={rangeValue} onChange={onRangeChange} small />}
        </div>
      </div>
      <div className={`table-wrap ${scrollY ? "has-scroll" : ""}`} style={scrollY ? { maxHeight: scrollY } : undefined}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-idx">#</th>
              {columns.map(c => (
                <th key={c.key} className={`${c.align === "right" ? "al-r" : c.align === "center" ? "al-c" : ""}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td className="al-c col-idx">{idx + 1}</td>
                {columns.map(c => (
                  <td key={c.key} className={`${c.align === "right" ? "al-r" : c.align === "center" ? "al-c" : ""}`}>{r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------- Main Dashboard -------------------- */
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const todayDMY = useMemo(() => { const d = new Date(); const p = n => String(n).padStart(2, "0"); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`; }, []);
  const startDMY = useMemo(() => { const d = new Date(); d.setDate(1); const p = n => String(n).padStart(2, "0"); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`; }, []);
  const defaultRange = `${startDMY} - ${todayDMY}`;

  const [globalRange, setGlobalRange] = useState(defaultRange);

  /* pills + dropdowns */
  const [locOpen, setLocOpen] = useState(false), [chanOpen, setChanOpen] = useState(false);
  const [locationIds, setLocationIds] = useState([LOCATIONS[0].id]);
  const [channelIds, setChannelIds] = useState(["OFFLINE"]);
  const [locQuery, setLocQuery] = useState(""), [chanQuery, setChanQuery] = useState("");
  const locBtnRef = useRef(null), chanBtnRef = useRef(null);
  const locDropStyle = useSmartDropdown(locOpen, locBtnRef);
  const chanDropStyle = useSmartDropdown(chanOpen, chanBtnRef);
  const filteredLocations = useMemo(() => { const q = locQuery.trim().toLowerCase(); return q ? LOCATIONS.filter(l => l.name.toLowerCase().includes(q)) : LOCATIONS; }, [locQuery]);
  const filteredChannels = useMemo(() => { const q = chanQuery.trim().toLowerCase(); return q ? CHANNELS.filter(c => c.name.toLowerCase().includes(q)) : CHANNELS; }, [chanQuery]);
  const allChannelIds = CHANNELS.map(c => c.id);
  const toggle = (id, list, setList) => setList(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  /* profile menu (right) */
  const [profileOpen, setProfileOpen] = useState(false);
  const profileBtnRef = useRef(null);
  const profilePopRef = useRef(null);

  const displayName = useMemo(() => {
    if (!user) return "Guest";
    if (user.full_name && user.full_name.trim()) return user.full_name;
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.username || "User";
  }, [user]);

  const displayRole = useMemo(() => {
    if (!user) return "";
    if (user.role_label) return user.role_label;
    if (user.is_superuser) return "Admin";
    return user.role || "";
  }, [user]);

  const initials = useMemo(() => {
    const src = displayName || "";
    return src
      .split(" ")
      .filter(Boolean)
      .map(p => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";
  }, [displayName]);

  useEffect(() => {
    function away(e) {
      if (!profileOpen) return;
      if (profilePopRef.current?.contains(e.target)) return;
      if (profileBtnRef.current?.contains(e.target)) return;
      setProfileOpen(false);
    }
    function esc(e) { if (e.key === 'Escape') setProfileOpen(false); }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [profileOpen]);

  /* KPI */
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const toISO = (dmy) => { const [dd, mm, yy] = dmy.split("/"); return `${yy}-${mm}-${dd}`; };
  const parseRange = (rng) => { const [a, b] = rng.split(" - "); return { from: toISO(a), to: toISO(b) }; };

  useEffect(() => {
    const { from, to } = parseRange(globalRange); // YYYY-MM-DD strings
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        // Build params for backend
        const params = {
          date_from: from,
          date_to: to,
        };

        // If exactly ONE location selected, filter by that (to=CODE).
        // If multiple locations, show combined of all (no "to" filter).
        if (locationIds.length === 1) {
          params.to = locationIds[0];
        }

        const transfers = await listTransfers(params);

        // --------- Aggregate from API ---------
        let totalSales = 0;         // sum of net_amount
        let totalInvoice = 0;       // number of StockTransfer rows
        let soldQty = 0;            // sum of qty across all transfers

        totalInvoice = transfers.length;

        for (const t of transfers) {
          const amt = Number(t.net_amount || 0);
          const q = Number(t.qty || 0);
          if (Number.isFinite(amt)) totalSales += amt;
          if (Number.isFinite(q)) soldQty += q;
        }

        // Start from your existing mock metrics (for all other cards)
        const baseCards = computeMetricsMock({ from, to, locationIds, channelIds });

        // Override only the first 3 KPIs with real values
        const cards = baseCards.map((card) => {
          if (card.label === "Total Sales") {
            return { ...card, value: money0(totalSales) };
          }
          if (card.label === "Total Invoice") {
            return { ...card, value: totalInvoice };
          }
          if (card.label === "Sold Qty") {
            return { ...card, value: soldQty };
          }
          return card; // keep others as they are (default/mock)
        });

        if (!cancelled) {
          setMetrics(cards);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load");
          // Fallback: still show mock numbers if API fails
          const { from, to } = parseRange(globalRange);
          setMetrics(computeMetricsMock({ from, to, locationIds, channelIds }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [globalRange, locationIds, channelIds]);


  /* chart/table ranges */
  const [rangeSVP, setRangeSVP] = useState(defaultRange);
  const [rangeTXN, setRangeTXN] = useState(defaultRange);
  const [rangeCAT, setRangeCAT] = useState(defaultRange);
  const [rangeLSP, setRangeLSP] = useState(defaultRange);
  const [rangeBSP, setRangeBSP] = useState(defaultRange);

  /* data */
  const xDates = ["13:00", "15:00", "17:00", "19:00", "21:00", "23:00"];

  /* ---------- LOGIN LOG location filter (in-card) ---------- */
  const [logLocOpen, setLogLocOpen] = useState(false);
  const [logLocIds, setLogLocIds] = useState([LOCATIONS[0].id]);
  const [logLocQuery, setLogLocQuery] = useState("");
  const logBtnRef = useRef(null);
  const logDropStyle = useSmartDropdown(logLocOpen, logBtnRef);
  const filteredLogLocs = useMemo(() => {
    const q = logLocQuery.trim().toLowerCase();
    return q ? LOCATIONS.filter(l => l.name.toLowerCase().includes(q)) : LOCATIONS;
  }, [logLocQuery]);

  const LoginLogRightSide = (
    <div className="select-wrap">
      <button
        ref={logBtnRef}
        className="pill"
        onClick={() => setLogLocOpen(v => !v)}
      >
        <span className="pill-label">Select Location</span>
        <span className="pill-count">{logLocIds.length}</span>
      </button>

      {logLocOpen && (
        <div className="dropdown" style={logDropStyle}>
          <div className="dd-search">
            <input
              placeholder="Search locations…"
              value={logLocQuery}
              onChange={e => setLogLocQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="dd-list">
            {filteredLogLocs.map(l => (
              <label key={l.id} className="opt">
                <input
                  type="checkbox"
                  checked={logLocIds.includes(l.id)}
                  onChange={() =>
                    setLogLocIds(prev =>
                      prev.includes(l.id)
                        ? prev.filter(x => x !== l.id)
                        : [...prev, l.id]
                    )
                  }
                />
                <span>{l.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="dash-page">
      <div className="dash-panel">
        {/* ===== Toolbar ===== */}
        <div className="dash-toolbar grid">
          <div className="toolbar-left">
            <DateRangeInput value={globalRange} onChange={setGlobalRange} />
          </div>

          <div className="toolbar-center">
            {/* Location */}
            <div className="select-wrap">
              <button ref={locBtnRef} className="pill" onClick={() => { setLocOpen(v => !v); setChanOpen(false); }}>
                <span className="pill-label">Select Location</span>
                <span className="pill-count">{locationIds.length}</span>
              </button>
              {locOpen && (
                <div className="dropdown" style={locDropStyle}>
                  <div className="dd-search">
                    <input placeholder="Search locations…" value={locQuery} onChange={e => setLocQuery(e.target.value)} autoFocus />
                  </div>
                  <div className="dd-list">
                    {filteredLocations.map(l => (
                      <label key={l.id} className="opt">
                        <input type="checkbox" checked={locationIds.includes(l.id)} onChange={() => toggle(l.id, locationIds, setLocationIds)} />
                        <span>{l.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Channel */}
            <div className="select-wrap">
              <button ref={chanBtnRef} className="pill" onClick={() => { setChanOpen(v => !v); setLocOpen(false); }}>
                <span className="pill-label">Select Channel</span>
                <span className="pill-count">{channelIds.length}</span>
              </button>
              {chanOpen && (
                <div className="dropdown" style={chanDropStyle}>
                  <div className="dd-search">
                    <input placeholder="Search channels…" value={chanQuery} onChange={e => setChanQuery(e.target.value)} autoFocus />
                  </div>
                  <div className="dd-list">
                    <label className="opt">
                      <input type="checkbox" checked={channelIds.length === allChannelIds.length}
                        onChange={() => setChannelIds(prev => prev.length === allChannelIds.length ? [] : allChannelIds)} />
                      <span>ALL</span>
                    </label>
                    {CHANNELS.map(c => (
                      <label key={c.id} className="opt">
                        <input type="checkbox" checked={channelIds.includes(c.id)}
                          onChange={() => setChannelIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])} />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: profile avatar */}
          <div className="toolbar-right">
            <button
              ref={profileBtnRef}
              className="avatar-btn"
              onClick={() => setProfileOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <span className="avatar-dot">{initials}</span>
            </button>

            {profileOpen && (
              <div className="profile-pop" ref={profilePopRef} role="menu">
                <div className="profile-head">
                  <div className="profile-title">{displayName}</div>
                  <div className="profile-sub">{displayRole}</div>
                </div>
                <a className="profile-link" href="#profile" role="menuitem">
                  <span className="profile-ico">👤</span>
                  <span>My Profile</span>
                </a>
                <div className="profile-actions">
                  <button className="btn ghost wfull">
                    🔑 Change Password
                  </button>
                  <button
                    className="btn danger wfull"
                    onClick={async () => {
                      await logout();
                      setProfileOpen(false);
                      navigate("/login");
                    }}
                  >
                    ↪ Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        {err && <div className="dash-error">⚠ {err}</div>}
        {loading && <div className="dash-loading">Loading…</div>}

        {/* KPI cards */}
        <div className="metric-grid" aria-busy={loading}>
          {metrics.map((m, i) => (
            <div key={i} className="metric-card">
              <div className={`metric-badge ${m.tone}`}>{m.value}</div>
              <div className="metric-label">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="charts-row">
          <ChartCard
            title="SALES V/S PURCHASE"
            xLabels={xDates}
            series={[
              { name: "Sales", color: "#1f77b4", data: [245000, 130000, 260000, 5000, 0, 0] },
              { name: "Purchase", color: "#2ca02c", data: [0, 0, 250000, 0, 0, 0] },
              { name: "Sales Return", color: "#ff7f0e", data: [0, 0, 0, 0, 0, 0] },
              { name: "Purchase Return", color: "#d62728", data: [0, 0, 0, 0, 0, 0] },
            ]}
            legends={[
              { color: "#1f77b4", label: "Sales" },
              { color: "#2ca02c", label: "Purchase" },
              { color: "#ff7f0e", label: "Sales Return" },
              { color: "#d62728", label: "Purchase Return" },
            ]}
            rangeValue={rangeSVP}
            onRangeChange={setRangeSVP}
          />

          <ChartCard
            title="TRANSACTION"
            xLabels={["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"]}
            series={[]}
            legends={[
              { color: "#1f77b4", label: "Cash" },
              { color: "#2ca02c", label: "Cheque" },
              { color: "#ff7f0e", label: "Card" },
              { color: "#9467bd", label: "Bank" },
              { color: "#8c564b", label: "Wallet" },
              { color: "#6a3d9a", label: "upi" },
              { color: "#17becf", label: "Instamojo" },
              { color: "#bcbd22", label: "Razor Pay" },
              { color: "#d62728", label: "Other" },
            ]}
            rangeValue={rangeTXN}
            onRangeChange={setRangeTXN}
            forceYMaxWhenEmpty={2}
          />
        </div>

        {/* Tables row 1 */}
        <div className="tables-row">
          <TableCard title="BEST SELLING PRODUCT" rangeValue={rangeBSP} onRangeChange={setRangeBSP}
            columns={[{ key: "pname", label: "Product Name" }, { key: "bills", label: "No. of Bills", align: "right" }, { key: "qty", label: "Sales Qty", align: "right" }, { key: "amount", label: "Sales Amount", align: "right" }, { key: "profit", label: "Profit", align: "right" }, { key: "pct", label: "Sales(%)", align: "right" }]}
            rows={Array.from({ length: 12 }).map(() => ({ pname: <a href="#!" className="tbl-link">(150) (L) Blouse</a>, bills: 1, qty: 1, amount: money2(200), profit: money2(0), pct: "10.00" }))}
            scrollY={420}
          />
          <TableCard title="LEAST SELLING PRODUCT" rangeValue={rangeLSP} onRangeChange={setRangeLSP}
            columns={[{ key: "pname", label: "Product Name" }, { key: "bills", label: "No. of Bills", align: "right" }, { key: "qty", label: "Sales Qty", align: "right" }, { key: "amount", label: "Sales Amount", align: "right" }, { key: "profit", label: "Profit", align: "right" }, { key: "pct", label: "Sales(%)", align: "right" }]}
            rows={Array.from({ length: 12 }).map(() => ({ pname: <a href="#!" className="tbl-link">(150) (L) Blouse</a>, bills: 1, qty: 1, amount: money2(200), profit: money2(0), pct: "10.00" }))}
            scrollY={420}
          />
        </div>

        {/* Tables row 2 */}
        <div className="tables-row">
          <TableCard
            title="CATEGORY SALES"
            rangeValue={rangeCAT}
            onRangeChange={setRangeCAT}
            columns={[{ key: "name", label: "Category Name" }, { key: "qty", label: "Sales Qty", align: "right" }, { key: "amount", label: "Sales Amount", align: "right" }, { key: "profit", label: "Profit", align: "right" }, { key: "pct", label: "Sales(%)", align: "right" }]}
            rows={[{ name: "Clothing", qty: 30, amount: money2(1200), profit: money2(0), pct: "100.00" }]}
          />

          {/* LOGIN LOG with right-side location filter */}
          <TableCard
            title="LOGIN LOG"
            columns={[{ key: "time", label: "Login Time" }, { key: "ip", label: "IP Address" }, { key: "system", label: "System Details" }]}
            rows={[
              { time: "IT Account Logged In at 10-11-2025 10:33:09 AM", ip: "122.180.248.68:50060", system: "Desktop Win10 10.0 Chrome Browser" },
              { time: "Krishna Pandit Logged In at 10-11-2025 09:02:11 AM", ip: "122.180.248.68:55618", system: "Desktop Win10 Chrome" },
              { time: "Manager Logged In at 09-11-2025 06:18:03 PM", ip: "10.1.2.34:50123", system: "Desktop Win11 Edge" },
            ]}
            scrollY={420}
            showDate={false}
            rightSide={LoginLogRightSide}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------- Smart dropdown (for pills) -------------------- */
const DD_WIDTH = 330;
function useSmartDropdown(open, btnRef) {
  const [style, setStyle] = useState(null);
  useEffect(() => {
    function calc() {
      if (!open || !btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect(); const pad = 8;
      const left = Math.min(Math.max(pad, r.left), window.innerWidth - DD_WIDTH - pad);
      const top = r.bottom + 8;
      setStyle({ position: "fixed", left: `${left}px`, top: `${top}px`, width: `${DD_WIDTH}px`, zIndex: 1000 });
    }
    calc();
    if (!open) return;
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    return () => { window.removeEventListener("resize", calc); window.removeEventListener("scroll", calc, true); };
  }, [open, btnRef]);
  return style;
}
