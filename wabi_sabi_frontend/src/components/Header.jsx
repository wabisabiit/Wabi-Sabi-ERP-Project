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
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const handleDeleteClick = () => setOpenConfirm(true);
  const handleOk = () => {
    setOpenConfirm(false);
  };
  const handleCancel = () => setOpenConfirm(false);

  const handleLogout = () => {
    // 👉 yahan apni logout logic lagaiye (API call, token clear, redirect etc.)
    console.log("Logging out...");
    window.location.href = "/login"; // example redirect
  };

  return (
    <>
      <header className="header" role="banner">
        {/* Left */}
        <div className="header-left">
          <button type="button" className="menu-icon" aria-label="Open menu">
            <span className="material-icons">menu</span>
          </button>

          <div className="logo-wrap">
            <span className="logo-vasy">Wabi Sabi</span>
            <span className="logo-erp">ERP</span>
          </div>
        </div>

        {/* Center: Salesman */}
        <div className="header-center">
          <div className="salesman">
            <label style={{ marginRight: 6, fontWeight: 500 }}>Salesman:</label>
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

        {/* Right */}
        <div className="header-right">
          <span className="material-icons green" aria-hidden="true">wifi</span>

          <button type="button" className="icon-btn black" aria-label="Print">
            <span className="material-icons">print</span>
          </button>

          

          <button
            type="button"
            className="icon-btn black"
            aria-label="Settings"
            onClick={() => setOpenSettings(true)}
          >
            <span className="material-icons">settings</span>
          </button>

          <button
            type="button"
            className="icon-btn black"
            aria-label="Products"
            onClick={() => setOpenProducts(true)}
          >
            <span className="material-icons">inventory_2</span>
          </button>

          <button
            type="button"
            className="icon-btn black"
            aria-label="Delete"
            onClick={handleDeleteClick}
            title="Discard Sale"
          >
            <span className="material-icons">delete</span>
          </button>

          <button
            type="button"
            className="icon-btn black"
            aria-label="Fullscreen"
            onClick={toggleFullscreen}
          >
            <span className="material-icons">{isFullscreen ? "fullscreen_exit" : "fullscreen"}</span>
          </button>

          {/* 🔴 Logout button */}
          <button
            type="button"
            className="icon-btn black"
            aria-label="Logout"
            onClick={handleLogout}
            title="Logout"
          >
            <span className="material-icons">logout</span>
          </button>
        </div>
      </header>

      <SettingsPanel open={openSettings} onClose={() => setOpenSettings(false)} />
      <ProductPanel open={openProducts} onClose={() => setOpenProducts(false)} />

      {/* Confirm Modal will render centered with backdrop */}
      <ConfirmModal open={openConfirm} onOk={handleOk} onCancel={handleCancel} />
    </>
  );
}

export default Header;