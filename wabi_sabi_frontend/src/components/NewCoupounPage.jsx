// src/pages/NewCoupounPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NewCoupounPage.css";
import { createCoupon } from "../api/client";

function YesNo({ value, onChange, name }) {
  return (
    <div className="yn">
      <label className="yn-opt">
        <input
          type="radio"
          name={name}
          checked={value === true}
          onChange={() => onChange(true)}
        />
        <span className="yn-dot" />
        <span className="yn-lb">Yes</span>
      </label>
      <label className="yn-opt">
        <input
          type="radio"
          name={name}
          checked={value === false}
          onChange={() => onChange(false)}
        />
        <span className="yn-dot" />
        <span className="yn-lb">No</span>
      </label>
    </div>
  );
}

export default function NewCoupounPage() {
  const nav = useNavigate();

  // state
  const [couponName, setCouponName] = useState("");
  const [couponPrice, setCouponPrice] = useState("");
  const [redeemType, setRedeemType] = useState("amount");
  const [redeemAmt, setRedeemAmt] = useState("");

  const [monthlyBasis, setMonthlyBasis] = useState(false);
  const [singleUse, setSingleUse] = useState(true);
  const [entireBill, setEntireBill] = useState(true);
  const [minIssue, setMinIssue] = useState(false);
  const [minRedeem, setMinRedeem] = useState(false);
  const [sameBill, setSameBill] = useState(false);
  const [hasBarcode, setHasBarcode] = useState(false);
  const [hasExpiryDays, setHasExpiryDays] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Keep Redeem Amount always equal to Coupon Price
  useEffect(() => {
    setRedeemAmt(couponPrice || "");
  }, [couponPrice]);

  const clear = () => {
    setCouponName("");
    setCouponPrice("");
    setRedeemType("amount");
    setRedeemAmt("");
    setMonthlyBasis(false);
    setSingleUse(true);
    setEntireBill(true);
    setMinIssue(false);
    setMinRedeem(false);
    setSameBill(false);
    setHasBarcode(false);
    setHasExpiryDays(false);
    setHasEndDate(false);
    setErr("");
  };

  const save = async () => {
    setErr("");

    const name = (couponName || "").trim();
    const priceNum = Number(couponPrice);

    if (!name) {
      setErr("Coupon name is required.");
      return;
    }
    if (!/^[A-Za-z0-9]+$/.test(name)) {
      setErr("Coupon name must be alphanumeric (A–Z, a–z, 0–9) without spaces.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setErr("Coupon price must be greater than 0.");
      return;
    }

    setSaving(true);
    try {
      // Backend creates {name, price} and treats redeem_value == price
      await createCoupon({ name, price: priceNum });

      alert("Coupon created successfully.");
      // Go back to list
      nav(-1);
    } catch (e) {
      // Show a friendly error (handles duplicate)
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("already exists")) {
        setErr("Coupon name already exists. Please choose another.");
      } else if (msg) {
        setErr(msg);
      } else {
        setErr("Failed to create coupon.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gcp-wrap">
      {/* page bar */}
      <div className="gcp-pagebar">
        <h1>New Coupon</h1>
        <div className="crumb">
          <span className="material-icons home-ico">home</span>
          <span className="crumb-sep">-</span>
          <span className="crumb-text">Coupon</span>
        </div>
      </div>

      <div className="gcp-card">
        <div className="gcp-section">
          <span className="material-icons dot">radio_button_checked</span>
          <span className="sec-title">Coupon Details</span>
        </div>

        {err && <div className="gcp-error" role="alert">{err}</div>}

        {/* top two-column grid */}
        <div className="gcp-grid-2">
          <div className="fld">
            <label className="lb">
              Coupon Name<span className="req">*</span>
            </label>
            <input
              className="ipt"
              placeholder="Coupon Name"
              value={couponName}
              onChange={(e) => setCouponName(e.target.value)}
            />
          </div>
          <div className="fld">
            <label className="lb">
              Coupon Price<span className="req">*</span>
            </label>
            <input
              className="ipt"
              placeholder="0"
              inputMode="decimal"
              value={couponPrice}
              onChange={(e) => setCouponPrice(e.target.value)}
            />
          </div>
          <div className="fld fld-row">
            <label className="lb">Redemption Type</label>
            <div className="rad">
              <label className="rad-opt">
                <input
                  type="radio"
                  name="rtype"
                  checked={redeemType === "amount"}
                  onChange={() => setRedeemType("amount")}
                />
                <span className="rad-dot" />
                <span>Redeem Amount</span>
              </label>
              <label className="rad-opt">
                <input
                  type="radio"
                  name="rtype"
                  checked={redeemType === "percent"}
                  onChange={() => setRedeemType("percent")}
                  disabled
                  title="Percentage not used (price is redeem value)."
                />
                <span className="rad-dot" />
                <span>Redeem Percentage</span>
              </label>
            </div>
          </div>
          <div className="fld">
            <label className="lb">
              Redeem Amount<span className="req">*</span>
            </label>
            <input
              className="ipt"
              placeholder="0"
              inputMode="decimal"
              value={redeemAmt}
              readOnly
              title="Redeem Amount equals Coupon Price"
            />
          </div>
        </div>

        {/* three-column grid (visual only, not saved per your brief) */}
        <div className="gcp-grid-3">
          <div className="fld fld-row">
            <label className="lb">Redeem on Monthly Basis?</label>
            <YesNo value={monthlyBasis} onChange={setMonthlyBasis} name="mb" />
          </div>
          <div className="fld fld-row">
            <label className="lb">Single Time Use?</label>
            <YesNo value={singleUse} onChange={setSingleUse} name="su" />
          </div>
          <div className="fld fld-row">
            <label className="lb">Apply on Entire Bill?</label>
            <YesNo value={entireBill} onChange={setEntireBill} name="eb" />
          </div>
          <div className="fld fld-row">
            <label className="lb">
              Minimum Purchase Amount Limit<br />To Issue Coupon
            </label>
            <YesNo value={minIssue} onChange={setMinIssue} name="mi" />
          </div>
          <div className="fld fld-row">
            <label className="lb">
              Minimum Purchase Amount Limit<br />To Redeem Coupon
            </label>
            <YesNo value={minRedeem} onChange={setMinRedeem} name="mr" />
          </div>
          <div className="fld fld-row">
            <label className="lb">Redeem on the same bill</label>
            <YesNo value={sameBill} onChange={setSameBill} name="sb" />
          </div>
          <div className="fld fld-row">
            <label className="lb">Barcode</label>
            <YesNo value={hasBarcode} onChange={setHasBarcode} name="bc" />
          </div>
          <div className="fld fld-row">
            <label className="lb">Coupon Expiry Days</label>
            <YesNo value={hasExpiryDays} onChange={setHasExpiryDays} name="ed" />
          </div>
          <div className="fld fld-row">
            <label className="lb">Coupon End Date</label>
            <YesNo value={hasEndDate} onChange={setHasEndDate} name="end" />
          </div>
        </div>
      </div>

      {/* sticky bottom bar */}
      <div className="gcp-bar">
        <div className="gcp-bar-left">
          <button className="btn danger" onClick={() => nav(-1)}>Cancel</button>
          <button className="btn warn" onClick={clear} disabled={saving}>Clear</button>
        </div>
        <div className="gcp-bar-right">
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
