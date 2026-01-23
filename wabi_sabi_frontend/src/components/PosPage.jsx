// src/components/PosPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import SearchBar from "./SearchBar";
import CartTable from "./CartTable";
import Footer from "./Footer";
import { getSaleLinesByInvoice } from "../api/client";

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
  // Dispatch example from your invoice input:
  // window.dispatchEvent(new CustomEvent("pos:load-invoice", { detail: { invoice_no: "INV103" } }))
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

  // ✅ totals always derived from current items (respects lineDiscountAmount)
  const totals = useMemo(() => {
    const totalQty = items.reduce((s, r) => s + (Number(r.qty) || 0), 0);

    const amount = items.reduce((s, r) => {
      const qty = Number(r.qty) || 0;

      const unit = Number(
        r.sellingPrice ??
          r.unitPrice ??
          r.unit_price ??
          r.price ??
          r.netAmount ??
          0
      );

      const disc = Number(r.lineDiscountAmount ?? 0) || 0;
      const discRs = Math.max(0, Math.min(unit || 0, disc));
      const netUnit = Math.max(0, (unit || 0) - discRs);

      return s + netUnit * qty;
    }, 0);

    return { totalQty, amount, discount: 0 };
  }, [items]);

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
  const someCustomer = null; // or whatever you already had

  return (
    <div className="pos-page">
      <SearchBar onAddItem={handleAddItem} />

      {/* CartTable can delete, and parent updates items */}
      <CartTable items={items} onRowsChange={handleRowsChange} />

      <Footer
        items={items}
        totalQty={totals.totalQty}
        amount={totals.amount} // ✅ now respects discount
        onReset={handleReset}
        customer={someCustomer}
      />
    </div>
  );
}
