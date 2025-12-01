// src/components/ContactForm.jsx
import React, { useEffect, useState } from "react";
import "../styles/ContactForm.css";
import { createSupplier } from "../api/client";

/**
 * Full-page Contact form.
 *
 * Props:
 *  - type: "customer" | "vendor"
 *  - open: boolean
 *  - onClose: () => void
 */
export default function ContactForm({ type = "customer", open = false, onClose }) {
  // Lock the page scroll while the form is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [toast, setToast] = useState({
    show: false,
    type: "success", // "success" | "error"
    msg: "",
  });

  useEffect(() => {
    if (!open) {
      // reset when closed
      setCompanyName("");
      setGstin("");
      setContactPhone("");
      setContactEmail("");
      setError("");
      setSaving(false);
      setToast({ show: false, type: "success", msg: "" });
    }
  }, [open]);

  const showToast = (type, msg) => {
    setToast({ show: true, type, msg });
    setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 3000);
  };

  if (!open) return null;

  async function handleSave(mode) {
    // only implement backend save for Supplier/Vendor for now
    if (type !== "vendor") {
      onClose?.();
      return;
    }

    setError("");

    if (!companyName.trim() || !gstin.trim()) {
      const msg = "Company Name and GSTIN are required.";
      setError(msg);
      showToast("error", msg);
      return;
    }

    const payload = {
      company_name: companyName.trim(),
      gstin: gstin.trim(),
      phone: contactPhone.trim(),
      email: contactEmail.trim(),
    };

    try {
      setSaving(true);
      await createSupplier(payload);

      // notify ContactPage to reload vendor table
      try {
        window.dispatchEvent(new CustomEvent("supplier:created"));
      } catch {}

      showToast("success", "Supplier/Vendor added successfully.");

      if (mode === "new") {
        setCompanyName("");
        setGstin("");
        setContactPhone("");
        setContactEmail("");
      } else {
        setTimeout(() => {
          onClose?.();
        }, 350);
      }
    } catch (e) {
      const msg = e?.message || "Failed to save supplier.";
      setError(msg);
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  }

  const onClear = () => {
    setCompanyName("");
    setGstin("");
    setContactPhone("");
    setContactEmail("");
    setError("");
  };

  return (
    <div className="cc-veil" role="dialog" aria-modal="true">
      <div className="cc-canvas">
        <div className="cc-stage">
          {/* Toast popup */}
          {toast.show && (
            <div
              className={`cc-toast ${
                toast.type === "success" ? "cc-toast-success" : "cc-toast-error"
              }`}
            >
              {toast.msg}
            </div>
          )}

          {/* Header */}
          <div className="cc-header">
            <button className="cc-back" onClick={onClose}>
              <span className="material-icons">arrow_back</span>
              <span>Back</span>
            </button>
            <div className="cc-title">
              {type === "customer" ? "Create Customer" : "Create Supplier/Vendor"}
            </div>
          </div>

          {/* Tabs + Right Buttons (top row) */}
          <div className="cc-top-tabs">
            <div>
              <label className={`cc-top-tab ${type === "customer" ? "on" : ""}`}>
                Customer
              </label>
              <label className={`cc-top-tab ${type === "vendor" ? "on" : ""}`}>
                Supplier/Vendor
              </label>
            </div>
          </div>

          {/* Body (scrolls vertically) */}
          <div className="cc-body">
            {/* error message */}
            {error && <div className="cc-error">{error}</div>}

            {/* ------- General Details ------- */}
            <div className="cc-card">
              <div className="cc-section-title">General Details</div>

              <div className="cc-grid">
                {/* Name */}
                <div className="cc-field two">
                  <label>Name</label>
                  <div className="cc-two">
                    <input placeholder="First Name" />
                    <input placeholder="Last Name" />
                  </div>
                </div>

                {/* Company + Code */}
                <div className="cc-field">
                  <label>
                    Company Name<span className="req">*</span>
                  </label>
                  <input
                    placeholder="Company Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="cc-field">
                  <label>Code</label>
                  <input placeholder="Code" />
                </div>

                {/* Email + Mobile + PAN + Telephone */}
                <div className="cc-field">
                  <label>Email</label>
                  <input placeholder="Email" />
                </div>
                <div className="cc-field">
                  <label>Mobile No.</label>
                  <div className="cc-phone">
                    <span className="cc-cc">+91</span>
                    <input placeholder="Mobile No." />
                  </div>
                </div>
                <div className="cc-field">
                  <label>PAN No.</label>
                  <input placeholder="PAN No." />
                </div>
                <div className="cc-field">
                  <label>Telephone No.</label>
                  <input placeholder="Telephone No." />
                </div>

                {/* Remarks + Payment Mode + Terms + Opening Balance */}
                <div className="cc-field">
                  <label>Remarks</label>
                  <input placeholder="Remarks" />
                </div>
                <div className="cc-field">
                  <label>Payment Mode</label>
                  <select>
                    <option>Select Payment Mode</option>
                  </select>
                </div>
                <div className="cc-field">
                  <label>Payment Terms</label>
                  <select>
                    <option>Select Payment Term</option>
                  </select>
                </div>
                <div className="cc-field">
                  <label>Opening Balance</label>
                  <div className="cc-open">
                    <input placeholder="Amount" />
                    <div className="cc-crdr">
                      <button className="on" type="button">
                        Debit Amount
                      </button>
                      <button type="button">Credit Amount</button>
                    </div>
                  </div>
                </div>

                {/* TAN + WhatsApp + DOB + Anniversary */}
                <div className="cc-field">
                  <label>TAN No.</label>
                  <input placeholder="TAN No." />
                </div>
                <div className="cc-field">
                  <label>WhatsApp No.</label>
                  <div className="cc-phone">
                    <span className="cc-cc">+91</span>
                    <input placeholder="WhatsApp No." />
                  </div>
                </div>
                <div className="cc-field">
                  <label>Date of Birth</label>
                  <input type="date" />
                </div>
                <div className="cc-field">
                  <label>Anniversary Date</label>
                  <input type="date" />
                </div>

                {/* Type radios */}
                <div className="cc-field">
                  <label>
                    Type<span className="req">*</span>
                  </label>
                  <div className="cc-radio-row">
                    <label>
                      <input type="radio" name="ctype" defaultChecked /> Manufacturer
                    </label>
                    <label>
                      <input type="radio" name="ctype" /> Stockiest
                    </label>
                    <label>
                      <input type="radio" name="ctype" /> Trader
                    </label>
                    <label>
                      <input type="radio" name="ctype" /> Other
                    </label>
                  </div>
                </div>

                {/* Bank */}
                <div className="cc-field">
                  <label>Bank IFSC Code</label>
                  <input placeholder="IFSC Code" />
                </div>
                <div className="cc-field">
                  <label>Bank Name</label>
                  <input placeholder="Bank Name" />
                </div>
                <div className="cc-field">
                  <label>Branch Name</label>
                  <input placeholder="Branch Name" />
                </div>
                <div className="cc-field">
                  <label>Account No.</label>
                  <input placeholder="Account No." />
                </div>
              </div>
            </div>

            {/* ------- Address Details ------- */}
            <div className="cc-card">
              <div className="cc-section-title">Address Details</div>

              <div className="cc-grid">
                <div className="cc-field">
                  <label>GST Type</label>
                  <select>
                    <option>UnRegistered</option>
                  </select>
                </div>

                <div className="cc-field">
                  <label>
                    GSTIN<span className="req">*</span>
                  </label>
                  <input
                    placeholder="GSTIN"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                  />
                </div>

                <div className="cc-field">
                  <label>
                    Contact First Name<span className="req">*</span>
                  </label>
                  <input placeholder="Contact First Name" />
                </div>

                <div className="cc-field">
                  <label>Contact Last Name</label>
                  <input placeholder="Contact Last Name" />
                </div>

                <div className="cc-field">
                  <label>Contact Company Name</label>
                  <input placeholder="Contact Company Name" />
                </div>

                <div className="cc-field">
                  <label>Contact No.</label>
                  <div className="cc-phone">
                    <span className="cc-cc">+91</span>
                    <input
                      placeholder="Contact Number"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="cc-field">
                  <label>Contact Email</label>
                  <input
                    placeholder="Contact Email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <div className="cc-field two">
                  <label>Address Line 1</label>
                  <input placeholder="Address Line 1" />
                </div>

                <div className="cc-field two">
                  <label>Address Line 2</label>
                  <input placeholder="Address Line 2" />
                </div>

                <div className="cc-field">
                  <label>
                    Select State<span className="req">*</span>
                  </label>
                  <select>
                    <option>Haryana</option>
                  </select>
                </div>

                <div className="cc-field">
                  <label>
                    Select City<span className="req">*</span>
                  </label>
                  <select>
                    <option>Gurugram</option>
                  </select>
                </div>

                <div className="cc-field">
                  <label>Pincode</label>
                  <input placeholder="ZIP/Postal code" />
                </div>

                <div className="cc-field">
                  <label>
                    Select Country<span className="req">*</span>
                  </label>
                  <select>
                    <option>India</option>
                  </select>
                </div>

                <div className="cc-field">
                  <button className="cc-addmore" type="button">
                    <span className="material-icons">add</span> Add More Address
                  </button>
                </div>
              </div>
            </div>

            {/* ------- Bottom buttons ------- */}
            <div className="cc-bottombar">
              <div className="cc-bottom-left">
                <button
                  className="cc-btn grey"
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                >
                  <span className="material-icons">cancel</span>
                  Cancel
                </button>
                <button
                  className="cc-btn yellow"
                  type="button"
                  onClick={onClear}
                  disabled={saving}
                >
                  Clear
                </button>
              </div>

              <div className="cc-bottom-right">
                <button
                  className="cc-btn green"
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave("close")}
                >
                  {saving ? (
                    <span className="cc-btn-spinner" />
                  ) : (
                    "Save & Print/Preview"
                  )}
                </button>
                <button
                  className="cc-btn blue"
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave("close")}
                >
                  {saving ? <span className="cc-btn-spinner" /> : "Save"}
                </button>
                <button
                  className="cc-btn blue"
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave("new")}
                >
                  {saving ? (
                    <span className="cc-btn-spinner" />
                  ) : (
                    "Save & Create New"
                  )}
                </button>
                <button
                  className="cc-btn blue"
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave("close")}
                >
                  {saving ? (
                    <span className="cc-btn-spinner" />
                  ) : (
                    "Save & Create Invoice"
                  )}
                </button>
              </div>
            </div>
          </div>
          {/* /cc-body */}
        </div>
        {/* /cc-stage */}
      </div>
    </div>
  );
}
