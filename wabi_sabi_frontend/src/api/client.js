// src/api/client.js
const BASE = "http://127.0.0.1:8000"; // keep "" if frontend is proxied to Django; else like "http://127.0.0.1:8000"

export async function getItemByCode(code) {
  // Your DRF endpoint: /api/taskitems/<item_code>/
  const url = `${BASE}/api/taskitems/${encodeURIComponent(code)}/`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    // 404 etc. -> let caller handle and keep typed code
    const text = await res.text().catch(() => "");
    throw new Error(`Lookup failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Map backend fields to a friendly product_name
  const product_name =
    data.item_print_friendly_name ||
    data.item_full_name ||
    data.full_name ||
    data.name ||
    "";

  return { product_name, item: data };
}
