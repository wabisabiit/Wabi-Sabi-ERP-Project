import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/NotificationSettingsPage.css";

/* ===== Pills (unchanged) ===== */
const PILL = {
  CUSTOMER: { text: "CUSTOMER", tone: "blue" },
  "SUPER ADMIN": { text: "SUPER ADMIN", tone: "red" },
  "LOCATION ADMIN": { text: "LOCATION ADMIN", tone: "green" },
  "SENDER LOCATION ADMIN": { text: "SENDER LOCATION ADMIN", tone: "green" },
  "REQUESTED LOCATION ADMIN": { text: "REQUESTED LOCATION ADMIN", tone: "green" },
  SUPPLIER: { text: "SUPPLIER", tone: "blue" },
};

/* ===== Data (your 1–40 rows, unchanged) ===== */
const ROWS = [
  { id: 1, event: "New Estimate", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: true, e: true },
  { id: 2, event: "Edit Estimate", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 3, event: "New Sales Order", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 4, event: "Edit Sales Order", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 5, event: "New Invoice", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: true, e: true },
  { id: 6, event: "Edit Invoice", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 7, event: "Delete Invoice", module: "Sales & POS", sender: "System", receiver: ["SUPER ADMIN"], w: true, s: false, e: true },
  { id: 8, event: "Register Open", module: "POS", sender: "System", receiver: ["SUPER ADMIN", "LOCATION ADMIN"], w: true, s: false, e: true },
  { id: 9, event: "Register Close", module: "POS", sender: "System", receiver: ["SUPER ADMIN", "LOCATION ADMIN"], w: true, s: false, e: true },
  { id: 10, event: "New Delivery Challan", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 11, event: "Edit Delivery Challan", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 12, event: "New Credit Note", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 13, event: "Edit Credit Note", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 14, event: "New Purchase Order", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
  { id: 15, event: "Edit Purchase Order", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
  { id: 16, event: "New Material Inward", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
  { id: 17, event: "Edit Material Inward", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
  { id: 18, event: "New Bill", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
  { id: 19, event: "Edit Bill", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
  { id: 20, event: "New Debit Note", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
  { id: 21, event: "Edit Debit Note", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
  { id: 22, event: "New eCommerce Order", module: "E- Commerce", sender: "System", receiver: ["SUPER ADMIN", "LOCATION ADMIN"], w: true, s: false, e: true },
  { id: 23, event: "Ecommerce New Order", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 24, event: "Ecommerce Order In-Progress", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 25, event: "Ecommerce Order Confirmation", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 26, event: "Ecommerce Out for Delivery", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 27, event: "Ecommerce Order Delivered", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 28, event: "Ecommerce Order Cancelled", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 29, event: "Birthday Wishes", module: "Others", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 30, event: "OTP on Credit Note Redemption", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: false },
  { id: 31, event: "OTP on Advance Payment", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: false },
  { id: 32, event: "Anniversary Wishes", module: "Others", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 33, event: "Stock Transfer", module: "Inventory", sender: "System", receiver: ["LOCATION ADMIN"], w: true, s: false, e: true },
  { id: 34, event: "Stock Transfer Approve/Reject", module: "Inventory", sender: "System", receiver: ["SENDER LOCATION ADMIN"], w: true, s: false, e: true },
  { id: 35, event: "Stock Transfer Request", module: "Inventory", sender: "System", receiver: ["LOCATION ADMIN"], w: true, s: false, e: true },
  { id: 36, event: "Stock Transfer Request Approved/Rejected", module: "Inventory", sender: "System", receiver: ["REQUESTED LOCATION ADMIN"], w: true, s: false, e: true },
  { id: 37, event: "Stock Verification", module: "Inventory", sender: "System", receiver: ["LOCATION ADMIN"], w: true, s: false, e: false },
  { id: 38, event: "Stock Verification Approved/Rejected", module: "Inventory", sender: "System", receiver: ["LOCATION ADMIN"], w: true, s: false, e: true },
  { id: 39, event: "Redeemed Loyalty points", module: "POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
  { id: 40, event: "New Delivery Challan", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
];

/* ===== Options exactly like your screenshots ===== */
const MODULE_OPTIONS = [
  { key: "", label: "Select Module", matches: [] },
  { key: "salespos", label: "Sales & POS", matches: ["Sales & POS", "Sales", "POS"] },
  { key: "purchase", label: "Purchase", matches: ["Purchase"] },
  { key: "ecom", label: "E-Commerce", matches: ["E- Commerce"] }, // note the space in data
  { key: "reports", label: "Reports", matches: ["Reports"] },
  { key: "inventory", label: "Inventory", matches: ["Inventory"] },
  { key: "others", label: "Others", matches: ["Others"] },
];

const SENDER_OPTIONS = [
  { value: "", label: "Select Sender" },
  { value: "Admin", label: "Admin" },
  { value: "System", label: "System" },
];

const RECEIVER_OPTIONS = [
  { value: "", label: "Select Receiver" },
  { value: "SUPER ADMIN", label: "Super Admin" },
  { value: "LOCATION ADMIN", label: "Location Admin" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "SENDER LOCATION ADMIN", label: "Sender Location Admin" },
  { value: "REQUESTED LOCATION ADMIN", label: "Requested Location Admin" },
];

/* ================= Searchable Select (inline search like screenshots) ================ */
function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const fn = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onOutside?.();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [ref, onOutside]);
}

function SearchSelect({
  label,
  placeholder,
  value,
  onChange,
  options, // [{value,label}] OR for module: [{key,label}]
  width = 240,
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const boxRef = useRef(null);
  useClickOutside(boxRef, () => setOpen(false));

  const isModule = options[0] && "key" in options[0];
  const valLabel = useMemo(() => {
    if (!value) return "";
    const found = options.find((o) =>
      isModule ? o.key === value : o.value === value
    );
    return found?.label ?? "";
  }, [value, options, isModule]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.label.toLowerCase().includes(t));
  }, [term, options]);

  const selectOption = (opt) => {
    onChange(isModule ? opt.key : opt.value);
    setOpen(false);
    setTerm("");
  };

  return (
    <div className="ns-fg" style={{ width }}>
      <label>{label}</label>
      <div
        className={`sselect ${open ? "open" : ""}`}
        onClick={() => setOpen(true)}
        ref={boxRef}
        style={{ width }}
      >
        <div className={`sselect-display ${!valLabel ? "placeholder" : ""}`}>
          {valLabel || placeholder}
          <span className="arrow" />
        </div>

        {open && (
          <div className="sselect-pop" style={{ width }}>
            <div className="sselect-search">
              <input
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder=""
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <div className="sselect-list">
              {filtered.map((o, idx) => (
                <div
                  key={(isModule ? o.key : o.value) || idx}
                  className={`sselect-opt ${(!isModule && o.value === value) || (isModule && o.key === value) ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectOption(o);
                  }}
                >
                  {o.label}
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="sselect-empty">No results</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =================================== Page =================================== */
export default function NotificationSettingsPage() {
  const [moduleKey, setModuleKey] = useState("");
  const [senderFilter, setSenderFilter] = useState("");
  const [receiverFilter, setReceiverFilter] = useState("");
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const moduleMatches = useMemo(() => {
    const found = MODULE_OPTIONS.find((m) => m.key === moduleKey);
    return found?.matches ?? [];
  }, [moduleKey]);

  const rows = useMemo(() => {
    return ROWS.filter((r) => {
      const byModule = moduleMatches.length === 0 ? true : moduleMatches.includes(r.module);
      const bySender = !senderFilter || r.sender === senderFilter;
      const byReceiver = !receiverFilter || r.receiver.includes(receiverFilter);
      const byQuery = !q || r.event.toLowerCase().includes(q.toLowerCase());
      return byModule && bySender && byReceiver && byQuery;
    });
  }, [moduleMatches, senderFilter, receiverFilter, q]);

  const toggle = (id, key) => {
    const idx = ROWS.findIndex((r) => r.id === id);
    if (idx >= 0) ROWS[idx][key] = !ROWS[idx][key];
  };

  return (
    <div className="ns-wrap">
      <div className="ns-bc">
        <div className="ns-left">
          <span className="material-icons ns-home">home</span>
          <span className="ns-title">Whatsapp/SMS/Email Notifications</span>
        </div>
      </div>

      <div className="ns-card">
        {/* top right bar (unchanged) */}
        <div className="ns-topbar">
          <button
            className={`ns-btn ns-btn--filter ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
            type="button"
          >
            <span className="material-icons">filter_list</span>
            Filter
          </button>

          <div className="ns-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search List..."
            />
          </div>

          <button className="ns-btn ns-btn--primary" type="button">
            Configure Template
          </button>
        </div>

        {/* collapsible filters row with SEARCHABLE selects */}
        {showFilters && (
          <div className="ns-filters">
            <SearchSelect
              label="Module"
              placeholder="Select Module"
              value={moduleKey}
              onChange={setModuleKey}
              options={MODULE_OPTIONS}
              width={240}
            />
            <SearchSelect
              label="Sender"
              placeholder="Select Sender"
              value={senderFilter}
              onChange={setSenderFilter}
              options={SENDER_OPTIONS}
              width={240}
            />
            <SearchSelect
              label="Receiver"
              placeholder="Select Receiver"
              value={receiverFilter}
              onChange={setReceiverFilter}
              options={RECEIVER_OPTIONS}
              width={260}
            />
          </div>
        )}

        {/* table */}
        <div className="ns-table-wrap">
          <table className="ns-table">
            <thead>
              <tr>
                <th className="c-sr">Sr. No.</th>
                <th className="c-event">Notification Events</th>
                <th className="c-module">Module</th>
                <th className="c-sender">Sender</th>
                <th className="c-receiver">Receiver</th>
                <th className="c-chan">Whatsapp</th>
                <th className="c-chan">SMS</th>
                <th className="c-chan">Email</th>
                <th className="c-actions">Actions</th>
              </tr>
            </thead>

            {rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={9} className="ns-empty">Result not found.</td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="c-sr">{r.id}</td>
                    <td className="c-event">{r.event}</td>
                    <td className="c-module">{r.module}</td>
                    <td className="c-sender">{r.sender}</td>
                    <td className="c-receiver">
                      {r.receiver.map((rv, k) => {
                        const p = PILL[rv] || { text: rv, tone: "blue" };
                        return (
                          <span key={k} className={`pill pill--${p.tone}`}>
                            {p.text}
                          </span>
                        );
                      })}
                    </td>
                    <td className="c-chan">
                      <label className="chk">
                        <input type="checkbox" defaultChecked={r.w} onChange={() => toggle(r.id, "w")} />
                        <span className="box" />
                      </label>
                    </td>
                    <td className="c-chan">
                      <label className="chk">
                        <input type="checkbox" defaultChecked={r.s} onChange={() => toggle(r.id, "s")} />
                        <span className="box" />
                      </label>
                    </td>
                    <td className="c-chan">
                      <label className="chk">
                        <input type="checkbox" defaultChecked={r.e} onChange={() => toggle(r.id, "e")} />
                        <span className="box" />
                      </label>
                    </td>
                    <td className="c-actions">
                      <div className="act">
                        <button className="ico" title="Info"><span className="material-icons">info</span></button>
                        <button className="ico" title="Message"><span className="material-icons">sms</span></button>
                        <button className="ico" title="Email"><span className="material-icons">email</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

      </div>
    </div>
  );
}
