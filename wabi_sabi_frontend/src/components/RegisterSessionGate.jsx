// src/components/RegisterSessionGate.jsx
import React, { useEffect, useState } from "react";
import { getRegisterSessionToday, openRegisterSession } from "../api/client";

export default function RegisterSessionGate({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [openingCash, setOpeningCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const s = await getRegisterSessionToday();
      setSession(s || null);
      // prefill if backend sends opening_cash
      if (s && typeof s.opening_cash !== "undefined") {
        setOpeningCash(String(s.opening_cash ?? ""));
      }
    } catch (e) {
      setSession(null);
      setErr(e?.message || "Failed to load register session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOpen = !!session?.is_open;

  const onOpenRegister = async () => {
    setErr("");
    setBusy(true);
    try {
      const val = String(openingCash || "").trim();
      await openRegisterSession({
        opening_cash: val === "" ? "0" : val,
      });
      await load();
    } catch (e) {
      setErr(e?.message || "Failed to open register session.");
    } finally {
      setBusy(false);
    }
  };

  // While loading: render a lightweight loader (prevents white flash)
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
          fontSize: 14,
          color: "#444",
        }}
      >
        Checking register session...
      </div>
    );
  }

  // If session is open → show POS immediately
  if (isOpen) return children;

  // Otherwise show popup and block POS
  return (
    <>
      {/* keep screen blank behind modal (so POS doesn't show) */}
      <div />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 16,
        }}
      >
        <div
          style={{
            width: "min(520px, 95vw)",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Open Register Session
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
              {session?.range_label
                ? `Business Date: ${session.range_label}`
                : "Please open today’s register session before starting POS."}
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <label style={{ display: "block", fontSize: 13, color: "#444" }}>
              Opening Cash
            </label>

            <input
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              style={{
                width: "100%",
                marginTop: 8,
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 10,
                outline: "none",
                fontSize: 14,
              }}
            />

            {err ? (
              <div style={{ marginTop: 10, color: "#b00020", fontSize: 13 }}>
                {err}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={load}
                disabled={busy}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: busy ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={onOpenRegister}
                disabled={busy}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#111",
                  color: "#fff",
                  cursor: busy ? "not-allowed" : "pointer",
                  fontWeight: 700,
                }}
              >
                {busy ? "Opening..." : "Open & Continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
