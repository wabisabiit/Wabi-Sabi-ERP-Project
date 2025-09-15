import React, { useEffect, useMemo, useState } from "react";
import "../styles/PaymentModal.css";

export default function PaymentModal({ open, onClose }) {
  const [voucherType, setVoucherType] = useState("sales");   // sales | purchase | expense
  const [paymentType, setPaymentType] = useState("against"); // advance | against

  // Advance payment local state
  const [party, setParty] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash"); // Cash | Cheque | UPI | Bank | Card | Wallet
  const [amount, setAmount] = useState("0.00");
  const [remark, setRemark] = useState("");

  // Wallet dropdown state
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletSearch, setWalletSearch] = useState("");
  const [walletValue, setWalletValue] = useState("");

  // Party searchable dropdown state (ADD THESE)
  const [partyOpen, setPartyOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const partyOptions = useMemo(() => ["Cutomer 1"], []);
  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return []; // no default items; just the search bar
    return partyOptions.filter(p => p.toLowerCase().includes(q));
  }, [partyOptions, partySearch]);


  // SALES/BILL searchable dropdown (AGAINST)
  const [saleOpen, setSaleOpen] = useState(false);
  const [saleSearch, setSaleSearch] = useState("");
  const [saleValue, setSaleValue] = useState("");

  // Example list (or plug your API results)
  // "No default item" is enforced by filtering below.
  const saleOptions = useMemo(() => ["S-1001", "S-1002", "S-1003"], []);

  const filteredSales = useMemo(() => {
    const q = saleSearch.trim().toLowerCase();
    if (!q) return [];                 // 👈 show nothing until user types
    return saleOptions.filter(s => s.toLowerCase().includes(q));
  }, [saleOptions, saleSearch]);


  // Dynamic label for the extra picker
  const pickerLabel = useMemo(() => {
    const m = (paymentMode || "").toLowerCase();
    if (m === "upi") return "Select UPI";
    if (m === "card") return "Select Card";
    if (m === "wallet") return "Select Wallet";
    if (m === "bank" || m === "cheque") return "Select Bank";
    return "Select Option";
  }, [paymentMode]);


  const modes = ["Cash", "Cheque", "UPI", "Bank", "Card", "Wallet"];
  const walletOptions = useMemo(
    () => ["AXIS BANK UDYOG VIHAR"],
    []
  );

  const filteredWallets = useMemo(() => {
    if (!walletSearch.trim()) return walletOptions;
    const q = walletSearch.toLowerCase();
    return walletOptions.filter(w => w.toLowerCase().includes(q));
  }, [walletOptions, walletSearch]);

  const showWallet = useMemo(
    () => paymentMode && paymentMode.toLowerCase() !== "cash",
    [paymentMode]
  );

  // lock background scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  // ————————————————————————————————————————
  // Helper renderers
  const renderAdvanceForm = () => (
    <>
      <div className="payx-grid2">
        {/* Select Party (native select, same as screenshot) */}
        <div className="payx-field">
          <label>
            Select Party Name <span className="payx-req">*</span>
          </label>

          <div
            className={`payx-wallet ${partyOpen ? "open" : ""}`}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setPartyOpen(false);
            }}
          >
            <button
              type="button"
              className="payx-control payx-wallet-toggle"
              onClick={() => setPartyOpen(v => !v)}
            >
              {party || "Search Party"}
              <span className="payx-wallet-caret">▾</span>
            </button>

            {partyOpen && (
              <div className="payx-dd-panel" tabIndex={-1}>
                <div className="payx-dd-search">
                  <input
                    className="payx-control"
                    placeholder=" "
                    value={partySearch}
                    onChange={(e) => setPartySearch(e.target.value)}
                    autoFocus
                  />
                  <div className="payx-dd-hint">Please enter 1 or more characters</div>
                </div>

                <ul className="payx-dd-list">
                  {filteredParties.map((opt) => (
                    <li key={opt}>
                      <button
                        type="button"
                        className={`payx-dd-item ${party === opt ? "active" : ""}`}
                        onClick={() => {
                          setParty(opt);
                          setPartyOpen(false);
                        }}
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                  {filteredParties.length === 0 && (
                    <li className="payx-dd-empty">No matches</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>


        {/* Payment Mode (native select; no black caret) */}
        <div className="payx-field">
          <label>
            Payment Mode <span className="payx-req">*</span>
          </label>
          <select
            className="payx-control"
            value={paymentMode}
            onChange={(e) => {
              setPaymentMode(e.target.value);
              setWalletOpen(false);
              setWalletValue("");   // clear wallet when mode changes
              setWalletSearch("");
            }}
          >
            {/* No placeholder with value="" */}
            {["Cash", "Cheque", "UPI", "Bank", "Card", "Wallet"].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Select Wallet (appears when mode != Cash). Includes search field and option list like your screenshot */}
      {showWallet && (
        <div className="payx-field">
          <label>{pickerLabel}</label>
          <div
            className={`payx-wallet ${walletOpen ? "open" : ""}`}
            onBlur={(e) => { // close if focus leaves the wallet area
              if (!e.currentTarget.contains(e.relatedTarget)) setWalletOpen(false);
            }}
          >
            <button
              type="button"
              className="payx-control payx-wallet-toggle"
              onClick={() => setWalletOpen(v => !v)}
            >
              {walletValue || pickerLabel}
              <span className="payx-wallet-caret">▾</span>
            </button>

            {walletOpen && (
              <div className="payx-dd-panel" tabIndex={-1}>
                <div className="payx-dd-search">
                  <input
                    className="payx-control"
                    placeholder=" "
                    value={walletSearch}
                    onChange={(e) => setWalletSearch(e.target.value)}
                    autoFocus
                  />
                  <div className="payx-dd-hint">Please enter 1 or more characters</div>
                </div>

                <div className="payx-dd-section">Select Bank</div>

                <ul className="payx-dd-list">
                  {filteredWallets.map(opt => (
                    <li key={opt}>
                      <button
                        type="button"
                        className={`payx-dd-item ${walletValue === opt ? "active" : ""}`}
                        onClick={() => {
                          setWalletValue(opt);
                          setWalletOpen(false);
                        }}
                      >
                        {opt}
                      </button>
                    </li>
                  ))}
                  {filteredWallets.length === 0 && (
                    <li className="payx-dd-empty">No matches</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="payx-field" style={{ maxWidth: "300px" }}>
        <label>
          Amount <span className="payx-req">*</span>
        </label>
        <input
          className="payx-control"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="payx-field">
        <label>Remark</label>
        <input
          className="payx-control"
          type="text"
          placeholder="Enter Remark"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
      </div>

      <div className="payx-actions">
        <button className="payx-btn">Save</button>
        <button className="payx-btn" style={{ marginLeft: "12px" }}>Save &amp; Print</button>
      </div>
    </>
  );

  return (
    <div className="payx-overlay" role="dialog" aria-modal="true">
      <div className="payx-card">
        {/* Header */}
        <div className="payx-header">
          <h3>Payment</h3>
          <button className="payx-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="payx-body">
          {/* Voucher type */}
          <div className="payx-row">
            <span className="payx-title">Select Voucher Type</span>
            <div className="payx-radios">
              <label className="payx-radio">
                <input type="radio" name="vtype" checked={voucherType === "sales"} onChange={() => setVoucherType("sales")} />
                <span>Sales</span>
              </label>
              <label className="payx-radio">
                <input type="radio" name="vtype" checked={voucherType === "purchase"} onChange={() => setVoucherType("purchase")} />
                <span>Purchase</span>
              </label>
              <label className="payx-radio">
                <input type="radio" name="vtype" checked={voucherType === "expense"} onChange={() => setVoucherType("expense")} />
                <span>Expense</span>
              </label>
            </div>
          </div>

          {/* SALES / PURCHASE */}
          {voucherType !== "expense" && (
            <>
              <div className="payx-row">
                <span className="payx-title">Select Payment Type</span>
                <div className="payx-radios">
                  <label className="payx-radio">
                    <input type="radio" name="ptype" checked={paymentType === "advance"} onChange={() => setPaymentType("advance")} />
                    <span>Advance Payment</span>
                  </label>
                  <label className="payx-radio">
                    <input type="radio" name="ptype" checked={paymentType === "against"} onChange={() => setPaymentType("against")} />
                    <span>Against Bill</span>
                  </label>
                </div>
              </div>

              {/* ——— Advance Payment UI (your screenshots) ——— */}
              {paymentType === "advance" && renderAdvanceForm()}

              {/* ——— Against Bill: your original UI remains untouched ——— */}
              {paymentType === "against" && (
                <>
                  <div className="payx-grid2">
                    {/* LEFT: Party — searchable like your Advance section */}
                    <div className="payx-field">
                      <label>Select Party Name <span className="payx-req">*</span></label>

                      <div
                        className={`payx-wallet ${partyOpen ? "open" : ""}`}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setPartyOpen(false); }}
                      >
                        <button
                          type="button"
                          className="payx-control payx-wallet-toggle"
                          onClick={() => setPartyOpen(v => !v)}
                        >
                          {party || "Search Party"}
                          <span className="payx-wallet-caret">▾</span>
                        </button>

                        {partyOpen && (
                          <div className="payx-dd-panel" tabIndex={-1}>
                            <div className="payx-dd-search">
                              <input
                                className="payx-control"
                                placeholder=" "
                                value={partySearch}
                                onChange={(e) => setPartySearch(e.target.value)}
                                autoFocus
                              />
                              <div className="payx-dd-hint">Please enter 1 or more characters</div>
                            </div>

                            <ul className="payx-dd-list">
                              {filteredParties.map((opt) => (
                                <li key={opt}>
                                  <button
                                    type="button"
                                    className={`payx-dd-item ${party === opt ? "active" : ""}`}
                                    onClick={() => { setParty(opt); setPartyOpen(false); }}
                                  >
                                    {opt}
                                  </button>
                                </li>
                              ))}
                              {filteredParties.length === 0 && (
                                <li className="payx-dd-empty">No matches</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT: Select Sales/Bill — searchable, NO default items */}
                    <div className="payx-field">
                      <label>{voucherType === "sales" ? "Select Sales" : "Select Bill"} <span className="payx-req">*</span></label>

                      <div
                        className={`payx-wallet ${saleOpen ? "open" : ""}`}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSaleOpen(false); }}
                      >
                        <button
                          type="button"
                          className="payx-control payx-wallet-toggle"
                          onClick={() => setSaleOpen(v => !v)}
                        >
                          {saleValue || (voucherType === "sales" ? "Select Sales" : "Select Bill")}
                          <span className="payx-wallet-caret">▾</span>
                        </button>

                        {saleOpen && (
                          <div className="payx-dd-panel" tabIndex={-1}>
                            <div className="payx-dd-search">
                              <input
                                className="payx-control"
                                placeholder=" "
                                value={saleSearch}
                                onChange={(e) => setSaleSearch(e.target.value)}
                                autoFocus
                              />
                              <div className="payx-dd-hint">Please enter 1 or more characters</div>
                            </div>

                            <ul className="payx-dd-list">
                              {filteredSales.map((opt) => (
                                <li key={opt}>
                                  <button
                                    type="button"
                                    className={`payx-dd-item ${saleValue === opt ? "active" : ""}`}
                                    onClick={() => { setSaleValue(opt); setSaleOpen(false); }}
                                  >
                                    {opt}
                                  </button>
                                </li>
                              ))}
                              {filteredSales.length === 0 && (
                                <li className="payx-dd-empty">No matches</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Mode (keep your style; wire to state) */}
                  <div className="payx-field">
                    <label>Payment Mode <span className="payx-req">*</span></label>
                    <div className="payx-selectwrap">
                      <select
                        className="payx-control"
                        value={paymentMode}
                        onChange={(e) => {
                          setPaymentMode(e.target.value);
                          setWalletOpen(false);
                          setWalletValue("");
                          setWalletSearch("");
                        }}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank">Bank</option>
                        <option value="Card">Card</option>
                        <option value="Wallet">Wallet</option>
                      </select>
                      <button className="payx-caret" aria-label="More">
                        <span className="material-icons">arrow_drop_down</span>
                      </button>
                    </div>
                  </div>

                  {/* Extra picker for non-Cash (uses your existing wallet* + pickerLabel) */}
                  {showWallet && (
                    <div className="payx-field">
                      <label>{pickerLabel}</label>
                      <div
                        className={`payx-wallet ${walletOpen ? "open" : ""}`}
                        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setWalletOpen(false); }}
                      >
                        <button
                          type="button"
                          className="payx-control payx-wallet-toggle"
                          onClick={() => setWalletOpen(v => !v)}
                        >
                          {walletValue || pickerLabel}
                          <span className="payx-wallet-caret">▾</span>
                        </button>

                        {walletOpen && (
                          <div className="payx-dd-panel" tabIndex={-1}>
                            <div className="payx-dd-search">
                              <input
                                className="payx-control"
                                placeholder=" "
                                value={walletSearch}
                                onChange={(e) => setWalletSearch(e.target.value)}
                                autoFocus
                              />
                              <div className="payx-dd-hint">Please enter 1 or more characters</div>
                            </div>

                            <div className="payx-dd-section">{pickerLabel}</div>

                            <ul className="payx-dd-list">
                              {filteredWallets.map(opt => (
                                <li key={opt}>
                                  <button
                                    type="button"
                                    className={`payx-dd-item ${walletValue === opt ? "active" : ""}`}
                                    onClick={() => { setWalletValue(opt); setWalletOpen(false); }}
                                  >
                                    {opt}
                                  </button>
                                </li>
                              ))}
                              {filteredWallets.length === 0 && (
                                <li className="payx-dd-empty">No matches</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Totals (unchanged) */}
                  <div className="payx-grid3">
                    <div className="payx-field">
                      <label>Total Payment</label>
                      <div className="payx-currency">
                        <span>₹</span>
                        <input className="payx-control" type="text" value="0.00" disabled />
                      </div>
                    </div>
                    <div className="payx-field">
                      <label>Paid Amount</label>
                      <div className="payx-currency">
                        <span>₹</span>
                        <input className="payx-control" type="text" value="0.00" disabled />
                      </div>
                    </div>
                    <div className="payx-field">
                      <label>Pending Amount</label>
                      <div className="payx-currency">
                        <span>₹</span>
                        <input className="payx-control" type="text" value="0.00" disabled />
                      </div>
                    </div>
                  </div>

                  <div className="payx-grid2">
                    <div className="payx-field">
                      <label>Kasar</label>
                      <input className="payx-control" type="text" defaultValue="0.00" />
                    </div>
                    <div className="payx-field">
                      <label>Amount <span className="payx-req">*</span></label>
                      <input className="payx-control" type="text" defaultValue="0.00" />
                    </div>
                  </div>

                  <div className="payx-field">
                    <label>Remark</label>
                    <input className="payx-control" type="text" placeholder="Enter Remark" />
                  </div>

                  <div className="payx-actions">
                    <button className="payx-btn">Save</button>
                  </div>
                </>
              )}

            </>
          )}

          {/* EXPENSE (unchanged) */}
          {voucherType === "expense" && (
            <>
              <div className="payx-grid2">
                <div className="payx-field">
                  <label>Select Party Name <span className="payx-req">*</span></label>
                  <div className="payx-selectwrap">
                    <select className="payx-control"><option>Select Party</option></select>
                    <button className="payx-caret" aria-label="More"><span className="material-icons">arrow_drop_down</span></button>
                  </div>
                </div>
                <div className="payx-field">
                  <label>Account <span className="payx-req">*</span></label>
                  <div className="payx-selectwrap">
                    <select className="payx-control"><option>Search Account</option></select>
                    <button className="payx-caret" aria-label="More"><span className="material-icons">arrow_drop_down</span></button>
                  </div>
                </div>
              </div>

              <div className="payx-grid2">
                <div className="payx-field">
                  <label>Amount <span className="payx-req">*</span></label>
                  <input className="payx-control" type="text" placeholder="Enter Amount" />
                </div>
                <div className="payx-field payx-checkfield">
                  <label>&nbsp;</label>
                  <label className="payx-check"><input type="checkbox" /> <span>Non-GST</span></label>
                </div>
              </div>

              <div className="payx-field">
                <label>Remark</label>
                <input className="payx-control" type="text" placeholder="Enter remark" />
              </div>

              <div className="payx-actions">
                <button className="payx-btn">Save</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
