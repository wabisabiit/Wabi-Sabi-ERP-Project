import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EmployeeCreatePage.css";
import { listOutlets, createEmployee } from "../api/client";

export default function EmployeeCreatePage() {
  const navigate = useNavigate();

  // basics
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [pan, setPan] = useState("");
  const [aadhaar, setAadhaar] = useState("");               // NEW (required)
  const [bankName, setBankName] = useState("");             // NEW (required)
  const [bankBranch, setBankBranch] = useState("");         // NEW (required)
  const [accountNumber, setAccountNumber] = useState("");   // NEW (required)

  const [address, setAddress] = useState("");

  // geo (kept for UI only)
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Haryana");
  const [city, setCity] = useState("Gurugram");
  const [zip, setZip] = useState("");

  // business (branch from backend)
  const [branch, setBranch] = useState(""); // will be outlet.id
  const [branchOptions, setBranchOptions] = useState([]); // [{id, label}]
  const [salary, setSalary] = useState(""); // ✅ FIX: this was missing and caused the white screen

  // auth
  const [showAuth, setShowAuth] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(""); // keep your UI values; map to backend later

  // Load outlets for branch select
  useEffect(() => {
    (async () => {
      try {
        const data = await listOutlets();
        const list = (data?.results ?? data ?? []).map(o => ({
          id: o.id,
          label: o.name || o.display_name || o.code,
        }));
        setBranchOptions(list);
        if (list.length && !branch) setBranch(String(list[0].id));
      } catch (e) {
        console.error("Failed to load outlets:", e);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Local validation matching backend rules
  function validate() {
    if (!userName.trim() || !password.trim()) return "Username and Password are required.";
    if (!branch) return "Please select a Branch.";
    const panOk = /^[A-Za-z0-9]{10}$/.test(pan.trim());
    if (!panOk) return "PAN must be exactly 10 alphanumeric characters.";
    const aadhaarOk = /^\d{12}$/.test(aadhaar.trim());
    if (!aadhaarOk) return "Aadhaar must be exactly 12 digits.";
    const acctOk = /^\d{9,18}$/.test(accountNumber.trim());
    if (!acctOk) return "Account number must be 9–18 digits.";
    if (!bankName.trim() || !bankBranch.trim()) return "Bank name and branch are required.";
    return null;
  }

  const save = async () => {
    const err = validate();
    if (err) { alert(err); return; }

    // Map your UI role to backend expected role (MANAGER/STAFF)
    let backendRole = "STAFF";
    if (role === "store_manager") backendRole = "MANAGER";

    // Split full name into first/last (nice-to-have)
    const first = name.trim().split(" ")[0] || "";
    const last = name.trim().split(" ").slice(1).join(" ") || "";

    try {
      await createEmployee({
        username: userName.trim(),
        password: password,
        first_name: first,
        last_name: last,
        email: email.trim(),
        role: backendRole,
        outlet: Number(branch),            // HQ can choose; non-HQ ignored by backend
        aadhaar: aadhaar.trim(),
        pan: pan.trim().toUpperCase(),
        bank_name: bankName.trim(),
        bank_branch: bankBranch.trim(),
        account_number: accountNumber.trim(),
      });
      alert("Employee created successfully.");
      navigate("/admin/employee");
    } catch (e) {
      const msg = String(e?.message || "");
      if (/403/.test(msg)) {
        alert("Only Head Office can add employees.");
      } else {
        alert("Create failed: " + msg);
      }
    }
  };

  return (
    <div className="emp-wrap emp-create">
      <div className="emp-pagebar">
        <h1>New Employee</h1>
        <span className="material-icons home-ico">home</span>
      </div>

      <div className="emp-card">
        <div className="emp-create-grid">
          {/* Row 1 */}
          <div className="f">
            <label>
              Name <span className="req">*</span>
            </label>
            <input className="inp" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="f">
            <label>
              Mobile No. <span className="req">*</span>
            </label>
            <input
              className="inp"
              placeholder="+91 | Mobile No."
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>
          <div className="f">
            <label>Email</label>
            <input className="inp" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="f">
            <label>PAN No. <span className="req">*</span></label>
            <input className="inp" placeholder="PAN No." value={pan} onChange={(e) => setPan(e.target.value)} />
          </div>

          {/* Row 2 */}
          <div className="f f-span2">
            <label>Address</label>
            <textarea
              className="inp ta"
              rows={2}
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="f">
            <label>Select Country</label>
            <select className="inp" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option>India</option>
            </select>
          </div>
          <div className="f">
            <label>
              Select State <span className="req">*</span>
            </label>
            <select className="inp" value={state} onChange={(e) => setState(e.target.value)}>
              <option>Haryana</option>
              <option>Delhi</option>
              <option>Uttar Pradesh</option>
            </select>
          </div>

          {/* Row 3 */}
          <div className="f">
            <label>
              Select City <span className="req">*</span>
            </label>
            <select className="inp" value={city} onChange={(e) => setCity(e.target.value)}>
              <option>Gurugram</option>
              <option>New Delhi</option>
              <option>Noida</option>
            </select>
          </div>
          <div className="f">
            <label>ZIP/Postal Code</label>
            <input
              className="inp"
              placeholder="ZIP/Postal code"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
          </div>

          {/* Row 4 — Salary, Branch */}
          <div className="f">
            <label>Salary</label>
            <input className="inp" placeholder="Salary" value={salary} onChange={(e) => setSalary(e.target.value)} />
          </div>

          <div className="f">
            <label>Select Branch <span className="req">*</span></label>
            <select className="inp" value={branch} onChange={(e) => setBranch(e.target.value)}>
              {branchOptions.length === 0 ? (
                <option value="">Loading…</option>
              ) : (
                branchOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))
              )}
            </select>
          </div>

          {/* NEW KYC/BANK row */}
          <div className="f">
            <label>Aadhaar (12 digits) <span className="req">*</span></label>
            <input
              className="inp"
              placeholder="Aadhaar"
              value={aadhaar}
              maxLength={12}
              onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="f">
            <label>Bank Name <span className="req">*</span></label>
            <input className="inp" placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div className="f">
            <label>Bank Branch <span className="req">*</span></label>
            <input className="inp" placeholder="Bank Branch" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
          </div>
          <div className="f">
            <label>Account Number <span className="req">*</span></label>
            <input
              className="inp"
              placeholder="Account Number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <div className="f f-empty" />
        </div>

        <button type="button" className="link-auth" onClick={() => setShowAuth((v) => !v)}>
          {showAuth ? "Hide Authentication Details" : "Add Authentication Details"}
        </button>

        {showAuth && (
          <div className="emp-create-grid auth-grid">
            <div className="f">
              <label>
                User Name <span className="req">*</span>
              </label>
              <input
                className="inp"
                placeholder="User name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div className="f">
              <label>
                Password <span className="req">*</span>
              </label>
              <input
                className="inp"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="f">
              <label>
                Select Role <span className="req">*</span>
              </label>
              <select className="inp" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Select Role</option>
                <option value="admin">Admin</option>
                <option value="store_manager">Store Manager</option>
                <option value="cashier">Cashier</option>
              </select>
            </div>
          </div>
        )}

        <div className="emp-form-actions">
          <button className="btn ghost" onClick={() => navigate("/admin/employee")}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
