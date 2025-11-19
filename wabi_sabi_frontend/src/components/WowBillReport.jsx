// src/components/WowBillReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  listOutlets,
  listEmployees,
  listWowBills,
  createWowBill,
} from "../api/client";
import "../styles/WowBillReport.css";

/**
 * Excel-style WOW slab:
 * Location -> { WOW Bill Amount : Rate }
 */
const WOW_SLABS = {
  "Rajori Garden": {
    25000: 400,
    15000: 200,
    8000: 100,
  },
  "Rajori Outside": {
    10000: 200,
    7000: 150,
    3500: 100,
  },
  "Tilak Nagar": {
    8000: 100,
    15000: 200,
    25000: 400,
  },
  "Iffco Chowk": {
    15000: 350,
    10000: 200,
    5000: 100,
  },
  "Urbana M3M": {
    25000: 400,
    15000: 200,
    7000: 100,
  },
  "Udyog Vihar": {
    20000: 300,
    12000: 200,
    6000: 100,
  },
  "Ansal Plaza": {
    20000: 300,
    12000: 200,
    6000: 100,
  },
};

export default function WowBillReportCore() {
  // ---------- Location + Salesperson ----------
  const [outlets, setOutlets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [salespersonId, setSalespersonId] = useState("");

  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // ---------- WOW controls ----------
  // (no Total Sale Amount now)
  const [wowMin, setWowMin] = useState("1000"); // WOW Min Value (₹)
  const [payoutPerWow, setPayoutPerWow] = useState("100"); // Payout / WOW (₹)
  const [excludeReturns, setExcludeReturns] = useState(true);

  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  // ---------- Load outlets + ALL employees on mount ----------
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

  // ---------- Load WOW rows (optionally filtered by location) ----------
  useEffect(() => {
    async function loadRows() {
      try {
        const params = {};
        if (locationId) params.outlet = locationId;
        const data = await listWowBills(params);
        const arr = Array.isArray(data) ? data : data.results || data.data || [];
        setRows(arr);
      } catch (err) {
        console.error(err);
        setError("Unable to load WOW entries.");
      }
    }
    loadRows();
  }, [locationId]);

  // ---------- Helpers ----------
  // default: show ALL employees; when location selected, filter by outlet
  const filteredEmployees = useMemo(() => {
    if (!locationId) return employees;
    return employees.filter((e) => String(e.outlet) === String(locationId));
  }, [employees, locationId]);

  // ensure selected salesperson is valid whenever filter changes
  useEffect(() => {
    if (!filteredEmployees.length) {
      setSalespersonId("");
      return;
    }
    if (
      !salespersonId ||
      !filteredEmployees.some((e) => String(e.id) === String(salespersonId))
    ) {
      setSalespersonId(String(filteredEmployees[0].id));
    }
  }, [filteredEmployees]); // eslint-disable-line react-hooks/exhaustive-deps

  function getOutletLabel(o) {
    if (!o) return "";
    if (o.display_name) return o.display_name;
    if (o.location && o.location.name) return o.location.name;
    if (o.location && o.location.code) return o.location.code;
    return "";
  }

  function getEmployeeName(emp) {
    if (!emp) return "";
    const first = emp.user?.first_name || "";
    const last = emp.user?.last_name || "";
    const full = `${first} ${last}`.trim();
    return full || emp.user?.username || "";
  }

  const selectedOutlet = outlets.find(
    (o) => String(o.id) === String(locationId)
  );
  const selectedEmployee = filteredEmployees.find(
    (e) => String(e.id) === String(salespersonId)
  );

  // ---------- Auto-fill payout from Excel slab ----------
  useEffect(() => {
    if (!selectedOutlet) return;

    const locName =
      selectedOutlet?.location?.name ||
      selectedOutlet?.display_name ||
      selectedOutlet?.location?.code ||
      "";

    const slabs = WOW_SLABS[locName];
    const amount = Number(wowMin || 0);

    if (slabs && amount && slabs[amount]) {
      setPayoutPerWow(String(slabs[amount]));
    }
    // if amount not found in slab, we keep whatever is already in payoutPerWow
  }, [wowMin, selectedOutlet]);

  // ---------- Submit handler ----------
  async function handleSubmit() {
    setError("");

    const wow = Number(wowMin || 0);
    const payout = Number(payoutPerWow || 0);

    if (!locationId) {
      setError("Please select a location.");
      return;
    }
    if (!salespersonId) {
      setError("Please select a salesperson.");
      return;
    }
    if (!wow || !payout) {
      setError("WOW Min Value and payout/WOW are required.");
      return;
    }

    // We don't have Total Sale Amount on UI, so we use wowMin as the sale
    // so that wow_count becomes 1 in the backend formula.
    const sale = wow;

    try {
      const payload = {
        outlet: Number(locationId),
        employee: Number(salespersonId),
        sale_amount: String(sale),
        wow_min_value: String(wow),
        payout_per_wow: String(payout),
        exclude_returns: excludeReturns,
      };

      const saved = await createWowBill(payload);

      // append new row returned by backend
      setRows((prev) => [...prev, saved]);
    } catch (err) {
      console.error(err);
      setError("Failed to save WOW entry.");
    }
  }

  // ---------- Summary per salesperson ----------
  const summary = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.employee; // employee id
      const empObj = employees.find((e) => e.id === row.employee);
      const salesperson =
        row.employee_name || (empObj && getEmployeeName(empObj)) || "";

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

      rec.wowCount += Number.isFinite(wowCount) ? wowCount : 0;
      rec.totalPayout += Number.isFinite(totalPayout) ? totalPayout : 0;
      if (payoutPerWow) rec.payoutPerWow = payoutPerWow;
    });
    return Array.from(map.values());
  }, [rows, employees]);

  const grandTotal = summary.reduce(
    (sum, r) => sum + (Number.isFinite(r.totalPayout) ? r.totalPayout : 0),
    0
  );

  // ---------- UI ----------
  return (
    <div className="wbrc-root">
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
                    <option value="">All locations</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {getOutletLabel(o)}
                      </option>
                    ))}
                  </select>
                  <span className="material-icons">expand_more</span>
                </div>
              </div>

              {/* Salesperson (default: all employees; filtered by location) */}
              <div className="wbrc-field">
                <label>Salesperson</label>
                <div className="wbrc-select">
                  <select
                    value={salespersonId}
                    onChange={(e) => setSalespersonId(e.target.value)}
                    disabled={loadingEmployees || !filteredEmployees.length}
                  >
                    {!filteredEmployees.length && (
                      <option value="">No employees</option>
                    )}
                    {filteredEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {getEmployeeName(emp)}
                      </option>
                    ))}
                  </select>
                  <span className="material-icons">expand_more</span>
                </div>
              </div>

              {/* WOW Min Value */}
              <div className="wbrc-field">
                <label>WOW Min Value (₹)</label>
                <div className="wbrc-input">
                  <input
                    value={wowMin}
                    onChange={(e) =>
                      setWowMin(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Payout / WOW + Submit button */}
              <div className="wbrc-field">
                <label>Payout / WOW (₹)</label>
                <div className="wbrc-input wbrc-input-submit">
                  <input
                    value={payoutPerWow}
                    onChange={(e) =>
                      setPayoutPerWow(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="wbrc-btn wbrc-btn-primary wbrc-submit-btn"
                    onClick={handleSubmit}
                  >
                    Submit
                  </button>
                </div>
              </div>

              {/* Exclude returns */}
              <label className="wbrc-check">
                <input
                  type="checkbox"
                  checked={excludeReturns}
                  onChange={(e) => setExcludeReturns(e.target.checked)}
                />
                <span>Exclude returns</span>
              </label>
            </div>

            {error && <div className="wbrc-error">{error}</div>}
          </div>

          {/* Summary card */}
          <div className="wbrc-card inner">
            <div className="wbrc-section-title">Summary (Per Salesperson)</div>

            <div className="wbrc-grid-table">
              <div className="wbrc-row wbrc-head">
                <div>Salesperson</div>
                <div>WOW Count</div>
                <div>Payout / WOW (₹)</div>
                <div>Total Payout (₹)</div>
              </div>

              {/* Only ~3 rows visible with scroll for more */}
              <div
                className="wbrc-table-body"
                style={{ maxHeight: "180px", overflowY: "auto" }}
              >
                {summary.map((r, idx) => (
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
                <div className="wbrc-grand-value">{grandTotal}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
