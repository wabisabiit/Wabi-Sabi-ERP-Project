// src/components/CashControlModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../styles/CashControlModal.css";
import { apiMe, getRegisterSessionToday, openRegisterSession } from "../api/client";

export default function CashControlModal({ open, onClose }) {
  const [mode, setMode] = useState("opening");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");

  // ✅ NEW: opening display + meta
  const [openingCash, setOpeningCash] = useState("0");
  const [lastUser, setLastUser] = useState("—");
  const [lastDateTime, setLastDateTime] = useState("—");

  // ✅ NEW: edit opening cash inline (pencil)
  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [openingDraft, setOpeningDraft] = useState("");

  // ⬇️ background fixed & no scrollbar when modal is open
  useEffect(() => {
    if (open) {
      document.body.classList.add("ccm-no-scroll");
    } else {
      document.body.classList.remove("ccm-no-scroll");
    }
    return () => document.body.classList.remove("ccm-no-scroll");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ✅ NEW: load opening cash + manager name + datetime
  useEffect(() => {
    if (!open) return;

    setIsEditingOpening(false);
    setOpeningDraft("");
    setOpeningCash("0");
    setLastUser("—");
    setLastDateTime("—");

    (async () => {
      try {
        const [me, sess] = await Promise.all([
          apiMe().catch(() => null),
          getRegisterSessionToday().catch(() => null),
        ]);

        const oc =
          sess && typeof sess.opening_cash !== "undefined"
            ? String(sess.opening_cash ?? "0")
            : "0";

        setOpeningCash(oc);
        setOpeningDraft(oc);

        // manager name (prefer employee full name)
        const emp = me?.employee || null;
        const outlet = emp?.outlet || null;
        const locName = outlet?.location?.name || outlet?.name || "";

        const managerName =
          emp?.name ||
          me?.full_name ||
          me?.username ||
          me?.user?.username ||
          "—";

        // show "Manager (Location)" if location present
        const userLabel = locName ? `${managerName} (${locName})` : managerName;

        // date-time (prefer session opened_at; fallback now)
        const openedAt =
          sess?.opened_at || sess?.created_at || sess?.updated_at || null;

        const dt = openedAt
          ? new Date(openedAt)
          : null;

        const dtLabel =
          dt && !Number.isNaN(dt.getTime())
            ? dt.toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "—";

        setLastUser(userLabel || "—");
        setLastDateTime(dtLabel || "—");
      } catch (e) {
        // keep default dashes
        console.error("CashControlModal load failed", e);
      }
    })();
  }, [open]);

  const openingCashPretty = useMemo(() => {
    const n = Number(openingCash);
    if (Number.isFinite(n)) return String(n);
    return String(openingCash || "0");
  }, [openingCash]);

  const saveOpening = async () => {
    const val = String(openingDraft || "").trim();
    const safe = val === "" ? "0" : val;

    try {
      // uses your existing backend endpoint
      await openRegisterSession({ opening_cash: safe });

      setOpeningCash(safe);
      setIsEditingOpening(false);

      // update meta instantly
      setLastDateTime(
        new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      );
    } catch (e) {
      console.error("Failed to save opening cash", e);
      alert(e?.message || "Failed to save opening cash.");
    }
  };

  if (!open) return null;

  return (
    <div
      className="ccm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Cash Control"
    >
      <div className="ccm-modal">
        <div className="ccm-header">
          <h3 className="ccm-title">Cash Control</h3>
          <button className="ccm-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="ccm-radio-row">
          <label className={`ccm-radio ${mode === "opening" ? "is-active" : ""}`}>
            <input
              type="radio"
              name="ccm-mode"
              checked={mode === "opening"}
              onChange={() => setMode("opening")}
            />
            <span className="ccm-dot" />
            <span>Opening Balance</span>
          </label>

          <label className={`ccm-radio ${mode === "add" ? "is-active" : ""}`}>
            <input
              type="radio"
              name="ccm-mode"
              checked={mode === "add"}
              onChange={() => setMode("add")}
            />
            <span className="ccm-dot" />
            <span>Add Money In</span>
          </label>
        </div>

        {mode === "opening" && (
          <div className="ccm-opening">
            <div className="ccm-row">
              <span className="ccm-label">Today's opening Cash In Hand:</span>

              <span className="ccm-value">
                {isEditingOpening ? (
                  <>
                    <input
                      type="number"
                      value={openingDraft}
                      onChange={(e) => setOpeningDraft(e.target.value)}
                      style={{
                        width: 120,
                        padding: "6px 8px",
                        border: "1px solid #d8dde6",
                        borderRadius: 8,
                        fontSize: 14,
                        marginRight: 8,
                      }}
                    />
                    <button
                      className="ccm-save"
                      onClick={saveOpening}
                      style={{ padding: "6px 10px", borderRadius: 8 }}
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    {openingCashPretty}
                    <button
                      className="ccm-pencil"
                      aria-label="Edit"
                      onClick={() => {
                        setOpeningDraft(openingCashPretty);
                        setIsEditingOpening(true);
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: 18 }}>
                        edit
                      </span>
                    </button>
                  </>
                )}
              </span>
            </div>

            <div className="ccm-meta">
              <div className="ccm-meta-line">
                <span className="ccm-meta-label">Last changes made by</span>
              </div>
              <div className="ccm-meta-line">
                <span className="ccm-k">User:</span>
                <span className="ccm-v">{lastUser || "—"}</span>
              </div>
              <div className="ccm-meta-line">
                <span className="ccm-k">Date and Time:</span>
                <span className="ccm-v">{lastDateTime || "—"}</span>
              </div>
            </div>
          </div>
        )}

        {mode === "add" && (
          <div className="ccm-add">
            <div className="ccm-form">
              <div className="ccm-field">
                <label>
                  Amount<span className="ccm-req">*</span>
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="ccm-field">
                <label>Remark</label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </div>
              <div className="ccm-form-actions">
                <button
                  className="ccm-save"
                  onClick={() => {
                    /* API hook */
                  }}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="ccm-table-wrap">
              <div className="ccm-table-title">Cash In Hand</div>
              <table className="ccm-table">
                <thead>
                  <tr>
                    <th>Sr No.</th>
                    <th>Opening Amount</th>
                    <th>Created On</th>
                    <th>Updated On</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>0</td>
                    <td>09/09/2025 12:30:10 pm</td>
                    <td>09/09/2025 12:30:10 pm</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              <div className="ccm-pager">
                <button className="ccm-page-btn" disabled>
                  &lt;
                </button>
                <button className="ccm-page-btn is-current">1</button>
                <button className="ccm-page-btn" disabled>
                  &gt;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
