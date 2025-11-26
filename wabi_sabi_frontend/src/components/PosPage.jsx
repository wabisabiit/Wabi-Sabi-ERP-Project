import React, { useEffect, useMemo, useState } from "react";
import SearchBar from "./SearchBar";
import CartTable from "./CartTable";
import Footer from "./Footer";

const CART_KEY = "pos.cartItems";

export default function PosPage() {
  // ✅ Single source of truth for cart items (hydrate from localStorage if present)
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // ✅ Keep localStorage in sync – add & delete both update storage
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // ignore errors
    }
  }, [items]);

  const handleAddItem = (p) => {
    const row = {
      id: crypto.randomUUID?.() || `${p.id}-${Date.now()}`,
      itemcode: p.barcode,             // Footer/buildLines will read this
      product: p.vasyName || "",
      qty: 1,
      mrp: p.mrp,
      discount: undefined,
      addDisc: undefined,
      unitCost: undefined,
      netAmount: p.sellingPrice ?? 0,
    };
    setItems((prev) => [...prev, row]);
  };

  // 🔄 Called by CartTable when user deletes rows
  const handleRowsChange = (nextRows) => {
    setItems(nextRows); // <- this will recompute totals & footer amount
  };

  const totals = useMemo(() => {
    const totalQty = items.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const amount = items.reduce(
      (s, r) => s + (Number(r.netAmount) || 0) * (Number(r.qty) || 0),
      0
    );
    return { totalQty, amount, discount: 0 };
  }, [items]);

  // Called by Footer after a successful payment
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

    // 🧹 Clear cart in memory + storage
    setItems([]);
    try {
      localStorage.removeItem(CART_KEY);
    } catch {}
  };

  return (
    <div className="pos-page">
      <SearchBar onAddItem={handleAddItem} />
      {/* ✅ CartTable tells PosPage when rows change (delete) */}
      <CartTable items={items} onRowsChange={handleRowsChange} />
      <Footer
        items={items}                 // <-- cart rows
        totalQty={totals.totalQty}
        amount={totals.amount}        // <-- will now change on delete
        onReset={handleReset}
        customer={someCustomer}       // (keep whatever you had here)
      />
    </div>
  );
}
