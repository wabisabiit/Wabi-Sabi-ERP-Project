// src/components/SearchBar.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import "../styles/SearchBar.css";
import {
  getProductByBarcode,
  getSaleLinesByInvoice,
  // customer APIs + POS session helpers
  searchCustomers,
  createCustomer,
  getSelectedCustomer,
  setSelectedCustomer,
  clearSelectedCustomer,
} from "../api/client";

// (kept for compatibility; only used as fallback if API fails)
const MOCK_CUSTOMERS = [
  { id: 1, name: "ishika", phone: "9131054736", address: "", verified: false },
  { id: 2, name: "IShika", phone: "7417449691", address: "", verified: false },
  { id: 3, name: "Rohan", phone: "9876543210", address: "DLF Phase 3", verified: true },
];

function NewCustomerModal({ open, onClose, prefillName = "", onSaved }) {
  const nameRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    if (open) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  // prefill name
  useEffect(() => {
    if (open && nameRef.current) nameRef.current.value = prefillName || "";
  }, [open, prefillName]);

  if (!open) return null;
  const stop = (e) => e.stopPropagation();

  const handleSave = async () => {
    const name = (nameRef.current?.value || "").trim();
    const phone = (phoneRef.current?.value || "").trim();

    if (!name) { alert("Name is required."); return; }
    if (!phone) { alert("Mobile number is required."); return; }

    try {
      const res = await createCustomer({ name, phone });
      const cust = res.customer || res;
      alert(res.ok ? (res.created ? "Customer created." : "Customer selected.") : "Saved.");
      onSaved?.(cust);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save customer.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={stop} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">New Customer</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body: EXACT 3 columns (fields unchanged visually) */}
        <div className="modal-grid grid-3">
          {/* Row 1 */}
          <div className="form-row">
            <div className="label-row">
              <label>Name <span className="req">*</span></label>
            </div>
            <input ref={nameRef} className="field" defaultValue={prefillName} placeholder="Name" />
          </div>

          <div className="form-row">
            <div className="label-row between">
              <label>Mobile No. <span className="req">*</span></label>
              <button className="link-btn" type="button">Verify</button>
            </div>
            <div className="phone-field">
              <span className="country">+91</span>
              <input ref={phoneRef} className="field" placeholder="Mobile No." />
            </div>
          </div>

          <div className="form-row">
            <div className="label-row"><label>WhatsApp No.</label></div>
            <div className="phone-field">
              <span className="country">+91</span>
              <input className="field" placeholder="WhatsApp No." />
            </div>
          </div>

          {/* Row 2 */}
          <div className="form-row">
            <div className="label-row"><label>Date Of Birth</label></div>
            <input className="field" type="text" placeholder="Date Of Birth" />
          </div>

          <div className="form-row">
            <div className="label-row"><label>Anniversary Date</label></div>
            <input className="field" type="text" placeholder="Anniversary Date" />
          </div>

          <div className="form-row">
            <div className="label-row"><label>Email</label></div>
            <input className="field" type="email" placeholder="Email Address" />
          </div>

          {/* Row 3 */}
          <div className="form-row">
            <div className="label-row"><label>Address Line 1</label></div>
            <input className="field" placeholder="AddressLine1" />
          </div>

          <div className="form-row">
            <div className="label-row"><label>Country</label></div>
            <select className="field" defaultValue="India">
              <option>India</option>
            </select>
          </div>

          <div className="form-row">
            <div className="label-row"><label>State</label></div>
            <select className="field" defaultValue="Haryana">
              <option>Haryana</option>
              <option>Delhi</option>
              <option>Uttar Pradesh</option>
            </select>
          </div>

          {/* Row 4 */}
          <div className="form-row">
            <div className="label-row"><label>City</label></div>
            <select className="field" defaultValue="Gurugram">
              <option>Gurugram</option>
              <option>New Delhi</option>
              <option>Noida</option>
            </select>
          </div>

          <div className="form-row">
            <div className="label-row"><label>Pin Code</label></div>
            <input className="field" placeholder="Pin Code" />
          </div>

          <div className="form-row">
            <div className="label-row"><label>GST Type</label></div>
            <select className="field" defaultValue="UnRegistered">
              <option>UnRegistered</option>
              <option>Registered</option>
            </select>
          </div>

          {/* Row 5 */}
          <div className="form-row">
            <div className="label-row"><label>GSTIN</label></div>
            <input className="field" placeholder="GSTIN" />
          </div>

          <div className="form-row empty"></div>
          <div className="form-row empty"></div>
        </div>

        {/* Footer */}
        <div className="modal-footer center">
          <button className="primary-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function SearchBar({ onAddItem }) {
  const [scan, setScan] = useState("");          // barcode input (left box)
  const [query, setQuery] = useState("");        // walk-in customer box
  const [openDrop, setOpenDrop] = useState(false);
  const [matches, setMatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [invoice, setInvoice] = useState("");    // scan sales invoice box
  const [customer, setCustomer] = useState(() => getSelectedCustomer()); // POS session
  const wrapRef = useRef(null);

  // ✅ Fresh session on every full page refresh
  useEffect(() => {
    clearSelectedCustomer();    // wipe any stale selection from localStorage
    setCustomer(null);          // reflect in UI so customer-first is enforced
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenDrop(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Live search from server (keeps your dropdown UI)
  useEffect(() => {
    let alive = true;
    const run = async () => {
      const q = query.trim();
      if (!q) { setMatches([]); return; }
      try {
        const res = await searchCustomers(q);
        if (!alive) return;
        setMatches(res?.results || []);
      } catch (e) {
        console.error(e);
        const ql = q.toLowerCase();
        setMatches(MOCK_CUSTOMERS.filter(
          (c) => c.name.toLowerCase().includes(ql) || c.phone.includes(q)
        ));
      }
    };
    run();
    return () => { alive = false; };
  }, [query]);

  const openAddContact = (name = "") => {
    setPrefillName(name);
    setShowModal(true);
    setOpenDrop(false);
  };

  // Enforce customer-first
  const ensureCustomer = () => {
    if (!customer?.id) {
      try { alert("Select the customer first"); } catch { }
      // Give the alert a tick to close, then hard refresh to start a clean session
      setTimeout(() => {
        window.location.reload();
      }, 0);
      return false;
    }
    return true;
  };

  const handleScanSubmit = useCallback(async () => {
    if (!ensureCustomer()) return;

    const code = scan.trim();
    if (!code) return;

    try {
      const p = await getProductByBarcode(code);

      const qty = Number(p?.qty ?? 0);
      if (!p || qty <= 0 || p?.available === false) {
        alert("Product not available / already sold.");
        setScan("");
        return;
      }

      onAddItem?.(p);
      setScan("");
    } catch (err) {
      console.error(err);
      alert(`Not found: ${code}`);
    }
  }, [scan, onAddItem, customer]);

  // Load previous invoice → return mode (also enforce customer-first)
  async function loadInvoice(inv) {
    if (!ensureCustomer()) return;
    try {
      const res = await getSaleLinesByInvoice(inv);
      const lines = Array.isArray(res?.lines) ? res.lines : [];
      if (!lines.length) {
        alert("No lines for this invoice.");
        return;
      }

      window.__RETURN_MODE__ = true;
      window.__RETURN_INVOICE__ = res.invoice_no;

      lines.forEach((ln) => {
        onAddItem?.({
          id: ln.barcode,
          barcode: ln.barcode,
          qty: ln.qty,
          mrp: Number(ln.mrp || 0),
          sellingPrice: Number(ln.sp || 0),
          vasyName: ln.name || ln.barcode,
          netAmount: Number(ln.sp || 0),
        });
      });
    } catch (e) {
      console.error(e);
      alert("Invoice not found.");
    }
  }

  // Select customer from dropdown
  const pickCustomer = (c) => {
    setCustomer(c);
    setSelectedCustomer(c); // persist until payment success
    setQuery("");           // keep your input clean
    setOpenDrop(false);
  };

  return (
    <div className="search-row">
      <div className="container search-bar">
        {/* LEFT: scan barcode / product name */}
        <input
          className="scan"
          type="text"
          placeholder="Scan Barcode/Enter Product Name"
          value={scan}
          onChange={(e) => setScan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleScanSubmit();
          }}
          onBlur={(e) => {
            if (e.target.value.trim()) handleScanSubmit();
          }}
        />

        {/* Walk in Customer (same structure; shows selected session customer as placeholder) */}
        <div className="customer-input" ref={wrapRef}>
          <input
            type="text"
            placeholder={customer?.id ? `${customer.name} (${customer.phone})` : "Walk in Customer"}
            value={query}
            onFocus={() => setOpenDrop(true)}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="edit-btn" type="button" aria-label="Edit" onClick={() => setOpenDrop(v => !v)}>
            <span className="material-icons">edit</span>
          </button>

          {openDrop && (
            <div className="dropdown">
              {query.trim().length < 1 ? (
                <div className="dropdown-note">Please enter 1 or more characters</div>
              ) : (
                <>
                  <div
                    className="add-contact"
                    onClick={() => openAddContact(query.trim())}
                    role="button"
                    tabIndex={0}
                  >
                    Add Contact
                    <div className="muted">Address :</div>
                  </div>

                  {matches.length > 0 ? (
                    matches.map((c) => (
                      <div key={c.id} className="customer-item" onClick={() => pickCustomer(c)}>
                        <div className="cust-line">
                          <span className="cust-name">{c.name}</span>&nbsp;
                          <span className="cust-phone">{c.phone}</span>
                        </div>
                        <div className="cust-sub">
                          <span>Address : {c.address || ""}</span>
                          {!c.verified && <span className="unverified">Un-verified</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">No matching customers</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Scan Sales Invoice */}
        <input
          className="invoice"
          type="text"
          placeholder="Scan Sales Invoice"
          value={invoice}
          onChange={(e) => setInvoice(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && invoice.trim()) loadInvoice(invoice.trim());
          }}
          onBlur={(e) => {
            if (e.target.value.trim()) loadInvoice(e.target.value.trim());
          }}
        />
      </div>

      {/* Modal (fields unchanged; Save wires to backend + selects customer) */}
      <NewCustomerModal
        open={showModal}
        onClose={() => setShowModal(false)}
        prefillName={prefillName}
        onSaved={(cust) => pickCustomer(cust)}
      />
    </div>
  );
}
