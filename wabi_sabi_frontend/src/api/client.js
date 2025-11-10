// src/api/client.js

/* ========= TaskItem lookup (used on Image-1) ========= */
const BASE = "http://127.0.0.1:8000"; // if frontend is proxied to Django, you can set ""

export async function getItemByCode(code) {
  // DRF endpoint: /api/taskitems/<item_code>/
  const url = `${BASE}/api/taskitems/${encodeURIComponent(code)}/`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Lookup failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Normalize a friendly product name
  const product_name =
    data.item_print_friendly_name ||
    data.item_full_name ||
    data.full_name ||
    data.name ||
    "";

  return { product_name, item: data };
}

/* ========= Generic JSON HTTP helper (used by Product APIs) ========= */
const API_BASE = import.meta?.env?.VITE_API_BASE || "http://127.0.0.1:8000/api";

// Minimal cookie reader for CSRF (only needed with SessionAuthentication)
function getCookie(name) {
  const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return m ? decodeURIComponent(m.pop()) : "";
}

async function http(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  // For non-GETs, include CSRF token if present
  if (method !== "GET") {
    const csrftoken = getCookie("csrftoken");
    if (csrftoken) headers["X-CSRFToken"] = csrftoken;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // send cookies if you’re using SessionAuth
    ...opts,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} – ${text}`);
  }

  // 204 No Content
  return res.status === 204 ? null : res.json();
}

/* ========= Products API ========= */
export async function listProducts(params = {}) {
  const search = new URLSearchParams(params).toString();
  return http(`/products/${search ? `?${search}` : ""}`);
}

// <------------------------17-10-2025------------->

// Locations
export async function listLocations() {
  return http(`/locations/`);
}

// Transfers
export async function listTransfers(params = {}) {
  const search = new URLSearchParams(params).toString();
  return http(`/products/transfers/${search ? `?${search}` : ""}`);
}

export async function getTransfer(number) {
  return http(`/products/transfers/${encodeURIComponent(number)}/`);
}

export async function deleteTransfer(number) {
  return http(`/products/transfers/${encodeURIComponent(number)}/delete/`, { method: "DELETE" });
}


// <------------------------17-10-2025------------->

export async function getProduct(id) {
  return http(`/products/${id}/`);
}

export async function deleteProduct(id) {
  return http(`/products/${id}/`, { method: "DELETE" });
}

/**
 * Bulk create/update products from barcode grid.
 * rows: [{ itemCode, barcodeNumber, salesPrice, mrp, size, imageUrl }, ...]
 */
export async function upsertProductsFromBarcodes(rows) {
  return http(`/products/bulk-upsert/`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

// ⬇️ put this near the other transfer APIs
export async function printBarcodes(payload) {
  // payload = { to_location_code: "RJO", barcodes: ["WS-100-01", ...], created_at?, note? }
  return http(`/products/print-barcodes/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


/* ========= Optional convenience default export ========= */
export default {
  getItemByCode,
  listProducts,
  getProduct,
  deleteProduct,
  upsertProductsFromBarcodes,
  getProductByBarcode,

  listLocations,
  listTransfers,
  getTransfer,
  deleteTransfer,
  printBarcodes,
  createSale,
  listSales,
  listCreditNotes,

  // NEW
  getSaleLinesByInvoice,
  createSalesReturn,
  getCreditNote,
  redeemCreditNote,

  // customers + POS session
  searchCustomers,
  createCustomer,
  getSelectedCustomer,
  setSelectedCustomer,
  clearSelectedCustomer,

  listOutlets,
  createOutlet,
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,

  createMasterPack,
  listMasterPacks,
  deleteMasterPack,
  bulkDeleteMasterPacks,
  getMasterPack,
  mcGetNextNumber,
  mcCreate,
  mcList,
  mcGet,

  listCoupons,
  createCoupon,
  generateCoupons,
  listGeneratedCoupons,
  lookupCoupon,
  redeemCoupon,
  asArray,

  listDaywiseSalesSummary,
  listProductWiseSales,
};

function sanitizeBarcode(v = "") {
  return v.replace(/[–—−‐]/g, "-").trim().toUpperCase(); // normalize unicode dashes
}


// src/api/client.js  (add this below the existing helpers/exports)

/* ========= Product lookup by barcode (used by SearchBar) ========= */
/* ========= Product lookup by barcode (used by SearchBar) ========= */
export async function getProductByBarcode(barcode) {
  const url = `/products/by-barcode/${encodeURIComponent(barcode)}/`;
  const data = await http(url);

  // DRF returns strings for decimals; convert safely
  const mrpNum = Number(data?.mrp ?? 0);
  const spNum  = Number(data?.selling_price ?? 0);

  // Prefer print-friendly -> vasy -> full name
  const vasyName =
    data?.task_item?.item_print_friendly_name ||
    data?.task_item?.item_vasy_name ||
    data?.task_item?.item_full_name ||
    "";

  return {
    id: data?.id,
    barcode: data?.barcode || "",
    mrp: Number.isFinite(mrpNum) ? mrpNum : 0,
    sellingPrice: Number.isFinite(spNum) ? spNum : 0,
    vasyName,
    qty: Number(data?.qty ?? 0),
    available: !!data?.available,
    size: data?.size || "",      // <-- ADD THIS LINE
  };
}


// Create sale (finalize payment)
export async function createSale(payload) {
  // payload shape must match SalesView
  return http(`/sales/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// List sales (for Sale List page)
export async function listSales(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (typeof v === "string" && v.trim() === "") return;
    sp.append(k, v);
  });
  const qs = sp.toString();
  return http(`/sales/${qs ? `?${qs}` : ""}`);
}

// Credit Note 
// --- Credit Notes API ---
export async function listCreditNotes(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (typeof v === "string" && v.trim() === "") return;
    sp.append(k, v);
  });
  const qs = sp.toString();
  return http(`/credit-notes/${qs ? `?${qs}` : ""}`);
}


// ===== NEW: Sales Return helpers =====
export async function getSaleLinesByInvoice(invoiceNo) {
  const safe = String(invoiceNo || "").trim();
  return http(`/sales/${encodeURIComponent(safe)}/lines/`);
}


export async function getCreditNote(noteNo) {
  return http(`/credit-notes/${encodeURIComponent(noteNo)}/`);
}

export async function redeemCreditNote(noteNo, payload) {
  // payload: { invoice_no, amount }
  return http(`/credit-notes/${encodeURIComponent(noteNo)}/redeem/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createSalesReturn(invoiceNo) {
  const safe = String(invoiceNo || "").trim();
  return http(`/sales/${encodeURIComponent(safe)}/return/`, { method: "POST" });
}


// ---- Customers ----
export async function searchCustomers(q) {
  const sp = new URLSearchParams();
  if (q) sp.append("q", q);
  return http(`/customers/${sp.toString() ? `?${sp.toString()}` : ""}`);
}

export async function createCustomer(payload) {
  // { name, phone, email? }
  return http(`/customers/`, { method: "POST", body: JSON.stringify(payload) });
}

/* POS "session" helpers (persist selection until sale completes) */
const CKEY = "pos.currentCustomer";
export function getSelectedCustomer() {
  try { return JSON.parse(localStorage.getItem(CKEY) || "null"); } catch { return null; }
}
export function setSelectedCustomer(cust) {
  if (cust) {
    localStorage.setItem(CKEY, JSON.stringify(cust));
    // 🔔 notify app so components (Footer, etc.) can re-render immediately
    try { window.dispatchEvent(new CustomEvent("pos:customer", { detail: cust })); } catch {}
  } else {
    localStorage.removeItem(CKEY);
    try { window.dispatchEvent(new CustomEvent("pos:customer", { detail: null })); } catch {}
  }
}
export function clearSelectedCustomer() {
  try { localStorage.removeItem(CKEY); } catch {}
  window.dispatchEvent(new CustomEvent("pos:clear-customer"));
}

/* ========= Outlets & Employees (NEW) ========= */

// List outlets (scoped by backend if non-HQ user)
export async function listOutlets() {
  return http(`/outlets/`);
}

// List employees (HQ can pass ?outlet=<id> to filter)
export async function listEmployees(params = {}) {
  const sp = new URLSearchParams();
  if (params.outlet) sp.append("outlet", params.outlet);
  if (params.search) sp.append("search", params.search);
  const qs = sp.toString();
  return http(`/employees/${qs ? `?${qs}` : ""}`);
}

// Create employee
// payload must include: username, password, role, outlet?, aadhaar, pan, bank_name, bank_branch, account_number
export async function createEmployee(payload) {
  return http(`/employees/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Update employee
export async function updateEmployee(id, payload) {
  return http(`/employees/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Delete employee
export async function deleteEmployee(id) {
  return http(`/employees/${id}/`, { method: "DELETE" });
}

// Create outlet
export async function createOutlet(payload) {
  // payload: { location_id, display_name, contact_no, opening_date, active? }
  return http(`/outlets/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createMasterPack(payload) {
  return http(`/master-packs/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listMasterPacks(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === null || v === undefined || v === "") return;
    sp.append(k, v);
  });
  const qs = sp.toString();
  return http(`/master-packs/${qs ? `?${qs}` : ""}`);
}

export async function deleteMasterPack(number) {
  return http(`/master-packs/${encodeURIComponent(number)}/`, { method: "DELETE" });
}

export async function bulkDeleteMasterPacks(numbers = []) {
  return http(`/master-packs/bulk-delete/`, {
    method: "POST",
    body: JSON.stringify({ numbers }),
  });
}


// Get one Master Pack (invoice) by number
export async function getMasterPack(number) {
  return http(`/master-packs/${encodeURIComponent(number)}/`);
}

// Material Consumption
export async function mcGetNextNumber() {
  return http(`/material-consumptions/next/`);
}

export async function mcCreate(payload) {
  // payload: { date: "2025-01-01", location_code: "WSLLP", consumption_type: "Production", remark: "", rows: [{barcode, qty, price}] }
  return http(`/material-consumptions/`, { method: "POST", body: JSON.stringify(payload) });
}

export async function mcList(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || String(v).trim() === "") return;
    sp.append(k, v);
  });
  const qs = sp.toString();
  return http(`/material-consumptions/${qs ? `?${qs}` : ""}`);
}

// Get one (detail) – already available via your detail route if you need it
export async function mcGet(number) {
  return http(`/material-consumptions/${encodeURIComponent(number)}/`);
}

// src/api/client.js  (additions)


export async function listCoupons() {
  const res = await http(`/coupons/`);
  return asArray(res);
}

export async function createCoupon(payload) {
  // { name, price }
  return http(`/coupons/`, { method: "POST", body: JSON.stringify(payload) });
}

export async function generateCoupons({ coupon_id, coupon_name, qty }) {
  return http(`/coupons/generate/`, {
    method: "POST",
    body: JSON.stringify({ coupon_id, coupon_name, qty }),
  });
}

export async function listGeneratedCoupons(params = {}) {
  const sp = new URLSearchParams();
  if (params.coupon) sp.append("coupon", params.coupon);
  if (params.assign) sp.append("assign", params.assign);
  const qs = sp.toString();
  const res = await http(`/coupons/instances/${qs ? `?${qs}` : ""}`);
  return asArray(res);
}

export async function lookupCoupon(code) {
  return http(`/coupons/instances/${encodeURIComponent(code)}/`);
}

export async function redeemCoupon(code, payload) {
  // payload: { invoice_no, customer: { id?, name, phone, email? } }
  return http(`/coupons/instances/${encodeURIComponent(code)}/redeem/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Normalize helpers
function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.results || payload?.data || payload?.items || [];
}


// --- Reports ---
export async function listDaywiseSalesSummary(params = {}) {
  const sp = new URLSearchParams();
  if (params.date_from) sp.append("date_from", params.date_from);
  if (params.date_to) sp.append("date_to", params.date_to);
  if (params.location) sp.append("location", params.location);
  return http(`/reports/daywise-sales/?${sp.toString()}`);
}


// --- Product Wise Sales Summary (real) ---
export async function listProductWiseSales(params = {}) {
  const sp = new URLSearchParams();
  // multi-location support:
  if (Array.isArray(params.location) && params.location.length) {
    params.location.forEach((l) => sp.append("location", l));
  }
  const keys = [
    "q","department","category","brand","product",
    "date_from","date_to","sales_type","page","page_size","all"
  ];
  keys.forEach(k => {
    const v = params[k];
    if (v === undefined || v === null || String(v).trim() === "") return;
    sp.append(k, v);
  });
  const qs = sp.toString();
  return http(`/reports/product-wise-sales/${qs ? `?${qs}` : ""}`);
}
