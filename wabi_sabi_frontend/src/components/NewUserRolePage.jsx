import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NewUserRolePage.css";
import "../styles/GeneralSettingsPage.css";

/* ------------ tiny helpers ------------ */
function makeRowState(keys) {
  // keys = permission keys, e.g. ["selectAll","insert","view"...]
  const obj = {};
  keys.forEach((k) => (obj[k] = false));
  return obj;
}

/* A tiny permission table that matches your screenshots exactly */
function PermissionTable({
  title,                 // section title (e.g., "Dashboard")
  outletPerm,            // [outletPerm, setOutletPerm] state tuple
  columns,               // array of column labels (besides left-most label col)
  rows,                  // array of { label, keys: ["selectAll","view",...] }
  state,                 // object { [rowLabel]: {permKey:boolean,...} }
  setState,              // setter for state
}) {
  const [outletPermission, setOutletPermission] = outletPerm;

  const onToggleCell = (rowLabel, key) => {
    setState((s) => ({
      ...s,
      [rowLabel]: { ...s[rowLabel], [key]: !s[rowLabel][key] },
    }));
  };

  const onToggleSelectAll = (rowLabel) => {
    setState((s) => {
      const row = s[rowLabel];
      const now = !row.selectAll;
      const next = { ...row, selectAll: now };
      // when selectAll toggles, mirror it to every other key in that row
      Object.keys(next).forEach((k) => {
        if (k !== "selectAll") next[k] = now;
      });
      return { ...s, [rowLabel]: next };
    });
  };

  return (
    <div className="perm-wrap">
      <div className="perm-title">{title}</div>

      <label className="perm-outlet">
        <input
          type="checkbox"
          checked={outletPermission}
          onChange={(e) => setOutletPermission(e.target.checked)}
        />
        <span>Outlet Permission</span>
      </label>

      <div className="perm-table-wrap">
        <table className="perm-table">
          <thead>
            <tr>
              <th className="perm-left"></th>
              {columns.map((c) => (
                <th key={c} className="perm-th">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const row = state[r.label];
              return (
                <tr key={r.label}>
                  <td className="perm-left">{r.label}</td>

                  {/* Render cells in the order of "columns"
                      Each column name maps to a key in r.keys; key names use lower camel:
                      Select All -> "selectAll", Insert -> "insert", Pdf -> "pdf", Bell Notification -> "bell"
                  */}
                  {columns.map((c) => {
                    const keyMap = {
                      "Select All": "selectAll",
                      Insert: "insert",
                      View: "view",
                      Edit: "edit",
                      Delete: "delete",
                      Pdf: "pdf",
                      "Bell Notification": "bell",
                    };
                    const k = keyMap[c];

                    // "Select All" has special behavior
                    if (k === "selectAll") {
                      return (
                        <td key={c}>
                          <input
                            type="checkbox"
                            checked={row.selectAll}
                            onChange={() => onToggleSelectAll(r.label)}
                          />
                        </td>
                      );
                    }

                    return (
                      <td key={c}>
                        <input
                          type="checkbox"
                          checked={row[k]}
                          onChange={() => onToggleCell(r.label, k)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function NewUserRolePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("roles");
  const [name, setName] = useState("");

  // which accordion is open
  const [open, setOpen] = useState(() => new Set()); // open the first 3 by default
  const toggle = (key) =>
  setOpen((s) => (s.has(key) ? new Set() : new Set([key])));

  /* ---- Section data + state (Dashboard/Contact/Employee exactly like screenshots) ---- */
  // Dashboard
  const dashCols = ["Select All", "View"];
  const dashRows = [{ label: "Dashboard", keys: ["selectAll", "view"] }];
  const [dashOutlet, setDashOutlet] = useState(false);
  const [dashState, setDashState] = useState(() => {
    const base = {};
    dashRows.forEach((r) => (base[r.label] = makeRowState(["selectAll", "view"])));
    return base;
  });

  // Contact
  const contactCols = ["Select All", "Insert", "View", "Edit", "Delete", "Pdf", "Bell Notification"];
  const contactRows = [
    { label: "Suppliers/Vendors", keys: ["selectAll", "insert", "view", "edit", "delete", "pdf", "bell"] },
    { label: "Contact",           keys: ["selectAll", "insert", "view", "edit", "delete", "pdf", "bell"] },
    { label: "Customers",         keys: ["selectAll", "insert", "view", "edit", "delete", "pdf", "bell"] },
    { label: "Transport",         keys: ["selectAll", "insert", "view", "edit", "delete", "pdf", "bell"] },
  ];
  const [contactOutlet, setContactOutlet] = useState(false);
  const [contactState, setContactState] = useState(() => {
    const base = {};
    contactRows.forEach((r) => (base[r.label] = makeRowState(["selectAll", "insert", "view", "edit", "delete", "pdf", "bell"])));
    return base;
  });

  // Employee
  const empCols = ["Select All", "Insert", "View", "Edit", "Delete"];
  const empRows = [{ label: "Employee", keys: ["selectAll", "insert", "view", "edit", "delete"] }];
  const [empOutlet, setEmpOutlet] = useState(false);
  const [empState, setEmpState] = useState(() => {
    const base = {};
    empRows.forEach((r) => (base[r.label] = makeRowState(["selectAll", "insert", "view", "edit", "delete"])));
    return base;
  });

  // Other section titles (still placeholders)
  const otherSections = ["Inventory", "Purchase", "Sales", "Bank / Cash", "POS", "Reports", "Settings"];

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

      <div className="gs-body">
        {/* LEFT tabs (stay visible) */}
        <div className="gs-tabs">
          <button
            className={`gs-tab ${tab === "profile" ? "active" : ""}`}
            onClick={() => navigate("/settings/general")}
            type="button"
          >
            <span className="material-icons">account_circle</span><span>Profile</span>
          </button>
          <button
            className={`gs-tab ${tab === "taxes" ? "active" : ""}`}
            onClick={() => navigate("/settings/general?tab=taxes")}
            type="button"
          >
            <span className="material-icons">request_quote</span><span>Taxes</span>
          </button>
          <button
            className={`gs-tab ${tab === "roles" ? "active" : ""}`}
            onClick={() => setTab("roles")}
            type="button"
          >
            <span className="material-icons">groups</span><span>User Roles</span>
          </button>
        </div>

        {/* RIGHT card */}
        <div className="ur-card">
          {/* Head */}
          <div className="ur-head">
            <div className="ur-head-left">
              <span className="material-icons">groups</span>
              <span>User Role</span>
            </div>
          </div>

          {/* Role Name */}
          <div className="ur-row">
            <label htmlFor="ur-name">
              User Role Name <span className="req">*</span>
            </label>
            <input
              id="ur-name"
              className="ur-input"
              placeholder="User Role Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Sub-tabs */}
          <div className="ur-subtabs">
            <button className="ur-tab active" type="button">User Role Details</button>
            <button className="ur-tab" type="button">Report Details</button>
            <button className="ur-tab" type="button">Outlet Details</button>
          </div>

          {/* Accordions */}
          {/* 1) Dashboard */}
          <div className="ur-acc">
            <button className="ur-acc-head" onClick={() => toggle("Dashboard")} type="button" aria-expanded={open.has("Dashboard")}>
              <span>Dashboard</span>
              <span className={`material-icons ur-caret ${open.has("Dashboard") ? "open" : ""}`}>expand_more</span>
            </button>
            {open.has("Dashboard") && (
              <div className="ur-acc-body">
                <PermissionTable
                  title="Dashboard"
                  outletPerm={[dashOutlet, setDashOutlet]}
                  columns={dashCols}
                  rows={dashRows}
                  state={dashState}
                  setState={setDashState}
                />
              </div>
            )}
          </div>

          {/* 2) Contact */}
          <div className="ur-acc">
            <button className="ur-acc-head" onClick={() => toggle("Contact")} type="button" aria-expanded={open.has("Contact")}>
              <span>Contact</span>
              <span className={`material-icons ur-caret ${open.has("Contact") ? "open" : ""}`}>expand_more</span>
            </button>
            {open.has("Contact") && (
              <div className="ur-acc-body">
                <PermissionTable
                  title="Contact"
                  outletPerm={[contactOutlet, setContactOutlet]}
                  columns={contactCols}
                  rows={contactRows}
                  state={contactState}
                  setState={setContactState}
                />
              </div>
            )}
          </div>

          {/* 3) Employee */}
          <div className="ur-acc">
            <button className="ur-acc-head" onClick={() => toggle("Employee")} type="button" aria-expanded={open.has("Employee")}>
              <span>Employee</span>
              <span className={`material-icons ur-caret ${open.has("Employee") ? "open" : ""}`}>expand_more</span>
            </button>
            {open.has("Employee") && (
              <div className="ur-acc-body">
                <PermissionTable
                  title="Employee"
                  outletPerm={[empOutlet, setEmpOutlet]}
                  columns={empCols}
                  rows={empRows}
                  state={empState}
                  setState={setEmpState}
                />
              </div>
            )}
          </div>

          {/* Remaining sections keep placeholder UI (optional) */}
          {otherSections.map((t) => (
            <div className="ur-acc" key={t}>
              <button className="ur-acc-head" onClick={() => toggle(t)} type="button" aria-expanded={open.has(t)}>
                <span>{t}</span>
                <span className={`material-icons ur-caret ${open.has(t) ? "open" : ""}`}>expand_more</span>
              </button>
              {open.has(t) && (
                <div className="ur-acc-body">
                  <div className="ur-perm-row">
                    <label><input type="checkbox" /> View</label>
                    <label><input type="checkbox" /> Create</label>
                    <label><input type="checkbox" /> Edit</label>
                    <label><input type="checkbox" /> Delete</label>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Footer */}
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
