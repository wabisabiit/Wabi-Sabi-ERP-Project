import React, { useState, useEffect, useRef } from "react";
import ProductPanel from "./ProductPanel";
import "../styles/Header.css";
import ConfirmModal from "./ConfirmModal";
import SettingsPanel from "./SettingsPanel";

function Header() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState("IT Account");
  const [open, setOpen] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openProducts, setOpenProducts] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  

  const options = [
    "IT Account",
    "WABI SABI SUSTAINABILITY LLP",
    "NISHANT",
    "KRISHNA PANDIT",
  ];

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dropdownRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <>
      <header className="header">
        {/* Left Section */}
        <div className="header-left">
          <button type="button" className="menu-icon" aria-label="Open menu">
            <span className="material-icons">menu</span>
          </button>

          <div className="logo-wrap">
            <span className="logo-vasy">Wabi Sabi</span>
            <span className="logo-erp">ERP</span>
          </div>

          {/* Customer Type, Salesman dropdown ... (unchanged) */}
          <div className="customer-type" role="radiogroup" aria-label="Customer type">
            <label><input type="radio" name="customer_type" defaultChecked /><span>Walk In</span></label>
            <label><input type="radio" name="customer_type" /><span>Delivery</span></label>
          </div>

          <div className="salesman">
            <label style={{ marginRight: 4 }}>Salesman:</label>
            <div className="dropdown" ref={dropdownRef}>
              <button
                type="button"
                className="dropdown-selected"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {selected}
                <span className="material-icons arrow">
                  {open ? "expand_less" : "expand_more"}
                </span>
              </button>

              {open && (
                <div className="dropdown-menu">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="dropdown-search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                  <div className="dropdown-options" role="listbox" tabIndex={-1}>
                    {filtered.length > 0 ? (
                      filtered.map((opt) => (
                        <div
                          key={opt}
                          role="option"
                          aria-selected={selected === opt}
                          className={`dropdown-option ${selected === opt ? "active" : ""}`}
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
          <span className="material-icons green" aria-hidden="true">wifi</span>

          <div className="notify" aria-label="Notifications">
            <span className="count">0</span>
          </div>

          <button type="button" className="icon-btn black" aria-label="Print">
            <span className="material-icons">print</span>
          </button>

          <button type="button" className="icon-btn black" aria-label="Refresh">
            <span className="material-icons">refresh</span>
          </button>

          <button
            type="button"
            className="icon-btn black"
            aria-label="Settings"
            onClick={() => setOpenSettings(true)}
          >
            <span className="material-icons">settings</span>
          </button>

           {/* ...other buttons... */}

          <button
            type="button"
            className="icon-btn black"
            aria-label="Products"
            onClick={() => setOpenProducts(true)}   // ✅ open on click
          >
            <span className="material-icons">inventory_2</span>
          </button>

           <button
    type="button"
    className="icon-btn black"
    aria-label="Delete"
    onClick={() => alert("Delete action triggered!")} // यहां अपनी logic लगाइए
  >
    <span className="material-icons">delete</span>
  </button>

         

          <button type="button" className="icon-btn black" aria-label="Fullscreen">
            <span className="material-icons">fullscreen</span>
          </button>

          <button type="button" className="icon-btn black" aria-label="Power">
            <span className="material-icons">power_settings_new</span>
          </button>
        </div>
      </header>

      <SettingsPanel open={openSettings} onClose={() => setOpenSettings(false)} />

      {/* Product Drawer */}
      <ProductPanel open={openProducts} onClose={() => setOpenProducts(false)} />
    </>
  );
}

export default Header;
