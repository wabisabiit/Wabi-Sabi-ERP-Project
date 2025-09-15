import React, { useState, useEffect, useRef } from "react";
import ProductPanel from "./ProductPanel";
import "../styles/Header.css";
import ConfirmModal from "./ConfirmModal";
import SettingsPanel from "./SettingsPanel";
import RegisterCloseModal from "./RegisterCloseModal";
import Sidebar from "./Sidebar"; // <-- NEW: import the slide-in sidebar

function Header() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState("IT Account");
  const [open, setOpen] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openProducts, setOpenProducts] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(true);

  // NEW: sidebar open/close
  const [openSidebar, setOpenSidebar] = useState(false);

  // Register close modal state + header text
  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const [rangeLabel, setRangeLabel] = useState("");

  // ---- Salesman options (RESTORED, required by your JSX) ----
  const options = [
    "IT Account",
    "WABI SABI SUSTAINABILITY LLP",
    "NISHANT",
    "KRISHNA PANDIT",
  ];
  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ---- helpers ----
  const formatTs = (ts) =>
    new Date(ts).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  // ensure we have "registerOpenedAt" once
  useEffect(() => {
    const saved = localStorage.getItem("registerOpenedAt");
    if (!saved) {
      localStorage.setItem("registerOpenedAt", new Date().toISOString());
    }
  }, []);

  // dropdown close on outside/esc
  const dropdownRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // fullscreen sync
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  };

  // discard sale modal
  const handleDeleteClick = () => setOpenConfirm(true);
  const handleOk = () => setOpenConfirm(false);
  const handleCancel = () => setOpenConfirm(false);

  // logout
  const handleLogout = () => {
    console.log("Logging out...");
    window.location.href = "/login";
  };

  // cross icon -> open register modal with exact range text
  const openRegisterDialog = () => {
    const openedAt =
      localStorage.getItem("registerOpenedAt") || new Date().toISOString();
    const now = new Date().toISOString();
    setRangeLabel(`${formatTs(openedAt)} - ${formatTs(now)}`);
    setOpenRegisterModal(true);
  };

  return (
    <>
      <header className="header" role="banner">
        {/* Left */}
        <div className="header-left">
          <button
            type="button"
            className="menu-icon"
            aria-label="Open menu"
            aria-controls="sidebar-nav"
            aria-expanded={openSidebar}
            onClick={() => setOpenSidebar(true)}   // <-- OPEN SIDEBAR
          >
            <span className="material-icons">menu</span>
          </button>

          <div className="logo-wrap">
            <span className="logo-vasy">Wabi Sabi</span>&nbsp;
            <span className="logo-erp">ERP</span>
          </div>
        </div>

        {/* Center: Salesman */}
        <div className="header-center">
          <div className="salesman">
            <label style={{ marginRight: 6, fontWeight: 500 }}>Salesman:</label>
            {/* Dropdown commented but styles exist; enable when needed */}
            {/* <div className="dropdown" ref={dropdownRef}> ... </div> */}
          </div>
        </div>

        {/* Right */}
        <div className="header-right">
          <span className="material-icons green" aria-hidden="true">
            wifi
          </span>

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
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <span className="material-icons">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>

          {/* Cross → open centered Register Close modal with range label */}
          <button
            type="button"
            className="icon-btn black"
            aria-label={isRegisterOpen ? "Close Register" : "Open Cash Drawer"}
            onClick={openRegisterDialog}
            title="Open Cash Drawer / Close Register"
          >
            <span className="material-icons">close</span>
          </button>

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

      {/* Sidebar + overlay (mounted once, controlled by state) */}
      <Sidebar
        open={openSidebar}
        onClose={() => setOpenSidebar(false)}
        id="sidebar-nav"
      />

      <SettingsPanel open={openSettings} onClose={() => setOpenSettings(false)} />
      <ProductPanel open={openProducts} onClose={() => setOpenProducts(false)} />

      {/* Delete confirmation */}
      <ConfirmModal open={openConfirm} onOk={handleOk} onCancel={handleCancel} />

      {/* Register Close Modal */}
      <RegisterCloseModal
        open={openRegisterModal}
        onClose={() => setOpenRegisterModal(false)}
        rangeLabel={rangeLabel}
        openingCash={0}
        onSubmit={(payload) => {
          console.log("Register close payload:", payload);
          setIsRegisterOpen(false);
          // next shift ke liye (optional) new open time set
          localStorage.setItem("registerOpenedAt", new Date().toISOString());
          setOpenRegisterModal(false);
        }}
      />
    </>
  );
}

export default Header;
