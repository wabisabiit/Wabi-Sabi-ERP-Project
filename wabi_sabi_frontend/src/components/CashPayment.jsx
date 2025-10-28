import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/CashPayemnt.css"; // (exact file name per your request)
import { createSale, getSelectedCustomer, clearSelectedCustomer } from "../api/client";

export default function CashPayment({ amount = 0, onClose, onSubmit }) {
  const { state } = useLocation();
  const navigate = useNavigate();

  // When opened via routing from Footer we receive state: { cart:{items:[]}, customer:{}, amount, andPrint }
  const routedAmount = Number(state?.amount ?? amount) || 0;
  const routedCart   = state?.cart || { items: [] };
  const routedCustomer = state?.customer || getSelectedCustomer() || { name: "", phone: "", email: "" };
  const andPrint = !!state?.andPrint;
  const redirectPath = state?.redirectPath || "/new";

  const [due] = useState(routedAmount);
  const [tendered, setTendered] = useState(routedAmount);
  const inputRef = useRef(null);

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

  // Build sale lines from routed cart (same mapping style you use elsewhere)
  const buildLines = () =>
    (routedCart.items || [])
      .map((r, i) => {
        const qty =
          Number(r.qty ?? r.quantity ?? r.qtyOrdered ?? r.qty_ordered ?? 1) || 1;
        const code =
          r.barcode ?? r.itemCode ?? r.itemcode ?? r.code ?? r.id ?? "";
        return code ? { barcode: String(code), qty: qty > 0 ? qty : 1 } : null;
      })
      .filter(Boolean);

  const submitToServer = async () => {
    const lines = buildLines();
    if (!lines.length) {
      try { window.alert("No items in cart."); } catch {}
      return;
    }

    // Payment amount MUST equal server-side total. Use due (net amount), not tendered.
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

    const res = await createSale(payload);

    const msg = `Payment successful. Invoice: ${res?.invoice_no || "—"}`;
    try { window.alert(msg); } catch {}
    clearSelectedCustomer();
    if (andPrint) {
      try { window.print(); } catch {}
    }
    navigate(redirectPath, {
      replace: true,
      state: { flash: { type: "success", text: msg } },
    });
  };

  const handleSubmit = () => {
    // If used as a pure component with onSubmit, respect that; otherwise, post to server.
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
      try { window.alert(msg); } catch {}
    });
  };

  const handleClose = () => {
    if (onClose) onClose();
    else navigate(-1);
  };

  return (
    <div className="cpay-overlay" role="dialog" aria-modal="true">
      <div className="cpay-modal">
        {/* Top fields row */}
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

        {/* Keypad + Actions */}
        <div className="cpay-body">
          <div className="cpay-pad">
            {/* row 1 */}
            <button className="cpay-key" onClick={() => appendDigit(1)}>1</button>
            <button className="cpay-key" onClick={() => appendDigit(2)}>2</button>
            <button className="cpay-key" onClick={() => appendDigit(3)}>3</button>
            <button className="cpay-key" onClick={() => addBump(5)}>+05</button>
            <button className="cpay-key" onClick={() => addBump(100)}>+100</button>

            {/* row 2 */}
            <button className="cpay-key" onClick={() => appendDigit(4)}>4</button>
            <button className="cpay-key" onClick={() => appendDigit(5)}>5</button>
            <button className="cpay-key" onClick={() => appendDigit(6)}>6</button>
            <button className="cpay-key" onClick={() => addBump(10)}>+10</button>
            <button className="cpay-key" onClick={() => addBump(500)}>+500</button>

            {/* row 3 */}
            <button className="cpay-key" onClick={() => appendDigit(7)}>7</button>
            <button className="cpay-key" onClick={() => appendDigit(8)}>8</button>
            <button className="cpay-key" onClick={() => appendDigit(9)}>9</button>
            <button className="cpay-key" onClick={() => addBump(20)}>+20</button>
            <button className="cpay-key" onClick={() => addBump(2000)}>+2000</button>

            {/* row 4 */}
            <button className="cpay-key" onClick={clearAll}>C</button>
            <button className="cpay-key" onClick={dot}>.</button>
            <button className="cpay-key" onClick={() => appendDigit(0)}>0</button>
            <button className="cpay-key" onClick={() => appendDigit(50)}>+50</button>
            <button className="cpay-key" onClick={backspace}><span aria-hidden>⌫</span></button>
          </div>

          <div className="cpay-actions">
            <button className="cpay-btn cpay-submit" onClick={handleSubmit}>
              Submit
            </button>
            <button className="cpay-btn cpay-cancel" onClick={handleClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
