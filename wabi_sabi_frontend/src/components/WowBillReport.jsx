// src/components/WowBillReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listOutlets,
  listEmployees,
  listWowBills,
} from "../api/client";
import "../styles/WowBillReport.css";

export default function WowBillReportCore() {
  const navigate = useNavigate();

  // ---------- Location + employees ----------
  const [outlets, setOutlets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locationId, setLocationId] = useState("");

  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);

  // ---------- Date range controls ----------
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Exclude returns toggle (kept for future logic)
  const [excludeReturns] = useState(true);

  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  // ---------- Load outlets + employees on mount ----------
  useEffect(() => {
    async function loadOutletsAndEmployees() {
      setLoadingOutlets(true);
      setLoadingEmployees(true);
      try {
        const [outletData, empData] = await Promise.all([
          listOutlets(),
          listEmployees(),
        ]);

        const outletArr = Array.isArray(outletData)
          ? outletData
          : outletData.results || outletData.data || [];
        const empArr = Array.isArray(empData)
          ? empData
          : empData.results || empData.data || [];

        setOutlets(outletArr);
        setEmployees(empArr);
      } catch (err) {
        console.error(err);
        setError("Unable to load locations or employees.");
      } finally {
        setLoadingOutlets(false);
        setLoadingEmployees(false);
      }
    }

    loadOutletsAndEmployees();
  }, []);

  // ---------- Helpers ----------
  function getOutletLabel(o) {
    if (!o) return "";
    if (o.display_name) return o.display_name;
    if (o.location && o.location.name) return o.location.name;
    if (o.location && o.location.code) return o.location.code;
    return "";
  }

  function getEmployeeNameById(empId) {
    const emp = employees.find((e) => String(e.id) === String(empId));
    if (!emp) return "";
    const first = emp.user?.first_name || "";
    const last = emp.user?.last_name || "";
    const full = `${first} ${last}`.trim();
    return full || emp.user?.username || "";
  }

  // ---------- Submit = load WOW rows for location + date range ----------
  async function handleSubmit() {
    setError("");

    if (!locationId) {
      setError("Please select a location.");
      return;
    }
    if (!dateFrom || !dateTo) {
      setError("Please select both Date From and Date To.");
      return;
    }

    setLoadingRows(true);
    try {
      const params = {
        outlet: locationId,
        date_from: dateFrom,
        date_to: dateTo,
      };
      const data = await listWowBills(params);
      const arr = Array.isArray(data)
        ? data
        : data.results || data.data || [];
      setRows(arr);
    } catch (err) {
      console.error(err);
      setError("Failed to load WOW bill report for this range.");
    } finally {
      setLoadingRows(false);
    }
  }

  // ---------- Summary per salesperson ----------
  const summary = useMemo(() => {
    const map = new Map();

    rows.forEach((row) => {
      // only rows of the selected outlet
      if (locationId && String(row.outlet) !== String(locationId)) {
        return;
      }

      const key = row.employee; // employee id
      const salesperson =
        row.employee_name || getEmployeeNameById(row.employee);

      if (!map.has(key)) {
        map.set(key, {
          salesperson,
          wowCount: 0,
          payoutPerWow: 0,
          totalPayout: 0,
        });
      }

      const rec = map.get(key);
      const wowCount = Number(row.wow_count || 0);
      const totalPayout = Number(row.total_payout || 0);
      const payoutPerWow = Number(row.payout_per_wow || 0);

      // WOW Count = total WOWs in the period for that staff
      rec.wowCount += Number.isFinite(wowCount) ? wowCount : 0;

      // Total Payout = sum across all WOW entries
      rec.totalPayout += Number.isFinite(totalPayout)
        ? totalPayout
        : 0;

      // Payout / WOW: same rate, keep last non-zero
      if (Number.isFinite(payoutPerWow) && payoutPerWow > 0) {
        rec.payoutPerWow = payoutPerWow;
      }
    });

    return Array.from(map.values());
  }, [rows, employees, locationId]);

  const grandTotal = summary.reduce(
    (sum, r) =>
      sum + (Number.isFinite(r.totalPayout) ? r.totalPayout : 0),
    0
  );

  const initialLoading =
    (loadingOutlets || loadingEmployees) && outlets.length === 0;

  // ---------- UI ----------
  return (
    <div className="wbrc-root">
      {/* Global overlay spinner while first data load */}
      {initialLoading && (
        <div className="wbrc-loading-overlay">
          <div className="wbrc-spinner" />
          <span>Loading data...</span>
        </div>
      )}

      {/* Top app bar */}
      <div className="wbrc-appbar">
        <div className="wbrc-container">
          <div className="wbrc-appbar-row">
            <div className="wbrc-titlewrap">
              <h1 className="wbrc-title">Wow Bill Report</h1>
              <span
                className="material-icons wbrc-home"
                aria-label="Home"
                role="img"
              >
                home
              </span>
            </div>

            {/* ➕ Create New button – goes to Wow Bill Slab page */}
            <button
              type="button"
              className="wbrc-btn wbrc-btn-primary"
              onClick={() => navigate("/reports/wow-bill-slab")}
            >
              Create New
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="wbrc-container wbrc-main">
        <div className="wbrc-card">
          {/* Controls card */}
          <div className="wbrc-card inner">
            <div className="wbrc-section-title">Controls</div>

            <div className="wbrc-controls-grid">
              {/* Location */}
              <div className="wbrc-field">
                <label>Location</label>
                <div className="wbrc-select">
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    disabled={loadingOutlets}
                  >
                    <option value="">Select location</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {getOutletLabel(o)}
                      </option>
                    ))}
                  </select>
                  <span className="material-icons">expand_more</span>
                </div>
              </div>

              {/* Date From */}
              <div className="wbrc-field">
                <label>Date From</label>
                <div className="wbrc-input">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
              </div>

              {/* Date To + Submit */}
              <div className="wbrc-field">
                <label>Date To</label>
                <div className="wbrc-input wbrc-input-submit">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                  <button
                    type="button"
                    className="wbrc-btn wbrc-btn-primary wbrc-submit-btn"
                    onClick={handleSubmit}
                    disabled={
                      loadingRows || loadingOutlets || loadingEmployees
                    }
                  >
                    {loadingRows ? (
                      <>
                        <span className="wbrc-btn-spinner" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      "Submit"
                    )}
                  </button>
                </div>
              </div>

              {/* Exclude returns (visual only for now) */}
              <div className="wbrc-field">
                <label>&nbsp;</label>
                <label className="wbrc-check">
                  <input
                    type="checkbox"
                    checked={excludeReturns}
                    readOnly
                  />
                  <span>Exclude returns</span>
                </label>
              </div>
            </div>

            {error && <div className="wbrc-error">{error}</div>}
          </div>

          {/* Summary card */}
          <div className="wbrc-card inner">
            <div className="wbrc-section-title">
              Summary (Per Salesperson)
            </div>

            <div className="wbrc-grid-table">
              <div className="wbrc-row wbrc-head">
                <div>Salesperson</div>
                <div>WOW Count</div>
                <div>Payout / WOW (₹)</div>
                <div>Total Payout (₹)</div>
              </div>

              <div
                className="wbrc-table-body"
                style={{ maxHeight: "180px", overflowY: "auto" }}
              >
                {loadingRows && (
                  <div className="wbrc-row">
                    <div>Loading...</div>
                    <div />
                    <div />
                    <div />
                  </div>
                )}

                {!loadingRows && summary.length === 0 && (
                  <div className="wbrc-row">
                    <div>No data for this filter.</div>
                    <div />
                    <div />
                    <div />
                  </div>
                )}

                {!loadingRows &&
                  summary.map((r, idx) => (
                    <div key={idx} className="wbrc-row">
                      <div>{r.salesperson}</div>
                      <div>{r.wowCount}</div>
                      <div>{r.payoutPerWow}</div>
                      <div>{r.totalPayout}</div>
                    </div>
                  ))}
              </div>

              <div className="wbrc-grand">
                <div>Grand Total</div>
                <div className="wbrc-grand-value">
                  {grandTotal}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
