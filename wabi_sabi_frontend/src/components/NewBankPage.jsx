import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NewBankPage.css";

/* ---------- Options (screenshots जैसा) ---------- */
const SELECT_GROUPS = ["Bank Account", "Bank OD A/c"];

const COUNTRIES = ["Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland"];

const STATES_BY_COUNTRY = {
  India: [
    "महाराष्ट्र", "DD", "LA", "Union Territory of Ladakh",
    "Haryana", "OD"
  ],
  Iceland: ["Capital Region","Southern Peninsula"],
  Indonesia: ["Aceh","Bali","Jakarta"],
  Iran: ["Tehran"],
  Iraq: ["Baghdad"],
  Ireland: ["Dublin"],
};

const CITIES_BY_STATE = {
  Haryana: ["Gurugram","Mullana Ambala","Ambala cantt","Yamuna Nagar","Barwala (hisar)","SONEPAT"],
  "Union Territory of Ladakh": ["Leh"],
  "महाराष्ट्र": ["Mumbai","Pune"],
  DD: ["Daman"],
  LA: ["Kargil"],
  OD: ["Bhubaneswar"],
};

const BRANCHES = [
  "WABI SABI SUSTAINABILITY LLP",
  "Brands 4 less– Rajouri Garden Inside",
  "Brands loot – Krishna Nagar",
  "Brands 4 less – IFFCO Chowk",
  "Brands Loot – Udyog Vihar",
  "Brands 4 less– Rajouri Garden Outside",
  "Brand4Less–Tilak Nagar",
  "Brands 4 less– M3M Urbana",
];

