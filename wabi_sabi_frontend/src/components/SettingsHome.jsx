// src/components/SettingsHome.jsx
import React from "react";
import { NavLink } from "react-router-dom";

export default function SettingsHome() {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Settings</h2>
      <p>Choose a settings category:</p>
      <NavLink to="/settings/general">Go to General →</NavLink>
    </div>
  );
}
