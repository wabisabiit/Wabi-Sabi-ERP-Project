import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/ContactPage.css";
import ContactForm from "../components/ContactForm"; // ⟵ ADD

/* ----- Demo rows ----- */
const ROWS = [
  { sr: 1, name: "Brands 4 less – Ansal Plaza – – Brands 4 less – Ansal Plaza", contact: "+91–8868964450", whatsapp: "+91–8868964450", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 2, name: "Brands Loot – Udyog Vihar – – Brands Loot – Udyog Vihar", contact: "+91–7303467070", whatsapp: "+91–7303467070", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 3, name: "Brands 4 less – IFFCO Chowk – – Brands 4 less – IFFCO Chowk", contact: "+91–9599882602", whatsapp: "+91–9599882602", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 4, name: "WABI SABI SUSTAINABILITY LLP – WABI SABI SUSTAINABILITY LLP", contact: "+91–7303045070", whatsapp: "+91–7303045070", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
  { sr: 5, name: "WABI SABI SUSTAINABILITY LLP – WABI SABI", contact: "+91–7303045070", whatsapp: "+91–7303045070", gstin: "07AADFW9945P1Z6", createdBy: "mail@harmeet.com", mobileStatus: "Un-verified", status: "ACTIVE", loyalty: "0.00" },
];

/** --- Columns master (ALL possible columns) --- */
const COLS = [
  { id: "sr",          label: "Sr. No.",         th: (<><div>Sr.</div><div>No.</div></>), td: r => r.sr, thClass: "col-sr" },
  { id: "name",        label: "Name",            td: r => <a className="con-link two-line" href="#!">{r.name}</a> },
  { id: "firstName",   label: "First Name",      td: r => r.firstName || "" },
  { id: "lastName",    label: "Last Name",       td: r => r.lastName || "" },
  { id: "companyName", label: "Company Name",    td: r => r.companyName || "" },
  { id: "contact",     label: "Contact No.",     th: (<><div>Contact</div><div>No.</div></>), td: r => r.contact },
  { id: "whatsapp",    label: "Whatsapp No.",    td: r => r.whatsapp },

  { id: "email",       label: "Email Id",        td: r => r.email || "" },
  { id: "telephone",   label: "Telephone No.",   td: r => r.telephone || "" },
  { id: "gstType",     label: "GST Type",        td: r => r.gstType || "" },
  { id: "gstin",       label: "GSTIN",           td: r => <span className="two-line">{r.gstin}</span> },
  { id: "pan",         label: "PAN No.",         td: r => r.pan || "" },
  { id: "customerType",label: "Customer Type",   td: r => r.customerType || "" },
  { id: "bankName",    label: "Bank Name",       td: r => r.bankName || "" },

  { id: "branchName",  label: "Branch Name",     td: r => r.branchName || "" },
  { id: "bankAccount", label: "Bank Account No.",td: r => r.bankAccount || "" },
  { id: "ifsc",        label: "IFSC Code",       td: r => r.ifsc || "" },
  { id: "addr1",       label: "Address Line 1",  td: r => r.addr1 || "" },
  { id: "addr2",       label: "Address Line 2",  td: r => r.addr2 || "" },
  { id: "pin",         label: "Pin Code",        td: r => r.pin || "" },
  { id: "dob",         label: "DOB",             td: r => r.dob || "" },

  { id: "opening",     label: "Opening Balance", td: r => r.opening || "" },
  { id: "crdr",        label: "CR/DR",           td: r => r.crdr || "" },
  { id: "city",        label: "City",            td: r => r.city || "" },
  { id: "state",       label: "State",           td: r => r.state || "" },
  { id: "country",     label: "Country",         td: r => r.country || "" },

  { id: "segment",     label: "Customer Segment",td: r => r.segment || "" },
  { id: "membership",  label: "Membership Type", td: r => r.membership || "" },
  { id: "status",      label: "Status",          td: () => <span className="con-status">ACTIVE</span> },
  { id: "loyalty",     label: "Loyalty Point",   th: (<><div>Loyalty</div><div>Point</div></>), td: r => r.loyalty },
  { id: "actions",     label: "Actions",         td: () => (
      <>
        <button className="con-ico" title="Edit"><span className="material-icons">edit</span></button>
        <button className="con-ico" title="More"><span className="material-icons">more_vert</span></button>
      </>
    ), thClass: "col-actions" },

  { id: "createdBy",   label: "Created By",      td: r => <span className="two-line">{r.createdBy}</span> },
  { id: "mobileStatus",label: "Mobile No status",th: (<><div>Mobile</div><div>No status</div></>), td: r => <span className="muted">{r.mobileStatus}</span> },
];

/* Default visible sets by tab */
const CUSTOMER_VISIBLE = ["sr","name","contact","whatsapp","gstin","createdBy","mobileStatus","status","loyalty","actions"];
const VENDOR_VISIBLE   = ["sr","name","contact","whatsapp","gstin","createdBy","mobileStatus","status","actions"]; // no loyalty

/* ========= Location multi-select (Employee-style) ========= */
function ContactLocationSelect({ value = [], onChange, options = [] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.toLowerCase().includes(s));
  }, [q, options]);

  useEffect(() => {
    const onDoc = (e) =>
      wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const toggle = (opt) => {
    const s = new Set(value);
    s.has(opt) ? s.delete(opt) : s.add(opt);
    onChange(Array.from(s));
  };

  return (
    <div className="con-loc" ref={wrapRef}>
      <button
        type="button"
        className="con-loc-pill"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="con-loc-text">Select Location</span>
        <span className="con-loc-badge">{value.length}</span>
        <span className="material-icons con-loc-caret">expand_more</span>
      </button>

      {open && (
        <div className="con-loc-pop">
          <div className="con-loc-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
            />
          </div>
          <div className="con-loc-list">
            {filtered.length === 0 ? (
              <div className="con-loc-empty">No results</div>
            ) : (
              filtered.map((opt) => {
                const checked = value.includes(opt);
                return (
                  <label key={opt} className="con-loc-item" title={opt}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt)}
                    />
                    <span className="con-loc-txt">{opt}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========= Page ========= */
export default function ContactPage() {
  const [tab, setTab] = useState("customer");
  const [pageSize, setPageSize] = useState(15);
  const [query, setQuery] = useState("");

  // ⟵ ADD: overlay state
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState("customer");

  // Visible columns
  const [visible, setVisible] = useState(() => new Set(CUSTOMER_VISIBLE));

  // Columns popover (Customer only)
  const [colOpen, setColOpen] = useState(false);
  const colRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (!colRef.current) return;
      if (!colRef.current.contains(e.target)) setColOpen(false);
    }
    if (colOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [colOpen]);

  const baseDefault = tab === "vendor" ? VENDOR_VISIBLE : CUSTOMER_VISIBLE;
  const isDefault = visible.size === baseDefault.length && baseDefault.every(id => visible.has(id));
  const toggleCol = (id) => setVisible(cur => {
    const nxt = new Set(cur);
    nxt.has(id) ? nxt.delete(id) : nxt.add(id);
    return nxt;
  });
  const restoreCols = () => setVisible(new Set(baseDefault));

  // Tab switch — also reset visible columns
  const switchTab = (key) => {
    setTab(key);
    setColOpen(false);
    setVisible(new Set(key === "vendor" ? VENDOR_VISIBLE : CUSTOMER_VISIBLE));
  };

  // --- Filter states (Set Location only) ---
  const [openFilter, setOpenFilter] = useState(false);
  const [locations, setLocations] = useState([]);
  const LOCATION_OPTIONS = [
    "Brands4Less-Tilak Nagar",
    "Brands4Less-M3M Urbana",
    "Brands4Less-Rajori Garden inside(RJR)",
    "Brands4Less-Rajori Garden outside(RJO)",
    "Brands4Less-Iffco Chock",
    "Brands4Less-Krishna Nagar",
    "Brands4Less-UP-AP",
    "Brands4Less-Udhyog Vihar"
  ];

  // --- Download menu ---
  const [dlOpen, setDlOpen] = useState(false);
  const dlRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (!dlRef.current) return;
      if (!dlRef.current.contains(e.target)) setDlOpen(false);
    }
    if (dlOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [dlOpen]);

  function downloadBlob(filename, type, data = "") {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  const makeCsv = (headers) => headers.join(",") + "\n";
  function onDownload(kind) {
    const shown = shownCols.map(c => (typeof c.label === "string" ? c.label : c.id));
    const all   = COLS.map(c => (typeof c.label === "string" ? c.label : c.id));
    if (kind === "excel") downloadBlob("contacts.csv", "text/csv;charset=utf-8", makeCsv(shown));
    if (kind === "all")   downloadBlob("contacts_all.csv", "text/csv;charset=utf-8", makeCsv(all));
    if (kind === "pdf")   downloadBlob("contacts.pdf", "application/pdf");
    setDlOpen(false);
  }

  // --- Search + Location combined filter ---
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = ROWS;

    if (q) {
      rows = rows.filter((r) =>
        [r.name, r.contact, r.whatsapp, r.gstin, r.createdBy, r.mobileStatus, r.status]
          .some((v) => String(v || "").toLowerCase().includes(q))
      );
    }
    if (locations.length > 0) {
      rows = rows.filter((r) =>
        locations.some((loc) => r.name.toLowerCase().includes(loc.toLowerCase()))
      );
    }
    return rows;
  }, [query, locations]);

  const showingFrom = filtered.length ? 1 : 0;
  const showingTo = Math.min(filtered.length, pageSize);
  const shownCols = useMemo(() => COLS.filter((c) => visible.has(c.id)), [visible]);

  // ⟵ ADD: handler to open the form matching current tab
  const openCreate = () => {
    setFormType(tab === "vendor" ? "vendor" : "customer");
    setFormOpen(true);
  };

  return (
    <div className="con-wrap">
      {/* TOP ROW */}
      <div className="con-topbar">
        <div className="tabs">
          {[
            { key: "customer", label: "Customer" },
            { key: "vendor",   label: "Supplier/Vendor" },
          ].map((t) => (
            <button
              key={t.key}
              className={`con-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => switchTab(t.key)}
            >
              <span className="dot" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="actions-right">
          {/* Download */}
          <div className="con-download" ref={dlRef}>
            <button
              className={`con-btn-icon ${dlOpen ? "on" : ""}`}
              title="Export"
              onClick={() => setDlOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={dlOpen}
            >
              <span className="material-icons">file_download</span>
            </button>
            {dlOpen && (
              <div className="dl-menu" role="menu">
                <button className="dl-item" onClick={() => onDownload("excel")} role="menuitem">Excel</button>
                <button className="dl-item" onClick={() => onDownload("pdf")} role="menuitem">PDF</button>
                <button className="dl-item" onClick={() => onDownload("all")} role="menuitem">All Data Excel</button>
              </div>
            )}
          </div>

          {/* Page size */}
          <select
            className="con-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Rows per page"
          >
            {[10, 100, 200, 500, 1000].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          {/* Filter toggle */}
          <button
            className={`con-btn filter ${openFilter ? "is-active" : ""}`}
            onClick={() => setOpenFilter(v => !v)}
          >
            <span className="material-icons">filter_alt</span>
            <span>Filter</span>
          </button>

          {/* Search */}
          <div className="con-search">
            <span className="material-icons">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search List..."
            />
          </div>

          {/* ⟵ ADD: Create New button (right of search) */}
          <button className="con-btn primary create-new" onClick={openCreate}>

            <span>Create New</span>
          </button>
        </div>
      </div>

      {/* FILTER STRIP: Set Location only */}
      {openFilter && (
        <div className="con-filterstrip">
          <div className="con-field">
            <div className="con-field-label">Select Location</div>
            <ContactLocationSelect
              value={locations}
              onChange={setLocations}
              options={LOCATION_OPTIONS}
            />
          </div>
        </div>
      )}

      {/* SECOND ROW: Columns – only for Customer */}
      {tab === "customer" && (
        <div className="con-row-columns" ref={colRef}>
          <button className="con-btn primary" onClick={() => setColOpen(v => !v)}>
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
      )}

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
                <tr>
                  <td colSpan={1 + shownCols.length} className="con-empty">
                    No data available in table
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="con-foot">
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

      {/* ⟵ ADD: Render the overlay form */}
      <ContactForm
        type={formType}             // "customer" or "vendor" based on current tab
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
