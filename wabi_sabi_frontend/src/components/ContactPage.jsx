import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/Contact.css";

const ROWS = [
  { sr: 1, name: "Brands 4 less – Ansal Plaza – – Brands 4 less – Ansal Plaza", contact: "+91–8868964450", whatsapp: "+91–8868964450", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 2, name: "Brands Loot – Udyog Vihar – – Brands Loot – Udyog Vihar",     contact: "+91–7303467070", whatsapp: "+91–7303467070", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 3, name: "Brands 4 less – IFFCO Chowk – – Brands 4 less – IFFCO Chowk", contact: "+91–9599882602", whatsapp: "+91–9599882602", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 4, name: "WABI SABI SUSTAINABILITY LLP – WABI SABI SUSTAINABILITY LLP",  contact: "+91–7303045070", whatsapp: "+91–7303045070", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 5, name: "WABI SABI SUSTAINABILITY LLP – WABI SABI",                      contact: "+91–7303045070", whatsapp: "+91–7303045070", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
];

/** --- Columns master (includes ALL options you want in the popup) --- */
const COLS = [
  // left block in screenshot
  { id: "sr",          label: "Sr. No.",       th: (<><div>Sr.</div><div>No.</div></>),        td: r => r.sr, thClass: "col-sr" },
  { id: "name",        label: "Name",          td: r => <a className="con-link" href="#!">{r.name}</a> },
  { id: "firstName",   label: "First Name",    td: r => r.firstName || "" },
  { id: "lastName",    label: "Last Name",     td: r => r.lastName || "" },
  { id: "companyName", label: "Company Name",  td: r => r.companyName || "" },
  { id: "contact",     label: "Contact No.",   th: (<><div>Contact</div><div>No.</div></>),     td: r => r.contact },
  { id: "whatsapp",    label: "Whatsapp No.",  td: r => r.whatsapp },

  // second column group
  { id: "email",       label: "Email Id",      td: r => r.email || "" },
  { id: "telephone",   label: "Telephone No.", td: r => r.telephone || "" },
  { id: "gstType",     label: "GST Type",      td: r => r.gstType || "" },
  { id: "gstin",       label: "GSTIN",         td: r => r.gstin },
  { id: "pan",         label: "PAN No.",       td: r => r.pan || "" },
  { id: "customerType",label: "Customer Type", td: r => r.customerType || "" },
  { id: "bankName",    label: "Bank Name",     td: r => r.bankName || "" },

  // third column group
  { id: "branchName",  label: "Branch Name",   td: r => r.branchName || "" },
  { id: "bankAccount", label: "Bank Account No.", td: r => r.bankAccount || "" },
  { id: "ifsc",        label: "IFSC Code",     td: r => r.ifsc || "" },
  { id: "addr1",       label: "Address Line 1",td: r => r.addr1 || "" },
  { id: "addr2",       label: "Address Line 2",td: r => r.addr2 || "" },
  { id: "pin",         label: "Pin Code",      td: r => r.pin || "" },
  { id: "dob",         label: "DOB",           td: r => r.dob || "" },

  // fourth column group
  { id: "opening",     label: "Opening Balance", td: r => r.opening || "" },
  { id: "crdr",        label: "CR/DR",           td: r => r.crdr || "" },
  { id: "city",        label: "City",            td: r => r.city || "" },
  { id: "state",       label: "State",           td: r => r.state || "" },
  { id: "country",     label: "Country",         td: r => r.country || "" },

  // fifth column group
  { id: "segment",     label: "Customer Segment", td: r => r.segment || "" },
  { id: "membership",  label: "Membership Type",  td: r => r.membership || "" },
  { id: "status",      label: "Status",           td: () => <span className="con-status">ACTIVE</span> },
  { id: "loyalty",     label: "Loyalty Point",    th: (<><div>Loyalty</div><div>Point</div></>), td: r => r.loyalty, tdClass: "right" },
  { id: "actions",     label: "Actions",          td: () => (<>
      <button className="con-ico" title="Edit"><span className="material-icons">edit</span></button>
      <button className="con-ico" title="More"><span className="material-icons">more_vert</span></button>
    </>), thClass: "col-actions" },

  // also in your screenshot grid
  { id: "createdBy",   label: "Created By",       td: r => r.createdBy },
  { id: "mobileStatus",label: "Mobile No status", th: (<><div>Mobile</div><div>No status</div></>), td: r => <span className="muted">{r.mobileStatus}</span> },
];

/** Defaults (blue chips) – match your screenshot */
const DEFAULT_VISIBLE = [
  "sr","name","contact","whatsapp","gstin","createdBy","mobileStatus","status","loyalty","actions"
];

export default function ContactPage() {
  const [tab, setTab] = useState("customer");
  const [pageSize, setPageSize] = useState(15);
  const [query, setQuery] = useState("");

  // Columns pop
  const [colOpen, setColOpen] = useState(false);
  const [visible, setVisible] = useState(() => new Set(DEFAULT_VISIBLE));
  const colRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!colRef.current) return;
      if (!colRef.current.contains(e.target)) setColOpen(false);
    }
    if (colOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [colOpen]);

  const isDefault =
    visible.size === DEFAULT_VISIBLE.length &&
    DEFAULT_VISIBLE.every((id) => visible.has(id));

  const toggleCol = (id) =>
    setVisible((cur) => {
      const nxt = new Set(cur);
      nxt.has(id) ? nxt.delete(id) : nxt.add(id);
      return nxt;
    });

  const restoreCols = () => setVisible(new Set(DEFAULT_VISIBLE));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROWS;
    return ROWS.filter((r) =>
      [r.name, r.contact, r.whatsapp, r.gstin, r.createdBy, r.mobileStatus, r.status]
        .some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [query]);

  const showingFrom = filtered.length ? 1 : 0;
  const showingTo = Math.min(filtered.length, pageSize);

  const shownCols = useMemo(() => COLS.filter((c) => visible.has(c.id)), [visible]);

  return (
    <div className="con-wrap">
      {/* TOP ROW */}
      <div className="con-topbar">
        <div className="tabs">
          {[
            { key: "customer", label: "Customer" },
            { key: "vendor", label: "Supplier/Vendor" },
            // If you also need "Transport", add here similarly.
          ].map((t) => (
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
            {[10, 15, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
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

      {/* SECOND ROW: Columns button + Popover */}
      <div className="con-row-columns" ref={colRef}>
        <button className="con-btn primary" onClick={() => setColOpen((v) => !v)}>
          <span className="material-icons">view_column</span>
          <span>Columns</span>
          <span className="material-icons caret">arrow_drop_down</span>
        </button>

        {colOpen && (
          <div className="col-pop">
            <div className="col-grid">
              {COLS.map((c) => {
                const on = visible.has(c.id);
                return (
                  <button
                    key={c.id}
                    className={`col-chip ${on ? "on" : ""}`}
                    onClick={() => toggleCol(c.id)}
                  >
                    {c.label}
                  </button>
                );
              })}

              {/* Restore as a grey chip at the end */}
              <button
                className={`col-chip restore ${isDefault ? "disabled" : ""}`}
                onClick={restoreCols}
                disabled={isDefault}
              >
                Restore visibility
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="con-card">
        <div className="table-wrap">
          <table className="con-table">
            <thead>
              <tr>
                <th className="col-check"></th>
                {shownCols.map((c) => (
                  <th key={c.id} className={c.thClass || ""}>
                    {c.th || c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, pageSize).map((r) => (
                <tr key={r.sr}>
                  <td className="col-check"><input type="checkbox" /></td>
                  {shownCols.map((c) => (
                    <td key={c.id} className={c.tdClass || ""}>
                      {c.td ? c.td(r) : (r[c.id] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={1 + shownCols.length} className="con-empty">No contacts found.</td></tr>
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
