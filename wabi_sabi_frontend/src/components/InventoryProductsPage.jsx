// src/components/InventoryProductsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/InventoryProductsPage.css";
import {
  listProducts,
  deleteProduct,
  getItemByCode,
  productsCsvPreflight,
  productsCsvApply,
} from "../api/client";

/* -------------------- helpers -------------------- */
const PAGE_SIZE_OPTIONS = [10, 15];

function paginate(totalPages, current) {
  const last = totalPages;
  if (totalPages <= 8) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (current <= 5) return [1, 2, 3, 4, 5, "…", last];
  if (current >= last - 4) return [1, "…", last - 4, last - 3, last - 2, last - 1, last];
  return [1, "…", current - 1, current, current + 1, "…", last];
}

function useClickOutside(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return ref;
}

/* ===== Searchable Dropdown ===== */
function SearchSelect({ label, value, onChange, options, placeholder = "All", width }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useClickOutside(open, () => setOpen(false));

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(qq));
  }, [q, options]);

  return (
    <div className="ff-field" style={{ width }} ref={wrapRef}>
      <div className="ff-label">{label}</div>
      <button
        type="button"
        className={`ff-input ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="ff-text">{value || placeholder}</span>
        <span className="mi">arrow_drop_down</span>
      </button>

      {open && (
        <div className="ff-menu">
          <div className="ff-search">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
          </div>
          <div className="ff-list">
            {filtered.map((opt) => (
              <button
                key={opt}
                className={`ff-opt ${opt === value || (!value && opt === "All") ? "active" : ""}`}
                onClick={() => {
                  onChange(opt === "All" ? "" : opt);
                  setOpen(false);
                  setQ("");
                }}
              >
                {opt}
              </button>
            ))}
            {filtered.length === 0 && <div className="ff-empty">No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== CSV util ===== */
function toCSV(rows) {
  const headers = [
    "Sr. No.",
    "Barcode Number",
    "Item Code",
    "Category",
    "Brand",
    "Name",
    "MRP",
    "Selling Price",
    "HSN",
    "Qty",
    "Date",
    "Location",
    "Status",
    "Show Online",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(","),
    ...rows.map((r, i) =>
      [
        i + 1,
        r.barcodeNumber,
        r.itemCode,
        r.category,
        r.brand,
        r.name,
        Number(r.mrp || 0).toFixed(2),
        Number(r.sp || 0).toFixed(2),
        r.hsn,
        Number(r.qty || 0).toFixed(2),
        r.createdOn || "",
        r.location || "",
        (Number(r.qty) || 0) <= 0 ? "SOLD" : "ACTIVE",
        r.showOnline ? "Yes" : "No",
      ].map(esc).join(",")
    ),
  ];
  return lines.join("\r\n");
}

function downloadBlob(text, filename, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ===== Real PDF export (jspdf) ===== */
async function exportRowsToPdf(rows, filename) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const margin = 28;
    const pageH = doc.internal.pageSize.getHeight();

    const cols = [
      ["Sr. No.", 54],
      ["Barcode Number", 90],
      ["Item Code", 90],
      ["Category", 100],
      ["Brand", 70],
      ["Name", 260],
      ["MRP", 70],
      ["Selling Price", 90],
      ["HSN", 90],
      ["Qty", 50],
      ["Location", 120],
      ["Status", 70],
      ["Show Online", 90],
    ];

    const headerH = 26,
      rowH = 22;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Products", margin, y);
    y += 16;

    const drawHeader = () => {
      doc.setFillColor(245, 248, 253);
      doc.setDrawColor(230, 235, 243);
      let x = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      cols.forEach(([label, w]) => {
        doc.rect(x, y, w, headerH, "FD");
        doc.text(label, x + 6, y + 17);
        x += w;
      });
      y += headerH;
    };

    const drawRow = (r, idx) => {
      let x = margin;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const data = [
        String(idx + 1),
        r.barcodeNumber,
        r.itemCode,
        r.category,
        r.brand,
        r.name,
        Number(r.mrp || 0).toFixed(2),
        Number(r.sp || 0).toFixed(2),
        r.hsn,
        Number(r.qty || 0).toFixed(2),
        r.location || "",
        (Number(r.qty) || 0) <= 0 ? "SOLD" : "ACTIVE",
        r.showOnline ? "Yes" : "No",
      ];
      cols.forEach(([_, w], i) => {
        if (idx % 2 === 1) {
          doc.setFillColor(252, 253, 255);
          doc.rect(x, y, w, rowH, "F");
        }
        doc.setDrawColor(238, 242, 247);
        doc.rect(x, y, w, rowH, "S");
        let txt = data[i] ?? "";
        if (i === 5) {
          const maxChars = Math.floor((w - 10) / 6.2);
          if (txt.length > maxChars) txt = txt.slice(0, maxChars - 1) + "…";
        }
        if ([6, 7, 9].includes(i)) {
          doc.text(txt, x + w - 6, y + 15, { align: "right" });
        } else {
          doc.text(txt, x + 6, y + 15);
        }
        x += w;
      });
      y += rowH;
    };

    drawHeader();
    rows.forEach((r, i) => {
      if (y + rowH > pageH - margin) {
        doc.addPage();
        y = margin + 16;
        drawHeader();
      }
      drawRow(r, i);
    });

    doc.save(filename);
  } catch (e) {
    console.error(e);
    alert("PDF export ke liye `jspdf` install karein: npm i jspdf");
  }
}

/* ===== CSV parsing helper (safe for quoted CSV) ===== */
function parseCsvText(text) {
  const rows = [];
  let cur = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      cur.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n") {
      cur.push(cell);
      cell = "";
      if (cur.some((x) => String(x ?? "").trim() !== "")) rows.push(cur);
      cur = [];
      continue;
    }

    if (ch === "\r") continue;

    cell += ch;
  }

  cur.push(cell);
  if (cur.some((x) => String(x ?? "").trim() !== "")) rows.push(cur);

  return rows;
}

function normHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\./g, "")
    .replace(/\t+/g, " ")
    .replace(/\u00a0/g, " ");
}

function sanitizeBarcode(v = "") {
  return String(v || "").replace(/[–—−‐]/g, "-").trim().toUpperCase();
}

/* ===== NEW: extract item code like (252) or (290-W) from Product Name ===== */
function extractItemCodeFromName(name = "") {
  const s = String(name || "").trim();
  const m = s.match(/\(([^)]+)\)/); // first (...) group
  if (!m) return "";
  return String(m[1] || "").trim().toUpperCase();
}

/* ===== NEW: allow only "100" or "100-W" format (digits + optional -W) ===== */
function normalizeItemCode(v = "") {
  const s = String(v || "").trim().toUpperCase();
  if (/^\d+(-W)?$/.test(s)) return s;

  // try to pull pattern from anywhere (e.g. "ABC (252) ...")
  const m = s.match(/(\d+)(-W)?/);
  if (!m) return "";
  return `${m[1]}${m[2] || ""}`;
}

/* ===== NEW: derive size from SKU-like Item Code, e.g. 12033-XS => XS ===== */
function deriveSizeFromSku(sku = "") {
  const s = String(sku || "").trim().toUpperCase();
  if (!s.includes("-")) return "";
  const parts = s.split("-");
  const last = parts[parts.length - 1].trim();
  return last || "";
}

/* ===== Ambiguity Modal ===== */
function CsvConflictModal({ open, conflict, onClose, onYes, onNo }) {
  if (!open || !conflict) return null;

  const existing = conflict.existing || conflict.current || conflict.db || {};
  const incoming = conflict.incoming || conflict.csv || conflict.new || conflict.row || conflict.payload || {};

  return (
    <div className="pp-modal-backdrop">
      <div className="pp-modal">
        <div className="pp-modal-head">
          <div className="pp-modal-title">Ambiguity Found</div>
          <button className="pp-modal-x" onClick={onClose} aria-label="Close">
            <span className="mi">close</span>
          </button>
        </div>

        <div className="pp-modal-body">
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            Barcode: <b className="mono">{incoming.barcode || incoming.barcodeNumber || conflict.barcode}</b>
          </div>

          <div className="pp-modal-grid">
            <div className="pp-modal-card">
              <div className="pp-modal-card-title">Existing</div>
              <div className="pp-modal-row"><span>Item Code</span><b className="mono">{existing.item_code || existing.task_item_code || existing.taskItemCode || ""}</b></div>
              <div className="pp-modal-row"><span>Name</span><b>{existing.name || existing.product_name || ""}</b></div>
              <div className="pp-modal-row"><span>Category</span><b>{existing.category || ""}</b></div>
              <div className="pp-modal-row"><span>MRP</span><b className="mono">{existing.mrp ?? ""}</b></div>
              <div className="pp-modal-row"><span>Selling</span><b className="mono">{existing.selling_price ?? existing.sellingPrice ?? ""}</b></div>
              <div className="pp-modal-row"><span>HSN</span><b className="mono">{existing.hsn || existing.hsn_code || ""}</b></div>
              <div className="pp-modal-row"><span>Size</span><b className="mono">{existing.size || ""}</b></div>
              <div className="pp-modal-row"><span>Location</span><b className="mono">{existing.location || existing.location_code || ""}</b></div>
            </div>

            <div className="pp-modal-card">
              <div className="pp-modal-card-title">CSV</div>
              <div className="pp-modal-row"><span>Item Code</span><b className="mono">{incoming.item_code || incoming.itemCode || ""}</b></div>
              <div className="pp-modal-row"><span>Name</span><b>{incoming.name || ""}</b></div>
              <div className="pp-modal-row"><span>Category</span><b>{incoming.category || ""}</b></div>
              <div className="pp-modal-row"><span>MRP</span><b className="mono">{incoming.mrp ?? ""}</b></div>
              <div className="pp-modal-row"><span>Selling</span><b className="mono">{incoming.selling_price ?? incoming.sellingPrice ?? incoming.sp ?? ""}</b></div>
              <div className="pp-modal-row"><span>HSN</span><b className="mono">{incoming.hsn || ""}</b></div>
              <div className="pp-modal-row"><span>Size</span><b className="mono">{incoming.size || ""}</b></div>
              <div className="pp-modal-row"><span>Location</span><b className="mono">{incoming.location || incoming.location_code || ""}</b></div>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
            Do you want to update the existing product with CSV data?
          </div>
        </div>

        <div className="pp-modal-foot">
          <button className="pp-btn outline" onClick={onNo}>No</button>
          <button className="pp-btn blue" onClick={onYes}>Yes</button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- main component -------------------- */
export default function InventoryProductsPage() {
  const navigate = useNavigate();

  // Real rows from API
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  // filters/search/paging
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [psOpen, setPsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // per-row action menu
  const [actionOpenId, setActionOpenId] = useState(null);
  const actionRefs = useRef({});

  const [selectedIds, setSelectedIds] = useState(new Set());

  const psRef = useClickOutside(psOpen, () => setPsOpen(false));
  const exportRef = useClickOutside(exportOpen, () => setExportOpen(false));

  // image upload
  const fileInputRef = useRef(null);
  const uploadForRowRef = useRef(null);

  // ✅ CSV import
  const csvInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState("");

  // ambiguity flow
  const [conflicts, setConflicts] = useState([]);
  const [conflictIndex, setConflictIndex] = useState(0);
  const [importNewRows, setImportNewRows] = useState([]);
  const [importUpdates, setImportUpdates] = useState([]);

  const currentConflict = conflicts[conflictIndex] || null;
  const conflictOpen = !!currentConflict;

  // ✅ NEW: keep remaining batches after conflict resolution
  const importQueueRef = useRef([]); // array of batches (each batch = array of rows)
  const batchCursorRef = useRef(0);

  // ✅ NEW: TaskItem lookup cache (avoid 12k calls)
  const taskCacheRef = useRef(new Map()); // item_code => { name, category }

  const handlePickImages = (rowId) => {
    uploadForRowRef.current = rowId;
    fileInputRef.current?.click();
  };
  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !uploadForRowRef.current) return;
    const urls = files.map((f) => URL.createObjectURL(f));
    setRows((list) =>
      list.map((r) =>
        r.id === uploadForRowRef.current ? { ...r, images: [...(r.images || []), ...urls] } : r
      )
    );
    e.target.value = "";
  };
  useEffect(
    () => () => {
      rows.forEach((r) => (r.images || []).forEach((u) => URL.revokeObjectURL(u)));
    },
    [] // eslint-disable-line
  );

  // options
  const DEPT_OPTIONS = ["All", "Test", "S", "clothes", "Miscellaneous", "Sweater"];
  const TAX_OPTIONS = ["All", "Gst 15", "GST 28", "GST18", "GST12", "GST 5", "NON GST 0"];

  const [filters, setFilters] = useState({
    dept: "",
    category: "",
    brand: "",
    purchaseTax: "",
    salesTax: "",
    hsn: "",
  });

  /* ===== Load ALL pages from backend ===== */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadErr("");
      try {
        const first = await listProducts(search ? { q: search } : {});
        let list = [];
        let nextUrl = null;

        if (Array.isArray(first)) {
          list = first;
        } else if (first && Array.isArray(first.results)) {
          list = [...first.results];
          nextUrl = first.next || null;
          while (nextUrl) {
            const res = await fetch(nextUrl, {
              credentials: "include",
              headers: { Accept: "application/json" },
            });
            if (!res.ok) {
              const text = await res.text().catch(() => "");
              throw new Error(`Fetch next failed (${res.status}): ${text}`);
            }
            const j = await res.json();
            list.push(...(Array.isArray(j.results) ? j.results : []));
            nextUrl = j.next || null;
          }
        } else {
          list = [];
        }

        const mapped = list.map((r) => ({
          id: r.id,
          images: r.image ? [r.image] : [],
          // printed barcode number
          barcodeNumber: r.barcode || "error" || r.barcode || "",
          // real Taskmaster item code
          itemCode: r.taskItemCode || r.task_item_code || r.task_item_id || "",
          category: r.category || "",
          brand: r.brand || "B4L",
          name:
            r.name ||
            r.task_item?.item_print_friendly_name ||
            r.task_item?.item_vasy_name ||
            r.task_item?.item_full_name ||
            "",
          mrp: Number(r.mrp || 0),
          sp: Number(r.sellingPrice || r.selling_price || 0),
          hsn: r.hsn || r.hsn_code || "",
          qty: Number(r.qty ?? 0) || 0, // real qty
          location: r.location || "", // comes from serializer
          active: true,
          showOnline: false,
          createdOn: r.created_on || r.created_at || r.createdOn || r.created || "",
        }));

        if (!cancelled) setRows(mapped);
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoadErr("Failed to load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search]);

  /* ===== Filtering/pagination ===== */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.category && r.category !== filters.category) return false;
      if (filters.brand && r.brand !== filters.brand) return false;
      if (filters.hsn && r.hsn !== filters.hsn) return false;
      if (!q) return true;
      return `${r.barcodeNumber} ${r.itemCode} ${r.category} ${r.brand} ${r.name} ${r.mrp} ${r.sp} ${r.hsn} ${r.location}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = filtered.slice(start, end);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  useEffect(() => {
    if (!actionOpenId) return;
    const handleDown = (e) => {
      const host = actionRefs.current[actionOpenId];
      if (!host) return setActionOpenId(null);
      if (!host.contains(e.target)) setActionOpenId(null);
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setActionOpenId(null);
    };
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [actionOpenId]);

  /* ===== Delete (DB + UI) ===== */
  async function handleDeleteOne(row) {
    if (!row?.id) return;
    const ok = window.confirm(`Delete product with barcode "${row.barcodeNumber}" from database?`);
    if (!ok) return;
    try {
      await deleteProduct(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      alert("Deleted from database successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to delete from database.");
    }
  }

  /* ===========================
     ✅ NEW: concurrency helpers
     =========================== */
  function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  async function mapLimit(items, limit, mapper) {
    const res = new Array(items.length);
    let i = 0;
    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
      while (i < items.length) {
        const idx = i++;
        res[idx] = await mapper(items[idx], idx);
      }
    });
    await Promise.all(workers);
    return res;
  }

  async function enrichRowsWithTaskInfo(rawRows) {
    // only fetch for unique item_codes not in cache
    const uniqueCodes = Array.from(new Set(rawRows.map(r => String(r.item_code || "").trim()).filter(Boolean)));
    const toFetch = uniqueCodes.filter(code => !taskCacheRef.current.has(code));

    // limited parallel fetch
    await mapLimit(toFetch, 10, async (code) => {
      try {
        const info = await getItemByCode(code);
        taskCacheRef.current.set(code, {
          name: info?.product_name || "",
          category: info?.category || "",
        });
      } catch {
        taskCacheRef.current.set(code, { name: "", category: "" });
      }
    });

    // apply cache to rows
    return rawRows.map((r) => {
      const cached = taskCacheRef.current.get(r.item_code) || { name: "", category: "" };
      return {
        ...r,
        name: cached.name || "",
        category: cached.category || "",
        brand: "B4L",
        qty: 0,
        discount_percent: 0,
        image_url: "",
      };
    });
  }

  /* ===========================
     ✅ NEW: process a single batch
     =========================== */
  async function processOneBatch(batchRows, batchNo, totalBatches) {
    setImportStage(`Batch ${batchNo}/${totalBatches}: Fetching Name & Category...`);
    const enriched = await enrichRowsWithTaskInfo(batchRows);

    setImportStage(`Batch ${batchNo}/${totalBatches}: Checking duplicates...`);
    const pre = await productsCsvPreflight(enriched);

    const conflictsList = Array.isArray(pre?.conflicts) ? pre.conflicts : [];
    const toCreate = Array.isArray(pre?.to_create) ? pre.to_create : [];

    setImportNewRows(toCreate);
    setConflicts(conflictsList);
    setConflictIndex(0);
    setImportUpdates([]);

    // no conflicts -> apply immediately and continue
    if (!conflictsList.length) {
      setImportStage(`Batch ${batchNo}/${totalBatches}: Importing...`);
      await productsCsvApply({
        to_create: toCreate,
        decisions: [],
        incomingByBarcode: {},
      });
      return { hadConflicts: false };
    }

    // conflicts -> pause and show modal
    setImportStage("");
    return { hadConflicts: true };
  }

  /* ===========================
     ✅ NEW: continue remaining batches
     =========================== */
  async function continueImportQueueFromCursor() {
    const batches = importQueueRef.current || [];
    const total = batches.length;

    while (batchCursorRef.current < total) {
      const idx = batchCursorRef.current;
      const batch = batches[idx];
      const batchNo = idx + 1;

      const result = await processOneBatch(batch, batchNo, total);

      if (result.hadConflicts) {
        // pause here; user will resolve conflicts
        return;
      }

      batchCursorRef.current = batchCursorRef.current + 1;
    }

    alert("CSV imported successfully (all batches).");
    window.location.reload();
  }

  /* ===== CSV Import handling ===== */
  async function handleCsvChosen(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;

    setImporting(true);
    setImportStage("Reading CSV...");
    setConflicts([]);
    setConflictIndex(0);
    setImportNewRows([]);
    setImportUpdates([]);

    try {
      const text = await f.text();
      const table = parseCsvText(text);

      if (!table.length) throw new Error("CSV is empty.");

      const header = table[0].map(normHeader);
      const idx = (...names) => {
        for (const n of names) {
          const i = header.indexOf(normHeader(n));
          if (i >= 0) return i;
        }
        return -1;
      };

      // ✅ Accept your Excel-like CSV
            const iSkuItemCode = idx("item code", "code", "sku");
      const iProdName    = idx("product name", "item name", "name");
      const iMrp         = idx("mrp");
      const iSp          = idx("selling price", "selling", "sp", "sale price");
      const iHsn         = idx("hsn", "hsn code", "hsn number");
      const iLoc         = idx("location", "outlet", "branch");
      const iSize        = idx("size");

      // ✅ NEW: barcode column support
      const iBarcode     = idx("barcode number", "barcode", "barcode no", "barcode_number");

      // Required minimum: Product Name OR Item Code
      if (iProdName < 0 && iSkuItemCode < 0) {
        throw new Error(`Missing columns: need "Product Name" OR "Item Code"`);
      }

      const body = table.slice(1);

      setImportStage("Preparing rows...");

      const rawAll = body
        .map((r) => {
          const productName = iProdName >= 0 ? String(r[iProdName] || "").trim() : "";
          const extracted = normalizeItemCode(extractItemCodeFromName(productName));

          const sku = iSkuItemCode >= 0 ? String(r[iSkuItemCode] || "").trim() : "";
          const item_code = extracted || normalizeItemCode(sku);

          // ✅ barcode should come from file if present, else fallback to item_code
          const barcodeFromCsv = iBarcode >= 0 ? String(r[iBarcode] || "").trim() : "";
          const barcode = barcodeFromCsv || item_code;

          const sizeFromCsv = iSize >= 0 ? String(r[iSize] || "").trim() : "";
          const size = sizeFromCsv || deriveSizeFromSku(sku);

          const locFromCsv = iLoc >= 0 ? String(r[iLoc] || "").trim() : "";

          // ✅ IMPORTANT: force UV always (manager can see UV)
          const location = "UV";

          return {
            barcode: sanitizeBarcode(barcode),
            item_code: item_code,
            mrp: Number(iMrp >= 0 ? r[iMrp] : 0) || 0,
            selling_price: Number(iSp >= 0 ? r[iSp] : 0) || 0,
            hsn: String(iHsn >= 0 ? (r[iHsn] || "") : "").trim(),
            location,
            size,
            _productNameRaw: productName,
            _locationRaw: locFromCsv,
          };
        })
        .filter((x) => x.barcode && x.item_code);


      if (!rawAll.length) throw new Error("No valid rows found.");

      // ✅ NEW: batch import in chunks (500) to avoid server timeouts
      const BATCH_SIZE = 500;
      const batches = chunkArray(rawAll, BATCH_SIZE);

      importQueueRef.current = batches;
      batchCursorRef.current = 0;

      // start processing batches
      await continueImportQueueFromCursor();
    } catch (err) {
      console.error(err);
      alert(err?.message || "CSV import failed.");
    } finally {
      setImporting(false);
    }
  }

  async function finishApplyWithUpdates(finalUpdates) {
    setImporting(true);
    setImportStage("Importing...");
    try {
      const decisions = (finalUpdates || []).map((u) => ({
        barcode: u.barcode,
        action: "update",
      }));

      const incomingByBarcode = {};
      (finalUpdates || []).forEach((u) => {
        const key = String(u.barcode || "").toUpperCase();
        if (key) incomingByBarcode[key] = u;
      });

      await productsCsvApply({
        to_create: importNewRows || [],
        decisions,
        incomingByBarcode,
      });

      // ✅ after resolving conflicts for this batch, continue remaining batches
      batchCursorRef.current = batchCursorRef.current + 1;
      setConflicts([]);
      setConflictIndex(0);
      setImportUpdates([]);
      setImportNewRows([]);

      await continueImportQueueFromCursor();
    } catch (e) {
      console.error(e);
      alert("CSV import failed while saving.");
    } finally {
      setImporting(false);
      setImportStage("");
    }
  }

  function closeConflictModal() {
    setConflicts([]);
    setConflictIndex(0);
    setImportUpdates([]);
    // keep the queue paused; user can re-import if they want
  }

  function nextConflict() {
    setConflictIndex((i) => i + 1);
  }

  /* ===== UI ===== */
  return (
    <div className="pp-wrap">
      <div className="pp-topbar">
        <div className="pp-title">Product</div>
      </div>

      <div className="pp-card">
        <div className="pp-toolbar">
          <div className="pp-left">
            <div className="pp-pagesize" ref={exportRef}>
              <button className="pp-btn blue" onClick={() => setExportOpen((v) => !v)}>
                <span className="mi">file_download</span>
                <span className="mi caret">arrow_drop_down</span>
              </button>
              {exportOpen && (
                <div className="pp-menu">
                  <button
                    onClick={() => {
                      downloadBlob(toCSV(pageRows), "products_page.csv", "text/csv;charset=utf-8");
                      setExportOpen(false);
                    }}
                  >
                    <span className="mi icon">table_chart</span>Excel
                  </button>
                  <button
                    onClick={async () => {
                      await exportRowsToPdf(pageRows, "products_page.pdf");
                      setExportOpen(false);
                    }}
                  >
                    <span className="mi icon">picture_as_pdf</span>PDF
                  </button>
                  <button
                    onClick={async () => {
                      await exportRowsToPdf(filtered, "products_all.pdf");
                      setExportOpen(false);
                    }}
                  >
                    <span className="mi icon">picture_as_pdf</span>All Data PDF
                  </button>
                  <button
                    onClick={() => {
                      downloadBlob(toCSV(filtered), "products_all.csv", "text/csv;charset=utf-8");
                      setExportOpen(false);
                    }}
                  >
                    <span className="mi icon">grid_on</span>All Data Excel
                  </button>
                </div>
              )}
            </div>

            <div className="pp-pagesize" ref={psRef}>
              <button className="pp-btn select" onClick={() => setPsOpen((v) => !v)}>
                {pageSize}
                <span className="mi caret">arrow_drop_down</span>
              </button>
              {psOpen && (
                <div className="pp-menu">
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setPageSize(n);
                        setPsOpen(false);
                        setPage(1);
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="pp-btn outline" onClick={() => setShowFilters((v) => !v)}>
              <span className="mi">filter_list</span> Filter
            </button>

            <button
              className="pp-btn outline"
              title="Import Products CSV"
              onClick={() => csvInputRef.current?.click()}
            >
              <span className="mi">upload_file</span> Import CSV
            </button>

            <button
              className="pp-btn outline"
              title="Import HSN Code"
              onClick={() => document.getElementById("hsn-file-input")?.click()}
            >
              <span className="mi">upload_file</span> Import HSN Code
            </button>
          </div>

          {/* hidden input for Products CSV */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={handleCsvChosen}
          />

          {/* hidden input for HSN CSV/TXT */}
          <input
            id="hsn-file-input"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            style={{ display: "none" }}
          />

          <div className="pp-right">
            <div className="pp-search">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search List..."
              />
              <span className="mi">search</span>
            </div>
            <button className="pp-btn blue" onClick={() => navigate("/inventory/products/new")}>
              Create New
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="pp-filterbar">
            <SearchSelect
              label="Department"
              value={filters.dept}
              onChange={(v) => setFilters((f) => ({ ...f, dept: v }))}
              options={DEPT_OPTIONS}
              width={240}
            />
            <SearchSelect
              label="Category"
              value={filters.category}
              onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
              options={["All", ...new Set(rows.map((r) => r.category).filter(Boolean))]}
              width={260}
            />
            <SearchSelect
              label="Brand"
              value={filters.brand}
              onChange={(v) => setFilters((f) => ({ ...f, brand: v }))}
              options={["All", "B4L"]}
              width={240}
            />
            <SearchSelect
              label="HSN"
              value={filters.hsn}
              onChange={(v) => setFilters((f) => ({ ...f, hsn: v }))}
              options={["All", ...new Set(rows.map((r) => r.hsn).filter(Boolean))]}
              width={240}
            />
            <SearchSelect
              label="Purchase Tax"
              value={filters.purchaseTax}
              onChange={(v) => setFilters((f) => ({ ...f, purchaseTax: v }))}
              options={TAX_OPTIONS}
              width={240}
            />
            <SearchSelect
              label="Sales Tax"
              value={filters.salesTax}
              onChange={(v) => setFilters((f) => ({ ...f, salesTax: v }))}
              options={TAX_OPTIONS}
              width={240}
            />
          </div>
        )}

        <div className="pp-bulk" style={{ display: selectedIds.size ? "block" : "none" }}>
          <div className="pp-bulk-left">
            Selected {selectedIds.size || 0} Records:
            <button
              className="pp-btn danger"
              onClick={() => {
                if (!selectedIds.size) return;
                setRows((l) => l.filter((r) => !selectedIds.has(r.id)));
                setSelectedIds(new Set());
              }}
            >
              <span className="mi">delete</span> Delete
            </button>
          </div>
        </div>

        <div className="pp-table-wrap">
          {loading && (
            <div className="empty" style={{ padding: 16 }}>
              <div className="pp-loading">
                <div className="pp-spinner" />
                <span>Loading products…</span>
              </div>
            </div>
          )}
          {loadErr && (
            <div className="empty" style={{ padding: 16, color: "#c00" }}>
              {loadErr}
            </div>
          )}

          {!loading && !loadErr && (
            <table className="pp-table">
              <thead>
                <tr>
                  <th className="chk">
                    <label className="pp-chk">
                      <input
                        type="checkbox"
                        checked={pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id))}
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedIds(new Set([...selectedIds, ...pageRows.map((r) => r.id)]));
                          else {
                            const next = new Set(selectedIds);
                            pageRows.forEach((r) => next.delete(r.id));
                            setSelectedIds(next);
                          }
                        }}
                      />
                      <span />
                    </label>
                  </th>
                  <th>Sr. No.</th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Barcode Number</th>
                  <th>Item Code</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>MRP</th>
                  <th>Selling Price</th>
                  <th>HSN</th>
                  <th>Qty</th>
                  <th>Created On</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Show Online</th>
                  <th className="act">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, idx) => {
                  const isSold = (Number(r.qty) || 0) <= 0;
                  return (
                    <tr key={r.id}>
                      <td className="chk">
                        <label className="pp-chk">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(r.id);
                              else next.delete(r.id);
                              setSelectedIds(next);
                            }}
                          />
                          <span />
                        </label>
                      </td>
                      <td>{start + idx + 1}</td>
                      <td
                        onClick={() => {
                          uploadForRowRef.current = r.id;
                          fileInputRef.current?.click();
                        }}
                        style={{ cursor: "pointer" }}
                        title="Click to add images"
                      >
                        {r.images?.length ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            {r.images.slice(0, 3).map((u, i) => (
                              <img
                                key={i}
                                src={u}
                                alt=""
                                style={{
                                  width: 44,
                                  height: 36,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  border: "1px solid #cfd7e6",
                                  background: "#f9fbff",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  uploadForRowRef.current = r.id;
                                  fileInputRef.current?.click();
                                }}
                              />
                            ))}
                            {r.images.length > 3 && (
                              <div
                                style={{
                                  width: 44,
                                  height: 36,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px dashed #cfd7e6",
                                  borderRadius: 8,
                                  fontSize: 11,
                                  color: "#6b7280",
                                  background: "#f9fbff",
                                }}
                              >
                                +{r.images.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pp-img-skel">
                            <span className="mi">image</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          className="pp-link blue"
                          onClick={() => navigate(`/inventory/products/${r.id}`, { state: { row: r } })}
                          title="Open product details"
                          style={{
                            background: "transparent",
                            border: 0,
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          {r.name}
                        </button>
                      </td>
                      <td className="mono">{r.barcodeNumber}</td>
                      <td className="mono">{r.itemCode}</td>
                      <td>{r.category}</td>
                      <td className="mono">{r.brand}</td>
                      <td className="num">{Number(r.mrp || 0).toFixed(2)}</td>
                      <td className="num">{Number(r.sp || 0).toFixed(2)}</td>
                      <td className="mono">{r.hsn}</td>
                      <td className="num">{Number(r.qty ?? 0).toFixed(2)}</td>
                      <td className="mono">{r.createdOn || "-"}</td>
                      <td>{r.location || "-"}</td>
                      <td>
                        <span className={`pp-badge ${isSold ? "danger" : "success"}`}>
                          {isSold ? "SOLD" : "ACTIVE"}
                        </span>
                      </td>
                      <td>
                        <label className="pp-switch">
                          <input
                            type="checkbox"
                            checked={!!r.showOnline}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setRows((l) =>
                                l.map((row) => (row.id === r.id ? { ...row, showOnline: checked } : row))
                              );
                            }}
                          />
                          <span className="slider" />
                        </label>
                      </td>
                      <td className="act">
                        <div
                          className="pp-actions"
                          ref={(el) => {
                            if (el) actionRefs.current[r.id] = el;
                          }}
                        >
                          <button
                            className={`pp-kebab ${actionOpenId === r.id ? "open" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionOpenId((id) => (id === r.id ? null : r.id));
                            }}
                            aria-label="Row actions"
                            aria-expanded={actionOpenId === r.id}
                          >
                            <span className="dot" />
                            <span className="dot" />
                            <span className="dot" />
                          </button>

                          {actionOpenId === r.id && (
                            <div className="pp-menu right kebab">
                              <button
                                onClick={() => {
                                  alert("Edit Details");
                                  setActionOpenId(null);
                                }}
                              >
                                <span className="mi icon">open_in_new</span>
                                Edit Details
                              </button>
                              <button
                                onClick={async () => {
                                  setActionOpenId(null);
                                  await handleDeleteOne(r);
                                }}
                              >
                                <span className="mi icon">delete</span>
                                Delete
                              </button>
                              <button
                                onClick={() => {
                                  alert("Deactivate");
                                  setActionOpenId(null);
                                }}
                              >
                                <span className="mi icon">block</span>
                                Deactivate
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={16} className="empty">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* hidden input for image uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleFilesSelected}
        />

        <div className="pp-foot">
          <div className="pp-foot-left">
            Showing {Math.min(start + 1, filtered.length)} to {Math.min(end, filtered.length)} of{" "}
            {filtered.length.toLocaleString()} entries
          </div>
          <div className="pp-pagination">
            <button className="pg-btn" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            {paginate(totalPages, safePage).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="pg-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`pg-btn num ${p === safePage ? "active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            )}
            <button
              className="pg-btn"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Spinner overlay for import stages */}
      {importing && (
        <div className="pp-import-overlay">
          <div className="pp-import-card">
            <div className="pp-spinner" />
            <div style={{ marginTop: 10, fontSize: 13 }}>{importStage || "Working..."}</div>
          </div>
        </div>
      )}

      {/* ✅ Ambiguity modal */}
      <CsvConflictModal
        open={conflictOpen}
        conflict={currentConflict}
        onClose={() => closeConflictModal()}
        onNo={() => {
          if (conflictIndex + 1 >= conflicts.length) {
            finishApplyWithUpdates(importUpdates);
          } else {
            nextConflict();
          }
        }}
        onYes={() => {
          const incoming =
            currentConflict?.incoming ||
            currentConflict?.csv ||
            currentConflict?.new ||
            currentConflict?.row ||
            currentConflict?.payload ||
            {};
          const updatePayload = {
            ...incoming,
            barcode: incoming.barcode || incoming.barcodeNumber || currentConflict?.barcode,
          };

          const nextUpdates = [...importUpdates, updatePayload];
          setImportUpdates(nextUpdates);

          if (conflictIndex + 1 >= conflicts.length) {
            finishApplyWithUpdates(nextUpdates);
          } else {
            nextConflict();
          }
        }}
      />
    </div>
  );
}
