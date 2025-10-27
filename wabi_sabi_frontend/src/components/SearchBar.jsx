import React, { useEffect, useRef, useState, useCallback } from "react";
import "../styles/SearchBar.css";
import { getProductByBarcode, getSaleLinesByInvoice } from "../api/client";

const MOCK_CUSTOMERS = [
  { id: 1, name: "ishika", phone: "9131054736", address: "", verified: false },
  { id: 2, name: "IShika", phone: "7417449691", address: "", verified: false },
  { id: 3, name: "Rohan",  phone: "9876543210", address: "DLF Phase 3", verified: true },
];

function NewCustomerModal({ open, onClose, prefillName = "" }) {
  useEffect(() => {
    if (open) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  if (!open) return null;
  const stop = (e) => e.stopPropagation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={stop} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">New Customer</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body: EXACT 3 columns */}
        <div className="modal-grid grid-3">
          {/* Row 1 */}
          <div className="form-row">
            <div className="label-row">
              <label>Name <span className="req">*</span></label>
            </div>
            <input className="field" defaultValue={prefillName} placeholder="Name" />
          </div>

          <div className="form-row">
            <div className="label-row between">
              <label>Mobile No. <span className="req">*</span></label>
              <button className="link-btn" type="button">Verify</button>
            </div>
            <div className="phone-field">
              <span className="country">+91</span>
              <input className="field" placeholder="Mobile No." />
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
          <button className="primary-btn" onClick={onClose}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function SearchBar({ onAddItem }) {
  const [scan, setScan] = useState("");          // <-- barcode input (left box)
  const [query, setQuery] = useState("");        // walk-in customer box
  const [openDrop, setOpenDrop] = useState(false);
  const [matches, setMatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [invoice, setInvoice] = useState("");    // NEW: scan sales invoice box
  const wrapRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenDrop(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (query.trim().length >= 1) {
      const q = query.toLowerCase();
      const result = MOCK_CUSTOMERS.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(query.trim())
      );
      setMatches(result);
    } else {
      setMatches([]);
    }
  }, [query]);

  const openAddContact = (name = "") => {
    setPrefillName(name);
    setShowModal(true);
    setOpenDrop(false);
  };

  const handleScanSubmit = useCallback(async () => {
    const code = scan.trim();
    if (!code) return;

    try {
      const p = await getProductByBarcode(code);

      // ⛔ NEW: don't add if already sold/out-of-stock
      const qty = Number(p?.qty ?? 0);
      if (!p || qty <= 0 || p?.available === false) {
        alert("Product not available / already sold.");
        setScan("");
        // refresh after message
        setTimeout(() => window.location.reload(), 0);
        return;
      }

      // ✅ In stock → add to cart
      onAddItem?.(p);
      setScan("");
    } catch (err) {
      console.error(err);
      alert(`Not found: ${code}`);
    }
  }, [scan, onAddItem]);

  // Load previous invoice → return mode
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

        {/* Walk in Customer */}
        <div className="customer-input" ref={wrapRef}>
          <input
            type="text"
            placeholder="Walk in Customer"
            value={query}
            onFocus={() => setOpenDrop(true)}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="edit-btn" type="button" aria-label="Edit">
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
                      <div key={c.id} className="customer-item">
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
      />
    </div>
  );
}
