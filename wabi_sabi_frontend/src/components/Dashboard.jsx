// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listSales,
  listLoginLogs,
  listExpenses,
  dashboardSummary,
} from "../api/client";
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
    ? "₹" +
      n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : String(n);

/* -------------------- KPI mock -------------------- */
/**
 * For values not implemented yet, keep them 0 and mark "comingSoon: true"
 * so UI can show tooltip on hover.
 */
function computeMetricsMock({ from, to, locationIds, channelIds }) {
  const m = {
    totalSales: 0,
    totalInvoice: 0,
    soldQty: 0,
    totalCustomers: 0,
    toReceive: 0,
    salesReturn: 0,

    totalPurchase: 0,
    totalBills: 0,
    purchaseQty: 0,
    suppliers: 0,
    toPay: 0,
    purchaseReturn: 0,

    totalPaid: 0,
    totalExpense: 0,
    totalProductsAmount: 0,
    stockQty: 0,
    stockValue: 0,
    cashInHand: 0,

    grossProfit: 0,
    avgProfitMargin: 0,
    avgProfitMarginPct: 0,
    avgCartValue: 0,
    avgBills: 0,
    bankAccounts: 0,
  };

  const cs = (label, value, tone) => ({
    label,
    value,
    tone,
    comingSoon: true,
  });

  const real = (label, value, tone) => ({
    label,
    value,
    tone,
    comingSoon: false,
  });

  return [
    real("Total Sales", money0(m.totalSales), "mint"),
    real("Total Invoice", m.totalInvoice, "mint"),
    real("Sold Qty", m.soldQty, "mint"),
    real("Total Customers", m.totalCustomers, "mint"),
    real("To Receive", money0(m.toReceive), "mint"),
    real("Total Sales Return", money0(m.salesReturn), "mint"),

    real("Total Purchase", money0(m.totalPurchase), "sky"),
    real("Total Bills", m.totalBills, "sky"),
    real("Purchase Qty", m.purchaseQty, "sky"),
    cs("Total Suppliers", m.suppliers, "sky"),
    cs("To Pay", money0(m.toPay), "sky"),
    cs("Total Purchase Return", money0(m.purchaseReturn), "sky"),

    cs("Total Paid", money0(m.totalPaid), "violet"),
    real("Total Expense", money0(m.totalExpense), "violet"),
    real("Total Products", money0(m.totalProductsAmount), "violet"),
    cs("Stock Qty", m.stockQty, "violet"),
    cs("Stock Value", money0(m.stockValue), "violet"),
    real("Cash in Hand", money0(m.cashInHand), "violet"),

    real("Gross Profit", money0(m.grossProfit), "rose"),
    cs("Avg. Profit Margin", money0(m.avgProfitMargin), "rose"),
    cs("Avg. Profit Margin(%)", m.avgProfitMarginPct.toFixed(2), "rose"),
    cs("Avg. Cart Value", money0(m.avgCartValue), "rose"),
    cs("Avg. Bills (Nos.)", m.avgBills, "rose"),
    cs("Bank Accounts", m.bankAccounts, "rose"),
  ];
}

/* -------------------- Helpers -------------------- */
function niceStep(target) {
  if (target <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(target));
  const b = target / p;
  return (b > 5 ? 10 : b > 2 ? 5 : b > 1 ? 2 : 1) * p;
}

function sanitize(name = "chart") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCSV({ title, xLabels, series }) {
  const headers = ["Label", ...series.map((s) => s.name)];
  const rows = xLabels.map((x, i) => [x, ...series.map((s) => s.data?.[i] ?? 0)]);
  const csvLines = [`Title,${title}`, headers.join(","), ...rows.map((r) => r.join(","))];
  downloadText(`${sanitize(title)}.csv`, csvLines.join("\n"));
}

