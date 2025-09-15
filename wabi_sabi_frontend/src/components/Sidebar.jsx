import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom"; // ⬅️ add
import "../styles/Sidebar.css";

export default function Sidebar({ open, onClose }) {
  const panelRef = useRef(null);
  const [expandInventory, setExpandInventory] = useState(false);
  const [expandPOS, setExpandPOS] = useState(true); // POS open by default
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

  // optional: close sidebar when the route changes via browser nav
  useEffect(() => {
    const unlisten = navigate((_, { preventScrollReset }) => {
      // no-op, but ensures hook subscription; using NavLink onClick already closes.
      preventScrollReset = true;
    });
    return () => {
      typeof unlisten === "function" && unlisten();
    };
  }, [navigate]);

  const linkClass = ({ isActive }) =>
    `sb-subitem${isActive ? " active" : ""}`;

  const handleNav = (to) => () => {
    onClose?.();
    // NavLink will handle navigation; this is only for keyboard support if needed
  };

  return (
    <>
      {/* overlay */}
      <div
        className={`sb-overlay ${open ? "show" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      {/* panel */}
      <aside
        ref={panelRef}
        className={`sb-panel ${open ? "open" : ""}`}
        role="navigation"
        aria-label="Main menu"
      >
        {/* header row with collapse icon */}
        <div className="sb-top">
          <button className="sb-burger" onClick={onClose} aria-label="Close">
            <span className="material-icons">menu</span>
          </button>
          <div className="sb-brand">Wabi&nbsp;Sabi</div>
        </div>

        {/* items */}
        <nav className="sb-items">
          {/* Dashboard (optional route) */}
          <NavLink to="/new" className="sb-item" onClick={onClose}>
            <span className="material-icons sb-ic">dashboard</span>
            <span className="sb-text">Dashboard</span>
          </NavLink>

          {/* Inventory (collapsible) */}
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
            <div
              id="sb-inventory-sub"
              className={`sb-sub ${expandInventory ? "show" : ""}`}
            >
              {/* placeholders — hook these to real routes when ready */}
              <a className="sb-subitem" href="#stock">Stock</a>
              <a className="sb-subitem" href="#transfers">Transfers</a>
              <a className="sb-subitem" href="#adjustments">Adjustments</a>
            </div>
          </div>

          {/* POS (collapsible) */}
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
              {/* ✅ use NavLink so URL -> /new, /order-list, ... and active class works */}
              <NavLink to="/new" className={linkClass} onClick={onClose}>
                New
              </NavLink>
              <NavLink to="/order-list" className={linkClass} onClick={onClose}>
                Order List
              </NavLink>
              <NavLink to="/credit-note" className={linkClass} onClick={onClose}>
                Credit Note
              </NavLink>
              <NavLink to="/sales-register" className={linkClass} onClick={onClose}>
                Sales Register
              </NavLink>
            </div>
          </div>
        </nav>

        {/* footer helper / socials */}
        <div className="sb-foot">
          <div className="sb-tip-title">Want insider tips &amp; updates?</div>
          <div className="sb-tip-sub">Follow us:</div>
          <div className="sb-socials">
            <a href="#ig" aria-label="Instagram">
              <span className="material-icons">photo_camera</span>
            </a>
            <a href="#fb" aria-label="Facebook">
              <span className="material-icons">thumb_up</span>
            </a>
            <a href="#li" aria-label="LinkedIn">
              <span className="material-icons">work</span>
            </a>
            <a href="#yt" aria-label="YouTube">
              <span className="material-icons">play_circle_filled</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
