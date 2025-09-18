import React from "react";
import "../styles/EmployeePage.css";

export default function EmployeePage() {
  return (
    <div className="emp-wrap">
      <header className="emp-header">
        <h2>Employees</h2>
        <button className="emp-btn">+ Add Employee</button>
      </header>

      <div className="emp-card">
        <div className="emp-empty">
          <span className="material-icons">group</span>
          <p>No employees yet.</p>
          <small>Click “Add Employee” to create your first record.</small>
        </div>
      </div>
    </div>
  );
}
