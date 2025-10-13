import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "../styles/BankEditPage.css";

/* ---------- Prefill (open direct ya detail se aao) ---------- */
const DEMO = {
  group: "Bank Account",
  ifsc: "UTIB0001527",
  bankName: "AXIS BANK",
  branchName: "UDYOG VIHAR",
  accountHolder: "WABI SABI SUSTAINABILITY LLP",
  accountNo: "924020051622894",
  swift: "",
  upi: true,
  address1: "",
  address2: "",
  country: "India",
  state: "Haryana",
  city: "Gurugram",
  zip: "",
};

/* ---------- Dropdown options (screenshots ke matching) ---------- */
const GROUPS = ["Bank Account", "Bank OD A/c"];
const COUNTRIES = ["Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland"];
const STATES_BY_COUNTRY = {
  India: [
    "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana",
    "Himachal Pradesh","Jammu & Kashmir","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
    "महाराष्ट्र","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh",
    "Uttarakhand","Union Territory of Ladakh","DD","LA","OD"
  ],
  Iceland: ["Capital Region","Southern Peninsula"],
  Indonesia: ["Aceh","Bali","Jakarta"],
  Iran: ["Tehran"],
  Iraq: ["Baghdad"],
  Ireland: ["Dublin"],
};
const CITIES_BY_STATE = {
  Haryana: [
    "Gurugram",
    "Ambala cantt",
    "Mullana Ambala",
    "Yamuna Nagar",
    "Barwala (hisar)",
    "SONEPAT",
    "Gurgaon, Sector 70A",
  ],
  Delhi: ["New Delhi"],
  "Uttar Pradesh": ["Lucknow", "Kanpur"],
  Gujarat: ["Ahmedabad"],
  Rajasthan: ["Jaipur"],
  "Union Territory of Ladakh": ["Leh"],
};

