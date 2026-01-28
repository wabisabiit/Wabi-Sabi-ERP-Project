// src/pages/ReceiptPdfPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/OrderListModal.css";
import { getSaleReceiptPdf, getCreditNotePdf } from "../api/client";

export default function ReceiptPdfPage() {
  const { type, number } = useParams(); // /receipt/:type/:number
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState("");
  const [err, setErr] = useState("");

  const title = useMemo(() => {
    const t = String(type || "").toLowerCase();
    if (t === "sale") return `Receipt - ${number || ""}`;
    if (t === "credit" || t === "credit-note" || t === "creditnote")
      return `Credit Note - ${number || ""}`;
    return `Receipt - ${number || ""}`;
  }, [type, number]);

  useEffect(() => {
    let alive = true;
    let localUrl = "";

    (async () => {
      setLoading(true);
      setErr("");
      setBlobUrl("");
      try {
        const t = String(type || "").toLowerCase();
        const no = String(number || "").trim();

        if (!t || !no) throw new Error("Invalid receipt request.");

        if (t === "sale") {
          localUrl = await getSaleReceiptPdf(no);
        } else if (t === "credit" || t === "credit-note" || t === "creditnote") {
          localUrl = await getCreditNotePdf(no);
        } else {
          throw new Error("Unsupported receipt type for now.");
        }

        if (!alive) return;
        setBlobUrl(localUrl);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load receipt.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      try {
        if (localUrl) URL.revokeObjectURL(localUrl);
      } catch {}
    };
  }, [type, number]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* top bar */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #e6e6e6",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            background: "#fff",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>

        <div style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{title}</div>

        <button
          type="button"
          onClick={() => {
            const iframe = document.getElementById("receipt-iframe");
            try {
              iframe?.contentWindow?.focus();
              iframe?.contentWindow?.print();
            } catch {}
          }}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            background: "#fff",
            borderRadius: 6,
            cursor: "pointer",
          }}
          disabled={!blobUrl}
        >
          Print
        </button>
      </div>

      {/* content */}
      <div style={{ flex: 1, background: "#fafafa" }}>
        {loading ? (
          <div style={{ padding: 16 }}>Loading…</div>
        ) : err ? (
          <div style={{ padding: 16, color: "crimson" }}>{err}</div>
        ) : !blobUrl ? (
          <div style={{ padding: 16 }}>No PDF.</div>
        ) : (
          <iframe
            id="receipt-iframe"
            title="Receipt PDF"
            src={blobUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        )}
      </div>
    </div>
  );
}
