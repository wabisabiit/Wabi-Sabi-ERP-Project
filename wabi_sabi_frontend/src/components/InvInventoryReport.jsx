import React, { useEffect, useRef, useState } from "react";
import "../styles/InventoryReports.css";

export default function InvInventoryReport() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const tickRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    // Animate 0→99%
    tickRef.current = setInterval(() => {
      setProgress((p) => Math.min(99, p + Math.max(3, Math.floor(Math.random() * 8))));
    }, 220);

    // Finish at ~2.8s, download, then hide
    endRef.current = setTimeout(() => {
      if (tickRef.current) clearInterval(tickRef.current);
      setProgress(100);

      // Empty Excel-compatible file (CSV, but named .xlsx for easy open)
      const csv = "\uFEFF"; // BOM – Excel-friendly, no content
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "inventory-report.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setTimeout(() => setVisible(false), 600);
    }, 2800);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (endRef.current) clearTimeout(endRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="dl-overlay">
      <div className="dl-box" role="dialog" aria-live="polite" aria-label="Downloading file">
        <div className="dl-title">Downloading File… {progress} %</div>
        <div className="dl-bar">
          <div className="dl-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
