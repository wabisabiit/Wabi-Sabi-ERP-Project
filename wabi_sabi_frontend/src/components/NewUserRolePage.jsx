import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NewUserRolePage.css";
import "../styles/GeneralSettingsPage.css"; // reuse left tabs look

export default function NewUserRolePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("roles"); // keep left nav; highlight User Roles
  const [name, setName] = useState("");

  // simple accordion
  const sections = [
    "Dashboard",
    "Contact",
    "Employee",
    "Inventory",
    "Purchase",
    "Sales",
    "Bank / Cash",
    "POS",
    "Reports",
    "Settings",
  ];

  const [open, setOpen] = useState(() => new Set()); // collapsed by default
  const toggle = (key) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  return (
    <div className="ur-wrap">
      {/* page header */}
      <div className="ur-top">
        <div className="ur-left">
          <span className="material-icons ur-home">home</span>
          <span className="ur-dash">-</span>
          <span className="ur-bc">User Role</span>
        </div>
        <h1 className="ur-title">New User Role</h1>
      </div>

      <div className="gs-body">{/* reuse 2-col layout (tabs + content) */}
        {/* LEFT: same tabs as General Settings; keep them working */}
        <div className="gs-tabs">
          <button className={`gs-tab ${tab === "profile" ? "active" : ""}`} onClick={() => navigate("/settings/general")} type="button">
            <span className="material-icons">account_circle</span><span>Profile</span>
          </button>
          <button className={`gs-tab ${tab === "taxes" ? "active" : ""}`} onClick={() => navigate("/settings/general?tab=taxes")} type="button">
            <span className="material-icons">request_quote</span><span>Taxes</span>
          </button>
          <button className={`gs-tab ${tab === "roles" ? "active" : ""}`} onClick={() => setTab("roles")} type="button">
            <span className="material-icons">groups</span><span>User Roles</span>
          </button>
        </div>

        {/* RIGHT: form card */}
        <div className="ur-card">
          {/* “User Role” header strip */}
          <div className="ur-head">
            <div className="ur-head-left">
              <span className="material-icons">groups</span>
              <span>User Role</span>
            </div>
          </div>

          {/* Role name input */}
          <div className="ur-row">
            <label htmlFor="ur-name">User Role Name <span className="req">*</span></label>
            <input
              id="ur-name"
              className="ur-input"
              placeholder="User Role Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Top sub-tabs */}
          <div className="ur-subtabs">
            <button className="ur-tab active" type="button">User Role Details</button>
            <button className="ur-tab" type="button">Report Details</button>
            <button className="ur-tab" type="button">Outlet Details</button>
          </div>

          {/* Accordions */}
          <div className="ur-acc-list">
            {sections.map((title) => {
              const isOpen = open.has(title);
              return (
                <div className="ur-acc" key={title}>
                  <button className="ur-acc-head" onClick={() => toggle(title)} type="button" aria-expanded={isOpen}>
                    <span>{title}</span>
                    <span className={`material-icons ur-caret ${isOpen ? "open" : ""}`}>expand_more</span>
                  </button>
                  {isOpen && (
                    <div className="ur-acc-body">
                      {/* default placeholder permissions; wire actual checkboxes later */}
                      <div className="ur-perm-row">
                        <label><input type="checkbox" /> View</label>
                        <label><input type="checkbox" /> Create</label>
                        <label><input type="checkbox" /> Edit</label>
                        <label><input type="checkbox" /> Delete</label>
                        <label><input type="checkbox" /> Approve</label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer buttons */}
          <div className="ur-foot">
            <button className="btn outline" type="button" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn primary" type="button" disabled={!name.trim()} onClick={() => navigate("/settings/general?tab=roles")}>
              Save Role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
