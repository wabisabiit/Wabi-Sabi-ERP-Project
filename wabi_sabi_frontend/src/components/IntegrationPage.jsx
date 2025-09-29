// src/components/IntegrationPage.jsx
import React, { useMemo, useState } from "react";
import "../styles/IntegrationPage.css";

const TOP_TABS = ["Ecommerce", "Payment", "Messages", "Loyalty", "GST", "Vasy API", "Self Checkout"];

/* ============ Searchable Dropdown ============ */
function SearchSelect({ label, placeholder = "Select...", options, value, onChange, align = "left", width }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => options.filter(o => o.toLowerCase().includes(q.trim().toLowerCase())),
    [options, q]
  );

  return (
    <div className="ip-ss-field" style={{ justifySelf: align === "right" ? "end" : "start", width }}>
      <label className="ip-ss-label">
        {label} <span className="ip-req">*</span>
      </label>

      <div
        className={`ip-ss ${open ? "open" : ""}`}
        tabIndex={0}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
      >
        <button
          type="button"
          className="ip-ss-btn"
          onClick={() => setOpen(o => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={`ip-ss-placeholder ${value ? "has" : ""}`}>{value || placeholder}</span>
          <span className="material-icons ip-ss-caret">arrow_drop_down</span>
        </button>

        {open && (
          <div className={`ip-ss-pop ${align === "right" ? "right" : "left"}`} role="listbox">
            <input
              autoFocus
              className="ip-ss-search"
              placeholder=""
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="ip-ss-list">
              {filtered.length === 0 ? (
                <div className="ip-ss-empty">No results</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`ip-ss-opt ${opt === value ? "sel" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    {opt}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ Reusable Card ============ */
function IntegrationCard({ brand, logo, btnText, offByDefault }) {
  const [on, setOn] = useState(!offByDefault);

  return (
    <div className="ip-card">
      <div className="ip-card-head">
        <div className="ip-brand">
          <div className="ip-logo">{logo}</div>
          <div className="ip-brand-name">
            <span className="ip-brand-text">{brand}</span>
          </div>
        </div>
        <button className="ip-card-arrow" type="button" aria-label="Open">
          <span className="material-icons">chevron_right</span>
        </button>
      </div>

      <div className="ip-card-foot">
        <button className="ip-mini-toggle" onClick={() => setOn((v) => !v)} type="button" aria-pressed={on}>
          <span className={`ip-dot ${on ? "on" : ""}`} />
        </button>
        <span className="ip-activate">{btnText}</span>
      </div>
    </div>
  );
}

/* ============ Page ============ */
export default function IntegrationPage() {
  const [active, setActive] = useState("Ecommerce");

  // Payment filters
  const BANK_OPTIONS = useMemo(() => ["AXIS BANK UDYOG BIHAR"], []);
  const EDC_OPTIONS = useMemo(() => ["Paytm", "PhonePe", "ICICI", "Pine Labs", "Ezetap", "Mswipe"], []);
  const [bank, setBank] = useState("");
  const [edc, setEdc] = useState("");

  return (
    <div className="ip-wrap">
      {/* Breadcrumb / header */}
      <div className="ip-bc">
        <div className="ip-bc-left">
          <span className="material-icons ip-home">home</span>
          <span className="ip-title">Integration</span>
        </div>
      </div>

      {/* Top tabs */}
      <div className="ip-tabs">
        {TOP_TABS.map((t) => (
          <button
            key={t}
            className={`ip-tab ${active === t ? "active" : ""}`}
            onClick={() => setActive(t)}
            type="button"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="ip-body">
        {/* Ecommerce tab: ONLY WooCommerce + Shopify */}
        {active === "Ecommerce" && (
          <div className="ip-cards">
            <div className="ip-card">
              <div className="ip-card-head">
                <div className="ip-brand">
                  <div className="ip-logo">
                    <span className="ip-woo">woo</span>
                  </div>
                  <div className="ip-brand-name">
                    <span className="ip-brand-text">WooCommerce</span>
                  </div>
                </div>
                <button className="ip-card-arrow" type="button" aria-label="Open">
                  <span className="material-icons">chevron_right</span>
                </button>
              </div>
              <div className="ip-card-foot">
                <button className="ip-mini-toggle" type="button" aria-pressed="true">
                  <span className="ip-dot on" />
                </button>
                <span className="ip-activate">Activate Service</span>
              </div>
            </div>

            <div className="ip-card">
              <div className="ip-card-head">
                <div className="ip-brand">
                  <div className="ip-logo">
                    <img
                      className="ip-shopify-logo"
                      alt="Shopify"
                      src="https://upload.wikimedia.org/wikipedia/commons/0/0e/Shopify_logo_2018.svg"
                    />
                  </div>
                  <div className="ip-brand-name">
                    <span className="ip-brand-text">Shopify</span>
                  </div>
                </div>
                <button className="ip-card-arrow" type="button" aria-label="Open">
                  <span className="material-icons">chevron_right</span>
                </button>
              </div>
              <div className="ip-card-foot">
                <button className="ip-mini-toggle" type="button" aria-pressed="false">
                  <span className="ip-dot" />
                </button>
                <span className="ip-activate">Activate Service</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment tab with filters + logos */}
        {active === "Payment" && (
          <>
            {/* Filters row */}
            <div className="ip-filters">
              <SearchSelect
                label="Select Bank"
                placeholder="Select Bank"
                options={BANK_OPTIONS}
                value={bank}
                onChange={setBank}
                align="left"
                width={280}
              />
              <SearchSelect
                label="EDC Type"
                placeholder="Select..."
                options={EDC_OPTIONS}
                value={edc}
                onChange={setEdc}
                align="right"
                width={220}
              />
            </div>

            {/* Cards grid */}
            <div className="ip-cards">
              <IntegrationCard
                brand="Cashfree"
                logo={<img className="ip-pay-logo" src="/img/integration/cashfree.png" alt="Cashfree" />}
                btnText="Activate Service"
                offByDefault
              />
              <IntegrationCard
                brand="Razorpay"
                logo={<img className="ip-pay-logo" src="/img/integration/razorpay.png" alt="Razorpay" />}
                btnText="Activate Service"
                offByDefault
              />
              <IntegrationCard
                brand="Paytm"
                logo={<img className="ip-pay-logo" src="/img/integration/paytm.webp" alt="Paytm" />}
                btnText="Activate Service"
                offByDefault
              />
              <IntegrationCard
                brand="Instamojo"
                logo={<img className="ip-pay-logo" src="/img/integration/instamojo.png" alt="Instamojo" />}
                btnText="Activate Service"
                offByDefault
              />
              <IntegrationCard
                brand="Pine Labs"
                logo={<img className="ip-pay-logo" src="/img/integration/pinlabs.png" alt="Pine Labs" />}
                btnText="Activate Service"
                offByDefault
              />
              <IntegrationCard
                brand="Ezetap"
                logo={<img className="ip-pay-logo" src="/img/integration/ezetap.png" alt="Ezetap" />}
                btnText="Activate Service"
                offByDefault
              />
              <IntegrationCard
                brand="Mswipe"
                logo={<img className="ip-pay-logo" src="/img/integration/mswipe.png" alt="Mswipe" />}
                btnText="Activate Service"
                offByDefault
              />
              <IntegrationCard
                brand="PhonePe"
                logo={<img className="ip-pay-logo" src="/img/integration/phonepay.png" alt="PhonePe" />}
                btnText="Activate Service"
                offByDefault
              />
              <IntegrationCard
                brand="ICICI"
                logo={<img className="ip-pay-logo" src="/img/integration/icici.png" alt="ICICI Bank" />}
                btnText="Activate Service"
                offByDefault
              />
            </div>
          </>
        )}

        {/* Placeholders for other tabs */}
        {active !== "Ecommerce" && active !== "Payment" && (
          <div className="ip-empty">
            <div className="ip-empty-card">
              <span className="material-icons">info</span>
              <div>Nothing to configure in “{active}” yet.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
