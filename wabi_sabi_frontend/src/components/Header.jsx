import React, { useState } from "react";
import "../styles/Header.css";
import SettingsPanel from "./SettingsPanel"; // 👈 naya component import

function Header() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState("IT Account");
  const [open, setOpen] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  const options = [
    "IT Account",
    "WABI SABI SUSTAINABILITY LLP",
    "NISHANT",
    "KRISHNA PANDIT",
  ];

  // Filtered Options
  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <header className="header">
        {/* Left Section */}
        <div className="header-left">
          <span className="material-icons menu-icon">menu</span>

          {/* Logo */}
          <div className="logo-wrap">
            <span className="logo-vasy">Wabi Sabi</span>
            <span className="logo-erp">ERP</span>
          </div>

          {/* Customer Type */}
          <div className="customer-type">
            <label>
              <input type="radio" name="customer_type" defaultChecked />
              <span>Walk In</span>
            </label>
            <label>
              <input type="radio" name="customer_type" />
              <span>Delivery</span>
            </label>
          </div>

          {/* Salesman Dropdown with Search */}
          <div className="salesman">
            <label>Salesman:</label>
            <div className="dropdown">
              <div className="dropdown-selected" onClick={() => setOpen(!open)}>
                {selected}
                <span className="material-icons arrow">
                  {open ? "expand_less" : "expand_more"}
                </span>
              </div>

              {open && (
                <div className="dropdown-menu">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="dropdown-search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />

                  <div className="dropdown-options">
                    {filtered.length > 0 ? (
                      filtered.map((opt) => (
                        <div
                          key={opt}
                          className={`dropdown-option ${
                            selected === opt ? "active" : ""
                          }`}
                          onClick={() => {
                            setSelected(opt);
                            setOpen(false);
                            setSearchTerm("");
                          }}
                        >
                          {opt}
                        </div>
                      ))
                    ) : (
                      <div className="dropdown-noresult">No result found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="header-right">
          <span className="material-icons green">wifi</span>

          <div className="notify">
            <span className="count">0</span>
          </div>

          <span className="material-icons black">print</span>
          <span className="material-icons black">refresh</span>

          {/* ⚙ Settings Icon */}
          <span
            className="material-icons black"
            onClick={() => setOpenSettings(true)}
          >
            settings
          </span>
         
          <span className="material-icons black">apps</span>
          <span className="material-icons black">fullscreen</span>
          <span className="material-icons black">power_settings_new</span>
        </div>
      </header>

      {/* Slide-in Settings Panel */}
      <SettingsPanel open={openSettings} onClose={() => setOpenSettings(false)} />
    </>
  );
}

export default Header;
