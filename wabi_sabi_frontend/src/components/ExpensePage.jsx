// src/components/ExpensePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/ExpensePage.css";

/* 🔹 NewExpense form import */
import NewExpense from "./NewExpense";

/* 🔧 Icons (Feather) */
import { FiHome, FiSearch, FiFilter, FiDownload, FiChevronDown } from "react-icons/fi";

/* 🔹 API */
import { listExpenses, deleteExpense } from "../api/client";

/* ---------------- Mock data ---------------- */
const LOCATIONS = [
  "WABI SABI SUSTAINABILITY LLP",
  "Brands 4 less – IFFCO Chowk",
  "Brands 4 less – Rajouri Garden Outside",
  "Brands 4 less – M3M Urbana",
  "Brands loot – Krishna Nagar",
  "Brands Loot – Udyog Vihar",
  "Brand4Less – Tilak Nagar",
  "Brands 4 less – Ansal Plaza",
];
const PARTIES = [
  "All Party",
  "Wabi Sabi Services",
  "ABC Logistics",
  "Acme Vendor",
  "City Utilities",
];

/* ---------------- helpers ---------------- */
const cx = (...a) => a.filter(Boolean).join(" ");

function parseDMY(dmy) {
  const [d, m, y] = (dmy || "").split("/").map(Number);
  return d && m && y ? new Date(y, m - 1, d) : null;
}

function useClickOutside(close) {
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && close();
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [close]);
  return ref;
}

