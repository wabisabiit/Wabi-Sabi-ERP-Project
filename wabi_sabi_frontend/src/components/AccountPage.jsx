// src/pages/Account.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AccountPage.css";
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../api/client";

/** ---- Constants ---- */
const LOCATIONS = [
  "Brands 4 less - IFFCO Chowk",
  "Brands 4 less - M3M Urbana",
  "Brand4Less - Tilak Nagar",
  "Brands 4 less - Ansal Plaza",
  "Brands 4 less - Rajouri Garden Outside",
  "Brands 4 less - Rajouri Garden Inside",
  "Brands loot - Krishna Nagar",
];

const ACCOUNT_GROUPS = [
  "Current Assets (Assets)",
  "Fixed Assets (Assets)",
  "Branch & Division (Assets)",
  "Cash in Hand (Assets)",
  "Stock in Hand (Assets)",
  "Sundry Debtors (Assets)",
  "Sundry Creditors (Liabilities)",
  "Current Liabilities (Liabilities)",
  "Loans (Liabilities)",
  "Indirect Expenses (Expenses)",
  "Direct Expenses (Expenses)",
  "Income (Income)",
];

const PAGE_SIZES = [15, 20, 50, 100, 200, 500, 1000];

/* Helper: map API payload -> row used by table */
function mapAccountToRow(acc) {
  const dt = acc.created_at ? new Date(acc.created_at) : new Date();
  const createdOn = dt.toLocaleString("en-IN", { hour12: true });

  return {
    id: acc.id,
    accountName: acc.name,
    groupName: acc.group_name,
    groupNature: acc.group_nature,
    accountType: acc.account_type || "customers",
    createdOn,
    createdBy: acc.created_by || "",
    location: acc.location_name || LOCATIONS[0],
    openingDebit: Number(acc.opening_debit || 0),
    openingCredit: Number(acc.opening_credit || 0),
  };
}

/* derive nature from dropdown text */
function deriveNatureFromDropdownText(txt = "") {
  if (txt.includes("(Assets)")) return "Assets";
  if (txt.includes("(Liabilities)")) return "Liabilities";
  if (txt.includes("(Expenses)")) return "Expenses";
  if (txt.includes("(Income)")) return "Income";
  return "Assets";
}

