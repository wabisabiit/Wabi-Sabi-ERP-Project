import React from "react";

function POSPage() {
  return (
    <div className="container-fluid p-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold">Vasy ERP</h4>
        <div>
          <label className="me-2">
            <input type="radio" name="type" defaultChecked /> Walk In
          </label>
          <label className="me-2">
            <input type="radio" name="type" /> Delivery
          </label>
          <select className="form-select d-inline-block w-auto">
            <option>IT Account</option>
            <option>Salesman 1</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="row mb-3">
        <div className="col-md-4">
          <input
            type="text"
            placeholder="Scan Barcode/Enter Product Name"
            className="form-control"
          />
        </div>
        <div className="col-md-4">
          <select className="form-select">
            <option>Walk In Customer</option>
          </select>
        </div>
        <div className="col-md-4">
          <input
            type="text"
            placeholder="Scan Sales Invoice"
            className="form-control"
          />
        </div>
      </div>

      {/* Table */}
      <table className="table table-bordered text-center">
        <thead className="table-dark">
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
          <tr>
            <td colSpan="9" className="text-muted">
              No items added
            </td>
          </tr>
        </tbody>
      </table>

      {/* Remarks */}
      <input
        type="text"
        placeholder="Remarks"
        className="form-control mb-3"
      />

      {/* Footer Section */}
      <div className="row text-center">
        <div className="col">Quantity: 0</div>
        <div className="col">MRP: 0</div>
        <div className="col">Tax: 0</div>
        <div className="col">Discount: 0</div>
        <div className="col">Flat Discount: 0%</div>
        <div className="col">Amount: 0</div>
      </div>

      {/* Payment Buttons */}
      <div className="d-flex flex-wrap gap-2 mt-3">
        <button className="btn btn-dark">Multiple Pay (F12)</button>
        <button className="btn btn-dark">Redeem Credit</button>
        <button className="btn btn-dark">Hold (F6)</button>
        <button className="btn btn-dark">UPI (F5)</button>
        <button className="btn btn-dark">Card (F3)</button>
        <button className="btn btn-dark">Cash (F4)</button>
        <button className="btn btn-dark">Apply Coupon</button>
        <button className="btn btn-dark">Pay Later (F1)</button>
        <button className="btn btn-dark">Hold & Print (F7)</button>
        <button className="btn btn-dark">UPI & Print (F10)</button>
        <button className="btn btn-dark">Card & Print (F9)</button>
        <button className="btn btn-dark">Cash & Print (F8)</button>
      </div>
    </div>
  );
}

export default POSPage;
