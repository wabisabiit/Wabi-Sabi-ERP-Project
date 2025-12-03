import React, { useEffect, useMemo, useState } from "react";
import "../styles/PaymentModal.css";
import { listSuppliers, listAccounts, createExpense } from "../api/client";
import { useAuth } from "../auth/AuthContext";

function nowLocalInput() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function PaymentModal({ open, onClose }) {
  const { user } = useAuth();

  const [voucherType, setVoucherType] = useState("sales"); // sales | purchase | expense
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

  // Party searchable dropdown state
  const [partyOpen, setPartyOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const partyOptions = useMemo(() => ["Cutomer 1"], []);
  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return []; // blank => show only hint
    return partyOptions.filter((p) => p.toLowerCase().includes(q));
  }, [partyOptions, partySearch]);

  // SALES/BILL searchable dropdown (AGAINST)
  const [saleOpen, setSaleOpen] = useState(false);
  const [saleSearch, setSaleSearch] = useState("");
  const [saleValue, setSaleValue] = useState("");
  const saleOptions = useMemo(() => ["S-1001", "S-1002", "S-1003"], []);
  const filteredSales = useMemo(() => {
    const q = saleSearch.trim().toLowerCase();
    if (!q) return []; // blank => show only hint
    return saleOptions.filter((s) => s.toLowerCase().includes(q));
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
  const walletOptions = useMemo(() => ["AXIS BANK UDYOG VIHAR"], []);
  const filteredWallets = useMemo(() => {
    const q = walletSearch.trim().toLowerCase();
    if (!q) return []; // blank => show only hint
    return walletOptions.filter((w) => w.toLowerCase().includes(q));
  }, [walletOptions, walletSearch]);

  const showWallet = useMemo(
    () => paymentMode && paymentMode.toLowerCase() !== "cash",
    [paymentMode]
  );

  // ---------- EXPENSE state ----------
  const [suppliers, setSuppliers] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [expenseSupplierId, setExpenseSupplierId] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseRemark, setExpenseRemark] = useState("");
  const [expenseNonGst, setExpenseNonGst] = useState(false);
  const [expenseDateTime, setExpenseDateTime] = useState(nowLocalInput());
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseMsg, setExpenseMsg] = useState(null); // { type: "success"|"error", text }

  // Load suppliers + accounts when Expense tab is opened
  useEffect(() => {
    if (!open || voucherType !== "expense") return;

    let cancelled = false;
    async function loadMasters() {
      try {
        const [supRes, accRes] = await Promise.all([
          listSuppliers(),
          listAccounts(),
        ]);

        const supList = Array.isArray(supRes)
          ? supRes
          : supRes?.results || supRes?.data || supRes?.items || [];
        const accList = Array.isArray(accRes)
          ? accRes
          : accRes?.results || accRes?.data || accRes?.items || [];

        if (!cancelled) {
          setSuppliers(supList);
          setAccounts(accList);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setExpenseMsg({
            type: "error",
            text: "Failed to load suppliers/accounts.",
          });
        }
      }
    }

    loadMasters();
    return () => {
      cancelled = true;
    };
  }, [open, voucherType]);

  async function handleExpenseSave() {
    if (!expenseSupplierId || !expenseAccountId || !expenseAmount) {
      setExpenseMsg({
        type: "error",
        text: "Please select party, account and enter amount.",
      });
      return;
    }

    try {
      setSavingExpense(true);
      setExpenseMsg(null);

      const payload = {
        supplier: Number(expenseSupplierId),
        account: Number(expenseAccountId),
        amount: Number(expenseAmount),
        non_gst: expenseNonGst,
        remark: expenseRemark,
        date_time: expenseDateTime
          ? new Date(expenseDateTime).toISOString()
          : undefined,
      };

      await createExpense(payload);

      setExpenseMsg({
        type: "success",
        text: "Expense saved successfully.",
      });

      // reset amount/remark but keep party/account selected
      setExpenseAmount("");
      setExpenseRemark("");
      setExpenseNonGst(false);
      setExpenseDateTime(nowLocalInput());
    } catch (e) {
      console.error(e);
      setExpenseMsg({
        type: "error",
        text: e?.message || "Failed to save expense.",
      });
    } finally {
      setSavingExpense(false);
    }
  }

  // lock background scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  // ————————————————————————————————————————
  // Helper renderers
  const renderAdvanceForm = () => (
    <>
      <div className="payx-grid2">
        {/* Select Party */}
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
              onClick={() => setPartyOpen((v) => !v)}
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
                  {partySearch.trim().length < 1 && (
                    <div className="payx-dd-hint">Please enter 1 or more characters</div>
                  )}
                </div>

                {partySearch.trim().length < 1 ? null : (
                  <ul className="payx-dd-list">
                    {filteredParties.length > 0 ? (
                      filteredParties.map((opt) => (
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
                      ))
                    ) : (
                      <li className="payx-dd-empty">No results found</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment Mode */}
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
              setWalletValue(""); // clear wallet when mode changes
              setWalletSearch("");
            }}
          >
            {modes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Non-cash extra picker */}
      {showWallet && (
        <div className="payx-field">
          <label>{pickerLabel}</label>
          <div
            className={`payx-wallet ${walletOpen ? "open" : ""}`}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setWalletOpen(false);
            }}
          >
            <button
              type="button"
              className="payx-control payx-wallet-toggle"
              onClick={() => setWalletOpen((v) => !v)}
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
                  {walletSearch.trim().length < 1 && (
                    <div className="payx-dd-hint">Please enter 1 or more characters</div>
                  )}
                </div>

                {walletSearch.trim().length < 1 ? null : (
                  <>
                    <div className="payx-dd-section">{pickerLabel}</div>
                    <ul className="payx-dd-list">
                      {filteredWallets.length > 0 ? (
                        filteredWallets.map((opt) => (
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
                        ))
                      ) : (
                        <li className="payx-dd-empty">No results found</li>
                      )}
                    </ul>
                  </>
                )}
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
        <button className="payx-btn" style={{ marginLeft: "12px" }}>
          Save &amp; Print
        </button>
      </div>
    </>
  );

  return (
    <div className="payx-overlay" role="dialog" aria-modal="true">
      <div className="payx-card">
        {/* Header */}
        <div className="payx-header">
          <h3>Payment</h3>
          <button className="payx-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="payx-body">
          {/* Voucher type */}
          <div className="payx-row">
            <span className="payx-title">Select Voucher Type</span>
            <div className="payx-radios">
              <label className="payx-radio">
                <input
                  type="radio"
                  name="vtype"
                  checked={voucherType === "sales"}
                  onChange={() => setVoucherType("sales")}
                />
                <span>Sales</span>
              </label>
              <label className="payx-radio">
                <input
                  type="radio"
                  name="vtype"
                  checked={voucherType === "purchase"}
                  onChange={() => setVoucherType("purchase")}
                />
                <span>Purchase</span>
              </label>
              <label className="payx-radio">
                <input
                  type="radio"
                  name="vtype"
                  checked={voucherType === "expense"}
                  onChange={() => setVoucherType("expense")}
                />
                <span>Expense</span>
              </label>
            </div>
          </div>

          {/* SALES / PURCHASE (unchanged) */}
          {voucherType !== "expense" && (
            <>
              <div className="payx-row">
                <span className="payx-title">Select Payment Type</span>
                <div className="payx-radios">
                  <label className="payx-radio">
                    <input
                      type="radio"
                      name="ptype"
                      checked={paymentType === "advance"}
                      onChange={() => setPaymentType("advance")}
                    />
                    <span>Advance Payment</span>
                  </label>
                  <label className="payx-radio">
                    <input
                      type="radio"
                      name="ptype"
                      checked={paymentType === "against"}
                      onChange={() => setPaymentType("against")}
                    />
                    <span>Against Bill</span>
                  </label>
                </div>
              </div>

              {/* Advance */}
              {paymentType === "advance" && renderAdvanceForm()}

              {/* Against Bill */}
              {paymentType === "against" && (
                <>
                  <div className="payx-grid2">
                    {/* Party (searchable) */}
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
                          onClick={() => setPartyOpen((v) => !v)}
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
                              {partySearch.trim().length < 1 && (
                                <div className="payx-dd-hint">
                                  Please enter 1 or more characters
                                </div>
                              )}
                            </div>

                            {partySearch.trim().length < 1 ? null : (
                              <ul className="payx-dd-list">
                                {filteredParties.length > 0 ? (
                                  filteredParties.map((opt) => (
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
                                  ))
                                ) : (
                                  <li className="payx-dd-empty">No results found</li>
                                )}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sales/Bill (searchable) */}
                    <div className="payx-field">
                      <label>
                        {voucherType === "sales" ? "Select Sales" : "Select Bill"}{" "}
                        <span className="payx-req">*</span>
                      </label>

                      <div
                        className={`payx-wallet ${saleOpen ? "open" : ""}`}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) setSaleOpen(false);
                        }}
                      >
                        <button
                          type="button"
                          className="payx-control payx-wallet-toggle"
                          onClick={() => setSaleOpen((v) => !v)}
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
                              {saleSearch.trim().length < 1 && (
                                <div className="payx-dd-hint">
                                  Please enter 1 or more characters
                                </div>
                              )}
                            </div>

                            {saleSearch.trim().length < 1 ? null : (
                              <ul className="payx-dd-list">
                                {filteredSales.length > 0 ? (
                                  filteredSales.map((opt) => (
                                    <li key={opt}>
                                      <button
                                        type="button"
                                        className={`payx-dd-item ${
                                          saleValue === opt ? "active" : ""
                                        }`}
                                        onClick={() => {
                                          setSaleValue(opt);
                                          setSaleOpen(false);
                                        }}
                                      >
                                        {opt}
                                      </button>
                                    </li>
                                  ))
                                ) : (
                                  <li className="payx-dd-empty">No results found</li>
                                )}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div className="payx-field">
                    <label>
                      Payment Mode <span className="payx-req">*</span>
                    </label>
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
                        {modes.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <button className="payx-caret" aria-label="More">
                        <span className="material-icons">arrow_drop_down</span>
                      </button>
                    </div>
                  </div>

                  {/* Non-cash extra picker */}
                  {showWallet && (
                    <div className="payx-field">
                      <label>{pickerLabel}</label>
                      <div
                        className={`payx-wallet ${walletOpen ? "open" : ""}`}
                        onBlur={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget)) setWalletOpen(false);
                        }}
                      >
                        <button
                          type="button"
                          className="payx-control payx-wallet-toggle"
                          onClick={() => setWalletOpen((v) => !v)}
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
                              {walletSearch.trim().length < 1 && (
                                <div className="payx-dd-hint">
                                  Please enter 1 or more characters
                                </div>
                              )}
                            </div>

                            {walletSearch.trim().length < 1 ? null : (
                              <>
                                <div className="payx-dd-section">{pickerLabel}</div>
                                <ul className="payx-dd-list">
                                  {filteredWallets.length > 0 ? (
                                    filteredWallets.map((opt) => (
                                      <li key={opt}>
                                        <button
                                          type="button"
                                          className={`payx-dd-item ${
                                            walletValue === opt ? "active" : ""
                                          }`}
                                          onClick={() => {
                                            setWalletValue(opt);
                                            setWalletOpen(false);
                                          }}
                                        >
                                          {opt}
                                        </button>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="payx-dd-empty">No results found</li>
                                  )}
                                </ul>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Totals */}
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
                      <label>
                        Amount <span className="payx-req">*</span>
                      </label>
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

          {/* EXPENSE (wired to backend, rest unchanged) */}
          {voucherType === "expense" && (
            <>
              <div className="payx-grid2">
                <div className="payx-field">
                  <label>
                    Select Party Name <span className="payx-req">*</span>
                  </label>
                  <div className="payx-selectwrap">
                    <select
                      className="payx-control"
                      value={expenseSupplierId}
                      onChange={(e) => setExpenseSupplierId(e.target.value)}
                    >
                      <option value="">Select Party</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.company_name}
                        </option>
                      ))}
                    </select>
                    <button className="payx-caret" aria-label="More">
                      <span className="material-icons">arrow_drop_down</span>
                    </button>
                  </div>
                </div>
                <div className="payx-field">
                  <label>
                    Account <span className="payx-req">*</span>
                  </label>
                  <div className="payx-selectwrap">
                    <select
                      className="payx-control"
                      value={expenseAccountId}
                      onChange={(e) => setExpenseAccountId(e.target.value)}
                    >
                      <option value="">Search Account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <button className="payx-caret" aria-label="More">
                      <span className="material-icons">arrow_drop_down</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Date/Time + User */}
              <div className="payx-grid2">
                <div className="payx-field">
                  <label>Date &amp; Time</label>
                  <input
                    className="payx-control"
                    type="datetime-local"
                    value={expenseDateTime}
                    onChange={(e) => setExpenseDateTime(e.target.value)}
                  />
                </div>
                <div className="payx-field">
                  <label>User</label>
                  <input
                    className="payx-control"
                    type="text"
                    value={user?.username || user?.name || ""}
                    disabled
                  />
                </div>
              </div>

              <div className="payx-grid2">
                <div className="payx-field">
                  <label>
                    Amount <span className="payx-req">*</span>
                  </label>
                  <input
                    className="payx-control"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter Amount"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                  />
                </div>
                <div className="payx-field payx-checkfield">
                  <label>&nbsp;</label>
                  <label className="payx-check">
                    <input
                      type="checkbox"
                      checked={expenseNonGst}
                      onChange={(e) => setExpenseNonGst(e.target.checked)}
                    />{" "}
                    <span>Non-GST</span>
                  </label>
                </div>
              </div>

              <div className="payx-field">
                <label>Remark</label>
                <input
                  className="payx-control"
                  type="text"
                  placeholder="Enter remark"
                  value={expenseRemark}
                  onChange={(e) => setExpenseRemark(e.target.value)}
                />
              </div>

              <div className="payx-actions">
                <button
                  className="payx-btn"
                  onClick={handleExpenseSave}
                  disabled={savingExpense}
                >
                  {savingExpense ? "Saving..." : "Save"}
                </button>
                {savingExpense && (
                  <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.7 }}>
                    Please wait...
                  </span>
                )}
              </div>

              {expenseMsg && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    borderRadius: 4,
                    fontSize: 13,
                    backgroundColor:
                      expenseMsg.type === "success" ? "#e6ffed" : "#ffecec",
                    color: expenseMsg.type === "success" ? "#0a7a26" : "#c00",
                  }}
                >
                  {expenseMsg.text}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
