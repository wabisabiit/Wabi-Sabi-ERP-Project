import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/MasterPackInvoicePage.css";

export default function MasterPackInvoicePage() {
  const { number } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState(null);

  const lines = useMemo(() => data?.lines || [], [data]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/master-packs/${encodeURIComponent(number)}/`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`Load failed (${res.status}): ${t}`);
        }
        const json = await res.json();
        setData(json);
      } catch (e) {
        setToast({ type: "err", msg: e.message || String(e) });
        setTimeout(() => setToast(null), 2200);
      } finally {
        setLoading(false);
      }
    })();
  }, [number]);

  return (
    <div style={{ padding: 14 }}>
      {toast && (
        <div className={`mpi-toast ${toast.type === "ok" ? "ok" : "err"}`}>{toast.msg}</div>
      )}

      <div className="mpi-head">
        <button className="mpi-back" onClick={() => nav(-1)}>← Back</button>
        <h1>Master Pack: {number}</h1>
      </div>

      {loading ? (
        <div className="mpi-card">Loading...</div>
      ) : !data ? (
        <div className="mpi-card">No data</div>
      ) : (
        <>
          <div className="mpi-card mpi-meta">
            <div><b>From:</b> {(data?.from_location?.code || "")} {data?.from_location?.name ? `- ${data.from_location.name}` : ""}</div>
            <div><b>To:</b> {(data?.to_location?.code || "")} {data?.to_location?.name ? `- ${data.to_location.name}` : ""}</div>
            <div><b>Date:</b> {data?.created_at ? new Date(data.created_at).toLocaleString() : ""}</div>
          </div>

          <div className="mpi-card">
            <table className="mpi-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>S.No</th>
                  <th>Barcode</th>
                  <th>Name</th>
                  <th style={{ width: 90 }}>Qty</th>
                  <th style={{ width: 120 }}>SP</th>
                  <th style={{ width: 140 }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {lines.length ? (
                  lines.map((ln, i) => (
                    <tr key={`${ln.barcode}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{ln.barcode}</td>
                      <td>{ln.name || ""}</td>
                      <td>{ln.qty}</td>
                      <td>₹{Number(ln.sp || 0).toFixed(2)}</td>
                      <td>{ln?.location?.code || ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} style={{ padding: 12, color: "#6b7280" }}>No items</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
