import React from "react";

export default function POSPage() {
  return (
    <div className="h-screen w-full flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b px-3 py-2 bg-gray-50">
        {/* Left: Logo + WalkIn/Delivery + Salesman */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-extrabold text-blue-600">vasy</span>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-900 text-white">ERP</span>
          </div>

          <div className="h-5 w-px bg-gray-300 mx-1" />

          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" name="visitType" defaultChecked />
              <span>Walk In</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="visitType" />
              <span>Delivery</span>
            </label>

            <span className="text-gray-500">Salesman:</span>
            <select className="border rounded px-2 py-1">
              <option>IT Account</option>
              <option>Salesman A</option>
              <option>Salesman B</option>
            </select>

            <button className="ml-2 text-sm px-3 py-1 rounded border bg-white hover:bg-gray-100">
              Support Desk
            </button>
          </div>
        </div>

        {/* Right: search inputs */}
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-1 w-72"
            placeholder="Scan Barcode/Enter Product Name"
          />
          <input
            className="border rounded px-3 py-1 w-56"
            placeholder="Walk in Customer"
          />
          <input
            className="border rounded px-3 py-1 w-56"
            placeholder="Scan Sales Invoice"
          />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Items table */}
        <section className="flex-1 p-3 overflow-hidden">
          <div className="rounded border overflow-hidden h-full flex flex-col">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="text-left p-2 w-10">#</th>
                  <th className="text-left p-2 w-28">Itemcode</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2 w-16">Qty</th>
                  <th className="text-left p-2 w-24">MRP</th>
                  <th className="text-left p-2 w-24">Discount</th>
                  <th className="text-left p-2 w-24">Add Disc</th>
                  <th className="text-left p-2 w-24">Unit Cost</th>
                  <th className="text-left p-2 w-28">Net Amount</th>
                </tr>
              </thead>
            </table>

            {/* Empty area like the screenshot */}
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              No items added
            </div>
          </div>

          {/* Remarks */}
          <input
            className="mt-3 w-full border rounded px-3 py-2"
            placeholder="Remarks"
          />
        </section>

        {/* Right: Sidebar */}
        <aside className="w-80 border-l p-3 space-y-2 bg-white">
          {/* Action buttons (top stack) */}
          <div className="grid grid-cols-2 gap-2">
            <button className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-left">Hold Bill</button>
            <button className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-left">Payments</button>
            <button className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-left">Redeem Loyalty</button>
            <button className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-left">Add Payment Credit Notes</button>
            <button className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-left">Orders</button>
            <button className="p-2 rounded bg-gray-100 hover:bg-gray-200 text-left">Cash Control</button>
          </div>

          {/* Customer Details card */}
          <div className="border rounded p-3 text-sm">
            <h3 className="font-semibold mb-2">Customer Details</h3>
            <div className="space-y-1">
              <p><span className="text-gray-500">Last Visited:</span> -</p>
              <p><span className="text-gray-500">Last Bill Amount:</span> ₹0</p>
              <p><span className="text-gray-500">Most Purchased Item:</span> 0</p>
              <p><span className="text-gray-500">Payment Mode:</span> -</p>
              <p><span className="text-gray-500">Due Payment:</span> 0</p>
              <p><span className="text-gray-500">Total Purchase:</span> 0</p>
              <p><span className="text-gray-500">Loyalty Points:</span> 0</p>
            </div>
          </div>

          {/* Last bill card */}
          <div className="border rounded p-3 text-sm">
            <p><span className="text-gray-500">Last Bill No.:</span> -</p>
            <p><span className="text-gray-500">Last Bill Amount:</span> -</p>
            <button className="mt-2 w-full bg-black text-white py-2 rounded">Last Bill Print</button>
          </div>
        </aside>
      </div>

      {/* Bottom Bar */}
      <footer className="border-t bg-gray-50 p-3">
        {/* Totals row */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <div className="text-center">
            <div className="text-xl font-semibold">0</div>
            <div className="text-gray-600">Quantity</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold">0</div>
            <div className="text-gray-600">MRP</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold">0</div>
            <div className="text-gray-600">Tax Amount</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold">0</div>
            <div className="text-gray-600">Discount</div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600">Flat Discount</span>
            <input className="border rounded px-2 py-1 w-20" type="number" defaultValue="0.00" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600">Round OFF</span>
            <input className="border rounded px-2 py-1 w-20" type="number" defaultValue="0.00" />
          </div>

          <div className="ml-auto text-right">
            <div className="text-xl font-semibold">0</div>
            <div className="text-gray-600">Amount</div>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-3">
          <Btn>Multiple Pay (F12)</Btn>
          <Btn>Redeem Credit</Btn>
          <Btn>Hold (F6)</Btn>
          <Btn>UPI (F5)</Btn>
          <Btn>Card (F3)</Btn>
          <Btn>Cash (F4)</Btn>
          <Btn>Apply Coupon</Btn>
          <Btn>Pay Later (F1)</Btn>
          <Btn>Hold &amp; Print (F7)</Btn>
          <Btn>UPI &amp; Print (F10)</Btn>
          <Btn>Card &amp; Print (F9)</Btn>
          <Btn>Cash &amp; Print (F8)</Btn>
        </div>
      </footer>
    </div>
  );
}

/** Small shared button */
function Btn({ children }) {
  return (
    <button className="w-full bg-black text-white px-3 py-2 rounded hover:opacity-90">
      {children}
    </button>
  );
}
