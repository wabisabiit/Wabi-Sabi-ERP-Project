import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";   // ← added
import "../styles/EditProfilePage.css";

export default function EditProfilePage() {
  const navigate = useNavigate();                 // ← added

  // ----- defaults (from screenshot) -----
  const FY_OPTIONS = useMemo(
    () => ["2023–2024", "2024–2025", "2025–2026", "2026–2027"],
    []
  );

  const [form, setForm] = useState({
    name: "IT Account",
    email: "",
    mobile: "7859456858",
    username: "IT",
    finYear: "2025–2026",
  });

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    // TODO: wire to API
    console.log("Saving profile:", form);
  };

  return (
    <div className="ep-wrap">
      {/* Breadcrumb / title row */}
      <div className="ep-top">
        <div className="ep-left">
          <h1 className="ep-title">Edit Profile | 41044</h1>
          <span className="ep-sep">-</span>
          <span className="ep-sub">Profile</span>
        </div>
        <div className="ep-home" title="Home">
          <span className="material-icons">home</span>
        </div>
      </div>

      {/* Card: Profile Details */}
      <form className="ep-card" onSubmit={onSubmit}>
        <div className="ep-sec-head">
          <span className="material-icons ep-gear">settings</span>
          <h3>Profile Details</h3>
        </div>

        <div className="ep-grid ep-grid-3">
          {/* Name */}
          <div className="ep-field">
            <label htmlFor="name">Name:</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Name"
            />
          </div>

          {/* Email (required marker) */}
          <div className="ep-field">
            <label htmlFor="email">
              Email:<span className="req">*</span>
            </label>
            <input
              id="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="Email"
              type="email"
            />
          </div>

          {/* Mobile (required marker) */}
          <div className="ep-field">
            <label htmlFor="mobile">
              Mobile No:<span className="req">*</span>
            </label>
            <input
              id="mobile"
              name="mobile"
              value={form.mobile}
              onChange={onChange}
              placeholder="Mobile"
              inputMode="numeric"
            />
          </div>
        </div>

        {/* Card: Other Details */}
        <div className="ep-sec-head mt24">
          <span className="material-icons ep-gear">settings</span>
          <h3>Other Details</h3>
        </div>

        <div className="ep-grid ep-grid-2">
          {/* Username */}
          <div className="ep-field">
            <label htmlFor="username">User Name:</label>
            <input
              id="username"
              name="username"
              value={form.username}
              onChange={onChange}
              placeholder="User Name"
            />
          </div>

          {/* Financial Year (select) */}
          <div className="ep-field">
            <label htmlFor="finYear">Default Financial year:</label>
            <div className="ep-select-wrap">
              <select
                id="finYear"
                name="finYear"
                value={form.finYear}
                onChange={onChange}
              >
                {FY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {/* ghost clear + chevron to mimic UI */}
              <button
                type="button"
                className="ep-clear"
                title="Clear"
                onClick={() => setForm((f) => ({ ...f, finYear: "" }))}
                aria-label="clear"
              >
                ×
              </button>
              <span className="material-icons ep-dd">expand_more</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="ep-actions">
          <button className="btn primary" type="submit">
            Submit
          </button>
          <button
            className="btn soft"
            type="button"
            onClick={() => navigate(-1)}   // ← go back
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
