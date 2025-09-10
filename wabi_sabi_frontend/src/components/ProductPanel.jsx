import React, { useEffect } from "react";
import "../styles/ProductPanel.css";

export default function ProductPanel({ open, onClose }) {
  // 🚫 If closed, render nothing (prevents auto show)
  if (!open) return null;

  // ESC to close
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="prod-overlay" role="presentation" onClick={onClose}>
      <aside
        className="prod-drawer open"
        role="dialog"
        aria-label="Product List"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="prod-header">
          <span className="prod-title">Product List</span>
          <button type="button" className="prod-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="prod-body">
          <div className="field">
            <select className="select" defaultValue="">
              <option value="">Select Category and Subcategory</option>
            </select>
          </div>

          <div className="nodata">No Data Available</div>
        </div>
      </aside>
    </div>
  );
}