function exportPNG({ title, svgEl }) {
  if (!svgEl) return;
  const rect = svgEl.getBoundingClientRect();
  const scale = 2;
  const w = Math.max(900, rect.width) * scale;
  const h = Math.max(360, rect.height) * scale;

  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const svgStr = new XMLSerializer().serializeToString(clone);
  const svg64 = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const png = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = png;
    a.download = `${sanitize(title)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  img.src = svg64;
}

/* -------------------- Format login time -------------------- */
function formatLoginTime(iso, userDisplay) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const pad = (n) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();

  let hh = d.getHours();
  const mins = pad(d.getMinutes());
  const secs = pad(d.getSeconds());
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  const hhStr = pad(hh);

  return `${userDisplay} Logged In at ${dd}-${mm}-${yyyy} ${hhStr}:${mins}:${secs} ${ampm}`;
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
  forceYMaxWhenEmpty = 0,
}) {
  const width = 900;
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const flat = series.flatMap((s) => s.data ?? []);
  const ySeed = flat.length ? Math.max(...flat, 0) : forceYMaxWhenEmpty || 1;
  const segments = 4;
  let step = niceStep(ySeed / segments);
  let yMax = step * segments;
  while (yMax < ySeed) yMax += step;

  const yToPx = (v) => pad.t + innerH - (v / yMax) * innerH;

  const baseGroupW = innerW / Math.max(1, xLabels.length);
  const groupW = baseGroupW * Math.max(1, zoom);
  const barGap = 10;
  const barW = Math.min(
    28,
    (groupW - barGap * (series.length + 1)) / Math.max(1, series.length)
  );
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
              {Number(val).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
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
              <rect
                key={`${xi}-${si}`}
                x={x}
                y={y}
                width={barW}
                height={h}
                fill={s.color}
                rx="3"
                opacity={hoverIndex >= 0 && xi !== hoverIndex ? 0.35 : 1}
              />
            );
          });
        })}

        {hoverIndex >= 0 && (
          <rect
            x={pad.l + panClamped + hoverIndex * groupW}
            y={pad.t}
            width={groupW}
            height={innerH}
            fill="rgba(37,99,235,0.08)"
          />
        )}
      </g>

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
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }, []);

  const normalizeRange = (v) => {
    if (typeof v !== "string" || !v.includes(" - ")) return `${todayDMY} - ${todayDMY}`;
    const [a, b] = v.split(" - ");
    return a && b ? v : `${todayDMY} - ${todayDMY}`;
  };

  const norm = normalizeRange(value);
  const [tmp, setTmp] = useState(norm);

  useEffect(() => {
    function h(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const [fromStr, toStr] = norm.split(" - ");
  const toISO = (dmy) => {
    const [a, b, c] = dmy.split("/");
    return `${c}-${b}-${a}`;
  };
  const toDMY = (iso) => {
    if (!iso) return "";
    const [a, b, c] = iso.split("-");
    return `${c}/${b}/${a}`;
  };

  const [fIso, setFIso] = useState(toISO(fromStr));
  const [tIso, setTIso] = useState(toISO(toStr));

  useEffect(() => {
    const n = normalizeRange(value);
    const [fs, ts] = n.split(" - ");
    setFIso(toISO(fs));
    setTIso(toISO(ts));
    setTmp(n);
  }, [value]);

  const apply = () => {
    const out = `${toDMY(fIso)} - ${toDMY(tIso)}`;
    onChange(out);
    setOpen(false);
  };

  return (
    <div className={`drp-wrap ${small ? "drp-small" : ""}`} ref={ref}>
      <div className={`drp-input ${open ? "focus" : ""}`} onClick={() => setOpen(true)}>
        <span>{tmp}</span>
        <i className="mi">📅</i>
      </div>
      {open && (
        <div className="drp-pop">
          <div className="drp-cal">
            <div className="drp-col">
              <div className="drp-lbl">From</div>
              <input type="date" value={fIso} onChange={(e) => setFIso(e.target.value)} />
            </div>
            <div className="drp-col">
              <div className="drp-lbl">To</div>
              <input type="date" value={tIso} onChange={(e) => setTIso(e.target.value)} />
            </div>
          </div>
          <div className="drp-footer">
            <span className="drp-preview">{`${toDMY(fIso)} - ${toDMY(tIso)}`}</span>
            <div>
              <button className="btn ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={apply}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- Chart Card -------------------- */
function ChartCard({
  title,
  legends,
  xLabels,
  series = [],
  rangeValue,
  onRangeChange,
  rightSelector = null,
  forceYMaxWhenEmpty = 0,
}) {
  const [zoom] = useState(1);
  const [pan] = useState(0);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [handOn, setHandOn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const svgRef = useRef(null);
  const menuRef = useRef(null);
  const bodyRef = useRef(null);

  const width = 900;
  const pad = { l: 108, r: 180, t: 26, b: 62 };
  const innerW = width - pad.l - pad.r;

  useEffect(() => {
    const handler = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    function move(e) {
      if (!handOn) {
        setHoverIdx(-1);
        return;
      }
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const baseGroupW = innerW / Math.max(1, xLabels.length);
      const groupW = baseGroupW * Math.max(1, 1);
      const minPan = -Math.max(0, groupW * xLabels.length - innerW);
      const panClamped = Math.max(minPan, Math.min(0, pan));
      const effectiveX = localX - panClamped;
      const idx = Math.max(
        0,
        Math.min(xLabels.length - 1, Math.floor(effectiveX / groupW + 0.5))
      );
      setHoverIdx(idx);
    }
    function leave() {
      setHoverIdx(-1);
    }

    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [handOn, pan, xLabels.length, innerW]);

  const activeIdx = hoverIdx;
  const showTip = handOn && activeIdx >= 0;

  const tip = useMemo(() => {
    if (!showTip || !bodyRef.current) return { show: false };
    const rect = bodyRef.current.getBoundingClientRect();
    const left = rect.right - 310;
    const top = rect.top + 56;
    const rows = series.map((s) => ({
      name: s.name,
      color: s.color,
      value: (s.data?.[activeIdx] ?? 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    }));
    return {
      show: true,
      left,
      top,
      date: xLabels[activeIdx],
      rows,
    };
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
          series={
            series.length
              ? series
              : [
                  {
                    color: "transparent",
                    data: Array(xLabels.length).fill(0),
                  },
                ]
          }
          zoom={zoom}
          pan={pan}
          hoverIndex={activeIdx}
          svgRef={svgRef}
          forceYMaxWhenEmpty={forceYMaxWhenEmpty}
        />

        <div className="chart-tools" aria-hidden>
          <button className="tool-btn" title="Zoom in" disabled>
            ＋
          </button>
          <button className="tool-btn" title="Zoom out" disabled>
            －
          </button>
          <button
            className={`tool-btn ${handOn ? "active" : ""}`}
            title="Show data on hover (toggle)"
            onClick={() => setHandOn((v) => !v)}
          >
            ✋
          </button>
          <button
            className="tool-btn"
            title="Reset"
            onClick={() => {
              setHoverIdx(-1);
              setHandOn(false);
            }}
          >
            🏠
          </button>
          <div className="tool-menu" ref={menuRef}>
            <button className="tool-btn" title="More" onClick={() => setMenuOpen((v) => !v)}>
              ≡
            </button>
            {menuOpen && (
              <div className="menu-pop">
                <div className="menu-item" onClick={onDownloadCSV}>
                  Download CSV
                </div>
                <div className="menu-item" onClick={onDownloadPNG}>
                  Download PNG
                </div>
              </div>
            )}
          </div>
        </div>

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
            {tip.rows.map((r) => (
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
function TableCard({
  title,
  rangeValue,
  onRangeChange,
  columns,
  rows,
  rightSide = null,
  scrollY = 0,
  showDate = true,
}) {
  return (
    <div className="table-card">
      <div className="table-head">
        <div className="table-title">{title}</div>
        <div className="table-head-right">
          {rightSide}
          {showDate && (
            <DateRangeInput value={rangeValue} onChange={onRangeChange} small />
          )}
        </div>
      </div>
      <div
        className={`table-wrap ${scrollY ? "has-scroll" : ""}`}
        style={scrollY ? { maxHeight: scrollY } : undefined}
      >
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-idx">#</th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={
                    c.align === "right"
                      ? "al-r"
                      : c.align === "center"
                      ? "al-c"
                      : ""
                  }
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td className="al-c col-idx">{idx + 1}</td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={
                      c.align === "right"
                        ? "al-r"
                        : c.align === "center"
                        ? "al-c"
                        : ""
                    }
                  >
                    {r[c.key]}
                  </td>
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

  const isSuper = !!user?.is_superuser; // 🔵 only superuser gets filters

  const todayDMY = useMemo(() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }, []);
  const startDMY = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }, []);
  const defaultRange = `${startDMY} - ${todayDMY}`;

  const [globalRange, setGlobalRange] = useState(defaultRange);

  const [locOpen, setLocOpen] = useState(false);
  const [chanOpen, setChanOpen] = useState(false);
  const [locationIds, setLocationIds] = useState([LOCATIONS[0].id]);
  const [channelIds, setChannelIds] = useState(["OFFLINE"]);
  const [locQuery, setLocQuery] = useState("");
  const [chanQuery, setChanQuery] = useState("");
  const locBtnRef = useRef(null);
  const chanBtnRef = useRef(null);
  const locDropStyle = useSmartDropdown(locOpen, locBtnRef);
  const chanDropStyle = useSmartDropdown(chanOpen, chanBtnRef);
  const filteredLocations = useMemo(() => {
    const q = locQuery.trim().toLowerCase();
    return q ? LOCATIONS.filter((l) => l.name.toLowerCase().includes(q)) : LOCATIONS;
  }, [locQuery]);
  const filteredChannels = useMemo(() => {
    const q = chanQuery.trim().toLowerCase();
    return q ? CHANNELS.filter((c) => c.name.toLowerCase().includes(q)) : CHANNELS;
  }, [chanQuery]);
  const allChannelIds = CHANNELS.map((c) => c.id);
  const toggle = (id, list, setList) =>
    setList((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

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
    return (
      src
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "US"
    );
  }, [displayName]);

  useEffect(() => {
    function away(e) {
      if (!profileOpen) return;
      if (profilePopRef.current?.contains(e.target)) return;
      if (profileBtnRef.current?.contains(e.target)) return;
      setProfileOpen(false);
    }
    function esc(e) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [profileOpen]);

  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const toISO = (dmy) => {
    const [dd, mm, yy] = dmy.split("/");
    return `${yy}-${mm}-${dd}`;
  };
  const parseRange = (rng) => {
    const [a, b] = rng.split(" - ");
    return { from: toISO(a), to: toISO(b) };
  };

  const sumExpensesInRange = (expenses, fromISO, toISO_) => {
    const start = new Date(fromISO + "T00:00:00");
    const end = new Date(toISO_ + "T23:59:59");
    let total = 0;

    for (const ex of expenses || []) {
      const dt = ex?.date_time || ex?.date || ex?.created_at;
      if (!dt) continue;
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) continue;
      if (d < start || d > end) continue;

      const amt = Number(ex?.amount ?? 0);
      if (Number.isFinite(amt)) total += amt;
    }
    return total;
  };

  /* ===== KPI loader (REAL from backend summary + sales + expenses) ===== */
  useEffect(() => {
    const { from, to } = parseRange(globalRange);
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        const params = { date_from: from, date_to: to, all: "1" };

        // ✅ superuser filters: pass locations/channels down
        if (isSuper) {
          if (Array.isArray(locationIds) && locationIds.length) params.location = locationIds;
          if (Array.isArray(channelIds) && channelIds.length) params.channel = channelIds;
        }

        // backend scopes sales by outlet for non-admin; admin sees all
        const [salesRes, expRes, sumRes] = await Promise.all([
          listSales(params),
          listExpenses({ limit: 2500 }), // backend scopes for outlet; admin gets all
          dashboardSummary({
            date_from: from,
            date_to: to,
            ...(isSuper ? { location: locationIds, channel: channelIds } : {}),
          }),
        ]);

        const sales = Array.isArray(salesRes?.results)
          ? salesRes.results
          : Array.isArray(salesRes)
          ? salesRes
          : [];

        // ✅ FIX: expenses can be paginated object {results: []}
        const expenses = Array.isArray(expRes?.results)
          ? expRes.results
          : Array.isArray(expRes)
          ? expRes
          : [];

        let totalSales = 0;
        let totalInvoice = sales.length;
        let soldQty = 0;
        const customerKeys = new Set();

        for (const s of sales) {
          const amt = Number(s.net_amount ?? s.total_amount ?? s.grand_total ?? 0);
          if (Number.isFinite(amt)) totalSales += amt;

          const q = Number(s.total_qty ?? s.total_items ?? s.qty ?? 0);
          if (Number.isFinite(q) && q > 0) soldQty += q;

          const key =
            s.customer_id ??
            s.customer ??
            (s.customer_name || s.customer_phone
              ? `${s.customer_name || ""}|${s.customer_phone || ""}`
              : null);

          if (key !== null && key !== undefined && String(key).trim() !== "") {
            customerKeys.add(String(key));
          }
        }

        // ✅ SOLD QTY from backend summary: sold_qty (products.qty == 0 logic)
        if (Number(sumRes?.sold_qty ?? 0) > 0) {
          soldQty = Number(sumRes.sold_qty);
        } else if (soldQty <= 0) {
          soldQty = totalInvoice;
        }

        const totalCustomers = customerKeys.size;

        const sum = sumRes || {};
        const totalSalesReturn = Number(sum?.total_sales_return ?? 0);
        const totalReceive = Number(sum?.total_receive ?? 0);
        const totalPurchase = Number(sum?.total_purchase ?? 0);
        const totalBills = Number(sum?.total_bills ?? 0);
        const purchaseQty = Number(sum?.purchase_qty ?? 0);
        const totalProductsAmount = Number(sum?.total_products_amount ?? 0);
        const cashInHand = Number(sum?.cash_in_hand ?? 0);

        // ✅ GROSS PROFIT = Total Sales (backend already sets gross_profit = total_sales)
        const grossProfit = Number(sum?.gross_profit ?? totalSales);

        const totalExpense = sumExpensesInRange(expenses, from, to);

        const baseCards = computeMetricsMock({ from, to, locationIds, channelIds });

        const cards = baseCards.map((card) => {
          if (card.label === "Total Sales") return { ...card, value: money0(totalSales), comingSoon: false };
          if (card.label === "Total Invoice") return { ...card, value: totalInvoice, comingSoon: false };
          if (card.label === "Sold Qty") return { ...card, value: soldQty, comingSoon: false };
          if (card.label === "Total Customers") return { ...card, value: totalCustomers, comingSoon: false };

          if (card.label === "Total Sales Return") return { ...card, value: money0(totalSalesReturn), comingSoon: false };
          if (card.label === "To Receive") return { ...card, value: money0(totalReceive), comingSoon: false };
          if (card.label === "Total Purchase") return { ...card, value: money0(totalPurchase), comingSoon: false };
          if (card.label === "Total Bills") return { ...card, value: totalBills, comingSoon: false };
          if (card.label === "Purchase Qty") return { ...card, value: purchaseQty, comingSoon: false };

          if (card.label === "Total Products") return { ...card, value: money0(totalProductsAmount), comingSoon: false };
          if (card.label === "Cash in Hand") return { ...card, value: money0(cashInHand), comingSoon: false };
          if (card.label === "Gross Profit") return { ...card, value: money0(grossProfit), comingSoon: false };
          if (card.label === "Total Expense") return { ...card, value: money0(totalExpense), comingSoon: false };

          // everything else stays 0 + coming soon
          return card;
        });

        if (!cancelled) setMetrics(cards);
      } catch (e) {
        // ✅ requested: add log for console in case of failure
        console.error("Dashboard KPI load failed:", e);

        if (!cancelled) {
          setErr(e?.message || "Failed to load");
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
  }, [globalRange, locationIds, channelIds, isSuper]);

  const [rangeSVP, setRangeSVP] = useState(defaultRange);
  const [rangeTXN, setRangeTXN] = useState(defaultRange);
  const [rangeCAT, setRangeCAT] = useState(defaultRange);
  const [rangeLSP, setRangeLSP] = useState(defaultRange);
  const [rangeBSP, setRangeBSP] = useState(defaultRange);

  const xDates = ["13:00", "15:00", "17:00", "19:00", "21:00", "23:00"];

  /* ---------- LOGIN LOG location filter ---------- */
  const [logLocOpen, setLogLocOpen] = useState(false);
  const [logLocIds, setLogLocIds] = useState([]);
  const [logLocQuery, setLogLocQuery] = useState("");
  const logBtnRef = useRef(null);
  const logDropStyle = useSmartDropdown(logLocOpen, logBtnRef);
  const filteredLogLocs = useMemo(() => {
    const q = logLocQuery.trim().toLowerCase();
    return q ? LOCATIONS.filter((l) => l.name.toLowerCase().includes(q)) : LOCATIONS;
  }, [logLocQuery]);

  const LoginLogRightSide = (
    <div className="select-wrap">
      <button ref={logBtnRef} className="pill" onClick={() => setLogLocOpen((v) => !v)}>
        <span className="pill-label">Select Location</span>
        <span className="pill-count">{logLocIds.length}</span>
      </button>

      {logLocOpen && (
        <div className="dropdown" style={logDropStyle}>
          <div className="dd-search">
            <input
              placeholder="Search locations…"
              value={logLocQuery}
              onChange={(e) => setLogLocQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="dd-list">
            {filteredLogLocs.map((l) => (
              <label key={l.id} className="opt">
                <input
                  type="checkbox"
                  checked={logLocIds.includes(l.id)}
                  onChange={() =>
                    setLogLocIds((prev) =>
                      prev.includes(l.id) ? prev.filter((x) => x !== l.id) : [...prev, l.id]
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

  // ----- Login Log data -----
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLogErr, setLoginLogErr] = useState("");
  const [loginLogLoading, setLoginLogLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoginLogLoading(true);
      setLoginLogErr("");
      try {
        const res = await listLoginLogs({
          location: logLocIds,
          limit: 100,
        });
        if (!cancelled) setLoginLogs(res || []);
      } catch (e) {
        // ✅ already had console log; keep
        console.error("Login logs load failed:", e);
        if (!cancelled) setLoginLogErr(e?.message || "Failed to load login logs");
      } finally {
        if (!cancelled) setLoginLogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [logLocIds]);

  const loginTableRows = useMemo(
    () =>
      (loginLogs || []).map((log) => ({
        time: formatLoginTime(log.login_time, log.user_display || log.username),
        ip: log.ip_address,
        system: log.system_details || "",
      })),
    [loginLogs]
  );

  return (
    <div className="dash-page">
      <div className="dash-panel">
        <div className="dash-toolbar grid">
          <div className="toolbar-left">
            <DateRangeInput value={globalRange} onChange={setGlobalRange} />
          </div>

          <div className="toolbar-center">
            {isSuper && (
              <>
                <div className="select-wrap">
                  <button
                    ref={locBtnRef}
                    className="pill"
                    onClick={() => {
                      setLocOpen((v) => !v);
                      setChanOpen(false);
                    }}
                  >
                    <span className="pill-label">Select Location</span>
                    <span className="pill-count">{locationIds.length}</span>
                  </button>
                  {locOpen && (
                    <div className="dropdown" style={locDropStyle}>
                      <div className="dd-search">
                        <input
                          placeholder="Search locations…"
                          value={locQuery}
                          onChange={(e) => setLocQuery(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="dd-list">
                        {filteredLocations.map((l) => (
                          <label key={l.id} className="opt">
                            <input
                              type="checkbox"
                              checked={locationIds.includes(l.id)}
                              onChange={() => toggle(l.id, locationIds, setLocationIds)}
                            />
                            <span>{l.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="select-wrap">
                  <button
                    ref={chanBtnRef}
                    className="pill"
                    onClick={() => {
                      setChanOpen((v) => !v);
                      setLocOpen(false);
                    }}
                  >
                    <span className="pill-label">Select Channel</span>
                    <span className="pill-count">{channelIds.length}</span>
                  </button>
                  {chanOpen && (
                    <div className="dropdown" style={chanDropStyle}>
                      <div className="dd-search">
                        <input
                          placeholder="Search channels…"
                          value={chanQuery}
                          onChange={(e) => setChanQuery(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="dd-list">
                        <label className="opt">
                          <input
                            type="checkbox"
                            checked={channelIds.length === allChannelIds.length}
                            onChange={() =>
                              setChannelIds((prev) =>
                                prev.length === allChannelIds.length ? [] : allChannelIds
                              )
                            }
                          />
                          <span>ALL</span>
                        </label>
                        {filteredChannels.map((c) => (
                          <label key={c.id} className="opt">
                            <input
                              type="checkbox"
                              checked={channelIds.includes(c.id)}
                              onChange={() =>
                                setChannelIds((prev) =>
                                  prev.includes(c.id)
                                    ? prev.filter((x) => x !== c.id)
                                    : [...prev, c.id]
                                )
                              }
                            />
                            <span>{c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="toolbar-right">
            <button
              ref={profileBtnRef}
              className="avatar-btn"
              onClick={() => setProfileOpen((v) => !v)}
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
                  <button className="btn ghost wfull">🔑 Change Password</button>
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

        {err && <div className="dash-error">⚠ {err}</div>}

        {loading && (
          <div className="dash-loading">
            <div className="dash-spinner" />
            <span>Loading dashboard…</span>
          </div>
        )}

        <div className="metric-grid" aria-busy={loading}>
          {metrics.map((m, i) => (
            <div
              key={i}
              className="metric-card"
              title={m.comingSoon ? "Coming soon" : ""}
            >
              <div className={`metric-badge ${m.tone}`}>{m.value}</div>
              <div className="metric-label">{m.label}</div>
            </div>
          ))}
        </div>

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

        <div className="tables-row">
          <TableCard
            title="BEST SELLING PRODUCT"
            rangeValue={rangeBSP}
            onRangeChange={setRangeBSP}
            columns={[
              { key: "pname", label: "Product Name" },
              { key: "bills", label: "No. of Bills", align: "right" },
              { key: "qty", label: "Sales Qty", align: "right" },
              { key: "amount", label: "Sales Amount", align: "right" },
              { key: "profit", label: "Profit", align: "right" },
              { key: "pct", label: "Sales(%)", align: "right" },
            ]}
            rows={Array.from({ length: 12 }).map(() => ({
              pname: (
                <a href="#!" className="tbl-link">
                  (150) (L) Blouse
                </a>
              ),
              bills: 1,
              qty: 1,
              amount: money2(200),
              profit: money2(0),
              pct: "10.00",
            }))}
            scrollY={420}
          />
          <TableCard
            title="LEAST SELLING PRODUCT"
            rangeValue={rangeLSP}
            onRangeChange={setRangeLSP}
            columns={[
              { key: "pname", label: "Product Name" },
              { key: "bills", label: "No. of Bills", align: "right" },
              { key: "qty", label: "Sales Qty", align: "right" },
              { key: "amount", label: "Sales Amount", align: "right" },
              { key: "profit", label: "Profit", align: "right" },
              { key: "pct", label: "Sales(%)", align: "right" },
            ]}
            rows={Array.from({ length: 12 }).map(() => ({
              pname: (
                <a href="#!" className="tbl-link">
                  (150) (L) Blouse
                </a>
              ),
              bills: 1,
              qty: 1,
              amount: money2(200),
              profit: money2(0),
              pct: "10.00",
            }))}
            scrollY={420}
          />
        </div>

        <div className="tables-row">
          <TableCard
            title="CATEGORY SALES"
            rangeValue={rangeCAT}
            onRangeChange={setRangeCAT}
            columns={[
              { key: "name", label: "Category Name" },
              { key: "qty", label: "Sales Qty", align: "right" },
              { key: "amount", label: "Sales Amount", align: "right" },
              { key: "profit", label: "Profit", align: "right" },
              { key: "pct", label: "Sales(%)", align: "right" },
            ]}
            rows={[
              {
                name: "Clothing",
                qty: 30,
                amount: money2(1200),
                profit: money2(0),
                pct: "100.00",
              },
            ]}
          />

          <div className="table-card-wrapper">
            <TableCard
              title="LOGIN LOG"
              columns={[
                { key: "time", label: "Login Time" },
                { key: "ip", label: "IP Address" },
                { key: "system", label: "System Details" },
              ]}
              rows={loginTableRows}
              scrollY={260}
              showDate={false}
              rightSide={LoginLogRightSide}
            />
            {loginLogLoading && (
              <div className="dash-loading" style={{ marginTop: 4 }}>
                <div className="dash-spinner" />
                <span>Loading login logs…</span>
              </div>
            )}
            {loginLogErr && (
              <div className="dash-error" style={{ marginTop: 4 }}>
                ⚠ {loginLogErr}
              </div>
            )}
          </div>
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
      const r = btnRef.current.getBoundingClientRect();
      const pad = 8;
      const left = Math.min(
        Math.max(pad, r.left),
        window.innerWidth - DD_WIDTH - pad
      );
      const top = r.bottom + 8;
      setStyle({
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        width: `${DD_WIDTH}px`,
        zIndex: 1000,
      });
    }
    calc();
    if (!open) return;
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc, true);
    };
  }, [open, btnRef]);
  return style;
}
