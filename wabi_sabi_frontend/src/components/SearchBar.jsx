// src/components/SearchBar.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import "../styles/SearchBar.css";
import {
  getProductByBarcode,
  getSaleLinesByInvoice,
  searchCustomers,
  createCustomer,
  getSelectedCustomer,
  setSelectedCustomer,
} from "../api/client";

const ADDED_BARCODES = new Set();
const INFLIGHT = new Set();

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

function normalizeCustomer(raw) {
  const c = raw || {};
  const nested = c.customer || {};
  const name =
    (c.name ?? c.full_name ?? c.customer_name ?? nested.name ?? "").toString().trim();
  const phone =
    (c.phone ?? c.mobile ?? c.phone_number ?? nested.phone ?? "").toString().trim();

  return {
    ...c,
    id: c.id ?? nested.id,
    name,
    phone,
    // keep any extra fields (address/verified) if present
  };
}

export default function SearchBar({ onAddItem }) {
  const [scan, setScan] = useState("");
  const [query, setQuery] = useState("");
  const [openDrop, setOpenDrop] = useState(false);
  const [matches, setMatches] = useState([]);
  const [isSearching, setIsSearching] = useState(false); // customer search
  const [showModal, setShowModal] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [invoice, setInvoice] = useState("");
  const [customer, setCustomer] = useState(() => getSelectedCustomer());

  // ✅ NEW: loading spinners
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);

  const wrapRef = useRef(null);
  const scanInputRef = useRef(null);

  const scanLockRef = useRef(0);
  const markScanHandled = () => { scanLockRef.current = Date.now(); };
  const recentlyHandled = (ms = 200) => Date.now() - scanLockRef.current < ms;

  useEffect(() => { scanInputRef.current?.focus(); }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenDrop(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ✅ FIXED: Live search supports name OR phone and always shows name
  useEffect(() => {
    let alive = true;
    const timeoutId = setTimeout(async () => {
      const q = query.trim();

      if (!q) {
        setMatches([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const res = await searchCustomers(q);
        if (!alive) return;

        const arr = Array.isArray(res)
          ? res
          : res?.results || res?.data || res?.items || [];

        // Normalize fields so UI always has {name, phone}
        const normalized = arr.map(normalizeCustomer);

        // Extra safety: client-side filter by name OR phone
        const ql = q.toLowerCase();
        const filtered = normalized.filter((c) => {
          const nm = (c.name || "").toLowerCase();
          const ph = (c.phone || "");
          return nm.includes(ql) || ph.includes(q);
        });

        setMatches(filtered);
        setIsSearching(false);
      } catch (e) {
        console.error("❌ Customer search error:", e);
        if (!alive) return;

        const ql = q.toLowerCase();
        const mockResults = MOCK_CUSTOMERS
          .map(normalizeCustomer)
          .filter((c) => (c.name || "").toLowerCase().includes(ql) || (c.phone || "").includes(q));

        setMatches(mockResults);
        setIsSearching(false);
      }
    }, 150);

    return () => {
      alive = false;
      clearTimeout(timeoutId);
    };
  }, [query]);

  // ✅ BARCODE: show spinner until product is added / error
  const addByBarcode = useCallback(async (raw) => {
    const code = String(raw || "").trim();
    if (!code) return;

    if (ADDED_BARCODES.has(code) || INFLIGHT.has(code)) {
      alert(`Already in cart: ${code}`);
      setScan("");
      return;
    }

    setIsBarcodeLoading(true);
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
      ADDED_BARCODES.add(code);
      setScan("");
    } catch (err) {
      console.error(err);
      alert(`Not found: ${code}`);
    } finally {
      INFLIGHT.delete(code);
      setIsBarcodeLoading(false);
    }
  }, [onAddItem]);

  const handleScanSubmit = useCallback(async () => {
    if (recentlyHandled()) return;
    const code = scan.trim();
    if (!code) return;
    addByBarcode(code);
  }, [scan, addByBarcode]);

  // Global scanner listener
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

      if (gap > charTimeoutMs) buf = "";

      if (e.key === suffixKey) {
        const code = buf.trim();
        buf = "";
        if (code.length >= minLength) {
          e.preventDefault?.();
          markScanHandled();
          addByBarcode(code);
        }
        return;
      }

      if (e.key.length !== 1) return;
      buf += e.key;
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [addByBarcode]);

  // ✅ INVOICE: show spinner while loading & pushing all items
  async function loadInvoice(inv) {
    const trimmed = inv.trim();
    if (!trimmed) return;

    setIsInvoiceLoading(true);
    try {
      const res = await getSaleLinesByInvoice(trimmed);
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
    } finally {
      setIsInvoiceLoading(false);
    }
  }

  const pickCustomer = (raw) => {
    const c = normalizeCustomer(raw);
    console.log("✅ Selected customer:", c);
    setCustomer(c);
    setSelectedCustomer(c); // ✅ do not change existing customer-details logic
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
        {/* ✅ Barcode with spinner */}
        <div className="scan-wrap">
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
              if (recentlyHandled()) return;
              if (e.target.value.trim()) handleScanSubmit();
            }}
            disabled={isBarcodeLoading}
          />
          {isBarcodeLoading && <span className="sb-spinner" aria-hidden="true" />}
        </div>

        {/* Customer dropdown */}
        <div className="customer-input" ref={wrapRef} style={{ position: "relative" }}>
          <input
            type="text"
            placeholder={
              customer?.id
                ? `${customer.name} (${customer.phone})`
                : "Walk in Customer"
            }
            value={query}
            onFocus={() => setOpenDrop(true)}
            onChange={(e) => {
              const newQuery = e.target.value;
              setQuery(newQuery);
              if (newQuery.trim()) setOpenDrop(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpenDrop(false);
            }}
          />
          <button
            className="edit-btn"
            type="button"
            aria-label="Edit"
            onClick={() => setOpenDrop((v) => !v)}
          >
            <span className="material-icons">edit</span>
          </button>

          {openDrop && (
            <div
              className="dropdown"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "white",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                zIndex: 9999,
                maxHeight: "400px",
                overflowY: "auto",
                marginTop: "4px",
              }}
            >
              {query.trim().length < 1 ? (
                <div className="dropdown-note" style={{ padding: "12px", color: "#666" }}>
                  Please enter 1 or more characters
                </div>
              ) : isSearching ? (
                <div className="dropdown-note" style={{ padding: "12px", color: "#666" }}>
                  Searching...
                </div>
              ) : (
                <>
                  <div
                    className="add-contact"
                    onClick={() => openAddContact(query.trim())}
                    role="button"
                    tabIndex={0}
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid #eee",
                      cursor: "pointer",
                      backgroundColor: "#f8f9fa",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e9ecef")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f8f9fa")}
                  >
                    <div style={{ fontWeight: 500, marginBottom: "4px" }}>
                      ➕ Add New Contact: "{query.trim()}"
                    </div>
                    <div className="muted" style={{ fontSize: "12px", color: "#888" }}>
                      Click to create new customer
                    </div>
                  </div>

                  {matches.length > 0 ? (
                    matches.map((raw) => {
                      const c = normalizeCustomer(raw);
                      const displayName = c.name || "(No Name)";
                      const displayPhone = c.phone || "";
                      return (
                        <div
                          key={c.id || `${displayName}-${displayPhone}`}
                          className="customer-item"
                          onClick={() => pickCustomer(c)}
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #eee",
                            cursor: "pointer",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f8ff")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
                        >
                          <div className="cust-line" style={{ marginBottom: "4px" }}>
                            <span className="cust-name" style={{ fontWeight: 500 }}>
                              {displayName}
                            </span>
                            &nbsp;
                            <span className="cust-phone" style={{ color: "#666" }}>
                              {displayPhone}
                            </span>
                          </div>
                          <div className="cust-sub" style={{ fontSize: "12px", color: "#888" }}>
                            <span>Address: {c.address || "Not provided"}</span>
                            {c.verified === false && (
                              <span
                                className="unverified"
                                style={{
                                  marginLeft: "8px",
                                  color: "#dc3545",
                                  fontSize: "11px",
                                }}
                              >
                                ⚠️ Un-verified
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      className="no-results"
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        color: "#999",
                      }}
                    >
                      🔍 No matching customers found
                      <div style={{ fontSize: "12px", marginTop: "4px" }}>
                        Click "Add New Contact" above to create one
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ✅ Invoice with spinner */}
        <div className="invoice-wrap">
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
            disabled={isInvoiceLoading}
          />
          {isInvoiceLoading && <span className="sb-spinner" aria-hidden="true" />}
        </div>
      </div>

      <NewCustomerModal
        open={showModal}
        onClose={() => setShowModal(false)}
        prefillName={prefillName}
        onSaved={(cust) => pickCustomer(cust)}
      />
    </div>
  );
}
