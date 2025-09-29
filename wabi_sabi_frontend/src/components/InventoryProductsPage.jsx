import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const code = String(86000 + (i % 999)).padStart(5, "0") + ["-F", "-M", "-W"][i % 3];
  const mrp = [250, 375, 550, 1375][i % 4];
  const sp = [100, 119, 299, 550][i % 4];
  return {
    id: i + 1,
    image: "",
    itemCode: code,
    category: cat,
    brand,
    name,
    mrp,
    sp,
    hsn: "63090000",
    qty: 0.0,
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

/* -------------------- main component -------------------- */
export default function InventoryProductsPage() {
  const [rows, setRows] = useState(() => generateRows(200));
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // menus left in UI
  const [psOpen, setPsOpen] = useState(false);
  const [actionOpenId, setActionOpenId] = useState(null);

  // selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  const psRef = useClickOutside(psOpen, () => setPsOpen(false));
  const actRef = useClickOutside(!!actionOpenId, () => setActionOpenId(null));

  // filter rows
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.itemCode,
        r.category,
        r.brand,
        r.name,
        String(r.mrp),
        String(r.sp),
        r.hsn,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = filtered.slice(start, end);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // selection handlers
  const toggleAll = (checked) => {
    if (checked) {
      const pageIds = pageRows.map((r) => r.id);
      setSelectedIds(new Set([...selectedIds, ...pageIds]));
    } else {
      const newSet = new Set(selectedIds);
      pageRows.forEach((r) => newSet.delete(r.id));
      setSelectedIds(newSet);
    }
  };
  const toggleOne = (id, checked) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  };
  const clearSelection = () => setSelectedIds(new Set());
  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    setRows((list) => list.filter((r) => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
  };

  const onToggleOnline = (id, checked) => {
    setRows((list) => list.map((r) => (r.id === id ? { ...r, showOnline: checked } : r)));
  };

  const totalRecords = filtered.length;
  const showingFrom = totalRecords ? start + 1 : 0;
  const showingTo = Math.min(end, totalRecords);

  const allChecked = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));

  return (
    <div className="pp-wrap">
      <div className="pp-topbar">
        <div className="pp-title">Product</div>
        <a href="#setup-opening" className="pp-link">Setup Opening Stock</a>
      </div>

      <div className="pp-card">
        {/* bulk bar */}
        {selectedIds.size > 0 && (
          <div className="pp-bulk">
            <div className="pp-bulk-left">
              Selected {selectedIds.size} Records:
              <button className="pp-btn danger" onClick={deleteSelected}>
                <span className="mi">delete</span> Delete
              </button>
              <button className="pp-btn ghost" onClick={clearSelection}>Clear</button>
            </div>
          </div>
        )}

        {/* toolbar (Import/Export removed) */}
        <div className="pp-toolbar">
          <div className="pp-left">
            <div className="pp-pagesize" ref={psRef}>
              <button className="pp-btn select" onClick={() => setPsOpen((v) => !v)}>
                {pageSize} <span className="mi caret">arrow_drop_down</span>
              </button>
              {psOpen && (
                <div className="pp-menu">
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <button key={n} onClick={() => { setPageSize(n); setPsOpen(false); setPage(1); }}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="pp-btn outline">
              <span className="mi">filter_list</span> Filter
            </button>
          </div>

          <div className="pp-right">
            <div className="pp-search">
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search List..."
              />
              <span className="mi">search</span>
            </div>
            <button className="pp-btn blue">
              Create New
            </button>
          </div>
        </div>

        {/* table */}
        <div className="pp-table-wrap">
          <table className="pp-table">
            <thead>
              <tr>
                <th className="chk">
                  <label className="pp-chk">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                    <span/>
                  </label>
                </th>
                <th>Sr. No.</th>
                <th>Image</th>
                <th>Item Code</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Name</th>
                <th>MRP</th>
                <th>Selling Price</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Show Online</th>
                <th className="act">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, idx) => {
                const rowChecked = selectedIds.has(r.id);
                return (
                  <tr key={r.id}>
                    <td className="chk">
                      <label className="pp-chk">
                        <input
                          type="checkbox"
                          checked={rowChecked}
                          onChange={(e) => toggleOne(r.id, e.target.checked)}
                        />
                        <span/>
                      </label>
                    </td>
                    <td>{start + idx + 1}</td>
                    <td>
                      <div className="pp-img-skel">
                        <span className="mi">image</span>
                      </div>
                    </td>
                    <td className="mono">{r.itemCode}</td>
                    <td>{r.category}</td>
                    <td className="mono">{r.brand}</td>
                    <td>
                      <a className="pp-link blue" href="#name">{r.name}</a>
                    </td>
                    <td className="num">{r.mrp.toFixed(2)}</td>
                    <td className="num">{r.sp.toFixed(2)}</td>
                    <td className="mono">{r.hsn}</td>
                    <td className="num">{r.qty.toFixed(2)}</td>
                    <td>
                      <span className="pp-badge success">ACTIVE</span>
                    </td>
                    <td>
                      <label className="pp-switch">
                        <input
                          type="checkbox"
                          checked={!!r.showOnline}
                          onChange={(e) => onToggleOnline(r.id, e.target.checked)}
                        />
                        <span className="slider"/>
                      </label>
                    </td>
                    <td className="act">
                      <div className="pp-actions" ref={actRef}>
                        <button
                          className={`pp-kebab ${actionOpenId === r.id ? "open" : ""}`}
                          onClick={() =>
                            setActionOpenId((id) => (id === r.id ? null : r.id))
                          }
                        >
                          <span className="dot"/> <span className="dot"/> <span className="dot"/>
                        </button>
                        {actionOpenId === r.id && (
                          <div className="pp-menu right">
                            <button onClick={() => { alert("Edit Details"); setActionOpenId(null); }}>
                              <span className="mi">open_in_new</span> Edit Details
                            </button>
                            <button onClick={() => { alert("Delete"); setActionOpenId(null); }}>
                              <span className="mi">delete</span> Delete
                            </button>
                            <button onClick={() => { alert("Deactivate"); setActionOpenId(null); }}>
                              <span className="mi">block</span> Deactivate
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
                  <td colSpan={14} className="empty">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* footer / pagination */}
        <div className="pp-foot">
          <div className="pp-foot-left">
            Showing {showingFrom} to {showingTo} of {totalRecords.toLocaleString()} entries
          </div>
          <div className="pp-pagination">
            <button
              className="pg-btn"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            {paginate(totalPages, safePage).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="pg-ellipsis">…</span>
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
    </div>
  );
}
