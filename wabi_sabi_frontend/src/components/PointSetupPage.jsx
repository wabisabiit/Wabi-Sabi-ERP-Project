import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/PointSetupPage.css";

export default function PointSetupPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [points, setPoints] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    // TODO: API call here
    // console.log({ amount, points });
  };

  return (
    <div className="ps-wrap">
      {/* Header card */}
      <div className="ps-head-card">
        <div className="ps-head-left">
          <span className="material-icons home-ic">home</span>
          <span className="head-title">PointSetup</span>
        </div>
      </div>

      {/* Main card with tabs + form */}
      <div className="ps-card">
        {/* Tabs */}
        <div className="ps-tabs" role="tablist">
          <button
            className="ps-tab"
            role="tab"
            aria-selected="false"
            onClick={() => navigate("/crm/loyalty")}
          >
            Campaign
          </button>
          <button
            className="ps-tab active"
            role="tab"
            aria-selected="true"
            onClick={() => {}}
          >
            Point Setup
          </button>
        </div>

        <hr className="ps-divider" />

        {/* Earn Points form (two inputs with "=" in middle) */}
        <form className="ps-form" onSubmit={onSubmit}>
          <div className="ps-section-title">Earn Points</div>

          <div className="ps-grid">
            {/* Amount */}
            <div className="ps-field">
              <label className="ps-label">
                Amount<span className="req">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="Enter amount"
                className="ps-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {/* Equals sign */}
            <div className="ps-equals">=</div>

            {/* Point */}
            <div className="ps-field">
              <label className="ps-label">
                Point<span className="req">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Enter points"
                className="ps-input"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="ps-btn">Submit</button>
        </form>
      </div>
    </div>
  );
}
