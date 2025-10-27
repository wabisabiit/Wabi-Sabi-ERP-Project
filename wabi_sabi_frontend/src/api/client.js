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
};

function sanitizeBarcode(v = "") {
  return v.replace(/[–—−‐]/g, "-").trim().toUpperCase(); // normalize unicode dashes
}


// src/api/client.js  (add this below the existing helpers/exports)

/* ========= Product lookup by barcode (used by SearchBar) ========= */
export async function getProductByBarcode(barcode) {
  const url = `/products/by-barcode/${encodeURIComponent(barcode)}/`;
  const data = await http(url);

  // Map DRF response -> POS row needs
  // DRF returns strings for decimals; convert to numbers safely
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
  // supports: page (1-based), page_size, query
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

export async function createSalesReturn(invoiceNo) {
  const safe = String(invoiceNo || "").trim();
  return http(`/sales/${encodeURIComponent(safe)}/return/`, { method: "POST" });
}
