import React, { useMemo, useState } from "react";
import "../styles/Contact.css";

const ROWS = [
  { sr: 1, name: "Brands 4 less – Ansal Plaza – – Brands 4 less – Ansal Plaza", contact: "+91–8868964450", whatsapp: "+91–8868964450", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 2, name: "Brands Loot – Udyog Vihar – – Brands Loot – Udyog Vihar",     contact: "+91–7303467070", whatsapp: "+91–7303467070", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 3, name: "Brands 4 less – IFFCO Chowk – – Brands 4 less – IFFCO Chowk", contact: "+91–9599882602", whatsapp: "+91–9599882602", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 4, name: "WABI SABI SUSTAINABILITY LLP – WABI SABI SUSTAINABILITY LLP",  contact: "+91–7303045070", whatsapp: "+91–7303045070", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 5, name: "WABI SABI SUSTAINABILITY LLP – WABI SABI",                      contact: "+91–7303045070", whatsapp: "+91–7303045070", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
];

export default function ContactPage() {
  const [tab, setTab] = useState("customer");
  const [pageSize, setPageSize] = useState(15);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROWS;
    return ROWS.filter(r =>
      [r.name, r.contact, r.whatsapp, r.gstin, r.createdBy, r.mobileStatus, r.status]
        .some(v => String(v || "").toLowerCase().includes(q))
    );
  }, [query]);

  const showingFrom = filtered.length ? 1 : 0;
  const showingTo = Math.min(filtered.length, pageSize);

  return (
    <div className="con-wrap">
      {/* TOP ROW: tabs left, export/size/filter/search right */}
      <div className="con-topbar">
        <div className="tabs">
          {[
            { key: "customer", label: "Customer" },
            { key: "vendor", label: "Supplier/Vendor" },
            { key: "transport", label: "Transport" },
          ].map(t => (
            <button
              key={t.key}
              className={`con-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <span className="dot" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="actions-right">
          <button className="con-btn-icon" title="Export">
            <span className="material-icons">file_download</span>
          </button>

          <select
            className="con-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Rows per page"
          >
            {[10, 15, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <button className="con-btn filter">
            <span className="material-icons">filter_alt</span>
            <span>Filter</span>
          </button>

          <div className="con-search">
            <span className="material-icons">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search List..."
            />
          </div>
        </div>
      </div>

      {/* SECOND ROW: Columns button alone, left-aligned */}
      <div className="con-row-columns">
        <button className="con-btn primary">
          <span className="material-icons">view_column</span>
          <span>Columns</span>
          <span className="material-icons caret">arrow_drop_down</span>
        </button>
      </div>

      {/* TABLE CARD ONLY (no toolbar border above) */}
      <div className="con-card">
        <div className="table-wrap">
          <table className="con-table">
            <thead>
              <tr>
                <th className="col-check"></th>
                <th className="col-sr"><div>Sr.</div><div>No.</div></th>
                <th>Name</th>
                <th><div>Contact</div><div>No.</div></th>
                <th><div>Whatsapp</div><div>No.</div></th>
                <th>GSTIN</th>
                <th>Created By</th>
                <th><div>Mobile</div><div>No status</div></th>
                <th>Status</th>
                <th><div>Loyalty</div><div>Point</div></th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, pageSize).map(r => (
                <tr key={r.sr}>
                  <td className="col-check"><input type="checkbox" /></td>
                  <td className="col-sr">{r.sr}</td>
                  <td><a className="con-link" href="#!">{r.name}</a></td>
                  <td>{r.contact}</td>
                  <td>{r.whatsapp}</td>
                  <td>{r.gstin}</td>
                  <td>{r.createdBy}</td>
                  <td className="muted">{r.mobileStatus}</td>
                  <td><span className="con-status">ACTIVE</span></td>
                  <td className="right">{r.loyalty}</td>
                  <td className="col-actions">
                    <button className="con-ico" title="Edit"><span className="material-icons">edit</span></button>
                    <button className="con-ico" title="More"><span className="material-icons">more_vert</span></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="con-empty">No contacts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="con-foot">
          <div className="foot-left">{`Showing ${showingFrom} to ${showingTo} of ${filtered.length} entries`}</div>
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
