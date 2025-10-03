import React, { useState } from "react";
import "../styles/ReportsPage.css";


const TABS = [
  { key: "fav", label: "Favourite", icon: "grade" },
  { key: "sales", label: "Sales", icon: "shopping_cart" },
  { key: "purchase", label: "Purchase", icon: "shopping_bag" },
  { key: "inventory", label: "Inventory", icon: "inventory_2" },
  { key: "accounts", label: "Accounts", icon: "badge" },
  { key: "gst", label: "GST Returns", icon: "assignment" },
  { key: "other", label: "Other", icon: "show_chart" },
];

export default function ReportsPage() {
  const [active, setActive] = useState("fav");

  return (
    <div className="rp-wrap">
      {/* breadcrumb/title row */}
      <div className="rp-top">
        <div className="rp-title">Reports</div>
        <div className="rp-crumb">
          <span className="material-icons-outlined">home</span>
        </div>
      </div>

      {/* Blue tab strip */}
      <div className="rp-strip">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`rp-tab ${active === t.key ? "active" : ""}`}
            onClick={() => setActive(t.key)}
            type="button"
          >
            <div className="rp-tab-icon">
              <span className="material-icons-outlined">{t.icon}</span>
            </div>
            <div className="rp-tab-label">{t.label}</div>
          </button>
        ))}
      </div>

      {/* Section headline */}
      <div className="rp-section-title">
        {active === "fav" ? "FAVOURITE" : TABS.find((x) => x.key === active)?.label?.toUpperCase()}
      </div>

      {/* Big empty content surface (as in screenshot) */}
      <div className="rp-surface" />
    </div>
  );
}
