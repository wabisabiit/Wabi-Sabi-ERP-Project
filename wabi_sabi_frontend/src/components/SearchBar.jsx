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
  // NOTE: we no longer force-clearing on mount
  // clearSelectedCustomer,
} from "../api/client";

// Track barcodes already added to cart (session-scoped here)
const ADDED_BARCODES = new Set();
// Track scans currently being processed to prevent race duplicates
const INFLIGHT = new Set();

// (fallback only if API fails)
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
        <div className="modal-header">
          <h3 className="modal-title">New Customer</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-grid grid-3">
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

          <div className="form-row">
            <div className="label-row"><label>GSTIN</label></div>
            <input className="field" placeholder="GSTIN" />
          </div>

          <div className="form-row empty"></div>
          <div className="form-row empty"></div>
        </div>

        <div className="modal-footer center">
          <button className="primary-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function SearchBar({ onAddItem }) {
  const [scan, setScan] = useState("");
  const [query, setQuery] = useState("");
  const [openDrop, setOpenDrop] = useState(false);
  const [matches, setMatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [invoice, setInvoice] = useState("");
  const [customer, setCustomer] = useState(() => getSelectedCustomer()); // POS session
  const wrapRef = useRef(null);
  const scanInputRef = useRef(null);

  // tiny guard to suppress input handlers right after a global scan fires
  const scanLockRef = useRef(0);
  const markScanHandled = () => { scanLockRef.current = Date.now(); };
  const recentlyHandled = (ms = 200) => Date.now() - scanLockRef.current < ms;

  // Autofocus the scan box so it's ready for the scanner
  useEffect(() => { scanInputRef.current?.focus(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenDrop(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Live search
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

  // ==== Add-to-cart from a barcode (with pre-flight de-dupe + inflight) ====
  const addByBarcode = useCallback(async (raw) => {
    const code = String(raw || "").trim();
    if (!code) return;

    // Already added or currently being processed?
    if (ADDED_BARCODES.has(code) || INFLIGHT.has(code)) {
      alert(`Already in cart: ${code}`);
      setScan("");
      return;
    }

    INFLIGHT.add(code);
    try {
      const p = await getProductByBarcode(code);
      const qty = Number(p?.qty ?? 0);
      if (!p || qty <= 0 || p?.available === false) {
        alert("Product not available / already sold.");
        setScan("");
        return;
      }

      onAddItem?.(p);
      ADDED_BARCODES.add(code); // remember it so it won't be added twice later
      setScan("");
    } catch (err) {
      console.error(err);
      alert(`Not found: ${code}`);
    } finally {
      INFLIGHT.delete(code);
    }
  }, [onAddItem]);

  // Manual entry handler
  const handleScanSubmit = useCallback(async () => {
    if (recentlyHandled()) return; // global scan just handled it
    const code = scan.trim();
    if (!code) return;
    addByBarcode(code);
  }, [scan, addByBarcode]);

  // ==== USB scanner as keyboard (global listener) ====
  useEffect(() => {
    const suffixKey = "Enter";
    const minLength = 5;
    const charTimeoutMs = 45;

    let buf = "";
    let lastTs = 0;

    const onKeyDown = (e) => {
      const now = performance.now();
      const gap = now - (lastTs || 0);
      lastTs = now;

      // If gap is large, treat as a new stream
      if (gap > charTimeoutMs) buf = "";

      if (e.key === suffixKey) {
        const code = buf.trim();
        buf = "";
        if (code.length >= minLength) {
          e.preventDefault?.();
          markScanHandled();       // suppress input-level submit/blur echo
          addByBarcode(code);
        }
        return;
      }

      // ignore control keys (Shift, Alt, etc.)
      if (e.key.length !== 1) return;

      buf += e.key;
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [addByBarcode]);

  // Invoice load (return mode) — de-dupe each line by barcode as well
  async function loadInvoice(inv) {
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
        const bc = String(ln.barcode || "").trim();
        if (!bc || ADDED_BARCODES.has(bc) || INFLIGHT.has(bc)) return;
        INFLIGHT.add(bc);
        onAddItem?.({
          id: ln.barcode,
          barcode: ln.barcode,
          qty: ln.qty,
          mrp: Number(ln.mrp || 0),
          sellingPrice: Number(ln.sp || 0),
          vasyName: ln.name || ln.barcode,
          netAmount: Number(ln.sp || 0),
        });
        ADDED_BARCODES.add(bc);
        INFLIGHT.delete(bc);
      });
    } catch (e) {
      console.error(e);
      alert("Invoice not found.");
    }
  }

  // Select customer from dropdown → persists & notifies Footer
  const pickCustomer = (c) => {
    setCustomer(c);
    setSelectedCustomer(c);
    setQuery("");
    setOpenDrop(false);
  };

  const openAddContact = (name = "") => {
    setPrefillName(name);
    setShowModal(true);
    setOpenDrop(false);
  };

  return (
    <div className="search-row">
      <div className="container search-bar">
        {/* LEFT: scan barcode / product name */}
        <input
          ref={scanInputRef}
          className="scan"
          type="text"
          placeholder="Scan Barcode/Enter Product Name"
          value={scan}
          onChange={(e) => setScan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleScanSubmit();
          }}
          onBlur={(e) => {
            if (recentlyHandled()) return; // avoid double after global scan causes blur
            if (e.target.value.trim()) handleScanSubmit();
          }}
        />

        {/* Walk in Customer */}
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

      {/* Modal */}
      <NewCustomerModal
        open={showModal}
        onClose={() => setShowModal(false)}
        prefillName={prefillName}
        onSaved={(cust) => pickCustomer(cust)}
      />
    </div>
  );
}
