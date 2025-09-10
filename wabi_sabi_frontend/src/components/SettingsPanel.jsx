import React, { useState } from "react";
import "../styles/SettingsPanel.css";

function SettingsPanel({ open, onClose }) {
  const [printer, setPrinter] = useState("Default");
  const [barcodeUpper, setBarcodeUpper] = useState(false);
  const [customerDisplay, setCustomerDisplay] = useState(false);

  return (
    <div className={`settings-panel ${open ? "open" : ""}`}>
      <div className="settings-header">
        <h3>Setting</h3>
        <span className="material-icons close-btn" onClick={onClose}>
          close
        </span>
      </div>

      {/* Print Dropdown */}
      <div className="settings-item">
        <label>Print</label>
        <select
          value={printer}
          onChange={(e) => setPrinter(e.target.value)}
          className="settings-select"
        >
          <option value="Default">Default</option>
          <option value="Printer 1">Printer 1</option>
          <option value="Printer 2">Printer 2</option>
        </select>
      </div>

      {/* Barcode Checkbox */}
      <div className="settings-item">
        <input
          type="checkbox"
          checked={barcodeUpper}
          onChange={(e) => setBarcodeUpper(e.target.checked)}
        />
        <label>Barcode Uppercase Scan</label>
      </div>

      {/* Toggle Switch */}
      <div className="settings-item toggle">
        <label>Enable Customer Facing Display</label>
        <div
          className={`toggle-btn ${customerDisplay ? "on" : ""}`}
          onClick={() => setCustomerDisplay(!customerDisplay)}
        >
          {customerDisplay ? "On" : "Off"}
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
