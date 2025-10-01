// src/components/IntegrationPage.jsx
import React, { useMemo, useState } from "react";
import "../styles/IntegrationPage.css";

const TOP_TABS = ["Ecommerce", "Payment", "Messages", "Loyalty", "GST"];

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

/* ===== Messages helper bits (toggle + provider card) ===== */
function Toggle({ checked, onChange, label }) {
  return (
    <label className="msg-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="msg-toggle-track"><span className="msg-toggle-thumb" /></span>
      <span className="msg-toggle-label">{label}</span>
    </label>
  );
}

function MessageProviderCard({ brand, logo, on, setOn }) {
  return (
    <div className="msg-card">
      <div className="msg-card-name">{brand}</div>
      <div className="msg-card-logo">{logo}</div>
      <button
        type="button"
        className={`msg-card-btn ${on ? "on" : ""}`}
        onClick={() => setOn(v => !v)}
        aria-label="Open"
        title="Open"
      >
        <span className="material-icons">arrow_right_alt</span>
      </button>
    </div>
  );
}

/* ===== New SMS Template Modal ===== */
function SmsTemplateModal({ open, onClose, onSave }) {
  const EVENT_OPTIONS = ["Customer Registration", "Order Placed", "Order Shipped", "OTP", "Custom"];
  const [event, setEvent] = useState("");
  const [tplName, setTplName] = useState("");
  const [dltId, setDltId] = useState("");
  const [senderId, setSenderId] = useState("");
  const [text, setText] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  if (!open) return null;

  const len = text.length;
  const seg = Math.max(1, Math.ceil(len / 160));
  const rem = seg * 160 - len;

  return (
    <div className="msgm-overlay" role="dialog" aria-modal="true">
      <div className="msgm-card">
        {/* Header */}
        <div className="msgm-header">
          <h3>New SMS Template</h3>
          <button className="msgm-close" type="button" aria-label="Close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="msgm-body">
          <div className="msgm-grid">
            <div className="msgm-field">
              <label className="msgm-label">
                Select Event <span className="req">*</span>
              </label>
              <div className="msgm-select">
                <SearchSelect
                  placeholder="Select..."
                  options={EVENT_OPTIONS}
                  value={event}
                  onChange={setEvent}
                  align="left"
                />
              </div>
            </div>

            <div className="msgm-field">
              <label className="msgm-label">
                SMS Template Name <span className="req">*</span>
              </label>
              <input
                className="msgm-input"
                placeholder="SMS Template Name"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
              />
            </div>

            <div className="msgm-field">
              <label className="msgm-label">
                DLT Template ID <span className="req">*</span>
              </label>
              <input
                className="msgm-input"
                placeholder="Enter DLT Template Id"
                value={dltId}
                onChange={(e) => setDltId(e.target.value)}
              />
            </div>

            <div className="msgm-field">
              <label className="msgm-label">Sender ID</label>
              <input
                className="msgm-input"
                placeholder="Enter Sender Id"
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
              />
            </div>
          </div>

          <div className="msgm-field">
            <label className="msgm-label">
              Text Message <span className="req">*</span>
            </label>
            <textarea
              className="msgm-textarea"
              placeholder="Enter Text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <label className="msgm-default">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <span>Default</span>
          </label>

          <div className="msgm-metrics">
            <span><b>Messages:</b> {seg}</span>
            <span><b>Length:</b> {len}</span>
            <span><b>Remaining:</b> {rem}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="msgm-footer">
          <button type="button" className="msgm-btn msgm-btn-light" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="msgm-btn msgm-btn-primary"
            onClick={() => onSave?.({ event, tplName, dltId, senderId, text, isDefault })}
          >
            Save
          </button>
        </div>
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

  // Messages tab state
  const [msgChannel, setMsgChannel] = useState("SMS"); // "SMS" | "Whatsapp"
  const [allowPromo, setAllowPromo] = useState(false);
  const [defaultSender, setDefaultSender] = useState("VASYERP");
  const [prov1, setProv1] = useState(true);   // MSG91
  const [prov2, setProv2] = useState(false);  // Text Local
  const [prov3, setProv3] = useState(false);  // Twilio

  // Whatsapp state
  const [waDefault, setWaDefault] = useState(""); // dropdown value for WhatsApp default selection

  // Modal
  const [showSmsModal, setShowSmsModal] = useState(false);

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
        {/* Ecommerce tab */}
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

        {/* Payment tab */}
        {active === "Payment" && (
          <>
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

            <div className="ip-cards">
              <IntegrationCard brand="Cashfree" logo={<img className="ip-pay-logo" src="/img/integration/cashfree.png" alt="Cashfree" />} btnText="Activate Service" offByDefault />
              <IntegrationCard brand="Razorpay" logo={<img className="ip-pay-logo" src="/img/integration/razorpay.png" alt="Razorpay" />} btnText="Activate Service" offByDefault />
              <IntegrationCard brand="Paytm" logo={<img className="ip-pay-logo" src="/img/integration/paytm2.png" alt="Paytm" />} btnText="Activate Service" offByDefault />
              <IntegrationCard brand="Instamojo" logo={<img className="ip-pay-logo" src="/img/integration/instamojo.png" alt="Instamojo" />} btnText="Activate Service" offByDefault />
              <IntegrationCard brand="Pine Labs" logo={<img className="ip-pay-logo" src="/img/integration/pinlabs.png" alt="Pine Labs" />} btnText="Activate Service" offByDefault />
              <IntegrationCard brand="Ezetap" logo={<img className="ip-pay-logo" src="/img/integration/ezetap.png" alt="Ezetap" />} btnText="Activate Service" offByDefault />
              <IntegrationCard brand="Mswipe" logo={<img className="ip-pay-logo" src="/img/integration/mswipe.png" alt="Mswipe" />} btnText="Activate Service" offByDefault />
              <IntegrationCard brand="PhonePe" logo={<img className="ip-pay-logo" src="/img/integration/phonepay.png" alt="PhonePe" />} btnText="Activate Service" offByDefault />
              <IntegrationCard brand="ICICI" logo={<img className="ip-pay-logo" src="/img/integration/icici.png" alt="ICICI Bank" />} btnText="Activate Service" offByDefault />
            </div>
          </>
        )}

        {/* Messages tab */}
        {active === "Messages" && (
          <div className="msg-wrap">
            {/* Left vertical channel tabs */}
            <div className="msg-left">
              <button type="button" className={`msg-tab ${msgChannel === "SMS" ? "active" : ""}`} onClick={() => setMsgChannel("SMS")}>SMS</button>
              <button type="button" className={`msg-tab ${msgChannel === "Whatsapp" ? "active" : ""}`} onClick={() => setMsgChannel("Whatsapp")}>Whatsapp</button>
            </div>

            {/* Right content changes per subtab */}
            <div className="msg-main">
              {/* SMS view (unchanged) */}
              {msgChannel === "SMS" && (
                <>
                  <div className="msg-top">
                    <Toggle checked={allowPromo} onChange={setAllowPromo} label="Allow Promotional SMS" />
                    <div className="msg-default">
                      <label className="msg-default-label">Select default :</label>
                      <div className="msg-default-select">
                        <SearchSelect label="" placeholder="Select..." options={["VASYERP"]} value={defaultSender} onChange={setDefaultSender} align="right" width={180} />
                      </div>
                    </div>
                  </div>

                  <div className="msg-grid">
                    <MessageProviderCard brand="MSG91" on={prov1} setOn={setProv1} logo={<img src="/img/integration/msg.png" alt="MSG91" className="msg-logo" />} />
                    <MessageProviderCard brand="Text Local" on={prov2} setOn={setProv2} logo={<img src="/img/integration/text.png" alt="Text Local" className="msg-logo" />} />
                    <MessageProviderCard brand="Twilio" on={prov3} setOn={setProv3} logo={<img src="/img/integration/twillo.png" alt="Twilio" className="msg-logo" />} />
                  </div>

                  <div className="msg-table-head">
                    <div className="msg-table-title">SMS Template Master</div>
                    <button type="button" className="msg-create-btn" onClick={() => setShowSmsModal(true)}>Create New</button>
                  </div>

                  <div className="msg-table-wrap">
                    <table className="msg-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Template Name</th>
                          <th>Message</th>
                          <th>Event</th>
                          <th>Route</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="msg-empty-row">
                          <td colSpan={6}>No data available in table</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="msg-table-foot">Showing 0 to 0 of 0 entries</div>
                  </div>
                </>
              )}

              {/* WHATSAPP view (new) */}
              {msgChannel === "Whatsapp" && (
                <>
                  {/* top row: only default dropdown on the right */}
                  <div className="msg-top" style={{ justifyContent: "flex-end" }}>
                    <div className="msg-default">
                      <label className="msg-default-label">Select Default :</label>
                      <div className="msg-default-select">
                        <SearchSelect
                          label=""
                          placeholder="Select WhatsApp Provider"
                          options={["WhatsApp"]}
                          value={waDefault}
                          onChange={setWaDefault}
                          align="right"
                          width={240}
                        />
                      </div>
                    </div>
                  </div>

                  {/* one provider card with WhatsApp logo */}
                  <div className="msg-grid" style={{ gridTemplateColumns: "minmax(260px, 420px)" }}>
                    <MessageProviderCard
                      brand="Whatsapp"
                      on={true}
                      setOn={() => {}}
                      logo={<img src="/img/integration/whatsapp.jfif" alt="WhatsApp" className="msg-logo" />}
                    />
                  </div>

                  {/* table + create new identical to SMS but for WhatsApp */}
                  <div className="msg-table-head">
                    <div className="msg-table-title">Whatsapp Template Master</div>
                    <button type="button" className="msg-create-btn" onClick={() => setShowSmsModal(true)}>Create New</button>
                  </div>

                  <div className="msg-table-wrap">
                    <table className="msg-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Event</th>
                          <th>Template Name</th>
                          <th>Message</th>
                          <th>Is Default</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="msg-empty-row">
                          <td colSpan={6}>No data available in table</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="msg-table-foot">Showing 0 to 0 of 0 entries</div>
                  </div>
                </>
              )}
            </div>

            {/* re-use modal */}
            <SmsTemplateModal open={showSmsModal} onClose={() => setShowSmsModal(false)} onSave={() => setShowSmsModal(false)} />
          </div>
        )}

        {/* Loyalty tab (uses images) */}
        {active === "Loyalty" && (
          <div className="ip-cards">
            <IntegrationCard
              brand="Loyalty"
              logo={<img className="ip-pay-logo" src="/img/integration/loyalty.jfif" alt="Loyalty" />}
              btnText="Activate Service"
            />
            <IntegrationCard
              brand="Reelo Integration"
              logo={<img className="ip-pay-logo" src="/img/integration/reelo.png" alt="Reelo" />}
              btnText="Activate Service"
              offByDefault
            />
          </div>
        )}

        {/* GST tab (uses images) */}
        {active === "GST" && (
          <div className="ip-cards">
            <IntegrationCard
              brand="E-way Bill Integration"
              logo={<img className="ip-pay-logo" src="/img/integration/ewaybill.jpg" alt="E-way Bill" />}
              btnText="Activate Service"
            />
            <IntegrationCard
              brand="E-Invoice Integration"
              logo={<img className="ip-pay-logo" src="/img/integration/invoice.png" alt="E-Invoice" />}
              btnText="Activate Service"
              offByDefault
            />
          </div>
        )}

        {/* Placeholders for other tabs */}
        {active !== "Ecommerce" && active !== "Payment" && active !== "Messages" && active !== "Loyalty" && active !== "GST" && (
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
