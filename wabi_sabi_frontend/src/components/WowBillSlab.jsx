// src/components/WowBillSlab.jsx
import React, { useEffect, useState } from "react";
import {
  listOutlets,
  listWowSlabs,
  createWowSlab,
  updateWowSlab,
  deleteWowSlab,
} from "../api/client";
import "../styles/WowBillSlab.css";

export default function WowBillSlab() {
  const [outlets, setOutlets] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [rows, setRows] = useState([{ id: 1, minAmount: "", wowAmount: "" }]);

  const [existingSlabs, setExistingSlabs] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [loadingSlabs, setLoadingSlabs] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success"); // "success" | "error"

  // small helper
  const showToast = (msg, type = "success") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 2500);
  };

  /* ---------- Load outlets + slabs on mount ---------- */
  useEffect(() => {
    async function loadOutlets() {
      setLoadingOutlets(true);
      try {
        const res = await listOutlets();
        const arr = Array.isArray(res) ? res : res.results || res.data || [];
        setOutlets(arr);
      } catch (e) {
        console.error(e);
        setError("Unable to load locations.");
        showToast("Unable to load locations.", "error");
      } finally {
        setLoadingOutlets(false);
      }
    }

    async function loadSlabs() {
      setLoadingSlabs(true);
      try {
        const res = await listWowSlabs();
        const arr = Array.isArray(res) ? res : res.results || res.data || [];
        setExistingSlabs(arr);
      } catch (e) {
        console.error(e);
        setError("Unable to load WOW slabs.");
        showToast("Unable to load WOW slabs.", "error");
      } finally {
        setLoadingSlabs(false);
      }
    }

    loadOutlets();
    loadSlabs();
  }, []);

  const refreshSlabs = async () => {
    setLoadingSlabs(true);
    try {
      const res = await listWowSlabs();
      const arr = Array.isArray(res) ? res : res.results || res.data || [];
      setExistingSlabs(arr);
    } catch (e) {
      console.error(e);
      showToast("Unable to refresh slabs.", "error");
    } finally {
      setLoadingSlabs(false);
    }
  };

  function getOutletLabel(o) {
    if (!o) return "";
    if (o.display_name) return o.display_name;
    if (o.location?.name) return o.location.name;
    if (o.location?.code) return o.location.code;
    return "";
  }

  const handleRowChange = (id, field, value) => {
    const clean = value.replace(/[^0-9]/g, "");
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: clean } : r))
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        minAmount: "",
        wowAmount: "",
      },
    ]);
  };

  const handleRemoveRow = (id) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const resetForm = () => {
    setLocationId("");
    setRows([{ id: 1, minAmount: "", wowAmount: "" }]);
    setEditingId(null);
    setError("");
  };

  const handleSave = async () => {
    setError("");

    if (!locationId) {
      setError("Please select a location.");
      showToast("Please select a location.", "error");
      return;
    }

    const cleanedRows = rows
      .map((r) => ({
        minAmount: Number(r.minAmount || 0),
        wowAmount: Number(r.wowAmount || 0),
      }))
      .filter((r) => r.minAmount && r.wowAmount);

    if (!cleanedRows.length) {
      setError("Please enter at least one valid slab row.");
      showToast("Please enter at least one valid slab row.", "error");
      return;
    }

    setSaving(true);
    try {
      const promises = [];

      // If we are editing an existing slab, first row updates it
      if (editingId && cleanedRows.length) {
        const first = cleanedRows[0];
        promises.push(
          updateWowSlab(editingId, {
            outlet: Number(locationId),
            min_amount: String(first.minAmount),
            payout_per_wow: String(first.wowAmount),
          })
        );
        // any additional rows become NEW slabs
        cleanedRows.slice(1).forEach((r) => {
          promises.push(
            createWowSlab({
              outlet: Number(locationId),
              min_amount: String(r.minAmount),
              payout_per_wow: String(r.wowAmount),
            })
          );
        });
      } else {
        // purely creating new rows
        cleanedRows.forEach((r) => {
          promises.push(
            createWowSlab({
              outlet: Number(locationId),
              min_amount: String(r.minAmount),
              payout_per_wow: String(r.wowAmount),
            })
          );
        });
      }

      await Promise.all(promises);
      await refreshSlabs();
      resetForm();
      showToast("WOW slab(s) saved successfully.");
    } catch (e) {
      console.error(e);
      const msg =
        e?.message || "Failed to save WOW slabs (maybe duplicate min amount).";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEditRow = (slab) => {
    setEditingId(slab.id);
    setLocationId(String(slab.outlet));
    setRows([
      {
        id: slab.id,
        minAmount: String(slab.min_amount || slab.minAmount || ""),
        wowAmount: String(
          slab.payout_per_wow || slab.wowAmount || ""
        ),
      },
    ]);
    setError("");
  };

  const handleDeleteRow = async (slab) => {
    const ok = window.confirm("Delete this WOW slab?");
    if (!ok) return;

    setSaving(true);
    try {
      await deleteWowSlab(slab.id);
      await refreshSlabs();
      if (editingId === slab.id) {
        resetForm();
      }
      showToast("WOW slab deleted.");
    } catch (e) {
      console.error(e);
      showToast("Failed to delete WOW slab.", "error");
    } finally {
      setSaving(false);
    }
  };

  const isBusy = loadingOutlets || loadingSlabs || saving;

  return (
    <div className="wbs-root">
      {/* Spinner overlay */}
      {isBusy && (
        <div className="wbs-spinner-overlay">
          <div className="wbs-spinner" />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`wbs-toast wbs-toast-${toastType}`}>
          {toast}
        </div>
      )}

      {/* Top bar */}
      <div className="wbs-appbar">
        <div className="wbs-container">
          <div className="wbs-appbar-row">
            <div className="wbs-titlewrap">
              <h1 className="wbs-title">Wow Bill Slab</h1>
            </div>
            <button
              type="button"
              className="wbs-btn wbs-btn-outline"
              onClick={resetForm}
            >
              Create New
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="wbs-container wbs-main">
        <div className="wbs-card">
          {/* Controls */}
          <div className="wbs-card inner">
            <div className="wbs-section-title">
              {editingId ? "Edit Slab" : "Controls"}
            </div>

            {/* Location field */}
            <div className="wbs-controls-row">
              <div className="wbs-field wbs-field-location">
                <label>Set Location</label>
                <div className="wbs-select">
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
            </div>

            {/* Amount rows with horizontal scroll */}
            <div className="wbs-slabs-scroll">
              <div className="wbs-slabs-wrapper">
                <div className="wbs-slabs-header">
                  <div>Add Min Amount (₹)</div>
                  <div>WOW Bill Amount (₹)</div>
                  <div />
                </div>

                {rows.map((row, index) => (
                  <div key={row.id} className="wbs-slabs-row">
                    <div className="wbs-input">
                      <input
                        value={row.minAmount}
                        onChange={(e) =>
                          handleRowChange(row.id, "minAmount", e.target.value)
                        }
                        placeholder="e.g., 500"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="wbs-input">
                      <input
                        value={row.wowAmount}
                        onChange={(e) =>
                          handleRowChange(row.id, "wowAmount", e.target.value)
                        }
                        placeholder="e.g., 100"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="wbs-row-actions">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          className="wbs-icon-btn"
                          onClick={() => handleRemoveRow(row.id)}
                          aria-label="Remove row"
                        >
                          <span className="material-icons">close</span>
                        </button>
                      )}
                      <span className="wbs-row-index">{index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom buttons */}
            <div className="wbs-controls-footer">
              <button
                type="button"
                className="wbs-btn wbs-btn-ghost"
                onClick={handleAddRow}
              >
                Add New +
              </button>
              <button
                type="button"
                className="wbs-btn wbs-btn-primary"
                onClick={handleSave}
                disabled={isBusy}
              >
                {editingId ? "Update" : "Save"}
              </button>
            </div>

            {error && <div className="wbs-error">{error}</div>}
          </div>

          {/* Existing slabs */}
          <div className="wbs-card inner">
            <div className="wbs-section-title">Existing Slabs</div>

            <div className="wbs-table-scroll">
              <table className="wbs-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Location</th>
                    <th>Slab Details</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {!existingSlabs.length && (
                    <tr>
                      <td colSpan="4" className="wbs-empty">
                        No slabs added yet.
                      </td>
                    </tr>
                  )}
                  {existingSlabs.map((s, index) => (
                    <tr key={s.id}>
                      <td>{index + 1}</td>
                      <td>{s.outlet_name}</td>
                      <td>
                        ₹{s.min_amount} → ₹{s.payout_per_wow}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="wbs-icon-btn wbs-icon-edit"
                          onClick={() => handleEditRow(s)}
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button
                          type="button"
                          className="wbs-icon-btn wbs-icon-delete"
                          onClick={() => handleDeleteRow(s)}
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
