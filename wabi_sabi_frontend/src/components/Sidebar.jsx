// src/components/Sidebar.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "../styles/Sidebar.css";

export default function Sidebar({ open, onClose, persistent = false, miniHover = false }) {
  const panelRef = useRef(null);

  const [expandInventory, setExpandInventory] = useState(false);
  const [expandPOS, setExpandPOS] = useState(true);
  const [expandAdmin, setExpandAdmin] = useState(true);
  const [expandUtilities, setExpandUtilities] = useState(false);
  const [expandSettings, setExpandSettings] = useState(false);
  const [expandCRM, setExpandCRM] = useState(false);
  const [expandBankCash, setExpandBankCash] = useState(false);

  const location = useLocation();
  const isPath = (prefix) => location.pathname.startsWith(prefix);

  // ── Mini-hover: force icons-only on Credit Note Item Register route ──
  const ICONS_ONLY_ROUTES = [
    "/reports/credit-note-item-register",
    "/reports/credit-note-tem-register", // safeguard for typo
  ];
  const forceMini = ICONS_ONLY_ROUTES.some((p) => isPath(p));
  // Respect incoming prop OR force on the target route
  const mini = miniHover || forceMini;

  // mini-hover collapse/expand width
  const COLLAPSED_W = 56;
  const EXPANDED_W = 260;
  const [collapsed, setCollapsed] = useState(!!mini);

  useEffect(() => {
    if (mini) setCollapsed(true);
    else setCollapsed(false);
  }, [mini, location.pathname]);

  // Close on ESC (when not persistent)
  useEffect(() => {
    if (!open || persistent) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, persistent, onClose]);

  // Focus first focusable when opened
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    el && el.focus();
  }, [open]);

  // Auto-expand groups based on route
  useEffect(() => {
    if (isPath("/crm")) setExpandCRM(true);
    if (isPath("/bank")) setExpandBankCash(true);
    if (isPath("/utilities")) setExpandUtilities(true);
    if (isPath("/settings")) setExpandSettings(true);
    if (isPath("/inventory")) setExpandInventory(true);
  }, [location]);

  const linkClass = ({ isActive }) => `sb-subitem${isActive ? " active" : ""}`;
  const handleNav = () => { if (!persistent) onClose?.(); };

  // helpers to hide/show text when collapsed
  const textStyle = collapsed ? { width: 0, opacity: 0, pointerEvents: "none" } : {};
  const caretStyle = collapsed ? { opacity: 0, pointerEvents: "none" } : {};

  return (
    <>
      {/* overlay */}
      <div
        className={`sb-overlay ${open ? "show" : ""} ${persistent ? "persistent-hide" : ""}`}
        onClick={() => !persistent && onClose?.()}
        aria-hidden={!open}
      />

      {/* panel */}
      <aside
        ref={panelRef}
        className={`sb-panel ${open ? "open" : ""} ${persistent ? "persistent" : ""} ${mini ? "mini-hover" : ""}`}
        role="navigation"
        aria-label="Main menu"
        style={{
          width: mini ? (collapsed ? COLLAPSED_W : EXPANDED_W) : undefined,
          transition: "width 160ms ease"
        }}
        onMouseEnter={() => mini && setCollapsed(false)}
        onMouseLeave={() => mini && setCollapsed(true)}
      >
        {/* header */}
        <div className="sb-top">
          <button
            className="sb-burger"
            onClick={() => !persistent && onClose?.()}
            aria-label="Close"
          >
            <span className="material-icons">menu</span>
          </button>
          <div className="sb-brand" style={textStyle}>Wabi&nbsp;Sabi</div>
        </div>

        {/* items */}
        <nav className="sb-items">
          {/* Dashboard */}
          <NavLink to="/new" className="sb-item" onClick={handleNav}>
            <span className="material-icons sb-ic">dashboard</span>
            <span className="sb-text" style={textStyle}>Dashboard</span>
          </NavLink>

          {/* Contact */}
          <div className="sb-group">
            <NavLink
              to="/contact"
              className={({ isActive }) => `sb-item${isActive ? " active" : ""}`}
              onClick={handleNav}
            >
              <span className="material-icons sb-ic">contacts</span>
              <span className="sb-text" style={textStyle}>Contact</span>
            </NavLink>
          </div>

          {/* Admin */}
          <div className="sb-group">
            <button
              className="sb-item"
              onClick={() => setExpandAdmin((v) => !v)}
              aria-expanded={expandAdmin}
              aria-controls="sb-admin-sub"
              type="button"
            >
              <span className="material-icons sb-ic">admin_panel_settings</span>
              <span className="sb-text" style={textStyle}>Admin</span>
              <span className="material-icons sb-caret" style={caretStyle}>
                {expandAdmin ? "expand_less" : "expand_more"}
              </span>
            </button>

            <div id="sb-admin-sub" className={`sb-sub ${expandAdmin ? "show" : ""}`} style={textStyle}>
              <NavLink to="/admin/employee" className={linkClass} onClick={handleNav}>Employee</NavLink>
              <NavLink to="/admin/outlet" className={linkClass} onClick={handleNav}>Outlet</NavLink>
            </div>
          </div>

          {/* Inventory */}
          <div className="sb-group">
            <button
              className="sb-item"
              onClick={() => setExpandInventory((v) => !v)}
              aria-expanded={expandInventory}
              aria-controls="sb-inventory-sub"
              type="button"
            >
              <span className="material-icons sb-ic">inventory_2</span>
              <span className="sb-text" style={textStyle}>Inventory</span>
              <span className="material-icons sb-caret" style={caretStyle}>
                {expandInventory ? "expand_less" : "expand_more"}
              </span>
            </button>
            <div id="sb-inventory-sub" className={`sb-sub ${expandInventory ? "show" : ""}`} style={textStyle}>
              <NavLink to="/inventory/products" className={linkClass} onClick={handleNav}>Products</NavLink>
              <NavLink to="/inventory/stock-transfer" className={linkClass} onClick={handleNav}>Stock Transfer</NavLink>
            </div>
          </div>

          {/* Bank / Cash */}
          <div className="sb-group">
            <button
              className={`sb-item ${expandBankCash ? "open" : ""}`}
              onClick={() => setExpandBankCash((v) => !v)}
              aria-expanded={expandBankCash}
              aria-controls="sb-bank-sub"
              type="button"
            >
              <span className="material-icons sb-ic">account_balance_wallet</span>
              <span className="sb-text" style={textStyle}>Bank / Cash</span>
              <span className="material-icons sb-caret" style={caretStyle}>
                {expandBankCash ? "expand_less" : "expand_more"}
              </span>
            </button>
            <div id="sb-bank-sub" className={`sb-sub ${expandBankCash ? "show" : ""}`} style={textStyle}>
              <NavLink to="/bank" end className={linkClass} onClick={handleNav}>Bank</NavLink>
              <NavLink to="/bank/transactions" className={linkClass} onClick={handleNav}>Bank Transaction</NavLink>
              <NavLink to="/bank/payment" className={linkClass} onClick={handleNav}>Payment</NavLink>
              <NavLink to="/bank/receipt" className={linkClass} onClick={handleNav}>Receipt</NavLink>
              <NavLink to="/bank/expense" className={linkClass} onClick={handleNav}>Expense</NavLink>
            </div>
          </div>

          {/* POS */}
          <div className="sb-group">
            <button
              className="sb-item"
              onClick={() => setExpandPOS((v) => !v)}
              aria-expanded={expandPOS}
              aria-controls="sb-pos-sub"
              type="button"
            >
              <span className="material-icons sb-ic">point_of_sale</span>
              <span className="sb-text" style={textStyle}>POS</span>
              <span className="material-icons sb-caret" style={caretStyle}>
                {expandPOS ? "expand_less" : "expand_more"}
              </span>
            </button>

            <div id="sb-pos-sub" className={`sb-sub ${expandPOS ? "show" : ""}`} style={textStyle}>
              <NavLink to="/new" className={linkClass} onClick={handleNav}>New</NavLink>
              <NavLink to="/order-list" className={linkClass} onClick={handleNav}>Order List</NavLink>
              <NavLink to="/credit-note" className={linkClass} onClick={handleNav}>Credit Note</NavLink>
              <NavLink to="/sales-register" className={linkClass} onClick={handleNav}>Sales Register</NavLink>
            </div>
          </div>

          {/* CRM */}
          <div className="sb-group">
            <button
              className={`sb-item ${expandCRM ? "open" : ""}`}
              onClick={() => setExpandCRM((v) => !v)}
              aria-expanded={expandCRM}
              aria-controls="sb-crm-sub"
              type="button"
            >
              <span className="material-icons sb-ic">diversity_3</span>
              <span className="sb-text" style={textStyle}>CRM</span>
              <span className="material-icons sb-caret" style={caretStyle}>
                {expandCRM ? "expand_less" : "expand_more"}
              </span>
            </button>

            <div id="sb-crm-sub" className={`sb-sub ${expandCRM ? "show" : ""}`} style={textStyle}>
              <NavLink to="/crm/coupon" className={linkClass} onClick={handleNav}>Coupon</NavLink>
              <NavLink to="/crm/discount" className={linkClass} onClick={handleNav}>Discount</NavLink>
              <NavLink to="/crm/loyalty" className={linkClass} onClick={handleNav}>Loyalty</NavLink>
              <NavLink to="/crm/feedback" className={linkClass} onClick={handleNav}>Feedback</NavLink>
            </div>
          </div>

          {/* Utilities */}
          <div className="sb-group">
            <button
              className="sb-item"
              onClick={() => setExpandUtilities((v) => !v)}
              aria-expanded={expandUtilities}
              aria-controls="sb-utils-sub"
              type="button"
            >
              <span className="material-icons sb-ic">build</span>
              <span className="sb-text" style={textStyle}>Utilities</span>
              <span className="material-icons sb-caret" style={caretStyle}>
                {expandUtilities ? "expand_less" : "expand_more"}
              </span>
            </button>

            <div id="sb-utils-sub" className={`sb-sub ${expandUtilities ? "show" : ""}`} style={textStyle}>
              <NavLink to="/utilities/barcode" className={linkClass} onClick={handleNav}>Barcode Utility</NavLink>
              <NavLink to="/utilities/barcode2" className={linkClass} onClick={handleNav}>Barcode Utility 2</NavLink>
            </div>
          </div>

          {/* Reports */}
          <NavLink to="/reports" className="sb-item" onClick={handleNav}>
            <span className="material-icons sb-ic">insights</span>
            <span className="sb-text" style={textStyle}>Report</span>
          </NavLink>

          {/* Settings */}
          <div className="sb-group">
            <button
              className="sb-item"
              onClick={() => setExpandSettings((v) => !v)}
              aria-expanded={expandSettings}
              aria-controls="sb-settings-sub"
              type="button"
            >
              <span className="material-icons sb-ic">settings</span>
              <span className="sb-text" style={textStyle}>Settings</span>
              <span className="material-icons sb-caret" style={caretStyle}>
                {expandSettings ? "expand_less" : "expand_more"}
              </span>
            </button>

            <div id="sb-settings-sub" className={`sb-sub ${expandSettings ? "show" : ""}`} style={textStyle}>
              <NavLink to="/settings/general" className={linkClass} onClick={handleNav}>General</NavLink>
              <NavLink to="/settings/pos" className={linkClass} onClick={handleNav}>POS</NavLink>
              <NavLink to="/settings/notification" className={linkClass} onClick={handleNav}>Notification</NavLink>
              <NavLink to="/settings/integration" className={linkClass} onClick={handleNav}>Integration</NavLink>
            </div>
          </div>
        </nav>

        {/* footer */}
        <div className="sb-foot" style={textStyle}>
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
