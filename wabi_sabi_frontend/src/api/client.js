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

/* ========= Optional convenience default export ========= */
export default {
  getItemByCode,
  listProducts,
  getProduct,
  deleteProduct,
  upsertProductsFromBarcodes,
  getProductByBarcode,
};

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
  };
}

