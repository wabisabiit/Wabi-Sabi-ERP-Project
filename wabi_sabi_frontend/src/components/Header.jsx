// src/components/Header.jsx
import React, { useState, useEffect, useRef } from "react";
import ProductPanel from "./ProductPanel";
import "../styles/Header.css";
import ConfirmModal from "./ConfirmModal";
import SettingsPanel from "./SettingsPanel";
import RegisterCloseModal from "./RegisterCloseModal";
import Sidebar from "./Sidebar";
import { listEmployees } from "../api/client";

function Header() {
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ default from localStorage so selection survives reload
  const [selected, setSelected] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("pos.currentSalesman") || "null"
      );
      return saved?.name || "Select Salesman";
    } catch {
      return "Select Salesman";
    }
  });

  const [open, setOpen] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openProducts, setOpenProducts] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(true);
  const [openSidebar, setOpenSidebar] = useState(false);
  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const [rangeLabel, setRangeLabel] = useState("");

  // ---- Salesman data from API ----
  const [salesmen, setSalesmen] = useState([]); // [{id, name}]
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEmpLoading(true);
      setEmpError("");
      try {
        const res = await listEmployees();
        const rows = Array.isArray(res?.results)
          ? res.results
          : Array.isArray(res)
          ? res
          : [];

        // ✅ only STAFF will show in dropdown
        const mapped = rows
          .filter((e) => (e.role || "").toUpperCase() === "STAFF")
          .map((e) => {
            const u = e.user || {};
            const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
            const name = full || u.username || "";
            return name ? { id: e.id, name } : null;
          })
          .filter(Boolean);

        if (!cancelled) {
          setSalesmen(mapped);
        }
      } catch (e) {
        if (!cancelled) {
          setEmpError(e?.message || "Failed to load salesmen");
        }
      } finally {
        if (!cancelled) setEmpLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []); // load once

  const filtered = salesmen.filter((opt) =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // once
  useEffect(() => {
    const saved = localStorage.getItem("registerOpenedAt");
    if (!saved)
      localStorage.setItem("registerOpenedAt", new Date().toISOString());
  }, []);

  // dropdown close on outside/esc
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
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen?.();
  };

  const formatTs = (ts) =>
    new Date(ts).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

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
            onClick={() => setOpenSidebar(true)}
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

            {/* Dropdown */}
            <div className="ws-dd" ref={dropdownRef}>
              <button
                type="button"
                className="ws-dd-selected"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
              >
                <span>{selected}</span>
                <span className="material-icons ws-dd-arrow">
                  {open ? "arrow_drop_up" : "arrow_drop_down"}
                </span>
              </button>

              {open && (
                <div className="ws-dd-menu" role="listbox">
                  <input
                    type="text"
                    className="ws-dd-search"
                    placeholder="Search salesman..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />

                  {empLoading ? (
                    <div
                      className="ws-dd-loading"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "10px",
                      }}
                    >
                      <div className="ws-dd-blue-spinner"></div>
                      <span style={{ color: "#2563eb", fontWeight: 500 }}>
                        Loading salesmen…
                      </span>
                    </div>
                  ) : empError ? (
                    <div className="ws-dd-noresult">
                      {empError || "Failed to load"}
                    </div>
                  ) : (
                    <div className="ws-dd-options">
                      {filtered.length ? (
                        filtered.map((opt) => (
                          <div
                            key={opt.id}
                            className={
                              "ws-dd-option" +
                              (selected === opt.name ? " selected" : "")
                            }
                            onClick={() => {
                              setSelected(opt.name);
                              setSearchTerm("");
                              setOpen(false);

                              // ✅ persist + broadcast selected salesman
                              try {
                                localStorage.setItem(
                                  "pos.currentSalesman",
                                  JSON.stringify(opt)
                                );
                              } catch {}
                              try {
                                window.dispatchEvent(
                                  new CustomEvent("pos:salesman", {
                                    detail: opt,
                                  })
                                );
                              } catch {}
                            }}
                          >
                            {opt.name}
                          </div>
                        ))
                      ) : (
                        <div className="ws-dd-noresult">No results</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* /dropdown */}
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
            aria-label="Discard"
            onClick={() => setOpenConfirm(true)}
          >
            <span className="material-icons">delete</span>
          </button>
          <button
            type="button"
            className="icon-btn black"
            aria-label="Fullscreen"
            onClick={toggleFullscreen}
          >
            <span className="material-icons">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>
          <button
            type="button"
            className="icon-btn black"
            aria-label="Register"
            onClick={openRegisterDialog}
          >
            <span className="material-icons">close</span>
          </button>
          <button
            type="button"
            className="icon-btn black"
            aria-label="Logout"
            onClick={() => (window.location.href = "/login")}
          >
            <span className="material-icons">logout</span>
          </button>
        </div>
      </header>

      <Sidebar
        open={openSidebar}
        onClose={() => setOpenSidebar(false)}
        id="sidebar-nav"
      />
      <SettingsPanel open={openSettings} onClose={() => setOpenSettings(false)} />
      <ProductPanel open={openProducts} onClose={() => setOpenProducts(false)} />
      <ConfirmModal
        open={openConfirm}
        onOk={() => setOpenConfirm(false)}
        onCancel={() => setOpenConfirm(false)}
      />
      <RegisterCloseModal
        open={openRegisterModal}
        onClose={() => setOpenRegisterModal(false)}
        rangeLabel={rangeLabel}
        openingCash={0}
        onSubmit={(payload) => {
          console.log("Register close payload:", payload);
          setIsRegisterOpen(false);
          localStorage.setItem("registerOpenedAt", new Date().toISOString());
          setOpenRegisterModal(false);
        }}
      />
    </>
  );
}

export default Header;
