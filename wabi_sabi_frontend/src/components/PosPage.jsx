// src/components/PosPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import SearchBar from "./SearchBar";
import CartTable from "./CartTable";
import Footer from "./Footer";
import RegisterOpenModal from "./RegisterOpenModal";
import RegisterCloseModal from "./RegisterCloseModal";
import { getSaleLinesByInvoice, getRegisterSessionToday } from "../api/client";

const CART_KEY = "pos.cartItems";

export default function PosPage() {
  console.log("📌 POSPAGE FILE LOADED FROM:", import.meta.url);

  // cart state (hydrate from localStorage)
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // ✅ Register session state
  const [openingCash, setOpeningCash] = useState(0);
  const [rangeLabel, setRangeLabel] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);

  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const [closeRegisterModal, setCloseRegisterModal] = useState(false);

  // ✅ NEW: bill discount values coming from Footer (flat % / rupees)
  const [billDiscValue, setBillDiscValue] = useState("0.00");
  const [billDiscIsPercent, setBillDiscIsPercent] = useState(true);

  useEffect(() => {
    const handler = (e) => {
      const d = e?.detail || window.__BILL_DISCOUNT__ || null;
      if (!d) return;
      setBillDiscValue(String(d.value ?? "0"));
      setBillDiscIsPercent(!!d.isPercent);
    };
    window.addEventListener("pos:bill-discount", handler);

    // pick up already-set value (if footer mounted earlier)
    handler({ detail: window.__BILL_DISCOUNT__ });

    return () => window.removeEventListener("pos:bill-discount", handler);
  }, []);

  // keep localStorage in sync whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const handleAddItem = (p) => {
    const row = {
      id: crypto.randomUUID?.() || `${p.id}-${Date.now()}`,
      itemcode: p.barcode,
      product: p.vasyName || "",
      qty: 1,
      mrp: p.mrp,

      // keep these (existing fields)
      discount: undefined,
      addDisc: undefined,
      unitCost: undefined,

      // ✅ ensure unit base exists
      sellingPrice: p.sellingPrice ?? 0,

      // ✅ CartTable uses this for discount ₹ per unit
      lineDiscountAmount: 0,

      // keep netAmount for backward compatibility
      netAmount: p.sellingPrice ?? 0,
    };
    setItems((prev) => [...prev, row]);
  };

  // ✅ Load invoice into cart (uses sale-time lines endpoint)
  const loadInvoiceToCart = async (invoiceNo) => {
    const inv = String(invoiceNo || "").trim();
    if (!inv) return;

    try {
      const res = await getSaleLinesByInvoice(inv);
      const lines = Array.isArray(res?.lines) ? res.lines : [];

      const rows = lines.map((ln) => ({
        id: crypto.randomUUID?.() || `${ln.barcode}-${Date.now()}`,
        itemcode: ln.itemcode || ln.barcode || "",
        product: ln.product_name || "",
        qty: Number(ln.qty || 1),
        mrp: Number(ln.mrp || 0),

        // base unit price at sale time
        sellingPrice: Number(ln.sp || 0),

        // ✅ discount at sale time (₹ per unit)
        lineDiscountAmount: Number(ln.discount_amount || 0),

        // keep existing fields
        discount: undefined,
        addDisc: undefined,
        unitCost: undefined,

        // keep netAmount for backward compatibility
        netAmount: Number(ln.sp || 0),
      }));

      setItems(rows);
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(rows));
      } catch {}
    } catch (e) {
      console.error("Failed to load invoice lines:", e);
    }
  };

  // ✅ Listen for invoice-paste event fired from anywhere (header/input/etc.)
  useEffect(() => {
    const onLoad = (e) => {
      const invoiceNo =
        e?.detail?.invoice_no ||
        e?.detail?.invoiceNo ||
        e?.detail ||
        "";
      loadInvoiceToCart(invoiceNo);
    };

    window.addEventListener("pos:load-invoice", onLoad);
    return () => window.removeEventListener("pos:load-invoice", onLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔄 called by CartTable on delete (and any row changes)
  const handleRowsChange = (nextRows) => {
    setItems(nextRows); // ← parent state update
  };

  // ✅ totals = FINAL SUM OF NET AMOUNTS (includes footer flat discount)
  const totals = useMemo(() => {
    const totalQty = items.reduce((s, r) => s + (Number(r.qty) || 0), 0);

    // base for bill discount allocation is after line discounts
    const bases = items.map((r) => {
      const qty = Number(r.qty) || 0;
      const unit = Number(
        r.sellingPrice ??
          r.unitPrice ??
          r.unit_price ??
          r.price ??
          r.netAmount ??
          0
      );
      const lineDisc = Number(r.lineDiscountAmount ?? 0) || 0;
      const baseUnit = Math.max(0, (Number.isFinite(unit) ? unit : 0) - Math.max(0, Math.min(unit || 0, lineDisc)));
      return {
        qty,
        unit: Number.isFinite(unit) ? unit : 0,
        lineDisc: Math.max(0, Math.min(unit || 0, lineDisc)),
        baseUnit,
        baseLine: baseUnit * qty,
      };
    });

    const baseTotal = bases.reduce((s, b) => s + (b.baseLine || 0), 0);

    const discRaw = Math.max(0, Number(billDiscValue) || 0);
    const isPct = !!billDiscIsPercent;

    const amount = bases.reduce((s, b) => {
      const qty = Number(b.qty) || 0;
      const unit = Number(b.unit) || 0;
      const lineDisc = Number(b.lineDisc) || 0;

      let billDiscPerUnit = 0;
      if (isPct) {
        billDiscPerUnit = (b.baseUnit * discRaw) / 100;
      } else {
        if (baseTotal > 0 && qty > 0) {
          const share = b.baseLine / baseTotal;
          const allocLine = discRaw * share;
          billDiscPerUnit = allocLine / qty;
        }
      }

      const totalDiscPerUnit = Math.max(0, Math.min(unit, lineDisc + billDiscPerUnit));
      const netUnit = Math.max(0, unit - totalDiscPerUnit);

      return s + netUnit * qty;
    }, 0);

    return { totalQty, amount, discount: 0 };
  }, [items, billDiscValue, billDiscIsPercent]);

  const handleReset = (res) => {
    try {
      if (res?.invoice_no) {
        alert(
          `Payment successful.\nInvoice: ${res.invoice_no}${
            res?.grand_total ? `\nAmount: ₹${res.grand_total}` : ""
          }`
        );
      }
    } catch (_) {}

    setItems([]);
    try {
      localStorage.removeItem(CART_KEY);
    } catch {}
  };

  // you’ll replace this with your actual customer object
  const someCustomer = null;

  // ✅ On POS load: check if register is opened today for this location
  useEffect(() => {
    (async () => {
      try {
        const data = await getRegisterSessionToday();

        const is_open = !!data?.is_open;
        const opening = Number(data?.opening_cash ?? 0) || 0;

        setSessionOpen(is_open);
        setOpeningCash(opening);

        const label =
          data?.range_label ||
          data?.business_date_label ||
          data?.business_date ||
          new Date().toISOString().slice(0, 10);
        setRangeLabel(label);

        if (!is_open) {
          setOpenRegisterModal(true);
        } else {
          setOpenRegisterModal(false);
        }
      } catch (e) {
        console.error("Failed to load register session:", e);
        setOpenRegisterModal(true);
      }
    })();
  }, []);

  const onOpened = (data) => {
    const opening = Number(data?.opening_cash ?? 0) || 0;
    setOpeningCash(opening);
    setSessionOpen(true);

    const label =
      data?.range_label ||
      data?.business_date_label ||
      data?.business_date ||
      new Date().toISOString().slice(0, 10);
    setRangeLabel(label);

    setOpenRegisterModal(false);
  };

  const onAfterCloseSaved = async () => {
    setSessionOpen(false);
    setOpenRegisterModal(true);
  };

  return (
    <div className="pos-page" style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "8px 12px",
        }}
      >
        <button
          onClick={() => setCloseRegisterModal(true)}
          disabled={!sessionOpen}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: sessionOpen ? "#111827" : "#f3f4f6",
            color: sessionOpen ? "#fff" : "#6b7280",
            fontWeight: 700,
            cursor: sessionOpen ? "pointer" : "not-allowed",
          }}
          title={!sessionOpen ? "Open register first" : "Close register"}
        >
          Close Register
        </button>
      </div>

      <SearchBar onAddItem={handleAddItem} />

      {/* ✅ pass footer bill discount so row shows ₹ discount */}
      <CartTable
        items={items}
        onRowsChange={handleRowsChange}
        billDiscountValue={billDiscValue}
        billDiscountIsPercent={billDiscIsPercent}
      />

      <Footer
        items={items}
        totalQty={totals.totalQty}
        amount={totals.amount} // ✅ final sum of row nets
        onReset={handleReset}
        customer={someCustomer}
      />

      <RegisterOpenModal
        open={openRegisterModal}
        onClose={() => {
          if (sessionOpen) setOpenRegisterModal(false);
        }}
        onOpened={onOpened}
      />

      <RegisterCloseModal
        open={closeRegisterModal}
        onClose={() => setCloseRegisterModal(false)}
        rangeLabel={rangeLabel}
        openingCash={openingCash}
        onAfterSave={onAfterCloseSaved}
      />
    </div>
  );
}
