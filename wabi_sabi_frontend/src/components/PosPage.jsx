import React, { useMemo, useState } from "react";
import SearchBar from "./SearchBar";
import CartTable from "./CartTable";
import Footer from "./Footer";

export default function PosPage() {
  const [items, setItems] = useState([]);

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
    setItems([]); // clear cart for next customer
  };

  return (
    <div className="pos-page">
      <SearchBar onAddItem={handleAddItem} />
      <CartTable items={items} />
      <Footer
        items={items}                 // <-- IMPORTANT: pass cart rows
        totalQty={totals.totalQty}
        amount={totals.amount}
        onReset={handleReset}         // <-- Footer will call this on success
        customer={someCustomer}  // (optional) pass real customer if you have it
      />
    </div>
  );
}
