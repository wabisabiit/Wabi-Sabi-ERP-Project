// components/CampaignCreatePage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/CampaignCreatePage.css";

export default function CampaignCreatePage() {
  const navigate = useNavigate();

  // ----- Form state -----
  const [name, setName] = useState("");
  const [redemptionPoint, setRedemptionPoint] = useState("");
  const [type, setType] = useState("Discount");
  const [discountValue, setDiscountValue] = useState("");
  const [desc, setDesc] = useState("");
  const [redeemPerCustomer, setRedeemPerCustomer] = useState("Multiple");
  const [launchDate, setLaunchDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [minPurchase, setMinPurchase] = useState("0");

  const [openGeneral, setOpenGeneral] = useState(true);
  const [openParam, setOpenParam] = useState(false);

  const descCount = useMemo(() => `${desc.length}/200`, [desc]);

  // ----- Actions -----
  const onCancel = () => navigate(-1);
  const onClear = () => {
    setName(""); setRedemptionPoint(""); setType("Discount"); setDiscountValue("");
    setDesc(""); setRedeemPerCustomer("Multiple"); setLaunchDate(""); setExpiryDate("");
    setMinPurchase("0");
  };
  const onSave = () => {
    // TODO: API call
    // const payload = { name, redemptionPoint, type, discountValue, desc, redeemPerCustomer, launchDate, expiryDate, minPurchase };
    // console.log(payload);
    navigate("/crm/loyalty"); // back to list or wherever you want
  };
  const onSaveCreateNew = () => {
    onSave();
    onClear();
  };

  return (
    <div className="cf-wrap">
      <div className="cf-page-title">Campaign</div>

      <div className="cf-card">
        {/* ===== Section: General Details ===== */}
        <div className="cf-section">
          {/* left timeline */}
          <div className="cf-side">
            <div className={`cf-step ${openGeneral ? "active" : ""}`}>
              <span className="material-icons">article</span>
            </div>
            <div className="cf-line" />
          </div>

          {/* right content */}
          <div className="cf-main">
            <button className="cf-acc-head" onClick={() => setOpenGeneral((v) => !v)}>
              <div className={`cf-acc-title ${openGeneral ? "active" : ""}`}>General Details</div>
              <span className="material-icons">{openGeneral ? "expand_less" : "expand_more"}</span>
            </button>

            {openGeneral && (
              <div className="cf-acc-body">
                <div className="cf-grid-4">
                  {/* Name */}
                  <div className="cf-field">
                    <label className="cf-label">
                      Name<span className="req">*</span>
                    </label>
                    <input
                      className="cf-input"
                      placeholder="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Redemption Point */}
                  <div className="cf-field">
                    <label className="cf-label">
                      Redemption Point<span className="req">*</span>
                    </label>
                    <input
                      className="cf-input"
                      placeholder="Redemption Point"
                      value={redemptionPoint}
                      onChange={(e) => setRedemptionPoint(e.target.value.replace(/[^\d]/g, ""))}
                      inputMode="numeric"
                      required
                    />
                  </div>

                  {/* Type (select) */}
                  <div className="cf-field">
                    <label className="cf-label">
                      Type<span className="req">*</span>
                    </label>
                    <div className="cf-select">
                      <select value={type} onChange={(e) => setType(e.target.value)}>
                        <option>Discount</option>
                        <option>Cashback</option>
                        <option>Bonus Points</option>
                      </select>
                      <span className="material-icons caret">expand_more</span>
                    </div>
                  </div>

                  {/* Discount Value with ₹ prefix */}
                  <div className="cf-field">
                    <label className="cf-label">
                      Discount Value<span className="req">*</span>
                    </label>
                    <div className="cf-input-affix">
                      <span className="cf-prefix">₹</span>
                      <input
                        className="cf-input with-prefix"
                        placeholder="Enter discount"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value.replace(/[^\d.]/g, ""))}
                        inputMode="decimal"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="cf-field mt16">
                  <label className="cf-label">Description</label>
                  <div className="cf-textarea-wrap">
                    <textarea
                      className="cf-textarea"
                      placeholder="Enter description"
                      maxLength={200}
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                    />
                    <div className="cf-char">{descCount}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== Section: Parameter Details ===== */}
        <div className="cf-section">
          <div className="cf-side">
            <div className={`cf-step ${openParam ? "active" : "muted"}`}>
              <span className="material-icons">verified</span>
            </div>
          </div>

          <div className="cf-main">
            <button className="cf-acc-head" onClick={() => setOpenParam((v) => !v)}>
              <div className={`cf-acc-title ${openParam ? "active" : ""}`}>Parameter Details</div>
              <span className="material-icons">{openParam ? "expand_less" : "expand_more"}</span>
            </button>

            {openParam && (
              <div className="cf-acc-body">
                {/* Redemption Per Customer */}
                <div className="cf-grid-1">
                  <div className="cf-field">
                    <label className="cf-label">
                      Redemption Per Customer<span className="req">*</span>
                    </label>
                    <div className="cf-select">
                      <select
                        value={redeemPerCustomer}
                        onChange={(e) => setRedeemPerCustomer(e.target.value)}
                      >
                        <option>Multiple</option>
                        <option>Single</option>
                      </select>
                      <span className="material-icons caret">expand_more</span>
                    </div>
                  </div>
                </div>

                {/* Dates + Min Purchase */}
                <div className="cf-grid-3">
                  <div className="cf-field">
                    <label className="cf-label">
                      Campaign Launch Date<span className="req">*</span>
                    </label>
                    <input
                      type="date"
                      className="cf-input"
                      value={launchDate}
                      onChange={(e) => setLaunchDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="cf-field">
                    <label className="cf-label">Campaign Expiry Date</label>
                    <input
                      type="date"
                      className="cf-input"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>

                  <div className="cf-field">
                    <label className="cf-label">
                      Minimum Purchase Amount<span className="req">*</span>
                    </label>
                    <input
                      className="cf-input"
                      value={minPurchase}
                      onChange={(e) => setMinPurchase(e.target.value.replace(/[^\d.]/g, ""))}
                      inputMode="decimal"
                      required
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Footer Actions (sticky bar) ===== */}
      <div className="cf-footer">
        <div className="left">
          <button className="btn btn-danger" onClick={onCancel}>Cancel</button>
          <button className="btn btn-warn" onClick={onClear}>Clear</button>
        </div>
        <div className="right">
          <button className="btn btn-primary ghost" onClick={onSaveCreateNew}>Save &amp; Create New</button>
          <button className="btn btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
