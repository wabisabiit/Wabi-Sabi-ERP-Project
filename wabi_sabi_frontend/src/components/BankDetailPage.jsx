// src/components/BankDetailPage.jsx
import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import "../styles/BankDetailPage.css";

/** Fallback demo (agar list se state na aaye to) */
const DEMO = {
  bankName: "AXIS BANK",
  branchName: "UDYOG VIHAR",
  accountHolder: "WABI SABI SUSTAINABILITY LLP",
  accountNo: "924020051622894",
  ifsc: "UTIB0001527",
  swift: "",
  creditBalance: "0.0",
  debitBalance: "0.0",
  accountGroup: "Bank Account",
  address1: "",
  address2: "",
  country: "India",
  state: "Haryana",
  city: "Gurugram",
  zip: "",
  isUpi: "Yes",
  createdOn: "20/06/2025 11:18:09 AM",
};

/** Demo branches list (exact labels from your screenshot) */
const BRANCHES = [
  "WABI SABI SUSTAINABILITY LLP",
  "Brands 4 less – Rajouri Garden Inside",
  "Brands 4 less – Krishna Nagar",
  "Brands 4 less – IFFCO Chowk",
  "Brands Loot – Udyog Vihar",
  "Brands 4 less – Rajouri Garden Outside",
  "Brand4Less- Tilak Nagar",
  "Brands 4 less – M3M Urbana",
  "Brands 4 less – Ansal Plaza",
];

export default function BankDetailPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // record = state se aaya hai to use, warna DEMO
  const r = { ...DEMO, ...(location.state || {}) };

  const goBackToList = () => navigate("/bank");

  const onEdit = () => {
    const safeSlug =
      slug || r.bankName?.toLowerCase().replace(/\s+/g, "-") || "axis-bank";
    navigate(`/bank/${encodeURIComponent(safeSlug)}/edit`, { state: r });
  };

  return (
    <div className="bd-wrap">
      {/* Breadcrumb / title */}
      <div className="bd-header">
        <div className="bd-crumb">
          <span
            className="material-icons bd-home"
            title="Back to Bank List"
            onClick={goBackToList}
          >
            home
          </span>
          <span className="bd-sep">/</span>
          <button className="bd-back" onClick={goBackToList}>Bank</button>
          <span className="bd-sep">/</span>
          <span className="bd-name">{r.bankName} Bank</span>
        </div>
      </div>

      {/* Card */}
      <div className="bd-card">
        {/* top-right edit button */}
        <button
          type="button"
          className="bd-edit"
          title="Edit"
          aria-label="Edit"
          onClick={onEdit}
        >
          <span className="material-icons">edit</span>
        </button>

        <div className="bd-card-head">
          <span className="material-icons bd-gear">settings</span>
          <span>Bank Details</span>
        </div>

        <div className="bd-grid">
          {/* Left column */}
          <div className="bd-col">
            <Row label="Bank Name" value={r.bankName} />
            <Row label="Branch Name" value={r.branchName} />
            <Row label="Account Holder Name" value={r.accountHolder} />
            <Row label="Account No." value={r.accountNo} />
            <Row label="IFSC Code" value={r.ifsc} />
            <Row label="Swift Code" value={r.swift || "-"} />
            <Row label="Credit Balance" value={r.creditBalance} />
            <Row label="Debit Balance" value={r.debitBalance} />
            <Row label="Account Group" value={r.accountGroup} />
          </div>

          {/* Right column */}
          <div className="bd-col">
            <Row label="Address Line 1" value={r.address1 || ""} />
            <Row label="Address Line 2" value={r.address2 || ""} />
            <Row label="Country" value={r.country} />
            <Row label="State" value={r.state} />
            <Row label="City" value={r.city} />
            <Row label="ZIP/Postal Code" value={r.zip || ""} />
            <Row label="Is Upi Available?" value={r.isUpi} />
            <Row label="Created On" value={r.createdOn} />
          </div>

          {/* ------ New: Assignee Branches (left side, under the table) ------ */}
          <div className="bd-col bd-col-branches">
            <div className="bd-branches-head">
              Assignee Branches <span className="bd-req">*</span>
            </div>
            <div className="bd-branches-list">
              {BRANCHES.map((name) => (
                <label key={name} className="bd-branch">
                  <span className="bd-square" aria-hidden />
                  <input type="checkbox" disabled />
                  <span className="bd-branch-text" title={name}>{name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Right filler so vertical divider continues (empty like screenshot) */}
          <div className="bd-col bd-col-empty" aria-hidden />
        </div>
      </div>
    </div>
  );
}

/* small row renderer */
function Row({ label, value }) {
  return (
    <div className="bd-row">
      <div className="bd-label">{label}</div>
      <div className="bd-value">{value}</div>
    </div>
  );
}
