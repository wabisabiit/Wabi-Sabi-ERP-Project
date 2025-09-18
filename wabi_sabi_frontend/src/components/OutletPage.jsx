import React, { useMemo, useState } from "react";
import "../styles/OutletPage.css";

const OUTLETS = [
  { id: 1, name: "WABI SABI SUSTAINABILITY LLP", code: "WSSL",   phone: "+91-9012345678", address: "Udyog Vihar, Gurugram",  status: "ACTIVE" },
  { id: 2, name: "Brands4Less - Tilak Nagar",    code: "B4L-TN", phone: "+91-9812345678", address: "Tilak Nagar, New Delhi", status: "ACTIVE" },
  { id: 3, name: "Brands4Less - M3M Urbana",     code: "B4L-URB",phone: "+91-9712345678", address: "M3M Urbana, Gurugram",  status: "ACTIVE" },
  { id: 4, name: "Brands4Less - Krishna Nagar",  code: "B4L-KN", phone: "+91-9612345678", address: "Krishna Nagar, Delhi",  status: "ACTIVE" },
];

export default function OutletPage() {
  const [pageSize, setPageSize] = useState(15);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return OUTLETS;
    return OUTLETS.filter(r =>
      [r.name, r.code, r.phone, r.address, r.status].some(v =>
        String(v || "").toLowerCase().includes(q)
      )
    );
  }, [query]);

  const showingFrom = filtered.length ? 1 : 0;
  const showingTo = Math.min(filtered.length, pageSize);

  return (
    <div className="out-wrap">
      <div className="out-pagebar">
        <h1>Outlet</h1>
        <span className="material-icons out-home">home</span>
      </div>

      <div className="out-card">
        <div className="out-toolbar">
          <div className="flex-spacer" />
          <button className="out-btn-icon" title="Export">
            <span className="material-icons">file_download</span>
          </button>
          <select
            className="out-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Rows per page"
          >
            {[10, 15, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className="out-btn filter">
            <span className="material-icons">filter_alt</span>
            <span>Filter</span>
          </button>
          <div className="out-search">
            <span className="material-icons">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search List..."
            />
          </div>
          <button className="out-btn primary">Create New</button>
        </div>

        <div className="table-wrap">
          <table className="out-table">
            <thead>
              <tr>
                <th className="col-sr">#</th>
                <th>Outlet Name</th>
                <th>Code</th>
                <th>Mobile No.</th>
                <th>Address</th>
                <th className="col-status">Status</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, pageSize).map(r => (
                <tr key={r.id}>
                  <td className="col-sr">{r.id}</td>
                  <td><a className="out-link" href="#!">{r.name}</a></td>
                  <td>{r.code}</td>
                  <td>{r.phone}</td>
                  <td>{r.address}</td>
                  <td className="col-status"><span className="out-status">ACTIVE</span></td>
                  <td className="col-actions">
                    <button className="out-ico" title="Open"><span className="material-icons">open_in_new</span></button>
                    <button className="out-ico" title="Edit"><span className="material-icons">edit</span></button>
                    <button className="out-ico" title="Duplicate"><span className="material-icons">content_copy</span></button>
                    <button className="out-ico" title="Delete"><span className="material-icons">delete_outline</span></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="out-empty">No outlets found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="out-foot">
          <div className="foot-left">
            {`Showing ${showingFrom} to ${showingTo} of ${filtered.length} entries`}
          </div>
          <div className="foot-right">
            <button className="page arrow" title="Previous"><span className="material-icons">chevron_left</span></button>
            <button className="page current">1</button>
            <button className="page arrow" title="Next"><span className="material-icons">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}