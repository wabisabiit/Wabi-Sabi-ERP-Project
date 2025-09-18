import React, { useMemo, useState } from "react";
import "../styles/EmployeePage.css";

const DATA = [
  { id: 1, name: "Rajdeep", phone: "+91-7827635203", email: "", branch: "WABI SABI SUSTAINABILITY LLP", status: "ACTIVE" },
  { id: 2, name: "IT Account", phone: "+91-7859456588", email: "", branch: "WABI SABI SUSTAINABILITY LLP", status: "ACTIVE" },
  { id: 3, name: "Nishant", phone: "+91-9658745122", email: "", branch: "WABI SABI SUSTAINABILITY LLP", status: "ACTIVE" },
  { id: 4, name: "Krishna Pandit", phone: "+91-9718068241", email: "", branch: "WABI SABI SUSTAINABILITY LLP", status: "ACTIVE" },
];

export default function EmployeePage() {
  const [pageSize, setPageSize] = useState(15);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DATA;
    return DATA.filter((r) =>
      [r.name, r.phone, r.email, r.branch].some((v) =>
        String(v || "").toLowerCase().includes(q)
      )
    );
  }, [query]);

  const showingFrom = filtered.length ? 1 : 0;
  const showingTo = Math.min(filtered.length, pageSize);

  return (
    <div className="emp-wrap">
      {/* Page Title with Home Icon */}
      <div className="emp-pagebar">
        <h1>Employee</h1>
        <span className="material-icons home-ico">home</span>
      </div>

      {/* Card */}
      <div className="emp-card">
        {/* Toolbar */}
        <div className="emp-toolbar">
          <div className="flex-spacer" />
          <button className="btn-icon" title="Export">
            <span className="material-icons">file_download</span>
          </button>

          <select
            className="emp-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Rows per page"
          >
            {[10, 15, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <button className="btn filter">
            <span className="material-icons">filter_alt</span>
            <span>Filter</span>
          </button>

          <div className="emp-search">
            <span className="material-icons">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search List..."
            />
          </div>

          <button className="btn primary">Create New</button>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="emp-table">
            <thead>
              <tr>
                <th className="col-sr">#</th>
                <th>Name</th>
                <th>Mobile No.</th>
                <th>Email</th>
                <th>Assign Branch</th>
                <th className="col-status">Status</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, pageSize).map((r) => (
                <tr key={r.id}>
                  <td className="col-sr">{r.id}</td>
                  <td><a className="emp-link" href="#!">{r.name}</a></td>
                  <td>{r.phone}</td>
                  <td>{r.email || ""}</td>
                  <td>{r.branch}</td>
                  <td className="col-status">
                    <span className="status-pill active">ACTIVE</span>
                  </td>
                  <td className="col-actions">
                    <button className="ico" title="Open">
                      <span className="material-icons">open_in_new</span>
                    </button>
                    <button className="ico" title="Edit">
                      <span className="material-icons">edit</span>
                    </button>
                    <button className="ico" title="Duplicate">
                      <span className="material-icons">content_copy</span>
                    </button>
                    <button className="ico" title="Delete">
                      <span className="material-icons">delete_outline</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">No employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer (with arrows) */}
        <div className="emp-table-foot">
          <div className="foot-left">
            {`Showing ${showingFrom} to ${showingTo} of ${filtered.length} entries`}
          </div>
          <div className="foot-right">
            <button className="page arrow">
              <span className="material-icons">chevron_left</span>
            </button>
            <button className="page current">1</button>
            <button className="page arrow">
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