/* ---------- Click outside helper ---------- */
function useClickOutside(refs, onOutside) {
  useEffect(() => {
    const handler = (e) => {
      const hit = refs.some((r) => r?.current && r.current.contains(e.target));
      if (!hit) onOutside?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [refs, onOutside]);
}

/* ---------- Searchable Single Select ---------- */
function SelectSearch({
  label,
  required,
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  width = 175,
  error,
  name,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hover, setHover] = useState(-1);
  const [panelWidth, setPanelWidth] = useState(width);

  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  useClickOutside([wrapRef], () => setOpen(false));

  useEffect(() => {
    if (btnRef.current) {
      setPanelWidth(btnRef.current.getBoundingClientRect().width);
    }
  }, [open, width]);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const s = q.toLowerCase();
    return options.filter((o) => String(o).toLowerCase().includes(s));
  }, [q, options]);

  const select = (v) => {
    onChange?.(v);
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
    else if (e.key === "ArrowUp") { e.preventDefault(); setHover((h) => Math.max(0, h - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const v = filtered[hover] ?? filtered[0]; if (v != null) select(v); }
  };

  return (
    <div className={`nb-field ${error ? "has-err" : ""}`} onKeyDown={onKey}>
      <label className={`nb-lbl ${required ? "req" : ""}`} htmlFor={name}>{label}</label>

      <div className="nb-sel" ref={wrapRef} style={{ "--w": `${width}px` }}>
        <button
          id={name}
          ref={btnRef}
          type="button"
          className={`nb-dd-btn nb-sel-btn ${open ? "open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-invalid={!!error}
          title={String(value || placeholder)}
        >
          <span className={`nb-sel-value ${value ? "" : "placeholder"}`}>
            {value || placeholder}
          </span>
          <span className="material-icons nb-caret">expand_more</span>
        </button>

        {open && (
          <div
            ref={popRef}
            className="nb-dd nb-dd--select"
            style={{ width: panelWidth }}
            role="listbox"
          >
            <div className="nb-dd-top">
              <input
                className="nb-dd-search"
                placeholder="Search…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setHover(0); }}
              />
            </div>
            <div className="nb-dd-list">
              {filtered.length === 0 ? (
                <div className="nb-dd-empty">No results</div>
              ) : (
                filtered.map((opt, i) => {
                  const active = value === opt;
                  return (
                    <div
                      key={opt}
                      className={`nb-dd-row nb-sel-item ${active ? "active" : ""} ${hover === i ? "hover" : ""}`}
                      onMouseEnter={() => setHover(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => select(opt)}
                      role="option"
                      aria-selected={active}
                      title={opt}
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

      {error && <div className="nb-err">{error}</div>}
    </div>
  );
}

/* ---------- Branches Multiselect ---------- */
function BranchesSelect({ value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const wrapRef = useRef(null);
  useClickOutside([wrapRef], () => setOpen(false));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return BRANCHES;
    return BRANCHES.filter((b) => b.toLowerCase().includes(s));
  }, [q]);

  const toggle = (name) => {
    const has = value.includes(name);
    onChange(has ? value.filter((v) => v !== name) : [...value, name]);
  };

  const allChecked = value.length === BRANCHES.length;

  return (
    <div className={`nb-field nb-branches ${error ? "has-err" : ""}`}>
      <label className="nb-lbl req">Branches</label>

      <div className="nb-sel" ref={wrapRef} style={{ "--w": "420px" }}>
        <button
          type="button"
          className={`nb-dd-btn ${open ? "open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-invalid={!!error}
        >
          {value.length ? `${value.length} selected` : "Select branches"}
          <span className="material-icons nb-caret">expand_more</span>
        </button>

        {open && (
          <div className="nb-dd" style={{ width: 420 }}>
            <div className="nb-dd-top">
              <input
                className="nb-dd-search"
                placeholder="Search branches"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button
                type="button"
                className="nb-dd-all"
                onClick={() => onChange(allChecked ? [] : [...BRANCHES])}
              >
                {allChecked ? "Clear All" : "Select All"}
              </button>
            </div>

            <div className="nb-dd-list nb-dd-list--5">
              {filtered.map((name) => (
                <label key={name} className="nb-dd-row" title={name}>
                  <input
                    type="checkbox"
                    checked={value.includes(name)}
                    onChange={() => toggle(name)}
                  />
                  <span className="nb-dd-text">{name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <div className="nb-err">{error}</div>}
    </div>
  );
}

/* ---------- Simple validators ---------- */
const isEmpty = (s) => !String(s || "").trim();
const isIFSC = (s) => /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(String(s).trim());         // 11-char IFSC
const isAcct = (s) => /^\d{6,18}$/.test(String(s).trim());                            // 6–18 digits
const isZip  = (s) => s === "" || /^[A-Za-z0-9\- ]{3,10}$/.test(String(s).trim());    // optional
const isMoney = (s) => s === "" || /^(\d+(\.\d{1,2})?)$/.test(String(s).trim());      // optional, 2dp

/* ---------- Page ---------- */
export default function NewBankPage() {
  const nav = useNavigate();

  const [selectGroup, setSelectGroup] = useState(SELECT_GROUPS[0]);
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [swift, setSwift] = useState("");
  const [credit, setCredit] = useState("");
  const [debit, setDebit] = useState("");
  const [upi, setUpi] = useState(false);
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");

  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Haryana");
  const [city, setCity] = useState("Gurugram");
  const [zip, setZip] = useState("");



  
  const [branches, setBranches] = useState(["WABI SABI SUSTAINABILITY LLP"]);

  const [errors, setErrors] = useState({});

  const states = useMemo(() => STATES_BY_COUNTRY[country] || [], [country]);
  const cities = useMemo(() => CITIES_BY_STATE[state] || [], [state]);

  const onCountry = (v) => {
    setCountry(v);
    const ns = (STATES_BY_COUNTRY[v] || [])[0] || "";
    const nc = (CITIES_BY_STATE[ns] || [])[0] || "";
    setState(ns);
    setCity(nc);
  };
  const onState = (v) => {
    setState(v);
    const nc = (CITIES_BY_STATE[v] || [])[0] || "";
    setCity(nc);
  };

  // ---------- validate + scroll to first error ----------
  const validate = () => {
    const next = {};

    if (isEmpty(selectGroup)) next.selectGroup = "Required";
    if (isEmpty(bankName)) next.bankName = "Required";
    if (isEmpty(branchName)) next.branchName = "Required";

    if (isEmpty(accountNo)) next.accountNo = "Required";
    else if (!isAcct(accountNo)) next.accountNo = "6–18 digits only";

    if (ifsc && !isIFSC(ifsc)) next.ifsc = "Invalid IFSC (e.g., ABCL0123456)";

    if (!isMoney(credit)) next.credit = "Enter a valid amount";
    if (!isMoney(debit)) next.debit = "Enter a valid amount";

    if (isEmpty(country)) next.country = "Required";
    if (isEmpty(state)) next.state = "Required";
    if (isEmpty(city)) next.city = "Required";

    if (!isZip(zip)) next.zip = "Invalid postal code";

    if (!branches.length) next.branches = "Pick at least one branch";

    setErrors(next);
    return next;
  };

  const scrollFirstError = (errs) => {
    const order = [
      "selectGroup","ifsc","bankName","branchName","accountHolder",
      "accountNo","swift","credit","debit","country","state","city","zip","branches"
    ];
    const firstKey = order.find((k) => errs[k]);
    if (!firstKey) return;
    const el =
      document.querySelector(`[name="${firstKey}"]`) ||
      document.getElementById(firstKey) ||
      document.querySelector(`.nb-field.has-err`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onCancel = () => nav(-1);

  const onSave = () => {
    const errs = validate();
    if (Object.keys(errs).length) return scrollFirstError(errs);
    alert("Saved (demo).");
    nav("/bank");
  };

  const onSaveCreateNew = () => {
    const errs = validate();
    if (Object.keys(errs).length) return scrollFirstError(errs);

    alert("Saved (demo). Ready for new entry.");
    setIfsc(""); setBankName(""); setBranchName(""); setAccountHolder(""); setAccountNo("");
    setSwift(""); setCredit(""); setDebit(""); setAddr1(""); setAddr2(""); setZip("");
    setBranches([]);
    setErrors({});
  };

  /* ---------- Breadcrumb handlers ---------- */
  const goHome = () => nav("/");
  const goBankList = () => nav("/bank");

  return (
    <div className="nb-wrap">
      {/* Header / breadcrumb */}
      <div className="nb-topbar">
        <nav className="nb-left" aria-label="Breadcrumb">
          <button className="nb-back" onClick={() => nav(-1)} title="Back">
            <span className="material-icons">arrow_back</span>
          </button>

          <button
            type="button"
            className="nb-crumb nb-home-btn"
            onClick={goHome}
            title="Home"
            aria-label="Home"
          >
            <span className="material-icons nb-home">home</span>
          </button>

          <span className="nb-dash">-</span>

          <button
            type="button"
            className="nb-crumb nb-link"
            onClick={goBankList}
            title="Bank"
          >
            Bank
          </button>

          <span className="nb-dash">-</span>
          <span className="nb-bc" aria-current="page">New Bank</span>
        </nav>

        <h1 className="nb-title">New Bank</h1>
      </div>

      {/* Card */}
      <div className="nb-card">
        <div className="nb-grid">
          {/* Row 1 */}
          <SelectSearch
            name="selectGroup"
            label="Select Group"
            required
            value={selectGroup}
            onChange={setSelectGroup}
            options={SELECT_GROUPS}
            error={errors.selectGroup}
          />

          <div className={`nb-field ${errors.ifsc ? "has-err" : ""}`}>
            <label className="nb-lbl">IFSC Code</label>
            <input
              className="nb-inp"
              name="ifsc"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value)}
              placeholder="IFSC Code"
              aria-invalid={!!errors.ifsc}
            />
            {errors.ifsc && <div className="nb-err">{errors.ifsc}</div>}
          </div>

          <div className={`nb-field ${errors.bankName ? "has-err" : ""}`}>
            <label className="nb-lbl req">Bank Name</label>
            <input
              className="nb-inp"
              name="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Bank Name"
              aria-invalid={!!errors.bankName}
            />
            {errors.bankName && <div className="nb-err">{errors.bankName}</div>}
          </div>

          <div className={`nb-field ${errors.branchName ? "has-err" : ""}`}>
            <label className="nb-lbl req">Branch Name</label>
            <input
              className="nb-inp"
              name="branchName"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Branch Name"
              aria-invalid={!!errors.branchName}
            />
            {errors.branchName && <div className="nb-err">{errors.branchName}</div>}
          </div>

          <div className="nb-field">
            <label className="nb-lbl">Account Holder Name</label>
            <input
              className="nb-inp"
              name="accountHolder"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Account Holder Name"
            />
          </div>

          {/* Row 2 */}
          <div className={`nb-field ${errors.accountNo ? "has-err" : ""}`}>
            <label className="nb-lbl req">Account No.</label>
            <input
              className="nb-inp"
              name="accountNo"
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value)}
              placeholder="Account No."
              aria-invalid={!!errors.accountNo}
            />
            {errors.accountNo && <div className="nb-err">{errors.accountNo}</div>}
          </div>

          <div className="nb-field">
            <label className="nb-lbl">Swift Code</label>
            <input
              className="nb-inp"
              name="swift"
              value={swift}
              onChange={(e) => setSwift(e.target.value)}
              placeholder="Swift Code"
            />
          </div>

          <div className="nb-field nb-openbal">
            <label className="nb-lbl">Opening Balance</label>
            <div className="nb-bals">
              <div className={`nb-field ${errors.credit ? "has-err" : ""}`} style={{margin:0}}>
                <input
                  className="nb-inp"
                  name="credit"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                  placeholder="Credit Balance"
                  aria-invalid={!!errors.credit}
                />
                {errors.credit && <div className="nb-err">{errors.credit}</div>}
              </div>
              <div className={`nb-field ${errors.debit ? "has-err" : ""}`} style={{margin:0}}>
                <input
                  className="nb-inp"
                  name="debit"
                  value={debit}
                  onChange={(e) => setDebit(e.target.value)}
                  placeholder="Debit Balance"
                  aria-invalid={!!errors.debit}
                />
                {errors.debit && <div className="nb-err">{errors.debit}</div>}
              </div>
            </div>
          </div>

          <div className="nb-field nb-upi">
            <label className="nb-lbl">&nbsp;</label>
            <label className="nb-check">
              <input type="checkbox" checked={upi} onChange={(e) => setUpi(e.target.checked)} />
              <span>Is Upi Available?</span>
            </label>
          </div>

          <div />

          {/* Row 3 */}
          <div className="nb-field">
            <label className="nb-lbl">Address Line 1</label>
            <input
              className="nb-inp"
              name="addr1"
              value={addr1}
              onChange={(e) => setAddr1(e.target.value)}
              placeholder="Address Line 1"
            />
          </div>

          <div className="nb-field nb-colspan2">
            <label className="nb-lbl">Address Line 2</label>
            <input
              className="nb-inp"
              name="addr2"
              value={addr2}
              onChange={(e) => setAddr2(e.target.value)}
              placeholder="Address Line 2"
            />
          </div>

          {/* Right tall block: Branches */}
          <BranchesSelect value={branches} onChange={setBranches} error={errors.branches} />

          {/* Row 4 searchable selects */}
          <SelectSearch
            name="country"
            label="Select Country"
            required
            value={country}
            onChange={onCountry}
            options={COUNTRIES}
            error={errors.country}
          />
          <SelectSearch
            name="state"
            label="Select State"
            required
            value={state}
            onChange={onState}
            options={states}
            error={errors.state}
          />
          <SelectSearch
            name="city"
            label="Select City"
            required
            value={city}
            onChange={setCity}
            options={cities}
            error={errors.city}
          />

          <div className={`nb-field ${errors.zip ? "has-err" : ""}`}>
            <label className="nb-lbl">ZIP/Postal Code</label>
            <input
              className="nb-inp"
              name="zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="ZIP/Postal code"
              aria-invalid={!!errors.zip}
            />
            {errors.zip && <div className="nb-err">{errors.zip}</div>}
          </div>
        </div>

        <div className="nb-actions">
          <button type="button" className="nb-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="nb-btn primary" onClick={onSave}>Save</button>
          <button type="button" className="nb-btn outline" onClick={onSaveCreateNew}>Save &amp; Create New</button>
        </div>
      </div>
    </div>
  );
}
