import React, { useState } from "react";
import "../styles/GeneralSettingsPage.css"; // re-use the same CSS (pos-* classes, gs-* shell)

export default function PosSettingPage() {
  // ===== helpers (copied from your GeneralSettingsPage POS section) =====
  const Pill = ({ value, onChange, left = "Yes", right = "No" }) => (
    <div className="pos-pill">
      <button
        type="button"
        className={`pos-pill-btn ${value === left ? "active" : ""}`}
        onClick={() => onChange(left)}
      >
        {left}
      </button>
      <button
        type="button"
        className={`pos-pill-btn ${value === right ? "active" : ""}`}
        onClick={() => onChange(right)}
      >
        {right}
      </button>
    </div>
  );

  const PillOnOff = ({ value, onChange }) => (
    <Pill value={value} onChange={onChange} left="ON" right="OFF" />
  );

  const Switch = ({ checked, onChange, label }) => (
    <button
      type="button"
      className={`pos-switch ${checked ? "checked" : ""}`}
      aria-label={label || "toggle"}
      onClick={() => onChange(!checked)}
    >
      <span className="dot" />
    </button>
  );

  // ===== state (defaults same as your POS tab) =====
  const [pos, setPos] = useState({
    allowChangeDiscount: "Yes",
    bxgyFreeSet: "ZERO",
    allowChangeMRP: "No",
    allowExchange: "Yes",

    startPosWith: "Product Scan/Search",
    tenderCashPrint: "Yes",
    voiceAfterBilling: "No",
    onlineOrderAlert: "No",

    salesMan: true, qty: true, mrp: true, taxAmount: true,
    addlCharge: false, flatDiscount: true, roundoff: true, multiPay: false,
    redeemCredit: true, upi: true, card: true, cash: true,
    applyCoupon: true, payLater: true, holdPrint: true, upiPrint: false,
    cardPrint: true, cashPrint: true, holdBill: true, redeemLoyalty: false,
    addPayment: true, creditNote: true, orders: true, customerDetails: false,

    additionalDiscount: false,
    billDiscount: true,
    itemCode: true,
    lastBill: true,
    orderType: false,
    otpPayLater: false,
    otpCreditNoteRedeem: false,
    otpAdvancePayment: false,

    viewAllTerminalOrders: "No",
    allowManagerCashFlow: "No",
    allowTakeMoneyOut: "No",
    tenderType: "Normal",
    couponShow: "Yes",
    tokenPrint: "OFF",
    customerDetailsMandatory: "ON",
    showLandingPricePopup: "OFF",
    enableOnlineOrderFlow: "OFF",

    flatDiscountLimitPct: "100",
    flatDiscountLimitAmt: "",
  });
  const sp = (patch) => setPos((p) => ({ ...p, ...patch }));

  // ===== UI (same shell look as settings pages) =====
  return (
    <div className="gs-wrap">
      <div className="gs-panel-head">
        <div className="gs-panel-title">
          <span className="material-icons">point_of_sale</span>
          <span>POS Setting</span>
        </div>
      </div>

      <div className="gs-card">
        {/* Top grid */}
        <div className="pos-top-grid">
          <div className="pos-top-cell">
            <div className="pos-top-k">Allow User to Change Discount of Product</div>
            <Pill value={pos.allowChangeDiscount} onChange={(v)=>sp({allowChangeDiscount:v})} />
          </div>

          <div className="pos-top-cell">
            <div className="pos-top-k">BXGY-Free Product Set</div>
            <div className="pos-input-wrap">
              <input className="pos-input" value={pos.bxgyFreeSet} onChange={(e)=>sp({bxgyFreeSet:e.target.value})}/>
            </div>
          </div>

          <div className="pos-top-cell">
            <div className="pos-top-k">Allow User to Change MRP of Product</div>
            <Pill value={pos.allowChangeMRP} onChange={(v)=>sp({allowChangeMRP:v})} />
          </div>

          <div className="pos-top-cell">
            <div className="pos-top-k">Allow User to Accept Exchange of Product</div>
            <Pill value={pos.allowExchange} onChange={(v)=>sp({allowExchange:v})} />
          </div>

          <div className="pos-top-cell">
            <div className="pos-top-k">Start POS with</div>
            <div className="pos-input-wrap">
              <input className="pos-input" value={pos.startPosWith} onChange={(e)=>sp({startPosWith:e.target.value})}/>
            </div>
          </div>

          <div className="pos-top-cell">
            <div className="pos-top-k">Tender Model on Cash &amp; Print</div>
            <Pill value={pos.tenderCashPrint} onChange={(v)=>sp({tenderCashPrint:v})} />
          </div>

          <div className="pos-top-cell">
            <div className="pos-top-k">Voice Message after Billing</div>
            <Pill value={pos.voiceAfterBilling} onChange={(v)=>sp({voiceAfterBilling:v})} />
          </div>

          <div className="pos-top-cell">
            <div className="pos-top-k">Online Order Alert Sound</div>
            <Pill value={pos.onlineOrderAlert} onChange={(v)=>sp({onlineOrderAlert:v})} />
          </div>
        </div>

        {/* Advance Settings */}
        <div className="pos-adv-head">Advance Settings</div>
        <div className="pos-adv-grid">
          <div className="pos-item"><span>Sales Man</span><Switch checked={pos.salesMan} onChange={(v)=>sp({salesMan:v})} /></div>
          <div className="pos-item"><span>Qty</span><Switch checked={pos.qty} onChange={(v)=>sp({qty:v})} /></div>
          <div className="pos-item"><span>MRP</span><Switch checked={pos.mrp} onChange={(v)=>sp({mrp:v})} /></div>
          <div className="pos-item"><span>Tax Amount</span><Switch checked={pos.taxAmount} onChange={(v)=>sp({taxAmount:v})} /></div>

          <div className="pos-item"><span>Additional Charge</span><Switch checked={pos.addlCharge} onChange={(v)=>sp({addlCharge:v})} /></div>
          <div className="pos-item"><span>Flat Discount</span><Switch checked={pos.flatDiscount} onChange={(v)=>sp({flatDiscount:v})} /></div>
          <div className="pos-item"><span>RoundOff</span><Switch checked={pos.roundoff} onChange={(v)=>sp({roundoff:v})} /></div>
          <div className="pos-item"><span>MultiPay</span><Switch checked={pos.multiPay} onChange={(v)=>sp({multiPay:v})} /></div>

          <div className="pos-item"><span>Redeem Credit</span><Switch checked={pos.redeemCredit} onChange={(v)=>sp({redeemCredit:v})} /></div>
          <div className="pos-item"><span>UPI</span><Switch checked={pos.upi} onChange={(v)=>sp({upi:v})} /></div>
          <div className="pos-item"><span>Card</span><Switch checked={pos.card} onChange={(v)=>sp({card:v})} /></div>
          <div className="pos-item"><span>Cash</span><Switch checked={pos.cash} onChange={(v)=>sp({cash:v})} /></div>

          <div className="pos-item"><span>Apply Coupon</span><Switch checked={pos.applyCoupon} onChange={(v)=>sp({applyCoupon:v})} /></div>
          <div className="pos-item"><span>Pay Later</span><Switch checked={pos.payLater} onChange={(v)=>sp({payLater:v})} /></div>
          <div className="pos-item"><span>Hold &amp; Print</span><Switch checked={pos.holdPrint} onChange={(v)=>sp({holdPrint:v})} /></div>
          <div className="pos-item"><span>UPI &amp; Print</span><Switch checked={pos.upiPrint} onChange={(v)=>sp({upiPrint:v})} /></div>

          <div className="pos-item"><span>Card &amp; Print</span><Switch checked={pos.cardPrint} onChange={(v)=>sp({cardPrint:v})} /></div>
          <div className="pos-item"><span>Cash &amp; Print</span><Switch checked={pos.cashPrint} onChange={(v)=>sp({cashPrint:v})} /></div>
          <div className="pos-item"><span>Hold Bill</span><Switch checked={pos.holdBill} onChange={(v)=>sp({holdBill:v})} /></div>
          <div className="pos-item"><span>Redeem Loyalty</span><Switch checked={pos.redeemLoyalty} onChange={(v)=>sp({redeemLoyalty:v})} /></div>

          <div className="pos-item"><span>Add Payment</span><Switch checked={pos.addPayment} onChange={(v)=>sp({addPayment:v})} /></div>
          <div className="pos-item"><span>Credit Note</span><Switch checked={pos.creditNote} onChange={(v)=>sp({creditNote:v})} /></div>
          <div className="pos-item"><span>Orders</span><Switch checked={pos.orders} onChange={(v)=>sp({orders:v})} /></div>
          <div className="pos-item"><span>Customer Details</span><Switch checked={pos.customerDetails} onChange={(v)=>sp({customerDetails:v})} /></div>
        </div>

        {/* Second band */}
        <div className="pos-adv-grid pos-compact">
          <div className="pos-item"><span>Additional Discount</span><Switch checked={pos.additionalDiscount} onChange={(v)=>sp({additionalDiscount:v})} /></div>
          <div className="pos-item"><span>Bill Discount</span><Switch checked={pos.billDiscount} onChange={(v)=>sp({billDiscount:v})} /></div>
          <div className="pos-item"><span>Item Code</span><Switch checked={pos.itemCode} onChange={(v)=>sp({itemCode:v})} /></div>
          <div className="pos-item"><span>Last Bill</span><Switch checked={pos.lastBill} onChange={(v)=>sp({lastBill:v})} /></div>

          <div className="pos-item"><span>Order Type</span><Switch checked={pos.orderType} onChange={(v)=>sp({orderType:v})} /></div>
          <div className="pos-item"><span>OTP Verification on PayLater</span><Switch checked={pos.otpPayLater} onChange={(v)=>sp({otpPayLater:v})} /></div>
          <div className="pos-item"><span>OTP on Credit Note Redemption</span><Switch checked={pos.otpCreditNoteRedeem} onChange={(v)=>sp({otpCreditNoteRedeem:v})} /></div>
          <div className="pos-item"><span>OTP on Advance Payment</span><Switch checked={pos.otpAdvancePayment} onChange={(v)=>sp({otpAdvancePayment:v})} /></div>
        </div>

        {/* Third band */}
        <div className="pos-bottom-grid">
          <div className="pos-bottom-cell">
            <div className="lbl">View all Terminal/User Orders</div>
            <Pill value={pos.viewAllTerminalOrders} onChange={(v)=>sp({viewAllTerminalOrders:v})} />
          </div>
          <div className="pos-bottom-cell">
            <div className="lbl">Allow Manager Cash Flow</div>
            <Pill value={pos.allowManagerCashFlow} onChange={(v)=>sp({allowManagerCashFlow:v})} />
          </div>
          <div className="pos-bottom-cell">
            <div className="lbl">Allow user for Take Money Out</div>
            <Pill value={pos.allowTakeMoneyOut} onChange={(v)=>sp({allowTakeMoneyOut:v})} />
          </div>
          <div className="pos-bottom-cell">
            <div className="lbl">Select Tender Type</div>
            <div className="pos-pill single">
              <button type="button" className="pos-pill-btn active">Normal</button>
            </div>
          </div>

          <div className="pos-bottom-cell">
            <div className="lbl">Coupon Show</div>
            <Pill value={pos.couponShow} onChange={(v)=>sp({couponShow:v})} left="Yes" right="No" />
          </div>
          <div className="pos-bottom-cell">
            <div className="lbl">Allow Token Print</div>
            <PillOnOff value={pos.tokenPrint} onChange={(v)=>sp({tokenPrint:v})} />
          </div>
          <div className="pos-bottom-cell">
            <div className="lbl">Customer Details Mandatory</div>
            <PillOnOff value={pos.customerDetailsMandatory} onChange={(v)=>sp({customerDetailsMandatory:v})} />
          </div>
          <div className="pos-bottom-cell">
            <div className="lbl">Show Landing Price in Product Details PopUp</div>
            <PillOnOff value={pos.showLandingPricePopup} onChange={(v)=>sp({showLandingPricePopup:v})} />
          </div>

          <div className="pos-bottom-cell">
            <div className="lbl">ENABLE ONLINE ORDER CONFIRMATION FLOW</div>
            <PillOnOff value={pos.enableOnlineOrderFlow} onChange={(v)=>sp({enableOnlineOrderFlow:v})} />
          </div>
          <div className="pos-bottom-cell">
            <div className="lbl">Flat Discount Limit In Percentage</div>
            <div className="pos-input-wrap">
              <input
                className="pos-input"
                value={pos.flatDiscountLimitPct}
                onChange={(e)=>sp({flatDiscountLimitPct:e.target.value})}
                placeholder="Blank indicates no restriction"
              />
            </div>
          </div>
          <div className="pos-bottom-cell">
            <div className="lbl">Flat Discount Limit In Amount</div>
            <div className="pos-input-wrap">
              <input
                className="pos-input"
                value={pos.flatDiscountLimitAmt}
                onChange={(e)=>sp({flatDiscountLimitAmt:e.target.value})}
                placeholder="Blank indicates no restriction"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
