// src/components/InventoryProductsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/InventoryProductsPage.css";

/* -------------------- demo data -------------------- */
const CATS = ["Clothing", "Footwear", "Accessories"];
const BRANDS = ["B4L", "KZ", "WS", "BL"];
const SAMPLE_NAMES = [
  "(872) (U) Socks - Summer",
  "(351) (M) Shirt (Long Sleeves)",
  "(118) (W) Top - Casual",
  "(204) (M) Jeans - Slim Fit",
];

function makeRow(i) {
  const cat = CATS[i % CATS.length];
  const brand = BRANDS[i % BRANDS.length];
  const name = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
  const code =
    String(86000 + (i % 999)).padStart(5, "0") + ["-F", "-M", "-W"][i % 3];
  const mrp = [1499, 1499, 1499, 1499][i % 4];
  const sp = [599, 599, 599, 599][i % 4];
  return {
    id: i + 1,
    images: [],
    itemCode: code,
    category: cat,
    brand,
    name,
    mrp,
    sp,
    hsn: "63090000",
    qty: 1.0,
    active: true,
    showOnline: false,
  };
}
function generateRows(n = 200) {
  return Array.from({ length: n }, (_, i) => makeRow(i));
}

/* -------------------- helpers -------------------- */
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 500, 1000];

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
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
            />
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
    "Item Code",
    "Category",
    "Brand",
    "Name",
    "MRP",
    "Selling Price",
    "HSN",
    "Qty",
    "Status",
    "Show Online",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(","),
    ...rows.map((r, i) =>
      [
        i + 1,
        r.itemCode,
        r.category,
        r.brand,
        r.name,
        r.mrp.toFixed(2),
        r.sp.toFixed(2),
        r.hsn,
        r.qty.toFixed(2),
        r.active ? "ACTIVE" : "INACTIVE",
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
      ["Sr. No.", 54], ["Item Code", 90], ["Category", 100], ["Brand", 70],
      ["Name", 300], ["MRP", 70], ["Selling Price", 90], ["HSN", 90],
      ["Qty", 60], ["Status", 80], ["Show Online", 100],
    ];

    const headerH = 26, rowH = 22;
    let y = margin;

    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("Products", margin, y); y += 16;

    const drawHeader = () => {
      doc.setFillColor(245, 248, 253); doc.setDrawColor(230, 235, 243);
      let x = margin;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      cols.forEach(([label, w]) => { doc.rect(x, y, w, headerH, "FD"); doc.text(label, x + 6, y + 17); x += w; });
      y += headerH;
    };
    const drawRow = (r, idx) => {
      let x = margin;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      const data = [
        String(idx + 1), r.itemCode, r.category, r.brand, r.name,
        r.mrp.toFixed(2), r.sp.toFixed(2), r.hsn, r.qty.toFixed(2),
        r.active ? "ACTIVE" : "INACTIVE", r.showOnline ? "Yes" : "No",
      ];
      cols.forEach(([_, w], i) => {
        if (idx % 2 === 1) { doc.setFillColor(252, 253, 255); doc.rect(x, y, w, rowH, "F"); }
        doc.setDrawColor(238, 242, 247); doc.rect(x, y, w, rowH, "S");
        let txt = data[i] ?? "";
        if (i === 4) { const maxChars = Math.floor((w - 10) / 6.2); if (txt.length > maxChars) txt = txt.slice(0, maxChars - 1) + "…"; }
        if ([5, 6, 8].includes(i)) { doc.text(txt, x + w - 6, y + 15, { align: "right" }); }
        else { doc.text(txt, x + 6, y + 15); }
        x += w;
      });
      y += rowH;
    };

    drawHeader();
    rows.forEach((r, i) => {
      if (y + rowH > pageH - margin) { doc.addPage(); y = margin + 16; drawHeader(); }
      drawRow(r, i);
    });

    doc.save(filename);
  } catch (e) {
    console.error(e);
    alert("PDF export ke liye `jspdf` install karein: npm i jspdf");
  }
}