/* ---------- Reusable: click outside ---------- */
function useClickOutside(refs, onOutside) {
  useEffect(() => {
    const h = (e) => {
      const t = e.target;
      const hit = refs.some((r) => r?.current && r.current.contains(t));
      if (!hit) onOutside?.();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [refs, onOutside]);
}

/* ---------- Searchable Select ---------- */
function SelectSearch({ value, onChange, options = [], placeholder = "" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hover, setHover] = useState(-1);

  const btnRef = useRef(null);
  const popRef = useRef(null);
  useClickOutside([btnRef, popRef], () => setOpen(false));

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const s = q.trim().toLowerCase();
    return options.filter((o) => String(o).toLowerCase().includes(s));
  }, [q, options]);

  const select = (val) => {
    onChange?.(val);
    setOpen(false);
    setQ("");
    setHover(-1);
  };

  const onKey = (e) => {
    if (!open && (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setHover((h) => Math.min(filtered.length - 1, h + 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setHover((h) => Math.max(0, h - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const val = filtered[hover] ?? filtered[0];
      if (val != null) select(val);
    }
  };

  const [panelStyle, setPanelStyle] = useState({});
  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPanelStyle({ width: r.width });
    }
  }, [open]);

  return (
    <div className="be-sel" onKeyDown={onKey}>
      <button
        ref={btnRef}
        type="button"
        className={`be-sel-btn ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={String(value || placeholder)}
      >
        <span className={`be-sel-value ${value ? "" : "placeholder"}`}>
          {value || placeholder || "—"}
        </span>
        <span className="material-icons be-caret">expand_more</span>
      </button>

      {open && (
        <div ref={popRef} className="be-sel-pop" style={panelStyle} role="listbox">
          <div className="be-sel-search">
            <span className="material-icons">search</span>
            <input
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); setHover(0); }}
              placeholder="Search…"
            />
          </div>
          <div className="be-sel-list">
            {filtered.length === 0 ? (
              <div className="be-sel-empty">No results</div>
            ) : (
              filtered.map((opt, i) => {
                const active = value === opt;
                const hov = hover === i;
                return (
                  <div
                    key={opt}
                    className={`be-sel-item ${active ? "active" : ""} ${hov ? "hover" : ""}`}
                    onMouseEnter={() => setHover(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(opt)}
                    title={opt}
                    role="option"
                    aria-selected={active}
                  >
                    {opt}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Page ---------- */
export default function BankEditPage() {
  const { slug } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const initial = { ...DEMO, ...(state || {}) };
  const [form, setForm] = useState(initial);

  const states = useMemo(() => STATES_BY_COUNTRY[form.country] || [], [form.country]);
  const cities = useMemo(() => CITIES_BY_STATE[form.state] || [], [form.state]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const onSave = (e) => {
    e.preventDefault();
    // TODO: API hook
    navigate(-1);
  };

  return (
    <div className="be-wrap">
      <div className="be-header">
        <div className="be-title">
          Edit Bank <span className="be-id">| 19989</span>
        </div>
        <div className="be-breadcrumb">
          <span className="be-dash">–</span>
          <button className="be-crumb" onClick={() => navigate("/bank")}>Bank</button>
        </div>
      </div>

      <form className="be-card" onSubmit={onSave}>
        <div className="be-grid">
          <Field label="Select Group*">
            <SelectSearch value={form.group} onChange={(v) => update("group", v)} options={GROUPS} placeholder="Select group" />
          </Field>
          <Field label="IFSC Code"><input className="be-input" value={form.ifsc} onChange={(e) => update("ifsc", e.target.value)} /></Field>
          <Field label="Bank Name*"><input className="be-input" required value={form.bankName} onChange={(e) => update("bankName", e.target.value)} /></Field>
          <Field label="Branch Name*"><input className="be-input" required value={form.branchName} onChange={(e) => update("branchName", e.target.value)} /></Field>

          <Field label="Account Holder Name"><input className="be-input" value={form.accountHolder} onChange={(e) => update("accountHolder", e.target.value)} /></Field>
          <Field label="Account No.*"><input className="be-input" required value={form.accountNo} onChange={(e) => update("accountNo", e.target.value)} /></Field>
          <Field label="Swift Code"><input className="be-input" value={form.swift} onChange={(e) => update("swift", e.target.value)} placeholder="Swift Code" /></Field>
          <Field label="Is Upi Available?" tight>
            <label className="be-switch"><input type="checkbox" checked={!!form.upi} onChange={(e) => update("upi", e.target.checked)} /><span /></label>
          </Field>

          <Field label="Address Line 1"><input className="be-input" value={form.address1} onChange={(e) => update("address1", e.target.value)} placeholder="Address Line 1" /></Field>
          <Field label="Address Line 2"><input className="be-input" value={form.address2} onChange={(e) => update("address2", e.target.value)} placeholder="Address Line 2" /></Field>

          <Field label="Select Country*">
            <SelectSearch
              value={form.country}
              onChange={(v) => {
                const nextState = (STATES_BY_COUNTRY[v] || [])[0] || "";
                const nextCity = (CITIES_BY_STATE[nextState] || [])[0] || "";
                update("country", v); update("state", nextState); update("city", nextCity);
              }}
              options={COUNTRIES} placeholder="Select Country"
            />
          </Field>

          <Field label="Select State*">
            <SelectSearch
              value={form.state}
              onChange={(v) => {
                const nextCity = (CITIES_BY_STATE[v] || [])[0] || "";
                update("state", v); update("city", nextCity);
              }}
              options={states} placeholder="Select State"
            />
          </Field>

          <Field label="Select City*">
            <SelectSearch value={form.city} onChange={(v) => update("city", v)} options={cities} placeholder="Select City" />
          </Field>

          <Field label="ZIP/Postal Code"><input className="be-input" value={form.zip} onChange={(e) => update("zip", e.target.value)} placeholder="ZIP/Postal Code" /></Field>
        </div>

        <div className="be-actions">
          <button type="button" className="be-btn ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="be-btn primary">Save</button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Building blocks ---------- */
function Field({ label, children, tight }) {
  return (
    <label className={`be-field ${tight ? "tight" : ""}`}>
      <div className="be-label">{label}</div>
      {children}
    </label>
  );
}
