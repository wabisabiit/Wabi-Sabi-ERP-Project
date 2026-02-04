// src/components/MaterialConsumptionListPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/MaterialConsumption.css";
import { mcList, listLocations, mcDelete } from "../api/client";

/* Small helpers */
const toDMY = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
const fmtInt = (n) => Number(n || 0).toLocaleString("en-IN");

export default function MaterialConsumptionListPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);          // fetched from API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [locations, setLocations] = useState([]); // from API
  const [perPage, setPerPage] = useState(10);
  const [filterOpen, setFilterOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [from, setFrom] = useState("");           // dd/mm/yyyy shown, we’ll not send to API for now
  const [to, setTo] = useState("");
  const [loc, setLoc] = useState("");

  /* Load locations + consumptions */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [locs, list] = await Promise.all([
          listLocations(),
          mcList(), // client-side filtering keeps UI instant
        ]);
        if (!alive) return;
        setLocations(locs || []);
        setRows((list || []).map(r => ({
          no: r.number,
          date: toDMY(r.date),
          user: r.user || "Krishna Pandit",
          type: r.type,
          loc: r.location,
          amount: Number(r.amount || 0),
        })));
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ✅ NEW: delete handler (backend + remove from table) */
  const onDelete = async (no) => {
    const ok = window.confirm(`Delete Material Consumption ${no}?`);
    if (!ok) return;

    try {
      await mcDelete(no);
      setRows(prev => prev.filter(r => r.no !== no));
      alert("Deleted successfully.");
    } catch (e) {
      alert(`Delete failed: ${e?.message || e}`);
    }
  };

  /* Client-side filter & search exactly like your previous version */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      const okQ = !q || [r.no, r.user, r.type, r.loc].some(
        x => String(x || "").toLowerCase().includes(q)
      );
      const okT = !fType || r.type === fType;
      const okL = !loc   || r.loc  === loc;
      // date range (dd/mm/yyyy compare safely)
      const toKey = (dmy) => dmy.split("/").reverse().join(""); // yyyymmdd
      const okFrom = !from || toKey(r.date) >= toKey(from);
      const okTo   = !to   || toKey(r.date) <= toKey(to);
      return okQ && okT && okL && okFrom && okTo;
    });
  }, [rows, search, fType, loc, from, to]);

  const total = useMemo(() => filtered.reduce((s, r) => s + (r.amount || 0), 0), [filtered]);

  if (loading) return <div className="mc-page"><div className="muted" style={{padding:12}}>Loading…</div></div>;
  if (error)   return <div className="mc-page"><div className="muted" style={{padding:12}}>Error: {error}</div></div>;

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
          <button className="mc-btn" onClick={()=>navigate("/inventory/material-consumption/new")}>
            Create New
          </button>
        </div>
      </div>

      {/* Filter panel */}
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
              <input
                value={from}
                onChange={(e)=>setFrom(e.target.value)}
                placeholder="dd/mm/yyyy"
              />
            </div>
            <div className="col">
              <label>To Date</label>
              <input
                value={to}
                onChange={(e)=>setTo(e.target.value)}
                placeholder="dd/mm/yyyy"
              />
            </div>
            <div className="col">
              <label>Location</label>
              <div className="loc-wrap">
                <select value={loc} onChange={(e)=>setLoc(e.target.value)}>
                  <option value="">Select Location</option>
                  {locations.map(l=> <option key={l.code} value={l.name}>{l.name}</option>)}
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
                <td className="num">{fmtInt(r.amount)}</td>
                <td className="actions">
                  <span
                    className="mi"
                    title="View"
                    onClick={() => navigate(`/inventory/material-consumption/${r.no}`)}
                    style={{ cursor: "pointer" }}
                  >
                    visibility
                  </span>
                  <span className="mi" title="Edit">edit</span>
                  <span
                    className="mi"
                    title="Delete"
                    onClick={() => onDelete(r.no)}
                    style={{ cursor: "pointer" }}
                  >
                    delete
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="right strong">Total</td>
              <td className="num strong">{fmtInt(total)}</td>
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
