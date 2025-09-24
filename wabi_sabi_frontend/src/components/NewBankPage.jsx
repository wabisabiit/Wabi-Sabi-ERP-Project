import React, { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NewBankPage.css";

/* -------- Options (as in your screenshot) -------- */
const SELECT_GROUPS = ["Bank Account"];
const COUNTRIES = ["India"];
const STATES = ["Haryana"];
const CITIES = ["Gurugram"];
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

/* -------- Small helper: click outside to close -------- */
function useClickOutside(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside?.();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

/* -------- Branches multiselect (dropdown with checkboxes) -------- */
function BranchesSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useClickOutside(() => setOpen(false));

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return BRANCHES;
    return BRANCHES.filter((b) => b.toLowerCase().includes(qq));
  }, [q]);

  const toggle = (name) => {
    const has = value.includes(name);
    onChange(has ? value.filter((v) => v !== name) : [...value, name]);
  };

  const allChecked = value.length === BRANCHES.length;
  const toggleAll = () =>
    onChange(allChecked ? [] : [...BRANCHES]);

  return (
    <div className="nb-branch" ref={wrapRef}>
      <label className="nb-lbl req">Branches</label>
      <button
        type="button"
        className="nb-dd-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {value.length ? `${value.length} selected` : "Select branches"}
        <span className="material-icons nb-caret">expand_more</span>
      </button>

      {open && (
        <div className="nb-dd">
          <div className="nb-dd-top">
            <input
              className="nb-dd-search"
              placeholder="Search branches"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="button" className="nb-dd-all" onClick={toggleAll}>
              {allChecked ? "Clear All" : "Select All"}
            </button>
          </div>
          <div className="nb-dd-list">
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
  );
}

export default function NewBankPage() {
  const nav = useNavigate();

  // form state (minimal validation – just required markers)
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
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [state, setState] = useState(STATES[0]);
  const [city, setCity] = useState(CITIES[0]);
  const [zip, setZip] = useState("");
  const [branches, setBranches] = useState(["WABI SABI SUSTAINABILITY LLP"]);

  const onCancel = () => nav(-1);
  const onSave = () => {
    // hook your API here
    alert("Saved (demo). Returning to list.");
    nav("/bank");
  };
  const onSaveCreateNew = () => {
    alert("Saved (demo). Ready for new entry.");
    // keep user on this page & clear essentials
    setIfsc("");
    setBankName("");
    setBranchName("");
    setAccountHolder("");
    setAccountNo("");
    setSwift("");
    setCredit("");
    setDebit("");
    setAddr1("");
    setAddr2("");
    setZip("");
    setBranches([]);
  };

  return (
    <div className="nb-wrap">
      {/* Header / breadcrumb */}
      <div className="nb-topbar">
        <div className="nb-left">
          <button className="nb-back" onClick={() => nav(-1)} title="Back">
            <span className="material-icons">arrow_back</span>
          </button>
          <span className="material-icons nb-home">home</span>
          <span className="nb-dash">-</span>
          <span className="nb-bc">Bank</span>
        </div>
        <h1 className="nb-title">New Bank</h1>
      </div>

      {/* Card */}
      <div className="nb-card">
        {/* Row 1 */}
        <div className="nb-grid">
          <div className="nb-field">
            <label className="nb-lbl req">Select Group</label>
            <div className="nb-select">
              <select value={selectGroup} onChange={(e) => setSelectGroup(e.target.value)}>
                {SELECT_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <span className="material-icons nb-caret">expand_more</span>
            </div>
          </div>

          <div className="nb-field">
            <label className="nb-lbl">IFSC Code</label>
            <input className="nb-inp" value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="IFSC Code" />
          </div>

          <div className="nb-field">
            <label className="nb-lbl req">Bank Name</label>
            <input className="nb-inp" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Name" />
          </div>

          <div className="nb-field">
            <label className="nb-lbl req">Branch Name</label>
            <input className="nb-inp" value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Branch Name" />
          </div>

          <div className="nb-field">
            <label className="nb-lbl">Account Holder Name</label>
            <input className="nb-inp" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Account Holder Name" />
          </div>

          {/* Row 2 */}
          <div className="nb-field">
            <label className="nb-lbl req">Account No.</label>
            <input className="nb-inp" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="Account No." />
          </div>

          <div className="nb-field">
            <label className="nb-lbl">Swift Code</label>
            <input className="nb-inp" value={swift} onChange={(e) => setSwift(e.target.value)} placeholder="Swift Code" />
          </div>

          <div className="nb-field nb-openbal">
            <label className="nb-lbl">Opening Balance</label>
            <div className="nb-bals">
              <input
                className="nb-inp"
                value={credit}
                onChange={(e) => setCredit(e.target.value)}
                placeholder="Credit Balance"
              />
              <input
                className="nb-inp"
                value={debit}
                onChange={(e) => setDebit(e.target.value)}
                placeholder="Debit Balance"
              />
            </div>
          </div>

          <div className="nb-field nb-upi">
            <label className="nb-lbl">&nbsp;</label>
            <label className="nb-check">
              <input type="checkbox" checked={upi} onChange={(e) => setUpi(e.target.checked)} />
              <span>Is Upi Available?</span>
            </label>
          </div>

          {/* spacer to keep grid aligned */}
          <div />

          {/* Row 3 */}
          <div className="nb-field">
            <label className="nb-lbl">Address Line 1</label>
            <input className="nb-inp" value={addr1} onChange={(e) => setAddr1(e.target.value)} placeholder="Address Line 1" />
          </div>

          <div className="nb-field nb-colspan2">
            <label className="nb-lbl">Address Line 2</label>
            <input className="nb-inp" value={addr2} onChange={(e) => setAddr2(e.target.value)} placeholder="Address Line 2" />
          </div>

          {/* Branches (right column block) */}
          <div className="nb-field nb-branches">
            <BranchesSelect value={branches} onChange={setBranches} />
          </div>

          {/* Row 4 */}
          <div className="nb-field">
            <label className="nb-lbl req">Select Country</label>
            <div className="nb-select">
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="material-icons nb-caret">expand_more</span>
            </div>
          </div>

          <div className="nb-field">
            <label className="nb-lbl req">Select State</label>
            <div className="nb-select">
              <select value={state} onChange={(e) => setState(e.target.value)}>
                {STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="material-icons nb-caret">expand_more</span>
            </div>
          </div>

          <div className="nb-field">
            <label className="nb-lbl req">Select City</label>
            <div className="nb-select">
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="material-icons nb-caret">expand_more</span>
            </div>
          </div>

          <div className="nb-field">
            <label className="nb-lbl">ZIP/Postal Code</label>
            <input className="nb-inp" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP/Postal code" />
          </div>
        </div>

        {/* Footer buttons */}
        <div className="nb-actions">
          <button type="button" className="nb-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="nb-btn primary" onClick={onSave}>Save</button>
          <button type="button" className="nb-btn outline" onClick={onSaveCreateNew}>Save &amp; Create New</button>
        </div>
      </div>
    </div>
  );
}
