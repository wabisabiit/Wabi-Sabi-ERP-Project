import React, { useEffect, useState, useMemo } from "react";
import "../styles/HoldBillPanel.css";
import { listHoldBills, restoreHoldBill } from "../api/client";

export default function HoldBillPanel({ open, onClose, onLoadBill }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false); // 🔵 NEW: restore spinner
  const [error, setError] = useState("");

  // load active hold bills when panel opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function fetchBills() {
      setLoading(true);
      setError("");
      try {
        const data = await listHoldBills();
        if (!cancelled) {
          setRows(data);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Failed to load hold bills.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBills();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const num = (r.number || "").toLowerCase();
      const cname = (r.customer_name || "").toLowerCase();
      const cphone = (r.customer_phone || "").toLowerCase();
      return (
        num.includes(q) || cname.includes(q) || cphone.includes(q)
      );
    });
  }, [rows, search]);

  const handleRowClick = async (row) => {
    try {
      setRestoring(true); // 🔵 show restoring spinner

      const res = await restoreHoldBill(row.number);
      if (!res || res.ok === false) {
        alert(res?.message || "Failed to restore hold bill.");
        setRestoring(false);
        return;
      }

      // send to parent (PosPage)
      if (typeof onLoadBill === "function") {
        onLoadBill(res);
      } else {
        try {
          window.dispatchEvent(
            new CustomEvent("pos:hold-loaded", { detail: res })
          );
        } catch (e) {
          console.warn("Failed to dispatch pos:hold-loaded event", e);
        }
      }

      setRestoring(false);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("Error while restoring hold bill.");
      setRestoring(false);
    }
  };

  if (!open) return null;

  return (
    <div className="holdbill-overlay">
      <aside className="holdbill-panel">

        {/* Header */}
        <div className="holdbill-header">
          <h3>On Hold</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Search */}
        <div className="holdbill-search">
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="dropdown-btn" aria-label="More">
            <span className="material-icons">arrow_drop_down</span>
          </button>
        </div>

        {/* Body */}
        <div className="holdbill-body">

          {/* 🔵 GLOBAL LOADING SPINNER */}
          {loading && (
            <div className="hb-center">
              <div className="hb-spinner"></div>
              <p>Loading...</p>
            </div>
          )}

          {!loading && error && <p className="hb-error">{error}</p>}

          {/* 🔵 No Data */}
          {!loading && !error && filtered.length === 0 && (
            <p>No Data Available</p>
          )}

          {/* 🔵 RESTORING SPINNER OVER TABLE */}
          {restoring && (
            <div className="hb-restore-overlay">
              <div className="hb-restore-box">
                <div className="hb-spinner"></div>
                <div>Restoring bill...</div>
              </div>
            </div>
          )}

          {/* Table */}
          {!loading && !error && filtered.length > 0 && (
            <table className="holdbill-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Hold Bill No</th>
                  <th>Customer</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="holdbill-row"
                    onClick={() => handleRowClick(row)}
                  >
                    <td>{row.serial}</td>

                    {/* 🔵 clickable + blue link */}
                    <td className="hb-link">{row.number}</td>

                    <td>
                      {(row.customer_name || "Walk In") +
                        (row.customer_phone
                          ? ` (${row.customer_phone})`
                          : "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </aside>
    </div>
  );
}