/* -------------------- main component -------------------- */
export default function InventoryProductsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(() => generateRows(200));

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [psOpen, setPsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ✅ per-row action menu open id
  const [actionOpenId, setActionOpenId] = useState(null);

  // ✅ store DOM refs per row for outside-click handling
  const actionRefs = useRef({}); // { [rowId]: HTMLElement }

  const [selectedIds, setSelectedIds] = useState(new Set());

  const psRef = useClickOutside(psOpen, () => setPsOpen(false));
  const exportRef = useClickOutside(exportOpen, () => setExportOpen(false));

  const fileInputRef = useRef(null);
  const uploadForRowRef = useRef(null);
  const handlePickImages = (rowId) => { uploadForRowRef.current = rowId; fileInputRef.current?.click(); };
  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !uploadForRowRef.current) return;
    const urls = files.map((f) => URL.createObjectURL(f));
    setRows((list) => list.map((r) => (r.id === uploadForRowRef.current ? { ...r, images: [...(r.images || []), ...urls] } : r)));
    e.target.value = "";
  };
  useEffect(() => () => { rows.forEach((r) => (r.images || []).forEach((u) => URL.revokeObjectURL(u))); }, []); // eslint-disable-line

  // options (sub brand / sub category removed)
  const DEPT_OPTIONS = ["All", "Test", "S", "clothes", "Miscellaneous", "Sweater"];
  const CAT_OPTIONS = ["All", ...CATS];
  const BRAND_OPTIONS = ["All", "B4L"];
  const HSN_OPTIONS = ["All", "63090000", "90041000", "102", "7117", "64039990", "42022210"];
  const TAX_OPTIONS = ["All", "Gst 15", "GST 28", "GST18", "GST12", "GST 5", "NON GST 0"];

  const [filters, setFilters] = useState({ dept: "", category: "", brand: "", purchaseTax: "", salesTax: "", hsn: "" });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.category && r.category !== filters.category) return false;
      if (filters.brand && r.brand !== filters.brand) return false;
      if (filters.hsn && r.hsn !== filters.hsn) return false;
      if (!q) return true;
      return `${r.itemCode} ${r.category} ${r.brand} ${r.name} ${r.mrp} ${r.sp} ${r.hsn}`.toLowerCase().includes(q);
    });
  }, [rows, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = filtered.slice(start, end);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set([...selectedIds, ...pageRows.map((r) => r.id)]));
    else { const next = new Set(selectedIds); pageRows.forEach((r) => next.delete(r.id)); setSelectedIds(next); }
  };
  const toggleOne = (id, checked) => { const next = new Set(selectedIds); if (checked) next.add(id); else next.delete(id); setSelectedIds(next); };
  const deleteSelected = () => { if (!selectedIds.size) return; setRows((l) => l.filter((r) => !selectedIds.has(r.id))); setSelectedIds(new Set()); };
  const onToggleOnline = (id, checked) => setRows((l) => l.map((r) => (r.id === id ? { ...r, showOnline: checked } : r)));

  const exportExcelPage = () => { downloadBlob(toCSV(pageRows), "products_page.csv", "text/csv;charset=utf-8"); setExportOpen(false); };
  const exportExcelAll = () => { downloadBlob(toCSV(filtered), "products_all.csv", "text/csv;charset=utf-8"); setExportOpen(false); };
  const exportPdfPage = async () => { await exportRowsToPdf(pageRows, "products_page.pdf"); setExportOpen(false); };
  const exportPdfAll = async () => { await exportRowsToPdf(filtered, "products_all.pdf"); setExportOpen(false); };

  const totalRecords = filtered.length;
  const showingFrom = totalRecords ? start + 1 : 0;
  const showingTo = Math.min(end, totalRecords);
  const allChecked = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));

  /* ===== CLOSE ACTION MENU ON OUTSIDE CLICK / ESC ===== */
  useEffect(() => {
    if (!actionOpenId) return;
    const handleDown = (e) => {
      const host = actionRefs.current[actionOpenId];
      if (!host) return setActionOpenId(null);
      if (!host.contains(e.target)) setActionOpenId(null);
    };
    const handleEsc = (e) => { if (e.key === "Escape") setActionOpenId(null); };
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [actionOpenId]);

  return (
    <div className="pp-wrap">
      <div className="pp-topbar">
        <div className="pp-title">Product</div>
        <a href="#setup-opening" className="pp-link">Setup Opening Stock</a>
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
                  <button onClick={exportExcelPage}><span className="mi icon">table_chart</span>Excel</button>
                  <button onClick={exportPdfPage}><span className="mi icon">picture_as_pdf</span>PDF</button>
                  <button onClick={exportPdfAll}><span className="mi icon">picture_as_pdf</span>All Data PDF</button>
                  <button onClick={exportExcelAll}><span className="mi icon">grid_on</span>All Data Excel</button>
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
                    <button key={n} onClick={() => { setPageSize(n); setPsOpen(false); setPage(1); }}>{n}</button>
                  ))}
                </div>
              )}
            </div>

            <button className="pp-btn outline" onClick={() => setShowFilters((v) => !v)}>
              <span className="mi">filter_list</span> Filter
            </button>
          </div>

          <div className="pp-right">
            <div className="pp-search">
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search List..." />
              <span className="mi">search</span>
            </div>
            {/* ✅ Navigate to New Product page */}
            <button className="pp-btn blue" onClick={() => navigate("/inventory/products/new")}>Create New</button>
          </div>
        </div>

        {showFilters && (
          <div className="pp-filterbar">
            <SearchSelect label="Department" value={filters.dept} onChange={(v) => setFilters((f) => ({ ...f, dept: v }))} options={["All", "Test", "S", "clothes", "Miscellaneous", "Sweater"]} width={240}/>
            <SearchSelect label="Category" value={filters.category} onChange={(v) => setFilters((f) => ({ ...f, category: v }))} options={["All", ...CATS]} width={260}/>
            <SearchSelect label="Brand" value={filters.brand} onChange={(v) => setFilters((f) => ({ ...f, brand: v }))} options={["All", "B4L"]} width={240}/>
            <SearchSelect label="HSN" value={filters.hsn} onChange={(v) => setFilters((f) => ({ ...f, hsn: v }))} options={["All", "63090000", "90041000", "102", "7117", "64039990", "42022210"]} width={240}/>
            <SearchSelect label="Purchase Tax" value={filters.purchaseTax} onChange={(v) => setFilters((f) => ({ ...f, purchaseTax: v }))} options={["All", "Gst 15", "GST 28", "GST18", "GST12", "GST 5", "NON GST 0"]} width={240}/>
            <SearchSelect label="Sales Tax" value={filters.salesTax} onChange={(v) => setFilters((f) => ({ ...f, salesTax: v }))} options={["All", "Gst 15", "GST 28", "GST18", "GST12", "GST 5", "NON GST 0"]} width={240}/>
          </div>
        )}

        <div className={`pp-bulk ${selectedIds.size ? "show" : ""}`}>
          <div className="pp-bulk-left">
            Selected {selectedIds.size || 0} Records:
            <button className="pp-btn danger" onClick={deleteSelected}><span className="mi">delete</span> Delete</button>
          </div>
        </div>

        <div className="pp-table-wrap">
          <table className="pp-table">
            <thead>
              <tr>
                <th className="chk">
                  <label className="pp-chk"><input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} /><span /></label>
                </th>
                <th>Sr. No.</th><th>Image</th><th>Item Code</th><th>Category</th><th>Brand</th>
                <th>Name</th><th>MRP</th><th>Selling Price</th><th>HSN</th><th>Qty</th><th>Status</th><th>Show Online</th><th className="act">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, idx) => {
                const rowChecked = selectedIds.has(r.id);
                return (
                  <tr key={r.id}>
                    <td className="chk">
                      <label className="pp-chk"><input type="checkbox" checked={rowChecked} onChange={(e) => toggleOne(r.id, e.target.checked)} /><span /></label>
                    </td>
                    <td>{start + idx + 1}</td>
                    <td onClick={() => handlePickImages(r.id)} style={{ cursor: "pointer" }} title="Click to add images">
                      {r.images?.length ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          {r.images.slice(0, 3).map((u, i) => (
                            <img key={i} src={u} alt="" style={{ width: 44, height: 36, objectFit: "cover", borderRadius: 8, border: "1px solid #cfd7e6", background: "#f9fbff" }}
                              onClick={(e) => { e.stopPropagation(); handlePickImages(r.id); }} />
                          ))}
                          {r.images.length > 3 && (
                            <div style={{ width: 44, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                              border: "1px dashed #cfd7e6", borderRadius: 8, fontSize: 11, color: "#6b7280", background: "#f9fbff" }}>
                              +{r.images.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (<div className="pp-img-skel"><span className="mi">image</span></div>)}
                    </td>
                    <td className="mono">{r.itemCode}</td>
                    <td>{r.category}</td>
                    <td className="mono">{r.brand}</td>
                    <td><a className="pp-link blue" href="#name">{r.name}</a></td>
                    <td className="num">{r.mrp.toFixed(2)}</td>
                    <td className="num">{r.sp.toFixed(2)}</td>
                    <td className="mono">{r.hsn}</td>
                    <td className="num">{r.qty.toFixed(2)}</td>
                    <td><span className="pp-badge success">ACTIVE</span></td>
                    <td>
                      <label className="pp-switch"><input type="checkbox" checked={!!r.showOnline} onChange={(e) => onToggleOnline(r.id, e.target.checked)} /><span className="slider" /></label>
                    </td>
                    <td className="act">
                      {/* ✅ per-row action container with ref stored in map */}
                      <div
                        className="pp-actions"
                        ref={(el) => { if (el) actionRefs.current[r.id] = el; }}
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
                          <span className="dot" /><span className="dot" /><span className="dot" />
                        </button>

                        {actionOpenId === r.id && (
                          <div className="pp-menu right kebab">
                            <button onClick={() => { alert("Edit Details"); setActionOpenId(null); }}>
                              <span className="mi icon">open_in_new</span>Edit Details
                            </button>
                            <button onClick={() => { alert("Delete"); setActionOpenId(null); }}>
                              <span className="mi icon">delete</span>Delete
                            </button>
                            <button onClick={() => { alert("Deactivate"); setActionOpenId(null); }}>
                              <span className="mi icon">block</span>Deactivate
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (<tr><td colSpan={14} className="empty">No records found</td></tr>)}
            </tbody>
          </table>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFilesSelected} />

        <div className="pp-foot">
          <div className="pp-foot-left">Showing {showingFrom} to {showingTo} of {totalRecords.toLocaleString()} entries</div>
          <div className="pp-pagination">
            <button className="pg-btn" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            {paginate(totalPages, safePage).map((p, i) =>
              p === "…" ? <span key={`e${i}`} className="pg-ellipsis">…</span> :
              <button key={p} className={`pg-btn num ${p === safePage ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            )}
            <button className="pg-btn" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
