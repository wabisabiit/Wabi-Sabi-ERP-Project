import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/EmployeeCreatePage.css";

const BRANCH_OPTIONS = [
  "WABI SABI SUSTAINABILITY LLP",
  "Brands4Less - Tilak Nagar",
  "Brands4Less - M3M Urbana",
  "Brands4Less-Rajori Garden inside (RJR)",
  "Rajori Garden outside (RJO)",
  "Brands4Less-Iffco Chock",
  "Brands4Less-Krishna Nagar",
  "Brands4Less-UP-AP",
  "Brands4Less-Udhyog Vihar",
];

export default function EmployeeCreatePage() {
  const navigate = useNavigate();

  // basics
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [pan, setPan] = useState("");
  const [address, setAddress] = useState("");

  // geo
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Haryana");
  const [city, setCity] = useState("Gurugram");
  const [zip, setZip] = useState("");

  // business
  const [branch, setBranch] = useState("WABI SABI SUSTAINABILITY LLP");
  const [salary, setSalary] = useState("");
  const [target, setTarget] = useState("");

  // auth
  const [showAuth, setShowAuth] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const save = () => {
    // TODO: API call
    navigate("/admin/employee");
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
            <label>PAN No.</label>
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

          {/* Row 4 — Salary, Target, Branch */}
          <div className="f">
            <label>Salary</label>
            <input className="inp" placeholder="Salary" value={salary} onChange={(e) => setSalary(e.target.value)} />
          </div>
          <div className="f">
            <label>Target</label>
            <input className="inp" placeholder="Target" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>

          {/* ✅ Native Select Branch (rest code same) */}
          <div className="f">
            <label>Select Branch</label>
            <select className="inp" value={branch} onChange={(e) => setBranch(e.target.value)}>
              {BRANCH_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
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
