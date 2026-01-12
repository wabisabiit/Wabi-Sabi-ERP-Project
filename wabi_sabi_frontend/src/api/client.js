// src/api/client.js

/* ========= TaskItem lookup (used on Image-1) ========= */

// ✅ dev/prod backend origin
const DEV_BACKEND_ORIGIN = "http://localhost:8000";
const PROD_BACKEND_ORIGIN =
  (typeof window !== "undefined" && window.location?.origin)
    ? window.location.origin
    : "http://64.227.135.159";

const BASE = (import.meta?.env?.DEV ? DEV_BACKEND_ORIGIN : PROD_BACKEND_ORIGIN);

export async function getItemByCode(code) {
  const url = `${BASE}/api/taskitems/${encodeURIComponent(code)}/`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Lookup failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  const product_name =
    data.item_print_friendly_name ||
    data.item_full_name ||
    data.full_name ||
    data.name ||
    "";

  return { product_name, item: data };
}

/* ========= Generic JSON HTTP helper (used by Product APIs) ========= */

const API_BASE =
  import.meta?.env?.VITE_API_BASE ||
  (import.meta?.env?.DEV
    ? `${DEV_BACKEND_ORIGIN}/api`
    : `${PROD_BACKEND_ORIGIN}/api`);

function getCookie(name) {
  const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return m ? decodeURIComponent(m.pop()) : "";
}

function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "");
  return p.startsWith("/") ? `${b}${p}` : `${b}/${p}`;
}

