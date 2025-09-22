import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import "../styles/Sidebar.css";

export default function Sidebar({ open, onClose, persistent = false }) {
  const panelRef = useRef(null);
  const [expandInventory, setExpandInventory] = useState(false);
  const [expandPOS, setExpandPOS] = useState(true);     // POS open by default
  const [expandAdmin, setExpandAdmin] = useState(true); // Admin open by default
  const location = useLocation();
  const isPath = (prefix) => location.pathname.startsWith(prefix);

  // NEW: Utilities section state (closed by default)
  const [expandUtilities, setExpandUtilities] = useState(false);

  // NEW: CRM section state (closed by default)
  const [expandCRM, setExpandCRM] = useState(false);

  const navigate = useNavigate();

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // focus first focusable when opened
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = panelRef.current.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable && focusable.focus();
  }, [open]);

  // subscribe to nav changes (no-op but keeps hook parity)
  useEffect(() => {
    const unlisten = navigate((_, { preventScrollReset }) => {
      preventScrollReset = true;
    });
    return () => {
      typeof unlisten === "function" && unlisten();
    };
  }, [navigate]);

  const linkClass = ({ isActive }) => `sb-subitem${isActive ? " active" : ""}`;
  const handleNav = () => onClose?.();

  return (
    <>
      {/* overlay */}
      <div
        className={`sb-overlay ${open ? "show" : ""} ${persistent ? "persistent-hide" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      {/* panel */}
      <aside
        ref={panelRef}
        className={`sb-panel ${open ? "open" : ""} ${persistent ? "persistent" : ""}`}
        role="navigation"
        aria-label="Main menu"
      >
        {/* header */}
        <div className="sb-top">
          <button className="sb-burger" onClick={onClose} aria-label="Close">
            <span className="material-icons">menu</span>
          </button>
          <div className="sb-brand">Wabi&nbsp;Sabi</div>
        </div>

        {/* items */}
        <nav className="sb-items">
          {/* Dashboard */}
          <NavLink to="/new" className="sb-item" onClick={onClose}>
            <span className="material-icons sb-ic">dashboard</span>
            <span className="sb-text">Dashboard</span>
          </NavLink>

          <div className="sb-group">
            {/* Contact */}
            <NavLink
              to="/contact"
              className={({ isActive }) => `sb-item${isActive ? " active" : ""}`}
              onClick={onClose}
            >
              <span className="material-icons sb-ic">contacts</span>
              <span className="sb-text">Contact</span>
            </NavLink>
          </div>

          {/* Admin */}
          <div className="sb-group">
            <button
              className="sb-item"
              onClick={() => setExpandAdmin((v) => !v)}
              aria-expanded={expandAdmin}
              aria-controls="sb-admin-sub"
            >
              <span className="material-icons sb-ic">admin_panel_settings</span>
              <span className="sb-text">Admin</span>
              <span className="material-icons sb-caret">
                {expandAdmin ? "expand_less" : "expand_more"}
              </span>
            </button>

            <div id="sb-admin-sub" className={`sb-sub ${expandAdmin ? "show" : ""}`}>
              <NavLink to="/admin/employee" className={linkClass} onClick={handleNav}>
                Employee
              </NavLink>
              <NavLink to="/admin/outlet" className={linkClass} onClick={handleNav}>
                Outlet
              </NavLink>
            </div>
          </div>

          {/* Inventory */}
          <div className="sb-group">
            <button
              className="sb-item"
              onClick={() => setExpandInventory((v) => !v)}
              aria-expanded={expandInventory}
              aria-controls="sb-inventory-sub"
            >
              <span className="material-icons sb-ic">inventory_2</span>
              <span className="sb-text">Inventory</span>
              <span className="material-icons sb-caret">
                {expandInventory ? "expand_less" : "expand_more"}
              </span>
            </button>
            <div id="sb-inventory-sub" className={`sb-sub ${expandInventory ? "show" : ""}`}>
              <a className="sb-subitem" href="#stock">Stock</a>
              <a className="sb-subitem" href="#transfers">Transfers</a>
              <a className="sb-subitem" href="#adjustments">Adjustments</a>
            </div>
          </div>

          {/* POS */}
          <div className="sb-group">
            <button
              className="sb-item"
              onClick={() => setExpandPOS((v) => !v)}
              aria-expanded={expandPOS}
              aria-controls="sb-pos-sub"
            >
              <span className="material-icons sb-ic">point_of_sale</span>
              <span className="sb-text">POS</span>
              <span className="material-icons sb-caret">
                {expandPOS ? "expand_less" : "expand_more"}
              </span>
            </button>

            <div id="sb-pos-sub" className={`sb-sub ${expandPOS ? "show" : ""}`}>
              <NavLink to="/new" className={linkClass} onClick={onClose}>New</NavLink>
              <NavLink to="/order-list" className={linkClass} onClick={onClose}>Order List</NavLink>
              <NavLink to="/credit-note" className={linkClass} onClick={onClose}>Credit Note</NavLink>
              <NavLink to="/sales-register" className={linkClass} onClick={onClose}>Sales Register</NavLink>
            </div>
          </div>

          {/* NEW: CRM */}
          {/* CRM */}
          <div className="sb-group">
            <button
              className={`sb-item ${expandCRM || isPath("/crm") ? "active" : ""}`}
              onClick={() => setExpandCRM((v) => !v)}
              aria-expanded={expandCRM}
              aria-controls="sb-crm-sub"
            >
              <span className="material-icons sb-ic">diversity_3</span>
              <span className="sb-text">CRM</span>
              <span className="material-icons sb-caret">
                {expandCRM ? "expand_less" : "expand_more"}
              </span>
            </button>

            <div id="sb-crm-sub" className={`sb-sub ${expandCRM ? "show" : ""}`}>
              {/* NEW: Coupon */}
              <NavLink
                to="/crm/coupon"
                className={linkClass}
                onClick={handleNav}
              >
                Coupon
              </NavLink>

              {/* Existing: Loyalty */}
              <NavLink
                to="/crm/loyalty"
                className={linkClass}
                onClick={handleNav}
              >
                Loyalty
              </NavLink>
            </div>
          </div>


          {/* NEW: Utilities */}
          <div className="sb-group">
            <button
              className="sb-item"
              onClick={() => setExpandUtilities((v) => !v)}
              aria-expanded={expandUtilities}
              aria-controls="sb-utils-sub"
            >
              <span className="material-icons sb-ic">build</span>
              <span className="sb-text">Utilities</span>
              <span className="material-icons sb-caret">
                {expandUtilities ? "expand_less" : "expand_more"}
              </span>
            </button>

            <div id="sb-utils-sub" className={`sb-sub ${expandUtilities ? "show" : ""}`}>
              <NavLink
                to="/utilities/barcode"
                className={linkClass}
                onClick={handleNav}
              >
                Barcode Utility
              </NavLink>
            </div>
          </div>
        </nav>

        {/* footer */}
        <div className="sb-foot">
          <div className="sb-tip-title">Want insider tips &amp; updates?</div>
          <div className="sb-tip-sub">Follow us:</div>
          <div className="sb-socials">
            <a href="#ig" aria-label="Instagram"><span className="material-icons">photo_camera</span></a>
            <a href="#fb" aria-label="Facebook"><span className="material-icons">thumb_up</span></a>
            <a href="#li" aria-label="LinkedIn"><span className="material-icons">work</span></a>
            <a href="#yt" aria-label="YouTube"><span className="material-icons">play_circle_filled</span></a>
          </div>
        </div>
      </aside>
    </>
  );
}
