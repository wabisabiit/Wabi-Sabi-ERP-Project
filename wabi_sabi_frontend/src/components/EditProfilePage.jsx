// src/pages/EmployeePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactDOM from "react-dom";
import "../styles/EmployeePage.css";
import { listEmployees, listOutlets, deleteEmployee } from "../api/client";

/* ========= Page ========= */
export default function EmployeePage() {
  const [pageSize, setPageSize] = useState(15);
  const [query, setQuery] = useState("");

  const [rows, setRows] = useState([]); // backend rows
  const [loading, setLoading] = useState(true);

  const [outletMap, setOutletMap] = useState({}); // outletId -> display label
  const [openFilter, setOpenFilter] = useState(false);
  const [empLocations, setEmpLocations] = useState([]);
  const [empName, setEmpName] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  const navigate = useNavigate();

  // ---- Load outlets (for branch names) + employees ----
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Fetch outlets first, build a map for quick lookup
        const ol = await listOutlets();
        const outlets = (ol?.results ?? ol ?? []).map((o) => ({
          id: o.id,
          label: o.name || o.display_name || o.code || `#${o.id}`,
        }));
        const oMap = Object.fromEntries(outlets.map((o) => [o.id, o.label]));
        setOutletMap(oMap);

        // Fetch employees
        const el = await listEmployees();
        const emps = (el?.results ?? el ?? []).map((e) => ({
          id: e.id,
          name:
            [e.user?.first_name, e.user?.last_name]
              .filter(Boolean)
              .join(" ") ||
            e.user?.username ||
            "-",
          phone: e.mobile || "", // 🔹 now comes from API
          email: e.user?.email || "",
          branch: oMap[e.outlet] || `#${e.outlet}`, // show outlet name from map
          status: e.is_active ? "ACTIVE" : "DEACTIVE",
        }));
        setRows(emps);
      } catch (err) {
        console.error("Load failed:", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const NAME_OPTIONS = useMemo(() => rows.map((d) => d.name), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        [r.name, r.phone, r.email, r.branch].some((v) =>
          String(v || "").toLowerCase().includes(q)
        );
      const matchesName = !empName || r.name === empName;
      const matchesLoc =
        empLocations.length === 0 || empLocations.includes(r.branch);

      let matchesStatus = true;
      if (statusFilter === "All") matchesStatus = true;
      else if (statusFilter === "Active")
        matchesStatus = (r.status || "").toUpperCase() === "ACTIVE";
      else if (statusFilter === "Deactive")
        matchesStatus = (r.status || "").toUpperCase() === "DEACTIVE";

      return matchesSearch && matchesName && matchesLoc && matchesStatus;
    });
  }, [query, empName, empLocations, statusFilter, rows]);

  const showingFrom = filtered.length ? 1 : 0;
  const showingTo = Math.min(filtered.length, pageSize);

  useEffect(() => {
    const onDoc = (e) =>
      exportRef.current &&
      !exportRef.current.contains(e.target) &&
      setExportOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const headers = [
    "#",
    "Name",
    "Mobile No.",
    "Email",
    "Assign Branch",
    "Status",
  ];
  const getRows = () =>
    filtered.slice(0, pageSize).map((r) => [
      r.id,
      r.name,
      r.phone,
      r.email || "",
      r.branch,
      r.status,
    ]);

  const download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const rowsToExport = getRows();
    const th = headers
      .map(
        (h) =>
          `<th style="font-weight:600;border:1px solid #d9dee6;text-align:left;padding:4px 6px;">${h}</th>`
      )
      .join("");
    const tr = rowsToExport
      .map(
        (r) =>
          `<tr>${r
            .map(
              (c) =>
                `<td style="border:1px solid #d9dee6;padding:4px 6px;">${String(
                  c ?? ""
                )}</td>`
            )
            .join("")}</tr>`
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></body></html>`;

    download(
      new Blob([html], { type: "application/vnd.ms-excel" }),
      "employees.xls"
    );
    setExportOpen(false);
  };

  const pdfEscape = (s = "") =>
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const exportPDF = () => {
    const rowsToExport = getRows();
    const lines = [
      headers.join("  |  "),
      ...rowsToExport.map((r) => r.join("  |  ")),
    ];

    let pdf = `%PDF-1.4\n`;
    const parts = [];
    const add = (s) => {
      const off = pdf.length;
      pdf += s;
      parts.push(off);
    };

    let stream = "BT /F1 10 Tf 36 806 Td 14 TL\n";
    stream += `(Employees Export) Tj T* \n`;
    stream += `0 -8 Td 0 g 0.5 w 543 0 m S 0 0 Td 0 g 1 w\n`;
    lines.forEach((line) => {
      stream += `(${pdfEscape(line)}) Tj T* \n`;
    });
    stream += "ET\n";

    add(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
    add(
      `2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n`
    );
    add(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`
    );
    add(
      `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
    );
    add(
      `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`
    );

    const xrefStart = pdf.length;
    const pad = (n) => String(n).padStart(10, "0");
    pdf += `xref\n0 6\n0000000000 65535 f \n`;
    parts.forEach((off) => {
      pdf += `${pad(off)} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    download(new Blob([pdf]), "employees.pdf");
    setExportOpen(false);
  };

  // ===== Delete handler =====
  async function onDelete(id) {
    if (!window.confirm("Delete this employee?")) return;
    try {
      await deleteEmployee(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      alert("Delete failed: " + (e?.message || "Unknown error"));
    }
  }

  /* ---------- Small inline components from your original UI ---------- */
  function EmpLocationSelect({ value = [], onChange, options = [] }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const wrapRef = useRef(null);
    const filtered = useMemo(() => {
      const s = q.trim().toLowerCase();
      if (!s) return options;
      return options.filter((o) => o.toLowerCase().includes(s));
    }, [q, options]);
    useEffect(() => {
      const onDoc = (e) =>
        wrapRef.current &&
        !wrapRef.current.contains(e.target) &&
        setOpen(false);
      const onKey = (e) => e.key === "Escape" && setOpen(false);
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey);
      };
    }, []);
    const toggle = (opt) => {
      const s = new Set(value);
      s.has(opt) ? s.delete(opt) : s.add(opt);
      onChange(Array.from(s));
    };
    return (
      <div className="emp-loc" ref={wrapRef}>
        <button
          type="button"
          className="emp-loc-pill"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="emp-loc-text">Select Location</span>
          <span className="emp-loc-badge">{value.length}</span>
          <span className="material-icons emp-loc-close">expand_more</span>
        </button>
        {open && (
          <div className="emp-loc-pop">
            <div className="emp-loc-search">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder=""
              />
            </div>
            <div className="emp-loc-list">
              {filtered.length === 0 ? (
                <div className="emp-loc-empty">No results</div>
              ) : (
                filtered.map((opt) => {
                  const checked = value.includes(opt);
                  return (
                    <label
                      key={opt}
                      className="emp-loc-item"
                      title={opt}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(opt)}
                      />
                      <span className="emp-loc-txt">{opt}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  function EmpNameSelect({
    value,
    onChange,
    options = [],
    placeholder = "Select Name",
  }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const wrapRef = useRef(null);
    const filtered = useMemo(() => {
      const s = q.trim().toLowerCase();
      if (!s) return options;
      return options.filter((o) => o.toLowerCase().includes(s));
    }, [q, options]);
    useEffect(() => {
      const onDoc = (e) =>
        wrapRef.current &&
        !wrapRef.current.contains(e.target) &&
        setOpen(false);
      const onKey = (e) => e.key === "Escape" && setOpen(false);
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey);
      };
    }, []);
    const label = value || placeholder;
    return (
      <div className="emp-nselect" ref={wrapRef}>
        <button
          className={`emp-ns-btn ${open ? "is-open" : ""}`}
          type="button"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="emp-ns-value">{label}</span>
          <span className="material-icons emp-ns-caret">expand_more</span>
        </button>
        {open && (
          <div className="emp-ns-pop" role="listbox">
            <div className="emp-ns-search">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search..."
              />
            </div>
            <div className="emp-ns-list">
              {filtered.length === 0 ? (
                <div className="emp-ns-empty">No results</div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`emp-ns-item ${
                      value === opt ? "is-selected" : ""
                    }`}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    {opt}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  function EmpStatusSelect({
    value = "Active",
    onChange,
    options = ["Active", "Deactive", "All"],
  }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    useEffect(() => {
      const onDoc = (e) =>
        wrapRef.current &&
        !wrapRef.current.contains(e.target) &&
        setOpen(false);
      const onKey = (e) => e.key === "Escape" && setOpen(false);
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey);
      };
    }, []);
    return (
      <div className="emp-nselect emp-status" ref={wrapRef}>
        <button
          className={`emp-ns-btn ${open ? "is-open" : ""}`}
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Status"
        >
          <span className="emp-ns-value">{value}</span>
          <span className="material-icons emp-ns-caret">expand_more</span>
        </button>
        {open && (
          <div className="emp-ns-pop emp-status-pop" role="listbox">
            <div className="emp-ns-list emp-status-list">
              {options.map((opt) => {
                const checked = value === opt;
                return (
                  <label
                    key={opt}
                    className="emp-ns-item emp-status-item"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        onChange(opt);
                        setOpen(false);
                      }}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // options for Location filter = all known branches
  const locationOptions = useMemo(
    () => Object.values(outletMap),
    [outletMap]
  );

  return (
    <div className="emp-wrap">
      {/* Page Title with Home Icon */}
      <div className="emp-pagebar">
        <h1>Employee</h1>
        <span className="material-icons home-ico">home</span>
      </div>

      {/* Card */}
      <div className="emp-card">
        {/* Toolbar */}
        <div className="emp-toolbar">
          <div className="flex-spacer" />

          {/* Export dropdown */}
          <div className="emp-export" ref={exportRef}>
            <button
              className="btn-icon"
              title="Export"
              onClick={(e) => {
                setExportOpen((v) => !v);
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.dataset.rect = JSON.stringify({
                  top: r.bottom + 6,
                  left: r.right - 160,
                });
              }}
            >
              <span className="material-icons">file_download</span>
            </button>

            {exportOpen &&
              ReactDOM.createPortal(
                (() => {
                  const btn =
                    exportRef.current?.querySelector(".btn-icon");
                  let pos = { top: 0, left: 0 };
                  try {
                    pos = JSON.parse(btn?.dataset.rect || "{}");
                  } catch {}
                  return (
                    <div
                      className="emp-export-pop portal"
                      role="menu"
                      style={{
                        position: "fixed",
                        top: pos.top,
                        left: pos.left,
                        width: 160,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="emp-export-item"
                        onClick={exportExcel}
                      >
                        Excel
                      </button>
                      <button
                        className="emp-export-item"
                        onClick={exportPDF}
                      >
                        PDF
                      </button>
                    </div>
                  );
                })(),
                document.body
              )}
          </div>

          <select
            className="emp-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Rows per page"
          >
            {[10, 50, 100, 200, 500].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>

          <button
            className={`btn filter ${openFilter ? "is-active" : ""}`}
            onClick={() => setOpenFilter((v) => !v)}
            type="button"
          >
            <span className="material-icons">filter_alt</span>
            <span>Filter</span>
          </button>

          <div className="emp-search">
            <span className="material-icons">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search List..."
            />
          </div>

          {/* Create page */}
          <button
            className="btn primary"
            onClick={() => navigate("/admin/employee/new")}
          >
            Create New
          </button>
        </div>

        {/* Filter strip */}
        {openFilter && (
          <div className="emp-filterstrip">
            <div className="emp-field">
              <div className="emp-field-label">Select Location</div>
              <EmpLocationSelect
                value={empLocations}
                onChange={setEmpLocations}
                options={locationOptions}
              />
            </div>

            <div className="emp-field">
              <div className="emp-field-label">Select Name</div>
              <EmpNameSelect
                value={empName}
                onChange={setEmpName}
                options={NAME_OPTIONS}
                placeholder="Select Name"
              />
            </div>

            <div className="emp-field">
              <div className="emp-field-label">Status</div>
              <EmpStatusSelect
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="table-wrap">
          <table className="emp-table">
            <thead>
              <tr>
                <th className="col-sr">#</th>
                <th>Name</th>
                <th>Mobile No.</th>
                <th>Email</th>
                <th>Assign Branch</th>
                <th className="col-status">Status</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    Loading…
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.slice(0, pageSize).map((r) => {
                  const st = (r.status || "").toUpperCase();
                  const pillClass =
                    st === "ACTIVE"
                      ? "active"
                      : st === "DEACTIVE"
                      ? "deactive"
                      : "";
                  return (
                    <tr key={r.id}>
                      <td className="col-sr">{r.id}</td>
                      <td>
                        <a className="emp-link" href="#!">
                          {r.name}
                        </a>
                      </td>
                      <td>{r.phone}</td>
                      <td>{r.email || ""}</td>
                      <td>{r.branch}</td>
                      <td className="col-status">
                        <span className={`status-pill ${pillClass}`}>
                          {st}
                        </span>
                      </td>
                      <td className="col-actions">
                        <button className="ico" title="Open">
                          <span className="material-icons">
                            open_in_new
                          </span>
                        </button>
                        <button
                          className="ico"
                          title="Edit"
                          onClick={() =>{
                            console.log("Edit clicked for id", r.id);
                            navigate(`/admin/employee/${r.id}`) // 🔹 go to edit
                          }}
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button className="ico" title="Duplicate">
                          <span className="material-icons">
                            content_copy
                          </span>
                        </button>
                        <button
                          className="ico"
                          title="Delete"
                          onClick={() => onDelete(r.id)}
                        >
                          <span className="material-icons">
                            delete_outline
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer + pager */}
        <div className="emp-table-foot">
          <div className="foot-left">
            {`Showing ${showingFrom} to ${showingTo} of ${filtered.length} entries`}
          </div>
          <div className="foot-right">
            <button className="page arrow" type="button">
              <span className="material-icons">chevron_left</span>
            </button>
            <button className="page current" type="button">
              1
            </button>
            <button className="page arrow" type="button">
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