/* ---------------- Controls ---------------- */
function MultiSelect({ placeholder = "Select", options = [], selected = [], onChange, width = 260 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useClickOutside(() => setOpen(false));
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.toLowerCase())),
    [options, q]
  );
  const toggle = (opt) =>
    onChange(
      selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]
    );
  return (
    <div className="ms" style={{ width }} ref={ref}>
      <div className={cx("ms-box", open && "open")} onClick={() => setOpen((v) => !v)}>
        <span className={cx("ms-ph", selected.length && "dim")}>{placeholder}</span>
        {!!selected.length && <span className="ms-badge">{selected.length}</span>}
        {!!selected.length && (
          <button
            className="ms-clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            aria-label="Clear"
          >
            ×
          </button>
        )}
        <span className="ms-caret">▾</span>
      </div>
      {open && (
        <div className="ms-dd">
          <div className="ms-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
            />
          </div>
          <div className="ms-list">
            {filtered.length ? (
              filtered.map((o) => (
                <label key={o} className="ms-opt">
                  <input
                    type="checkbox"
                    checked={selected.includes(o)}
                    onChange={() => toggle(o)}
                  />
                  <span className="ms-lbl">{o}</span>
                </label>
              ))
            ) : (
              <div className="ms-empty">No options</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SingleSelect({
  placeholder = "Select",
  value = "",
  options = [],
  onChange,
  width = 260,
  clearable = true,
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div className="ss" style={{ width }} ref={ref}>
      <div className={cx("ss-box", open && "open")} onClick={() => setOpen((v) => !v)}>
        <span className={cx("ss-val", value && "dim")}>{value || placeholder}</span>
        {value && clearable && (
          <button
            className="ss-clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          >
            ×
          </button>
        )}
        <span className="ss-caret">▾</span>
      </div>
      {open && (
        <div className="ss-dd">
          {options.map((o) => (
            <div
              key={o}
              className={cx("ss-opt", value === o && "active")}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SingleSelectSearch({
  placeholder = "Select",
  value = "",
  options = [],
  onChange,
  width = 260,
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useClickOutside(() => setOpen(false));
  const filtered = useMemo(
    () =>
      q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options,
    [options, q]
  );
  return (
    <div className="ss ss--search" style={{ width }} ref={ref}>
      <div className={cx("ss-box", open && "open")} onClick={() => setOpen((v) => !v)}>
        <span className={cx("ss-val", value && "dim")}>{value || placeholder}</span>
        {!!value && (
          <button
            className="ss-clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          >
            ×
          </button>
        )}
        <span className="ss-caret">▾</span>
      </div>
      {open && (
        <div className="ss-dd">
          <div className="ss-search">
            <input
              placeholder="Search party…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <div className="ss-list">
            {filtered.length ? (
              filtered.map((o) => (
                <div
                  key={o}
                  className={cx("ss-opt", value === o && "active")}
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                >
                  {o}
                </div>
              ))
            ) : (
              <div className="ss-empty">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function exportCSV(rows) {
  const headers = [
    "Sr. No.",
    "Expense No.",
    "Expense Date",
    "Party Name",
    "Total",
    "Paid",
    "UnPaid",
    "Status",
    "Branch",
    "Created By",
    "Created From",
  ];
  const body = rows.map((r, i) => [
    i + 1,
    r.expenseNo,
    r.expenseDate,
    r.party,
    r.total || 0,
    r.paid || 0,
    (r.total || 0) - (r.paid || 0),
    r.status || "",
    r.branch || "",
    r.createdBy || "",
    r.createdFrom || "",
  ]);
  const csv = [headers, ...body].map((r) => r.join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "expense.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function ExportMenu({ rows }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  return (
    <div className="exp-wrap" ref={ref}>
      <button
        className={cx("exp-btn", open && "open")}
        onClick={() => setOpen((v) => !v)}
        title="Export"
      >
        <FiDownload className="ico" />
        <FiChevronDown className="caret" />
      </button>
      {open && (
        <div className="exp-dd">
          <button
            className="exp-item"
            onClick={() => {
              exportCSV(rows);
              setOpen(false);
            }}
          >
            <span className="exp-file-ico exp-xls">XLS</span>
            <span>Excel</span>
          </button>
          <button
            className="exp-item"
            onClick={() => {
              window.print();
              setOpen(false);
            }}
          >
            <span className="exp-file-ico exp-pdf">PDF</span>
            <span>PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Main Page (List + Form switch) ---------------- */
export default function ExpensePage() {
  const [view, setView] = useState("list"); // "list" | "form"

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selLocations, setSelLocations] = useState([]);
  const [party, setParty] = useState("All Party");
  const [status, setStatus] = useState("All");
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // 🔹 real rows from backend
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success"|"error", message }

  // load once
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await listExpenses();
        const data = Array.isArray(res) ? res : res?.results || [];

        const mapped = data.map((e) => {
          const dt = e.date_time ? new Date(e.date_time) : null;
          const dtStr = dt
            ? dt.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "";

          const loc =
            e.branch ||
            e.created_by_name ||
            e.created_from ||
            e.created_by_location ||
            "";

          const amt = Number(e.amount || 0);

          return {
            id: e.id,
            expenseNo: e.id, // Sr. No. & Expense No. same
            expenseDate: dtStr,
            party: e.supplier_name || "",
            total: amt,
            paid: amt, // paid is total amount
            status: "",
            branch: loc,
            createdBy: loc,
            createdFrom: loc,
          };
        });

        setRows(mapped);
      } catch (err) {
        console.error(err);
        setToast({ type: "error", message: "Failed to load expenses." });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    const f = fromDate ? new Date(fromDate) : null;
    const t = toDate ? new Date(toDate) : null;
    return rows.filter((r) => {
      if (selLocations.length && !selLocations.includes(r.branch)) return false;
      if (party && party !== "All Party" && party !== r.party) return false;
      if (status !== "All" && status !== (r.status || "")) return false;
      const dt = parseDMY(r.expenseDate);
      if (f && dt && dt < f) return false;
      if (t && dt && dt > t) return false;
      const blob = [
        r.expenseNo,
        r.expenseDate,
        r.party,
        r.branch,
        r.createdBy,
        r.createdFrom,
        r.status,
      ]
        .join(" ")
        .toLowerCase();
      return query.trim() ? blob.includes(query.toLowerCase()) : true;
    });
  }, [rows, selLocations, party, status, fromDate, toDate, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(
    () => setPage(1),
    [pageSize, selLocations, party, status, fromDate, toDate, query]
  );
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize),
    [filtered, page, pageSize]
  );

  const totals = useMemo(() => {
    const total = filtered.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    // Paid & Unpaid cards stay 0 for now as requested
    return { total, paid: 0, unpaid: 0 };
  }, [filtered]);

  const handleDelete = async (row) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await deleteExpense(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setToast({ type: "success", message: "Expense deleted successfully." });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Failed to delete expense." });
    }
  };

  if (view === "form") {
    return (
      <NewExpense
        onCancel={() => setView("list")}
        onSaved={() => setView("list")}
      />
    );
  }

  return (
    <div className="ex2-wrap">
      <div className="ex2-bc">
        <FiHome className="ex2-home" />
        <h1 className="ex2-title">Expense</h1>
      </div>

      <div className="ex2-cards">
        <KPI label="Total Expense" value={totals.total} />
        <KPI label="Paid" value={totals.paid} />
        <KPI label="Unpaid" value={totals.unpaid} />
      </div>

      <div className="ex2-card">
        {/* blue overlay spinner while loading */}
        {loading && (
          <div className="ex2-spinner-wrap">
            <div className="ex2-spinner" />
          </div>
        )}

        <div className="ex2-toolbar">
          <div className="ex2-tools-left">
            <ExportMenu rows={filtered} />
            <SingleSelect
              placeholder="10"
              value={String(pageSize)}
              options={["10", "25", "50", "100"]}
              onChange={(v) => setPageSize(Number(v || 10))}
              width={80}
              clearable={false}
            />
            <button
              className={cx("filter-btn", filtersOpen && "is-active")}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <FiFilter className="ico" />
              <span>Filter</span>
            </button>
          </div>

          <div className="ex2-tools-right">
            <div className="search">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search List..."
              />
              <FiSearch className="s-ico" />
            </div>
            <button className="primary" onClick={() => setView("form")}>
              Create New
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="ex2-filters">
            <div className="f f-loc">
              <label>Location</label>
              <MultiSelect
                placeholder="Select Location"
                options={LOCATIONS}
                selected={selLocations}
                onChange={setSelLocations}
              />
            </div>
            <div className="f f-party">
              <label>Select Party</label>
              <SingleSelectSearch
                placeholder="All Party"
                value={party}
                options={PARTIES}
                onChange={setParty}
                width={360}
              />
            </div>
            <div className="f f-from">
              <label>From Date</label>
              <div className="date">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <span className="d-ico">📅</span>
              </div>
            </div>
            <div className="f f-to">
              <label>To Date</label>
              <div className="date">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
                <span className="d-ico">📅</span>
              </div>
            </div>
            <div className="f f-status">
              <label>Select Status</label>
              <SingleSelect
                placeholder="All"
                value={status}
                options={["All", "PAID", "UNPAID", "PARTIALLY PAID"]}
                onChange={(v) => setStatus(v || "All")}
              />
            </div>
          </div>
        )}

        <div className="ex2-table-wrap">
          <table className="ex2-table">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Expense No.</th>
                <th>Expense Date</th>
                <th>Party Name</th>
                <th>Total</th>
                <th>Paid</th>
                <th>UnPaid</th>
                <th>Status</th>
                <th>Branch</th>
                <th>Created By</th>
                <th>Created From</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!pageRows.length && (
                <tr className="empty">
                  <td colSpan={12}>No data available in table</td>
                </tr>
              )}
              {pageRows.map((r, idx) => (
                <tr key={r.id}>
                  <td>{(page - 1) * pageSize + idx + 1}</td>
                  <td>{r.expenseNo}</td>
                  <td>{r.expenseDate}</td>
                  <td>{r.party}</td>
                  <td className="num">{(r.total || 0).toFixed(2)}</td>
                  <td className="num">{(r.paid || 0).toFixed(2)}</td>
                  <td className="num">
                    {((r.total || 0) - (r.paid || 0)).toFixed(2)}
                  </td>
                  <td>{r.status}</td>
                  <td>{r.branch}</td>
                  <td>{r.createdBy}</td>
                  <td>{r.createdFrom}</td>
                  <td>
                    <button
                      className="row-del"
                      onClick={() => handleDelete(r)}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="total">
                <td colSpan={4}>Total</td>
                <td className="num">{totals.total.toFixed(2)}</td>
                <td className="num">0.00</td>
                <td className="num">0.00</td>
                <td colSpan={5}></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="ex2-foot">
          <div className="showing">
            {filtered.length
              ? `Showing ${(page - 1) * pageSize + 1} to ${Math.min(
                  page * pageSize,
                  filtered.length
                )} of ${filtered.length} entries`
              : "Showing 0 to 0 of 0 entries"}
          </div>
          <div className="pager">
            <button
              className="pg"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            <button
              className="pg"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className={cx("ex2-toast", toast.type)}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* KPI */
function KPI({ label, value = 0 }) {
  return (
    <div className="kpi">
      <div className="kpi-badge">{Number(value || 0).toLocaleString()}</div>
      <div className="kpi-lb">{label}</div>
    </div>
  );
}
