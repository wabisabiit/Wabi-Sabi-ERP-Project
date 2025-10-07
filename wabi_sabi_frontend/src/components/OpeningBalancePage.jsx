import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/OpeningBalancePage.css";

/** ---- Demo masters (same values as screenshot) ---- */
const FY_LIST = ["2025–2026", "2024–2025", "2023–2024"];
const ACCOUNT_GROUPS = ["Sundry Debtors", "Sundry Creditors", "Cash in Hand", "Current Assets"];
const LOCATIONS = [
  "Brand4Less–Tilak Nagar",
  "Brands 4 less - IFFCO Chowk",
  "Brands 4 less - Rajouri Garden Outside",
  "Brands 4 less - Rajouri Garden Inside",
];

const NAMES = [
  "SHASHI GABA","SUMAN","ROSHAN","SUMAN","SHUBHAM CHAWLA","customer","MUSAKAN",
  "AS RANA","ANURAG","BITTU","VIPIN","RAKESH","NEHA","MOHIT","ABHISHEK","PRIYA",
  "KARTIK","MONIKA","HEENA","JYOTI","NIKHIL","AMIT","RANJIT","PALLAVI","DHEERAJ","CHANDER"
];

/* ---------- helpers ---------- */
function makeRows(count = 10) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      id: i + 1,
      name: NAMES[i % NAMES.length],
      group: "Sundry Debtors",
      location: LOCATIONS[i % LOCATIONS.length],
      credit: 0,
      debit: 0,
    });
  }
  return rows;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function OpeningBalancePage() {
  const [fy, setFy] = useState(FY_LIST[0]);
  const [accGroup, setAccGroup] = useState("");
  const [accGroupOpen, setAccGroupOpen] = useState(false);
  const accGroupWrapRef = useRef(null);

  const [rows, setRows] = useState(() => makeRows(10));
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onDoc = (e) => {
      if (accGroupWrapRef.current && !accGroupWrapRef.current.contains(e.target)) {
        setAccGroupOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDoc, true);
    return () => document.removeEventListener("pointerdown", onDoc, true);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      (r.name + " " + r.group + " " + r.location).toLowerCase().includes(q)
    );
  }, [rows, search]);

  useEffect(() => setPage(1), [pageSize, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  const updateCell = (id, key, val) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [key]: val } : r)));
  };

  return (
    <div className="ob-page">
      {/* Top bar */}
      <div className="ob-topbar">
        <div className="ob-title">
          <span className="material-icons-outlined home-ic" aria-hidden>home</span>
          <span> - Chart of Account</span>
        </div>
      </div>

      <div className="ob-card">
        {/* Filter row like screenshot */}
        <div className="ob-filters">
          <label className="fld">
            <span className="lbl">Select Year</span>
            <div className="sel">
              <select value={fy} onChange={(e) => setFy(e.target.value)}>
                {FY_LIST.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="material-icons-outlined caret">expand_more</span>
            </div>
          </label>

          <label className="fld" ref={accGroupWrapRef}>
            <span className="lbl">Select Account Group</span>

            {/* anchored custom dropdown */}
            <div className="sel-anchor">
              <button
                type="button"
                className="ipt fake-select"
                onClick={() => setAccGroupOpen(v => !v)}
                aria-haspopup="listbox"
                aria-expanded={accGroupOpen}
              >
                {accGroup || "Select Account Group"}
                <span className="material-icons-outlined caret">expand_more</span>
              </button>

              {accGroupOpen && (
                <div className="md-opts" role="listbox" onMouseDown={(e)=>e.stopPropagation()}>
                  <div className="opt-hd">Account Group</div>
                  {ACCOUNT_GROUPS.map(g => (
                    <button
                      key={g}
                      role="option"
                      type="button"
                      className={`opt ${accGroup === g ? "sel" : ""}`}
                      onClick={() => { setAccGroup(g); setAccGroupOpen(false); }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>

          <div className="ob-tools">
            <select
              className="size"
              value={pageSize}
              onChange={(e)=>setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <div className="search">
              <span className="material-icons-outlined">search</span>
              <input
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                placeholder="Search List..."
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="ob-table">
            <thead>
              <tr>
                <th className="col-n">#</th>
                <th>Account/Customer</th>
                <th>Account Group</th>
                <th>Location</th>
                <th className="col-num">Credit</th>
                <th className="col-num">Debit</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.id}>
                  <td className="col-n">{r.id}</td>
                  <td>{r.name}</td>
                  <td>{r.group}</td>
                  <td>{r.location}</td>
                  <td className="col-num">
                    <input
                      className="amt"
                      value={r.credit}
                      onChange={(e)=>/^\d*$/.test(e.target.value) && updateCell(r.id, "credit", e.target.value)}
                    />
                  </td>
                  <td className="col-num">
                    <input
                      className="amt"
                      value={r.debit}
                      onChange={(e)=>/^\d*$/.test(e.target.value) && updateCell(r.id, "debit", e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="ob-pager">
          <div className="pager-left">
            Showing <strong>{visible.length}</strong> of <strong>{filtered.length}</strong>
          </div>
          <div className="pager-right">
            <button
              className="pg-btn"
              disabled={safePage <= 1}
              onClick={()=>setPage(p => Math.max(1, p - 1))}
              type="button"
            >‹</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`pg-btn ${n === safePage ? "active" : ""}`}
                onClick={()=>setPage(n)}
                type="button"
              >{n}</button>
            ))}

            <button
              className="pg-btn"
              disabled={safePage >= totalPages}
              onClick={()=>setPage(p => Math.min(totalPages, p + 1))}
              type="button"
            >›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
