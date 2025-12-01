import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/CashPayemnt.css";
import { createSale, getSelectedCustomer, clearSelectedCustomer } from "../api/client";

export default function CashPayment({ amount = 0, onClose, onSubmit }) {
  const { state } = useLocation();
  const navigate = useNavigate();

  const routedAmount = Number(state?.amount ?? amount) || 0;
  const routedCart   = state?.cart || { items: [] };
  const routedCustomer = state?.customer || getSelectedCustomer() || { name: "", phone: "", email: "" };
  const andPrint = !!state?.andPrint;
  const redirectPath = state?.redirectPath || "/new";

  const [due] = useState(routedAmount);
  const [tendered, setTendered] = useState(routedAmount);
  const inputRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const showBanner = (type, text) => {
    setBanner({ type, text });
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const change = useMemo(() => {
    const ch = Number(tendered || 0) - Number(due || 0);
    return ch > 0 ? ch : 0;
  }, [tendered, due]);

  const appendDigit = (d) => {
    const s = String(tendered ?? 0);
    const next = s === "0" ? String(d) : s + String(d);
    if (/^\d+(\.\d{0,2})?$/.test(next)) {
      setTendered(Number(next));
    }
  };

  const addBump = (n) => setTendered((v) => Number(v || 0) + n);

  const backspace = () => {
    const s = String(tendered ?? 0);
    const cut = s.length > 1 ? s.slice(0, -1) : "0";
    setTendered(Number(cut === "" || cut === "-" || cut === "." ? 0 : cut));
  };

  const clearAll = () => setTendered(0);
  const dot = () => {
    const s = String(tendered ?? 0);
    if (!s.includes(".")) setTendered(Number(s + "."));
  };

  const buildLines = () =>
    (routedCart.items || [])
      .map((r) => {
        const qty = Number(r.qty ?? r.quantity ?? r.qtyOrdered ?? r.qty_ordered ?? 1) || 1;
        const code = r.barcode ?? r.itemCode ?? r.itemcode ?? r.code ?? r.id ?? "";
        return code ? { barcode: String(code), qty: qty > 0 ? qty : 1 } : null;
      })
      .filter(Boolean);

  const submitToServer = async () => {
    if (!routedCustomer?.id) {
      showBanner("error", "Select the customer first.");
      return;
    }

    const lines = buildLines();
    if (!lines.length) {
      showBanner("error", "No items in cart.");
      return;
    }

    const pays = [
      {
        method: "CASH",
        amount: +Number(due).toFixed(2),
        reference: `Tendered:${Number(tendered || 0).toFixed(2)}|Change:${Number(change || 0).toFixed(2)}`,
        card_holder: "",
        card_holder_phone: "",
        customer_bank: "",
        account: "",
      },
    ];

    const payload = {
      customer: {
        name: (routedCustomer?.name || "Guest"),
        phone: (routedCustomer?.phone || ""),
        email: (routedCustomer?.email || ""),
      },
      lines,
      payments: pays,
      store: "Wabi - Sabi",
      note: "",
    };

    try {
      setBusy(true);
      setBanner(null);

      // Add a small delay to ensure UI updates before API call
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await createSale(payload);

      const msg = `Payment successful. Invoice: ${res?.invoice_no || "—"}`;
      showBanner("success", msg);
      clearSelectedCustomer();

      if (andPrint) {
        try { window.print(); } catch {}
      }

      // Keep showing success message longer
      await new Promise(resolve => setTimeout(resolve, 1500));

      navigate(redirectPath, {
        replace: true,
        state: { flash: { type: "success", text: msg } },
      });
    } catch (e) {
      console.error(e);
      const msg = "Payment failed: could not update the database. Please try again.";
      showBanner("error", msg);
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({
        method: "cash",
        due,
        tendered: Number(tendered || 0),
        change: Number(change || 0),
        ts: Date.now(),
      });
      return;
    }
    submitToServer().catch((e) => {
      console.error(e);
      const msg = "Payment failed: could not update the database. Please try again.";
      showBanner("error", msg);
      setBusy(false);
    });
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate(-1);
  };

  return (
    <>
      <div className="cpay-overlay" role="dialog" aria-modal="true">
        <div className="cpay-modal">
          <div className="cpay-head">
            <div className="cpay-col">
              <div className="cpay-label">Due Amount</div>
              <input
                className="cpay-input cpay-green"
                value={due.toFixed(2)}
                readOnly
                aria-label="Due amount"
              />
            </div>

            <div className="cpay-col">
              <div className="cpay-label">Tendered</div>
              <input
                ref={inputRef}
                className="cpay-input cpay-green"
                value={(Number(tendered || 0)).toFixed(2)}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, "");
                  const cleaned = v === "" ? "0" : v;
                  if (/^\d*\.?\d{0,2}$/.test(cleaned)) setTendered(Number(cleaned));
                }}
                aria-label="Tendered amount"
              />
            </div>

            <div className="cpay-col">
              <div className="cpay-label">Change</div>
              <input
                className="cpay-input cpay-purple"
                value={change.toFixed(2)}
                readOnly
                aria-label="Change amount"
              />
            </div>
          </div>

          <div className="cpay-body">
            <div className="cpay-pad">
              <button className="cpay-key" onClick={() => appendDigit(1)} disabled={busy}>1</button>
              <button className="cpay-key" onClick={() => appendDigit(2)} disabled={busy}>2</button>
              <button className="cpay-key" onClick={() => appendDigit(3)} disabled={busy}>3</button>
              <button className="cpay-key" onClick={() => addBump(5)} disabled={busy}>+05</button>
              <button className="cpay-key" onClick={() => addBump(100)} disabled={busy}>+100</button>

              <button className="cpay-key" onClick={() => appendDigit(4)} disabled={busy}>4</button>
              <button className="cpay-key" onClick={() => appendDigit(5)} disabled={busy}>5</button>
              <button className="cpay-key" onClick={() => appendDigit(6)} disabled={busy}>6</button>
              <button className="cpay-key" onClick={() => addBump(10)} disabled={busy}>+10</button>
              <button className="cpay-key" onClick={() => addBump(500)} disabled={busy}>+500</button>

              <button className="cpay-key" onClick={() => appendDigit(7)} disabled={busy}>7</button>
              <button className="cpay-key" onClick={() => appendDigit(8)} disabled={busy}>8</button>
              <button className="cpay-key" onClick={() => appendDigit(9)} disabled={busy}>9</button>
              <button className="cpay-key" onClick={() => addBump(20)} disabled={busy}>+20</button>
              <button className="cpay-key" onClick={() => addBump(2000)} disabled={busy}>+2000</button>

              <button className="cpay-key" onClick={clearAll} disabled={busy}>C</button>
              <button className="cpay-key" onClick={dot} disabled={busy}>.</button>
              <button className="cpay-key" onClick={() => appendDigit(0)} disabled={busy}>0</button>
              <button className="cpay-key" onClick={() => addBump(50)} disabled={busy}>+50</button>
              <button className="cpay-key" onClick={backspace} disabled={busy}><span aria-hidden>⌫</span></button>
            </div>

            <div className="cpay-actions">
              <button
                className="cpay-btn cpay-submit"
                onClick={handleSubmit}
                disabled={busy}
              >
                {busy && <span className="cpay-spinner" aria-hidden="true" />}
                <span>{busy ? "Processing Payment..." : "Submit"}</span>
              </button>
              <button className="cpay-btn cpay-cancel" onClick={handleClose} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>

          {banner && (
            <div
              className={`cpay-banner ${banner.type === "success" ? "ok" : "err"}`}
              role="status"
              aria-live="polite"
            >
              <div className="cpay-banner-icon">
                {banner.type === "success" ? "✅" : "⚠️"}
              </div>
              <div className="cpay-banner-text">{banner.text}</div>
            </div>
          )}
        </div>
      </div>

      {/* Processing Overlay - moved outside main modal */}
      {busy && (
        <div className="cpay-processing-overlay">
          <div className="cpay-processing-card">
            <div className="cpay-processing-spinner"></div>
            <div className="cpay-processing-text">Payment Processing...</div>
          </div>
        </div>
      )}
    </>
  );
}