// ✅ NEW: supports arrays & skips empty
function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === null || v === undefined) return;

    if (Array.isArray(v)) {
      v.forEach((x) => {
        if (x === null || x === undefined) return;
        const s = String(x).trim();
        if (s) sp.append(k, s);
      });
      return;
    }

    const s = String(v).trim();
    if (s) sp.append(k, s);
  });

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function http(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();

  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  if (method !== "GET") {
    const csrftoken = getCookie("csrftoken");
    if (csrftoken) headers["X-CSRFToken"] = csrftoken;
  }

  const res = await fetch(joinUrl(API_BASE, path), {
    credentials: "include",
    ...opts,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} – ${text}`);
  }

  return res.status === 204 ? null : res.json();
}

/* ========= Products API ========= */
export async function listProducts(params = {}) {
  const search = new URLSearchParams(params).toString();
  return http(`/products/${search ? `?${search}` : ""}`);
}

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

export async function getProduct(id) {
  return http(`/products/${id}/`);
}

export async function deleteProduct(id) {
  return http(`/products/${id}/`, { method: "DELETE" });
}

export async function upsertProductsFromBarcodes(rows) {
  return http(`/products/bulk-upsert/`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

export async function printBarcodes(payload) {
  return http(`/products/print-barcodes/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ✅ CSV Import (Products)
export async function productsCsvPreflight(rows) {
  return http(`/products/import-csv/preflight/`, {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
}

export async function productsCsvApply(payload) {
  return http(`/products/import-csv/apply/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function sanitizeBarcode(v = "") {
  return v.replace(/[–—−‐]/g, "-").trim().toUpperCase();
}

/* ========= Product lookup by barcode (used by SearchBar) ========= */
export async function getProductByBarcode(barcode) {
  const url = `/products/by-barcode/${encodeURIComponent(barcode)}/`;
  const data = await http(url);

  const mrpNum = Number(data?.mrp ?? 0);
  const spNum  = Number(data?.selling_price ?? 0);

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
    size: data?.size || "",
  };
}

// Create sale
export async function createSale(payload) {
  return http(`/sales/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ✅ FIXED: listSales query builder (works for outlet too)
export async function listSales(params = {}) {
  return http(`/sales/${buildQuery(params)}`);
}

// Credit Notes
export async function listCreditNotes(params = {}) {
  return http(`/credit-notes/${buildQuery(params)}`);
}

export async function getSaleLinesByInvoice(invoiceNo) {
  const safe = String(invoiceNo || "").trim();
  return http(`/sales/${encodeURIComponent(safe)}/lines/`);
}

export async function getCreditNote(noteNo) {
  return http(`/credit-notes/${encodeURIComponent(noteNo)}/`);
}

export async function redeemCreditNote(noteNo, payload) {
  return http(`/credit-notes/${encodeURIComponent(noteNo)}/redeem/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createSalesReturn(invoiceNo) {
  const safe = String(invoiceNo || "").trim();
  return http(`/sales/${encodeURIComponent(safe)}/return/`, { method: "POST" });
}

// Customers
export async function searchCustomers(q) {
  const sp = new URLSearchParams();
  if (q) sp.append("q", q);
  return http(`/customers/${sp.toString() ? `?${sp.toString()}` : ""}`);
}

export async function createCustomer(payload) {
  return http(`/customers/`, { method: "POST", body: JSON.stringify(payload) });
}

// POS session helpers
const CKEY = "pos.currentCustomer";
export function getSelectedCustomer() {
  try { return JSON.parse(localStorage.getItem(CKEY) || "null"); } catch { return null; }
}
export function setSelectedCustomer(cust) {
  if (cust) {
    localStorage.setItem(CKEY, JSON.stringify(cust));
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

/* ========= Outlets & Employees ========= */
export async function listOutlets() {
  return http(`/outlets/`);
}

export async function listEmployees(params = {}) {
  const sp = new URLSearchParams();
  if (params.outlet) sp.append("outlet", params.outlet);
  if (params.search) sp.append("search", params.search);
  const qs = sp.toString();
  return http(`/employees/${qs ? `?${qs}` : ""}`);
}

export async function createEmployee(payload) {
  return http(`/employees/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEmployee(id, payload) {
  return http(`/employees/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteEmployee(id) {
  return http(`/employees/${id}/`, { method: "DELETE" });
}

export async function createOutlet(payload) {
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
  return http(`/master-packs/${buildQuery(params)}`);
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

export async function getMasterPack(number) {
  return http(`/master-packs/${encodeURIComponent(number)}/`);
}

// Material Consumption
export async function mcGetNextNumber() {
  return http(`/material-consumptions/next/`);
}

export async function mcCreate(payload) {
  return http(`/material-consumptions/`, { method: "POST", body: JSON.stringify(payload) });
}

export async function mcList(params = {}) {
  return http(`/material-consumptions/${buildQuery(params)}`);
}

export async function mcGet(number) {
  return http(`/material-consumptions/${encodeURIComponent(number)}/`);
}

// Coupons
export async function listCoupons() {
  const res = await http(`/coupons/`);
  return asArray(res);
}

export async function createCoupon(payload) {
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
  return http(`/coupons/instances/${encodeURIComponent(code)}/redeem/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.results || payload?.data || payload?.items || [];
}

// Reports
export async function listDaywiseSalesSummary(params = {}) {
  const sp = new URLSearchParams();
  if (params.date_from) sp.append("date_from", params.date_from);
  if (params.date_to) sp.append("date_to", params.date_to);
  if (params.location) sp.append("location", params.location);
  return http(`/reports/daywise-sales/?${sp.toString()}`);
}

export async function listProductWiseSales(params = {}) {
  const sp = new URLSearchParams();
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

export async function listCategoryWiseSales(params = {}) {
  const sp = new URLSearchParams();
  if (params.date_from) sp.append("date_from", params.date_from);
  if (params.date_to) sp.append("date_to", params.date_to);
  if (params.category) sp.append("category", params.category);
  if (Array.isArray(params.location) && params.location.length) {
    params.location.forEach(l => sp.append("location", l));
  } else if (typeof params.location === "string" && params.location.trim() !== "") {
    sp.append("location", params.location.trim());
  }
  const qs = sp.toString();
  return http(`/reports/category-wise-sales/${qs ? `?${qs}` : ""}`);
}

// Discounts
export async function listDiscounts(params = {}) {
  const sp = new URLSearchParams();
  if (params.q) sp.append("q", params.q);
  const qs = sp.toString();
  return http(`/discounts/${qs ? `?${qs}` : ""}`);
}

export async function createDiscount(payload) {
  return http(`/discounts/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteDiscount(id) {
  return http(`/discounts/${id}/`, { method: "DELETE" });
}

export async function listMasterPackingItemWise(params = {}) {
  const sp = new URLSearchParams();
  if (params.date_from)      sp.append("date_from", params.date_from);
  if (params.date_to)        sp.append("date_to", params.date_to);
  if (params.from_location)  sp.append("from_location", params.from_location);
  if (params.to_location)    sp.append("to_location", params.to_location);
  if (params.status)         sp.append("status", params.status);
  const qs = sp.toString();
  return http(`/reports/master-packing-item-wise/${qs ? `?${qs}` : ""}`);
}

// Auth
export async function apiLogin(credentials) {
  return http(`/auth/login/`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function apiLogout() {
  return http(`/auth/logout/`, { method: "POST" });
}

export async function apiMe() {
  return http(`/auth/me/`);
}

// Login Logs
export async function listLoginLogs(params = {}) {
  const sp = new URLSearchParams();
  if (Array.isArray(params.location)) {
    params.location.forEach((l) => sp.append("location", l));
  } else if (params.location) {
    sp.append("location", params.location);
  }
  if (params.limit) sp.append("limit", params.limit);
  const qs = sp.toString();
  return http(`/login-logs/${qs ? `?${qs}` : ""}`);
}

// WOW Bills
export async function listWowBills(params = {}) {
  const sp = new URLSearchParams();
  if (params.outlet) sp.append("outlet", params.outlet);
  if (params.employee) sp.append("employee", params.employee);
  if (params.date_from) sp.append("date_from", params.date_from);
  if (params.date_to)   sp.append("date_to", params.date_to);
  const qs = sp.toString();
  return http(`/wow-bills/${qs ? `?${qs}` : ""}`);
}

export async function createWowBill(payload) {
  return http(`/wow-bills/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Hold Bills
export async function listHoldBills() {
  const res = await http(`/hold-bills/`);
  return asArray(res);
}

export async function createHoldBill(payload) {
  return http(`/hold-bills/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function restoreHoldBill(number) {
  return http(`/hold-bills/${encodeURIComponent(number)}/restore/`, {
    method: "POST",
  });
}

export async function getEmployee(id) {
  return http(`/employees/${id}/`);
}

export async function deleteCreditNote(noteNo) {
  return http(`/credit-notes/${encodeURIComponent(noteNo)}/delete/`, {
    method: "DELETE",
  });
}

// Suppliers
export async function listSuppliers(params = {}) {
  const sp = new URLSearchParams();
  if (params.q) sp.append("q", params.q);
  const qs = sp.toString();
  return http(`/suppliers/${qs ? `?${qs}` : ""}`);
}

export async function createSupplier(payload) {
  return http(`/suppliers/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Accounts
export async function listAccounts() {
  return http(`/accounts/`);
}

export async function createAccount(payload) {
  return http(`/accounts/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAccount(id, payload) {
  return http(`/accounts/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(id) {
  return http(`/accounts/${id}/`, { method: "DELETE" });
}

// Expenses
export async function listExpenses(params = {}) {
  return http(`/expenses/${buildQuery(params)}`);
}

export async function createExpense(payload) {
  return http(`/expenses/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteExpense(id) {
  return http(`/expenses/${id}/`, { method: "DELETE" });
}

// Register closing
export async function createRegisterClose(payload) {
  return http(`/register-closes/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRegisterClosingSummary() {
  return http(`/register-closes/today-summary/`);
}

// ✅ NEW: Dashboard Summary endpoint
export async function dashboardSummary(params = {}) {
  return http(`/dashboard/summary/${buildQuery(params)}`);
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

  getSaleLinesByInvoice,
  createSalesReturn,
  getCreditNote,
  redeemCreditNote,

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
  getEmployee,
  deleteCreditNote,

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
  listCategoryWiseSales,

  listDiscounts,
  createDiscount,
  deleteDiscount,
  listMasterPackingItemWise,

  apiLogin,
  apiLogout,
  apiMe,

  listLoginLogs,

  listWowBills,
  createWowBill,

  listHoldBills,
  createHoldBill,
  restoreHoldBill,

  listSuppliers,
  createSupplier,

  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,

  listExpenses,
  createExpense,
  deleteExpense,

  createRegisterClose,
  getRegisterClosingSummary,

  // ✅ CSV Import
  productsCsvPreflight,
  productsCsvApply,

  // ✅ NEW
  dashboardSummary,
};