export default function AccountPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  /* Download dropdown */
  const [downloadOpen, setDownloadOpen] = useState(false);
  const dlWrapRef = useRef(null);
  const hiddenARef = useRef(null);

  /* Modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [accName, setAccName] = useState("");
  const [accGroup, setAccGroup] = useState("");
  const [openDr, setOpenDr] = useState("");
  const [openCr, setOpenCr] = useState("");
  const modalRef = useRef(null);
  const [editingId, setEditingId] = useState(null); // null => create, number => edit

  /* loading / saving / deleting spinner flags */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  /* Custom Account Group dropdown */
  const [accGroupOpen, setAccGroupOpen] = useState(false);
  const accGroupWrapRef = useRef(null);

  /* Router */
  const navigate = useNavigate();

  /* -------- Load accounts from API -------- */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const data = await listAccounts();
        const list = Array.isArray(data?.results) ? data.results : data;
        if (!cancelled) {
          const mapped = (list || []).map(mapAccountToRow);
          setRows(mapped);
        }
      } catch (e) {
        console.error("Failed to load accounts", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------- Outside-click handlers -------- */
  useEffect(() => {
    const onDocDown = (e) => {
      if (dlWrapRef.current && !dlWrapRef.current.contains(e.target)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocDown, true);
    return () => document.removeEventListener("pointerdown", onDocDown, true);
  }, []);

  /* modal + dropdown outside/escape handling */
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setAccGroupOpen(false);
        setEditingId(null);
      }
    };
    const onDown = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setModalOpen(false);
        setAccGroupOpen(false);
        setEditingId(null);
        return;
      }
      if (accGroupWrapRef.current && !accGroupWrapRef.current.contains(e.target)) {
        setAccGroupOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [modalOpen]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, search]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (
        r.accountName +
        " " +
        r.groupName +
        " " +
        r.groupNature +
        " " +
        r.accountType +
        " " +
        r.createdBy +
        " " +
        r.location
      )
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const visible = useMemo(
    () => filtered.slice(start, start + pageSize),
    [filtered, start, pageSize]
  );

  /* ---------- Download helpers ---------- */
  const clickHiddenA = (href, filename) => {
    let a = hiddenARef.current;
    if (!a) {
      a = document.createElement("a");
      a.style.display = "none";
      document.body.appendChild(a);
      hiddenARef.current = a;
    }
    a.href = href;
    a.setAttribute("download", filename);
    a.click();
    try {
      window.open(href, "_blank");
    } catch {}
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    clickHiddenA(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const ensureJsPDF = () =>
    new Promise((resolve, reject) => {
      if (window.jspdf || window.jsPDF)
        return resolve(window.jspdf || window.jsPDF);
      const s = document.createElement("script");
      s.src =
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
      s.async = true;
      s.onload = () => resolve(window.jspdf || window.jsPDF);
      s.onerror = reject;
      document.body.appendChild(s);
    });

  const exportToExcel = () => {
    const headers = [
      "#",
      "Account Name",
      "Group name",
      "Group Nature",
      "Account Type",
      "Created On",
      "Created By",
      "Location",
    ];
    const ro = filtered.map((r) => [
      r.id,
      r.accountName,
      r.groupName,
      r.groupNature,
      r.accountType,
      r.createdOn,
      r.createdBy,
      r.location,
    ]);
    const th = headers
      .map(
        (h) =>
          `<th style="font-weight:bold;border:1px solid #d9dde3;padding:6px 8px;background:#f1f5f9;color:#334155;text-align:left;white-space:nowrap;">${h}</th>`
      )
      .join("");
    const trs = ro
      .map(
        (r) =>
          `<tr>${r
            .map(
              (c) =>
                `<td style="border:1px solid #e5e7eb;padding:6px 8px;white-space:nowrap;">${String(
                  c
                )
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")}</td>`
            )
            .join("")}</tr>`
      )
      .join("");
    const tableHTML = `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
    const xlsHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body>${tableHTML}</body></html>`;
    downloadBlob(
      new Blob([xlsHTML], {
        type: "application/vnd.ms-excel;charset=utf-8",
      }),
      "chart-of-account.xls"
    );
    setDownloadOpen(false);
  };

  const exportToPDF = async () => {
    try {
      await ensureJsPDF();
      const { jsPDF } = window.jspdf || window;
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const marginX = 36,
        marginY = 42,
        lineH = 16;
      let y = marginY;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Chart of Account", marginX, y);
      y += 18;

      const headers = [
        "#",
        "Account Name",
        "Group name",
        "Group Nature",
        "Account Type",
        "Created On",
        "Created By",
        "Location",
      ];
      const widths = [20, 120, 95, 70, 80, 120, 90, 120];
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      let x = marginX;
      headers.forEach((h, i) => {
        doc.text(h, x, y);
        x += widths[i];
      });
      y += lineH;
      doc.setDrawColor(220);
      doc.line(
        marginX,
        y - 12,
        marginX + widths.reduce((a, b) => a + b, 0),
        y - 12
      );

      doc.setFont("helvetica", "normal");
      filtered.forEach((r) => {
        x = marginX;
        const vals = [
          r.id,
          r.accountName,
          r.groupName,
          r.groupNature,
          r.accountType,
          r.createdOn,
          r.createdBy,
          r.location,
        ].map(String);
        if (y > 800) {
          doc.addPage();
          y = marginY + 6;
        }
        vals.forEach((v, i) => {
          const t = v.length > 24 ? v.slice(0, 23) + "…" : v;
          doc.text(t, x, y);
          x += widths[i];
        });
        y += lineH;
      });

      downloadBlob(doc.output("blob"), "chart-of-account.pdf");
      setDownloadOpen(false);
    } catch {
      downloadBlob(
        new Blob(["%PDF-1.4\n"], { type: "application/pdf" }),
        "chart-of-account.pdf"
      );
      setDownloadOpen(false);
    }
  };

  /* ---------- Create / Update handler ---------- */
  const resetModalFields = () => {
    setAccName("");
    setAccGroup("");
    setOpenDr("");
    setOpenCr("");
  };

  const onSaveAccount = async () => {
    if (!accName.trim() || !accGroup.trim() || saving) return;

    const groupNature = deriveNatureFromDropdownText(accGroup);
    const groupName = accGroup.includes("(")
      ? accGroup.split("(")[0].trim()
      : accGroup.trim();

    const payload = {
      name: accName.trim(),
      group_name: groupName,
      account_type: "customers",
      opening_debit: openDr ? Number(openDr) : 0,
      opening_credit: openCr ? Number(openCr) : 0,
      // group_nature will be set in serializer as well, but we can send it:
      group_nature: groupNature,
    };

    try {
      setSaving(true);
      if (editingId) {
        const updated = await updateAccount(editingId, payload);
        const mapped = mapAccountToRow(updated);
        setRows((prev) =>
          prev.map((r) => (r.id === editingId ? mapped : r))
        );
      } else {
        const created = await createAccount(payload);
        const mapped = mapAccountToRow(created);
        setRows((prev) => [mapped, ...prev]);
      }

      resetModalFields();
      setModalOpen(false);
      setAccGroupOpen(false);
      setEditingId(null);
    } catch (e) {
      console.error("Save account failed", e);
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    resetModalFields();
    setEditingId(null);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingId(row.id);
    setAccName(row.accountName);
    setAccGroup(`${row.groupName} (${row.groupNature})`);
    setOpenDr(
      row.openingDebit != null && !Number.isNaN(row.openingDebit)
        ? String(row.openingDebit)
        : ""
    );
    setOpenCr(
      row.openingCredit != null && !Number.isNaN(row.openingCredit)
        ? String(row.openingCredit)
        : ""
    );
    setModalOpen(true);
  };

  const onDeleteRow = async (row) => {
    if (!window.confirm("Delete this account?")) return;
    try {
      setDeletingId(row.id);
      await deleteAccount(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      console.error("Delete account failed", e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="coa-page">
      <a ref={hiddenARef} style={{ display: "none" }} aria-hidden />

      {/* Top bar */}
      <div className="coa-topbar">
        <div className="coa-title">
          <span>Chart of Account</span>
          <span className="material-icons-outlined home-ic" aria-hidden>
            home
          </span>
        </div>

        <button
          type="button"
          className="coa-opening-link"
          onClick={() => navigate("/accounting/opening-balance")}
        >
          Setup Opening Balance
        </button>
      </div>

      <div className="coa-card">
        {/* blue loading spinner overlay */}
        {loading && (
          <div className="coa-loading">
            <div className="coa-spinner" />
          </div>
        )}

        {/* Toolbar */}
        <div className="coa-toolbar">
          <div className="coa-left">
            {/* Download split button */}
            <div className="coa-dl-wrap" ref={dlWrapRef}>
              <button
                className="btn icon solid coa-dl-btn"
                title="Download"
                onClick={() => setDownloadOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={downloadOpen}
                type="button"
              >
                <span className="material-icons-outlined">
                  file_download
                </span>
                <span
                  className="caret material-icons-outlined"
                  aria-hidden
                >
                  expand_more
                </span>
              </button>

              {downloadOpen && (
                <div
                  className="coa-dl-menu"
                  role="menu"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button onClick={exportToExcel} role="menuitem" type="button">
                    <span className="material-icons-outlined">
                      description
                    </span>{" "}
                    Excel
                  </button>
                  <button onClick={exportToPDF} role="menuitem" type="button">
                    <span className="material-icons-outlined">
                      picture_as_pdf
                    </span>{" "}
                    PDF
                  </button>
                </div>
              )}
            </div>

            <select
              className="select"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <div className="search">
              <span className="material-icons-outlined">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search List..."
              />
            </div>
          </div>

          <div className="coa-right">
            <button
              className="btn primary"
              type="button"
              onClick={openCreateModal}
            >
              Create New
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="coa-table">
            <thead>
              <tr>
                <th className="col-n">#</th>
                <th>Account Name</th>
                <th>Group name</th>
                <th>Group Nature</th>
                <th>Account Type</th>
                <th>Created On</th>
                <th>Created By</th>
                <th>Location</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="col-n">{r.id}</td>
                  <td>{r.accountName}</td>
                  <td>{r.groupName}</td>
                  <td>{r.groupNature}</td>
                  <td>{r.accountType}</td>
                  <td>{r.createdOn}</td>
                  <td>{r.createdBy}</td>
                  <td>{r.location}</td>
                  <td className="col-actions">
                    <button
                      className="link-icon"
                      title="Edit"
                      type="button"
                      onClick={() => openEditModal(r)}
                    >
                      <span className="material-icons-outlined">edit</span>
                    </button>
                    <button
                      className="link-icon"
                      title="Delete"
                      type="button"
                      onClick={() => onDeleteRow(r)}
                      disabled={deletingId === r.id}
                    >
                      {deletingId === r.id ? (
                        <span className="mini-spinner" />
                      ) : (
                        <span className="material-icons-outlined">delete</span>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="empty">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pager */}
        <div className="coa-pager">
          <div className="pager-left">
            Showing <strong>{visible.length}</strong> of{" "}
            <strong>{filtered.length}</strong>
          </div>
          <div className="pager-right">
            <button
              className="pg-btn"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              type="button"
            >
              ‹
            </button>

            {Array.from(
              { length: Math.max(1, Math.ceil(filtered.length / pageSize)) },
              (_, i) => i + 1
            )
              .filter((n) => {
                const last = Math.ceil(filtered.length / pageSize);
                if (n === 1 || n === last) return true;
                if (Math.abs(n - pageSafe) <= 1) return true;
                if (pageSafe <= 3 && n <= 4) return true;
                if (pageSafe >= last - 2 && n >= last - 3) return true;
                return false;
              })
              .reduce((acc, n, idx, arr) => {
                if (idx && n - arr[idx - 1] > 1) acc.push("…");
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === "…" ? (
                  <span className="pg-ellipsis" key={`e${i}`}>
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    className={`pg-btn ${n === pageSafe ? "active" : ""}`}
                    onClick={() => setPage(n)}
                    type="button"
                  >
                    {n}
                  </button>
                )
              )}

            <button
              className="pg-btn"
              disabled={pageSafe >= Math.ceil(filtered.length / pageSize)}
              onClick={() =>
                setPage((p) =>
                  Math.min(Math.ceil(filtered.length / pageSize), p + 1)
                )
              }
              aria-label="Next page"
              type="button"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mdl-title"
          >
            <div className="modal-head">
              <h3 id="mdl-title">
                {editingId ? "Edit Account" : "New Account"}
              </h3>
              <button
                className="x"
                onClick={() => {
                  setModalOpen(false);
                  setEditingId(null);
                }}
                aria-label="Close"
                type="button"
              >
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="modal-body">
              <label className="fld">
                <span>
                  Account Name<span className="req">*</span>
                </span>
                <input
                  className="ipt"
                  placeholder="Account Name"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                />
              </label>

              {/* Account Group (anchored dropdown) */}
              <label className="fld select-wrap" ref={accGroupWrapRef}>
                <span>
                  Account Group<span className="req">*</span>
                </span>
                <div className="sel-anchor">
                  <button
                    type="button"
                    className="ipt fake-select"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccGroupOpen((v) => !v);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    aria-haspopup="listbox"
                    aria-expanded={accGroupOpen}
                  >
                    {accGroup || "Account Group"}
                    <span className="material-icons-outlined caret">
                      expand_more
                    </span>
                  </button>

                  {accGroupOpen && (
                    <div
                      className="md-opts"
                      role="listbox"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="opt-hd">Account Group</div>
                      {ACCOUNT_GROUPS.map((g) => (
                        <button
                          key={g}
                          role="option"
                          type="button"
                          className={`opt ${accGroup === g ? "sel" : ""}`}
                          onClick={() => {
                            setAccGroup(g);
                            setAccGroupOpen(false);
                          }}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>

              <div className="row two">
                <label className="fld">
                  <span>Opening Balance</span>
                  <input
                    className="ipt"
                    placeholder="Debit"
                    value={openDr}
                    onChange={(e) =>
                      /^\d*\.?\d*$/.test(e.target.value) &&
                      setOpenDr(e.target.value)
                    }
                  />
                </label>
                <label className="fld">
                  <span className="vis">&nbsp;</span>
                  <input
                    className="ipt"
                    placeholder="Credit"
                    value={openCr}
                    onChange={(e) =>
                      /^\d*\.?\d*$/.test(e.target.value) &&
                      setOpenCr(e.target.value)
                    }
                  />
                </label>
              </div>
            </div>

            <div className="modal-foot">
              <button
                className="btn light"
                onClick={() => {
                  setModalOpen(false);
                  setEditingId(null);
                }}
                type="button"
              >
                Close
              </button>
              <button
                className="btn primary"
                onClick={onSaveAccount}
                disabled={!accName.trim() || !accGroup.trim() || saving}
                type="button"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
