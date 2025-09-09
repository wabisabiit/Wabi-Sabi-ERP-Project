import React from "react";

export default function ProductTable() {
  return (
    <div className="product-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Itemcode</th>
            <th>Product</th>
            <th>Qty</th>
            <th>MRP</th>
            <th>Discount</th>
            <th>Add Disc</th>
            <th>Unit Cost</th>
            <th>Net Amount</th>
          </tr>
        </thead>
        <tbody>
          {/* Empty rows initially */}
        </tbody>
      </table>
      <input className="remarks" placeholder="Remarks" />
    </div>
  );
}
