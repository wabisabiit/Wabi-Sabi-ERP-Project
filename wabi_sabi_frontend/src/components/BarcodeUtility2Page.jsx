// src/components/BarcodeUtility2Page.jsx
import React from "react";
import "../styles/BarcodeUtilityPage.css"; // reuse same base styles if you already have

export default function BarcodeUtility2Page() {
  return (
    <div className="bu-wrap with-sb">
      <div className="bu-top">
        <div className="bu-left">
          <span className="material-icons bu-home">home</span>
          <span className="bu-sep">/</span>
          <span className="bu-crumb">Utilities</span>
          <span className="bu-sep">/</span>
          <h1 className="bu-title">Barcode Utility 2</h1>
        </div>
      </div>

      <div className="bu-card">
        <div className="bu-card-head">
          <span className="material-icons">qr_code_2</span>
          <span>Second Barcode Tool</span>
        </div>

        <div className="bu-body" style={{ padding: 16 }}>
          <p style={{ margin: 0 }}>
            This is a placeholder page for <b>Barcode Utility 2</b>. Add your form, table,
            and generation logic here. It’s linked from the sidebar under Utilities.
          </p>
        </div>
      </div>
    </div>
  );
}
