import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/OutletCreatePage.css";

const YEAR_INTERVALS = ["2024–2025", "2025–2026", "2026–2027"];
const GST_TYPES = ["Registered", "Unregistered", "Composition"];
const TIMEZONES = ["Chennai, Kolkata, Mumbai, New Delhi (UTC+05:30)"];
const COUNTRIES = ["India"];
const STATES = ["Delhi", "Haryana", "Uttar Pradesh"];
const CITIES = ["West Delhi", "Gurugram", "Noida"];

export default function OutletCreatePage() {
  const nav = useNavigate();

  // top meta
  const [outletType, setOutletType] = useState("Branch"); // Brand | Franchise | Branch
  const [name, setName] = useState("");                   // ✅ ADDED field actually used in UI now
  const [displayName, setDisplayName] = useState("");
  const [contactName, setContactName] = useState("");

  // comms & login
  const [mobile, setMobile] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [pwd, setPwd] = useState("");

  // govt / tax
  const [year, setYear] = useState("2025–2026");
  const [gstType, setGstType] = useState("Registered");
  const [gstin, setGstin] = useState("");
  const [tan, setTan] = useState("");
  const [fssai, setFssai] = useState("");
  const [pan, setPan] = useState("");
  const [website, setWebsite] = useState("");

  // address
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState(TIMEZONES[0]);
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Delhi");
  const [city, setCity] = useState("West Delhi");
  const [zip, setZip] = useState("");

  // bank
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [swift, setSwift] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [outletSize, setOutletSize] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    // TODO: API call
    nav("/admin/outlet");
  };

  return (
    <div className="out-create-wrap">
      <div className="out-create-bar">
        <h1>New Outlet</h1>
        <span className="material-icons home-ico">home</span>
      </div>

      <form className="out-create-card" onSubmit={onSubmit}>
        {/* ===== 4-col grid exactly like screenshot ===== */}
        <div className="oc-grid">
          {/* Row 1: Outlet Type | Name | Display Name | Contact Name */}
          <div className="f">
            <label>Outlet Type<span className="req">*</span></label>
            <select className="inp" value={outletType} onChange={e=>setOutletType(e.target.value)}>
              <option>Brand</option>
              <option>Franchise</option>
              <option>Branch</option>
            </select>
          </div>
          <div className="f">
            <label>Name<span className="req">*</span></label>
            <input className="inp" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div className="f">
            <label>Display Name<span className="req">*</span></label>
            <input className="inp" placeholder="Display Name" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
          </div>
          <div className="f">
            <label>Contact Name</label>
            <input className="inp" placeholder="Contact Name" value={contactName} onChange={e=>setContactName(e.target.value)} />
          </div>

          {/* Row 2: Mobile | Telephone | Email | User Name */}
          <div className="f">
            <label>Mobile No.<span className="req">*</span></label>
            <input className="inp" placeholder="+91 | Mobile No." value={mobile} onChange={e=>setMobile(e.target.value)} />
          </div>
          <div className="f">
            <label>Telephone No.</label>
            <input className="inp" placeholder="Telephone" value={telephone} onChange={e=>setTelephone(e.target.value)} />
          </div>
          <div className="f">
            <label>Email</label>
            <input className="inp" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div className="f">
            <label>User Name</label>
            <input className="inp" placeholder="User Name" value={userName} onChange={e=>setUserName(e.target.value)} />
          </div>

          {/* Row 3: Change Password | PAN | Year | GST Type */}
          <div className="f">
            <label>Change Password</label>
            <input type="password" className="inp" placeholder="Password" value={pwd} onChange={e=>setPwd(e.target.value)} />
          </div>
          <div className="f">
            <label>PAN No.</label>
            <input className="inp" placeholder="PAN No." value={pan} onChange={e=>setPan(e.target.value)} />
          </div>
          <div className="f">
            <label>Year Interval</label>
            <select className="inp" value={year} onChange={e=>setYear(e.target.value)}>
              {YEAR_INTERVALS.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div className="f">
            <label>GST Type</label>
            <select className="inp" value={gstType} onChange={e=>setGstType(e.target.value)}>
              {GST_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Row 4: GSTIN | TAN | Website | FSSAI */}
          <div className="f">
            <label>GSTIN</label>
            <input className="inp" placeholder="GSTIN" value={gstin} onChange={e=>setGstin(e.target.value)} />
          </div>
          <div className="f">
            <label>TAN No.</label>
            <input className="inp" placeholder="TAN No." value={tan} onChange={e=>setTan(e.target.value)} />
          </div>
          <div className="f">
            <label>Website</label>
            <input className="inp" placeholder="Website" value={website} onChange={e=>setWebsite(e.target.value)} />
          </div>
          <div className="f">
            <label>FSSAI No.</label>
            <input className="inp" placeholder="FSSAI No." value={fssai} onChange={e=>setFssai(e.target.value)} />
          </div>

          {/* Row 5: Address (span2) | Country | State */}
          <div className="f f-span2">
            <label>Address<span className="req">*</span></label>
            <textarea className="inp ta" rows={2} placeholder="Address" value={address} onChange={e=>setAddress(e.target.value)} />
          </div>
          <div className="f">
            <label>Select Country</label>
            <select className="inp" value={country} onChange={e=>setCountry(e.target.value)}>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="f">
            <label>Select State</label>
            <select className="inp" value={state} onChange={e=>setState(e.target.value)}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Row 6: Timezone | ZIP | City | (empty) */}
          <div className="f">
            <label>Select Timezone</label>
            <select className="inp" value={timezone} onChange={e=>setTimezone(e.target.value)}>
              {TIMEZONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="f">
            <label>ZIP/Postal Code</label>
            <input className="inp" placeholder="ZIP/Postal Code" value={zip} onChange={e=>setZip(e.target.value)} />
          </div>
          <div className="f">
            <label>Select City</label>
            <select className="inp" value={city} onChange={e=>setCity(e.target.value)}>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="f f-empty" />

          {/* Row 7: Bank & account */}
          <div className="f">
            <label>IFSC Code</label>
            <input className="inp" placeholder="IFSC Code" value={ifsc} onChange={e=>setIfsc(e.target.value)} />
          </div>
          <div className="f">
            <label>Bank Name</label>
            <input className="inp" placeholder="Bank Name" value={bankName} onChange={e=>setBankName(e.target.value)} />
          </div>
          <div className="f">
            <label>Branch Name</label>
            <input className="inp" placeholder="Bank Branch" value={branchName} onChange={e=>setBranchName(e.target.value)} />
          </div>
          <div className="f">
            <label>Account No.</label>
            <input className="inp" placeholder="Bank A/c no" value={accountNo} onChange={e=>setAccountNo(e.target.value)} />
          </div>

          {/* Row 8: Holder | Swift | Outlet Size | (empty) */}
          <div className="f">
            <label>Account Holder Name</label>
            <input className="inp" placeholder="Account Holder Name" value={accountHolder} onChange={e=>setAccountHolder(e.target.value)} />
          </div>
          <div className="f">
            <label>Swift Code</label>
            <input className="inp" placeholder="Swift Code" value={swift} onChange={e=>setSwift(e.target.value)} />
          </div>
          <div className="f">
            <label>Outlet Size (sq.ft.)</label>
            <input className="inp" placeholder="Outlet Size (sq.ft.)" value={outletSize} onChange={e=>setOutletSize(e.target.value)} />
          </div>
          <div className="f f-empty" />
        </div>

        {/* actions */}
        <div className="out-form-actions">
          <button type="button" className="btn ghost" onClick={() => nav("/admin/outlet")}>Cancel</button>
          <button type="submit" className="btn primary">Submit</button>
        </div>
      </form>
    </div>
  );
}
