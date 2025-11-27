
import React, { useEffect, useMemo, useState } from "react";
import SearchBar from "./SearchBar";
import CartTable from "./CartTable";
import Footer from "./Footer";

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
      discount: undefined,
      addDisc: undefined,
      unitCost: undefined,
      netAmount: p.sellingPrice ?? 0,
    };
    setItems((prev) => [...prev, row]);
  };

  // 🔄 called by CartTable on delete (and any row changes)
  const handleRowsChange = (nextRows) => {
    setItems(nextRows);     // ← parent state update
  };

  // totals always derived from current items
  const totals = useMemo(() => {
    const totalQty = items.reduce(
      (s, r) => s + (Number(r.qty) || 0),
      0
    );
    const amount = items.reduce(
      (s, r) =>
        s + (Number(r.netAmount) || 0) * (Number(r.qty) || 0),
      0
    );
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
        amount={totals.amount}   // ← this will drop when you delete a row
        onReset={handleReset}
        customer={someCustomer}
      />
    </div>
  );
}
