import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/MaterialConsumption.css";

/* ---------- Dummy data (exact-looking) ---------- */
const LOCATIONS = [
  { code: "WSLLP", name: "WABI SABI SUSTAINABILITY LLP" },
  { code: "WSGUR", name: "WABI SABI – GURUGRAM" },
  { code: "WSRJN", name: "WABI SABI – RAJOURI" },
];

const ROWS = [
  { no: "CONWS58", date: "23/10/2025", user: "Krishna Pandit", type: "Scrap/Wastage", loc: LOCATIONS[0].name, amount: 2080 },
  { no: "CONWS57", date: "21/10/2025", user: "Krishna Pandit", type: "Production",    loc: LOCATIONS[0].name, amount: 307550 },
  { no: "CONWS56", date: "18/10/2025", user: "Krishna Pandit", type: "Expired",       loc: LOCATIONS[0].name, amount: 53567 },
  { no: "CONWS55", date: "10/10/2025", user: "Krishna Pandit", type: "Scrap/Wastage", loc: LOCATIONS[0].name, amount: 3200 },
  { no: "CONWS54", date: "10/10/2025", user: "Krishna Pandit", type: "Scrap/Wastage", loc: LOCATIONS[0].name, amount: 8080 },
  { no: "CONWS53", date: "09/10/2025", user: "Krishna Pandit", type: "Expired",       loc: LOCATIONS[0].name, amount: 235885 },
  { no: "CONWS52", date: "03/10/2025", user: "Krishna Pandit", type: "Expired",       loc: LOCATIONS[0].name, amount: 207078 },
  { no: "CONWS51", date: "03/10/2025", user: "Krishna Pandit", type: "Expired",       loc: LOCATIONS[0].name, amount: 123000 },
  { no: "CONWS50", date: "03/10/2025", user: "Krishna Pandit", type: "Expired",       loc: LOCATIONS[0].name, amount: 60066 },
  { no: "CONWS49", date: "03/10/2025", user: "Krishna Pandit", type: "Expired",       loc: LOCATIONS[0].name, amount: 3346 },
];

export default function MaterialConsumptionListPage() {
  const navigate = useNavigate();
  const [perPage, setPerPage] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [from, setFrom] = useState("01/04/2025");
  const [to, setTo] = useState("31/03/2026");
  const [loc, setLoc] = useState("");

  const filtered = useMemo(() => {
    return ROWS.filter(r => {
      const okQ = !search || [r.no, r.user, r.type, r.loc].some(x => x.toLowerCase().includes(search.toLowerCase()));
      const okT = !fType || r.type === fType;
      const okL = !loc || r.loc === loc;
      return okQ && okT && okL;
    });
  }, [search, fType, loc]);

  const total = useMemo(() => filtered.reduce((s, r) => s + (r.amount || 0), 0), [filtered]);

  return (
    <div className="mc-page">
      <div className="mc-topbar">
        <div className="mc-title">Material Consumption</div>
        <div className="mc-actions">
          <select value={perPage} onChange={(e)=>setPerPage(Number(e.target.value))} className="mc-select sm">
            {[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          <button
            className={`mc-btn filter ${filterOpen ? "active" : ""}`}
            onClick={()=>setFilterOpen(v=>!v)}
            title="Filter"
          >
            <span className="mi">filter_alt</span> <span>Filter</span>
          </button>
          <input
            className="mc-search"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="Search list..."
          />
          <button className="mc-btn primary" onClick={()=>navigate("/inventory/material-consumption/new")}>
            Create New
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="mc-filter">
          <div className="row">
            <div className="col">
              <label>Select Consumption Type</label>
              <select value={fType} onChange={(e)=>setFType(e.target.value)}>
                <option value="">Consumption Type</option>
                <option>Production</option>
                <option>Scrap/Wastage</option>
                <option>Expired</option>
              </select>
            </div>
            <div className="col">
              <label>From Date</label>
              <input value={from} onChange={(e)=>setFrom(e.target.value)} placeholder="dd/mm/yyyy" />
            </div>
            <div className="col">
              <label>To Date</label>
              <input value={to} onChange={(e)=>setTo(e.target.value)} placeholder="dd/mm/yyyy" />
            </div>
            <div className="col">
              <label>Location</label>
              <div className="loc-wrap">
                <select value={loc} onChange={(e)=>setLoc(e.target.value)}>
                  <option value="">Select Location</option>
                  {LOCATIONS.map(l=> <option key={l.code} value={l.name}>{l.name}</option>)}
                </select>
                <span className="mi loc-ico">search</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mc-card">
        <table className="mc-table">
          <thead>
            <tr>
              <th>Sr. No.</th>
              <th>Consumption No.</th>
              <th>Consumption Date</th>
              <th>User Name</th>
              <th>Consumption Type</th>
              <th>Location</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, perPage).map((r, i)=>(
              <tr key={r.no}>
                <td>{i+1}</td>
                <td><Link to={`/inventory/material-consumption/${r.no}`} className="mc-link">{r.no}</Link></td>
                <td>{r.date}</td>
                <td>{r.user}</td>
                <td>{r.type}</td>
                <td>{r.loc}</td>
                <td className="num">{r.amount}</td>
                <td className="actions">
                  <span className="mi">visibility</span>
                  <span className="mi">edit</span>
                  <span className="mi">delete</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="right strong">Total</td>
              <td className="num strong">{total}</td>
              <td/>
            </tr>
          </tfoot>
        </table>

        <div className="mc-table-foot">
          <span>Showing 1 to {Math.min(perPage, filtered.length)} of {filtered.length} entries</span>
          <div className="pager-mini">
            <button disabled>‹</button>
            <button className="current">1</button>
            <button disabled>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
