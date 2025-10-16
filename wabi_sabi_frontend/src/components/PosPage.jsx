import React, { useMemo, useState } from "react";
import SearchBar from "./SearchBar";     // ✅ same folder
import CartTable from "./CartTable";     // ✅ same folder
import Footer from "./Footer";        // ✅ same folder


export default function PosPage() {
  const [items, setItems] = useState([]);

  // When a barcode is scanned/pasted in SearchBar and the backend returns product
  const handleAddItem = (p) => {
    // p => { id, barcode, mrp, sellingPrice, vasyName }
    const row = {
      id: crypto.randomUUID?.() || `${p.id}-${Date.now()}`,
      itemcode: p.barcode,              // <-- itemcode IS barcode
      product: p.vasyName || "",        // <-- vasy easy name from TaskMaster
      qty: 1,                           // <-- default 1
      mrp: p.mrp,                       // <-- price from products table
      discount: undefined,              // <-- show as '---'
      addDisc: undefined,               // <-- show as '---'
      unitCost: undefined,              // <-- show as '---'
      netAmount: p.sellingPrice ?? 0,   // <-- selling price from products
    };
    setItems((prev) => [...prev, row]);
  };

  // Totals for footer
  const totals = useMemo(() => {
    const totalQty = items.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const amount = items.reduce(
      (s, r) => s + (Number(r.netAmount) || 0) * (Number(r.qty) || 0),
      0
    );
    const discount = 0; // You said discount fields are '---' for now; keeping 0 total
    return { totalQty, amount, discount };
  }, [items]);

  return (
    <div className="pos-page">
      <SearchBar onAddItem={handleAddItem} />
      <CartTable items={items} />
      <Footer
        totalQty={totals.totalQty}
        amount={totals.amount}
        // (Footer already shows a "Discount" metric at the left side of Amount)
      />
    </div>
  );
}
