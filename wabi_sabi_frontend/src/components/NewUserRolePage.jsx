import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NewUserRolePage.css";
import "../styles/GeneralSettingsPage.css";

/* ------------ tiny helpers ------------ */
function makeRowState(keys) {
  const obj = {};
  keys.forEach((k) => (obj[k] = false));
  return obj;
}

/* Permission table (matches screenshots) */
function PermissionTable({
  title,
  outletPerm,         // [value, setter]
  columns,            // ["Select All", "Insert", ...]
  rows,               // [{label, keys:[...]}] (keys are lower-camel)
  state,              // { [rowLabel]: {permKey:boolean,...} }
  setState,
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
      Object.keys(next).forEach((k) => {
        if (k !== "selectAll") next[k] = now;
      });
      return { ...s, [rowLabel]: next };
    });
  };

  const keyMap = {
    "Select All": "selectAll",
    Insert: "insert",
    View: "view",
    Edit: "edit",
    Delete: "delete",
    Pdf: "pdf",
    "Bell Notification": "bell",
    "Approve/Reject": "approve",
    "Show Profit": "profit",
    "E-way Bill": "eway",
    "E-Invoice": "einvoice",
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
        <div className="perm-table-viewport">
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
                    {columns.map((c) => {
                      const k = keyMap[c];

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
    </div>
  );
}

export default function NewUserRolePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("roles");
  const [name, setName] = useState("");

  /* single-open accordion */
  const [open, setOpen] = useState(() => new Set());
  const toggle = (key) =>
    setOpen((s) => (s.has(key) ? new Set() : new Set([key])));

  /* ---- Dashboard (same as before) ---- */
  const dashCols = ["Select All", "View"];
  const dashRows = [{ label: "Dashboard", keys: ["selectAll", "view"] }];
  const [dashOutlet, setDashOutlet] = useState(false);
  const [dashState, setDashState] = useState(() => {
    const base = {};
    dashRows.forEach(
      (r) => (base[r.label] = makeRowState(["selectAll", "view"]))
    );
    return base;
  });

  /* ---- Contact (same as before) ---- */
  const contactCols = [
    "Select All",
    "Insert",
    "View",
    "Edit",
    "Delete",
    "Pdf",
    "Bell Notification",
  ];
  const contactRows = [
    { label: "Suppliers/Vendors" },
    { label: "Contact" },
    { label: "Customers" },
    { label: "Transport" },
  ].map((r) => ({
    ...r,
    keys: ["selectAll", "insert", "view", "edit", "delete", "pdf", "bell"],
  }));
  const [contactOutlet, setContactOutlet] = useState(false);
  const [contactState, setContactState] = useState(() => {
    const base = {};
    contactRows.forEach(
      (r) =>
        (base[r.label] = makeRowState([
          "selectAll",
          "insert",
          "view",
          "edit",
          "delete",
          "pdf",
          "bell",
        ]))
    );
    return base;
  });

  /* ---- Employee (same as before) ---- */
  const empCols = ["Select All", "Insert", "View", "Edit", "Delete"];
  const empRows = [
    { label: "Employee", keys: ["selectAll", "insert", "view", "edit", "delete"] },
  ];
  const [empOutlet, setEmpOutlet] = useState(false);
  const [empState, setEmpState] = useState(() => {
    const base = {};
    empRows.forEach(
      (r) =>
        (base[r.label] = makeRowState([
          "selectAll",
          "insert",
          "view",
          "edit",
          "delete",
        ]))
    );
    return base;
  });

  /* -------- Bank / Cash (exactly like your image) -------- */
  const bankCols = [
    "Select All",
    "Insert",
    "View",
    "Edit",
    "Delete",
    "Pdf",
    "Approve/Reject",
  ];
  const bankRows = [
    "Bank",
    "Bank Transaction",
    "Payment",
    "Receipt",
    "Expense",
    "Owner Cash Flow",
    "Manager Cash Flow",
    "Cash Flow",
  ].map((label) => ({
    label,
    keys: [
      "selectAll",
      "insert",
      "view",
      "edit",
      "delete",
      "pdf",
      "approve",
    ],
  }));
  const [bankOutlet, setBankOutlet] = useState(false);
  const [bankState, setBankState] = useState(() => {
    const base = {};
    bankRows.forEach(
      (r) =>
        (base[r.label] = makeRowState([
          "selectAll",
          "insert",
          "view",
          "edit",
          "delete",
          "pdf",
          "approve",
        ]))
    );
    return base;
  });

  /* -------- POS (exactly like your image) -------- */
  const posCols = [
    "Select All",
    "Insert",
    "View",
    "Edit",
    "Delete",
    "Bell Notification",
    "Show Profit",
    "E-way Bill",
    "E-Invoice",
  ];
  const posRows = [
    "New",
    "Order List",
    "Online Order List",
    "Credit Note",
    "Sales Register",
  ].map((label) => ({
    label,
    keys: [
      "selectAll",
      "insert",
      "view",
      "edit",
      "delete",
      "bell",
      "profit",
      "eway",
      "einvoice",
    ],
  }));
  const [posOutlet, setPosOutlet] = useState(false);
  const [posState, setPosState] = useState(() => {
    const base = {};
    posRows.forEach(
      (r) =>
        (base[r.label] = makeRowState([
          "selectAll",
          "insert",
          "view",
          "edit",
          "delete",
          "bell",
          "profit",
          "eway",
          "einvoice",
        ]))
    );
    return base;
  });

  /* -------- CRM (exactly like your image) -------- */
  const crmCols = ["Select All", "Insert", "View", "Edit", "Delete"];
  const crmRows = [
    "Coupon",
    "Membership",
    "Discount",
    "Loyalty",
    "Feedback",
    "Campaign",
    "Point setup",
  ].map((label) => ({
    label,
    keys: ["selectAll", "insert", "view", "edit", "delete"],
  }));
  const [crmOutlet, setCrmOutlet] = useState(false);
  const [crmState, setCrmState] = useState(() => {
    const base = {};
    crmRows.forEach(
      (r) =>
        (base[r.label] = makeRowState([
          "selectAll",
          "insert",
          "view",
          "edit",
          "delete",
        ]))
    );
    return base;
  });

  /* Remaining simple sections (placeholders) */
  const otherSections = ["Inventory", "Purchase", "Sales", "Reports", "Settings"];

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
        {/* LEFT tabs */}
        <div className="gs-tabs">
          <button
            className={`gs-tab ${tab === "profile" ? "active" : ""}`}
            onClick={() => navigate("/settings/general")}
            type="button"
          >
            <span className="material-icons">account_circle</span>
            <span>Profile</span>
          </button>
          <button
            className={`gs-tab ${tab === "taxes" ? "active" : ""}`}
            onClick={() => navigate("/settings/general?tab=taxes")}
            type="button"
          >
            <span className="material-icons">request_quote</span>
            <span>Taxes</span>
          </button>
          <button
            className={`gs-tab ${tab === "roles" ? "active" : ""}`}
            onClick={() => setTab("roles")}
            type="button"
          >
            <span className="material-icons">groups</span>
            <span>User Roles</span>
          </button>
        </div>

        {/* RIGHT card */}
        <div className="ur-card">
          {/* head */}
          <div className="ur-head">
            <div className="ur-head-left">
              <span className="material-icons">groups</span>
              <span>User Role</span>
            </div>
          </div>

          {/* role name */}
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

          {/* sub-tabs */}
          <div className="ur-subtabs">
            <button className="ur-tab active" type="button">
              User Role Details
            </button>
            <button className="ur-tab" type="button">Report Details</button>
            <button className="ur-tab" type="button">Outlet Details</button>
          </div>

          {/* Accordions */}
          {/* Dashboard */}
          <div className="ur-acc">
            <button
              className="ur-acc-head"
              onClick={() => toggle("Dashboard")}
              type="button"
              aria-expanded={open.has("Dashboard")}
            >
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

          {/* Contact */}
          <div className="ur-acc">
            <button
              className="ur-acc-head"
              onClick={() => toggle("Contact")}
              type="button"
              aria-expanded={open.has("Contact")}
            >
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

          {/* Employee */}
          <div className="ur-acc">
            <button
              className="ur-acc-head"
              onClick={() => toggle("Employee")}
              type="button"
              aria-expanded={open.has("Employee")}
            >
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

          {/* Bank / Cash */}
          <div className="ur-acc">
            <button
              className="ur-acc-head"
              onClick={() => toggle("Bank / Cash")}
              type="button"
              aria-expanded={open.has("Bank / Cash")}
            >
              <span>Bank / Cash</span>
              <span className={`material-icons ur-caret ${open.has("Bank / Cash") ? "open" : ""}`}>expand_more</span>
            </button>
            {open.has("Bank / Cash") && (
              <div className="ur-acc-body">
                <PermissionTable
                  title="Bank / Cash"
                  outletPerm={[bankOutlet, setBankOutlet]}
                  columns={bankCols}
                  rows={bankRows}
                  state={bankState}
                  setState={setBankState}
                />
              </div>
            )}
          </div>

          {/* POS */}
          <div className="ur-acc">
            <button
              className="ur-acc-head"
              onClick={() => toggle("POS")}
              type="button"
              aria-expanded={open.has("POS")}
            >
              <span>POS</span>
              <span className={`material-icons ur-caret ${open.has("POS") ? "open" : ""}`}>expand_more</span>
            </button>
            {open.has("POS") && (
              <div className="ur-acc-body">
                <PermissionTable
                  title="POS"
                  outletPerm={[posOutlet, setPosOutlet]}
                  columns={posCols}
                  rows={posRows}
                  state={posState}
                  setState={setPosState}
                />
              </div>
            )}
          </div>

          {/* CRM */}
          <div className="ur-acc">
            <button
              className="ur-acc-head"
              onClick={() => toggle("CRM")}
              type="button"
              aria-expanded={open.has("CRM")}
            >
              <span>CRM</span>
              <span className={`material-icons ur-caret ${open.has("CRM") ? "open" : ""}`}>expand_more</span>
            </button>
            {open.has("CRM") && (
              <div className="ur-acc-body">
                <PermissionTable
                  title="CRM"
                  outletPerm={[crmOutlet, setCrmOutlet]}
                  columns={crmCols}
                  rows={crmRows}
                  state={crmState}
                  setState={setCrmState}
                />
              </div>
            )}
          </div>

          {/* Remaining simple sections */}
          {otherSections.map((t) => (
            <div className="ur-acc" key={t}>
              <button
                className="ur-acc-head"
                onClick={() => toggle(t)}
                type="button"
                aria-expanded={open.has(t)}
              >
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
