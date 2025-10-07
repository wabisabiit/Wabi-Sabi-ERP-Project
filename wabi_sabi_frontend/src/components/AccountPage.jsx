import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AccountPage.css";

/** ---- Demo data ---- */
const NAMES = [
  "AMIT","Shubhi","DHEERAJ","KUMAR","jai sharma","NIKHIL","JYOTI","KARTIK","MONIKA",
  "SONI SINGH","HEENA","chhavi","NIKHIL","RITU CHOPRA","SNEHA","PRIYANKA","ABHIGYA",
  "Walk in NAMY","RANJIT","ABHI","PALLAVI","MOHD ZAHEER","CHANDER","DHEERENDRA TIWARI",
];
const CREATORS = ["Neeraj Singh","Pallavi","abhi","Chander","Mohd Zaheer","Dhirendra Tiwari"];
const LOCATIONS = [
  "Brands 4 less - IFFCO Chowk","Brands 4 less - M3M Urbana","Brand4Less - Tilak Nagar",
  "Brands 4 less - Ansal Plaza","Brands 4 less - Rajouri Garden Outside",
  "Brands 4 less - Rajouri Garden Inside","Brands loot - Krishna Nagar",
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
  "Income (Income)"
];

function makeRows(count = 120) {
  const rows = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const dt = new Date(base.getTime() - (i + 1) * 37 * 60 * 1000);
    rows.push({
      id: i + 1,
      accountName: NAMES[i % NAMES.length],
      groupName: "Sundry Debtors",
      groupNature: "Assets",
      accountType: "customers",
      createdOn: dt.toLocaleString("en-IN", { hour12: true }),
      createdBy: CREATORS[i % CREATORS.length],
      location: LOCATIONS[i % LOCATIONS.length],
    });
  }
  return rows;
}

const PAGE_SIZES = [15, 20, 50, 100, 200, 500, 1000];

export default function AccountPage() {
  const [rows, setRows] = useState(() => makeRows());
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(15);
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

  /* Custom Account Group dropdown */
  const [accGroupOpen, setAccGroupOpen] = useState(false);
  const accGroupWrapRef = useRef(null);

  /* Router */
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setAccGroupOpen(false);
      }
    };
    const onDown = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setModalOpen(false);
        setAccGroupOpen(false);
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

  useEffect(() => { setPage(1); }, [pageSize, search]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (r.accountName + " " + r.groupName + " " + r.groupNature + " " + r.accountType + " " + r.createdBy + " " + r.location)
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * pageSize;
  const visible = useMemo(() => filtered.slice(start, start + pageSize), [filtered, start, pageSize]);

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
    try { window.open(href, "_blank"); } catch {}
  };

  const downloadBlob = (blob, filename) => {
    if (window.navigator && "msSaveOrOpenBlob" in window.navigator) {
      // @ts-ignore
      window.navigator.msSaveOrOpenBlob(blob, filename);
      return;
    }
    const url = URL.createObjectURL(blob);
    clickHiddenA(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const exportToExcel = () => {
    const headers = ["#", "Account Name", "Group name", "Group Nature", "Account Type", "Created On", "Created By", "Location"];
    const ro = filtered.map(r => [r.id, r.accountName, r.groupName, r.groupNature, r.accountType, r.createdOn, r.createdBy, r.location]);
    const th = headers.map(h => `<th style="font-weight:bold;border:1px solid #d9dde3;padding:6px 8px;background:#f1f5f9;color:#334155;text-align:left;white-space:nowrap;">${h}</th>`).join("");
    const trs = ro.map(r => `<tr>${r.map(c => `<td style="border:1px solid #e5e7eb;padding:6px 8px;white-space:nowrap;">${String(c).replace(/&/g,"&amp;").replace(/</g,"&lt;")}</td>`).join("")}</tr>`).join("");
    const tableHTML = `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
    const xlsHTML = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8" /></head><body>${tableHTML}</body></html>`;
    downloadBlob(new Blob([xlsHTML], { type: "application/vnd.ms-excel;charset=utf-8" }), "chart-of-account.xls");
    setDownloadOpen(false);
  };

  const ensureJsPDF = () =>
    new Promise((resolve, reject) => {
      if (window.jspdf || window.jsPDF) return resolve(window.jspdf || window.jsPDF);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
      s.async = true;
      s.onload = () => resolve(window.jspdf || window.jsPDF);
      s.onerror = reject;
      document.body.appendChild(s);
    });

  const exportToPDF = async () => {
    try {
      await ensureJsPDF();
      const { jsPDF } = window.jspdf || window;
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const marginX = 36, marginY = 40, lineH = 16;
      let y = marginY;

      doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text("Chart of Account", marginX, y); y += 18;

      const headers = ["#", "Account Name", "Group name", "Group Nature", "Account Type", "Created On", "Created By", "Location"];
      const widths  = [20, 110, 90, 70, 80, 110, 90, 120];
      doc.setFontSize(10); doc.setFont("helvetica","bold");
      let x = marginX; headers.forEach((h,i)=>{ doc.text(h,x,y); x+=widths[i]; });
      y += lineH; doc.setDrawColor(220); doc.line(marginX, y-12, marginX + widths.reduce((a,b)=>a+b,0), y-12);

      doc.setFont("helvetica","normal");
      filtered.forEach(r=>{
        x=marginX;
        const vals=[r.id,r.accountName,r.groupName,r.groupNature,r.accountType,r.createdOn,r.createdBy,r.location].map(String);
        if (y > 790) { doc.addPage(); y = marginY; }
        vals.forEach((v,i)=>{ const t=v.length>28? v.slice(0,27)+"…":v; doc.text(t,x,y); x+=widths[i]; });
        y+=lineH;
      });

      const blob = doc.output("blob");
      downloadBlob(blob, "chart-of-account.pdf");
      setDownloadOpen(false);
    } catch {
      const base64 = "JVBERi0xLjQKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlIC9QYWdlIC9NZWRpYUJveCBbMCAwIDU5NSA4NDJdIC9QYXJlbnQgMiAwIFIgL1Jlc291cmNlcyA8PC9Gb250IDw8Pj4+PiA+PiA+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDk2IDAwMDAwIG4gCjAwMDAwMDAxNzQgMDAwMDAgbiAKMDAwMDAwMDI4MyAwMDAwMCBuIAp0cmFpbGVyCjw8L1Jvb3QgMSAwIFIgL1NpemUgND4+CnN0YXJ0eHJlZgoKJSVlbyoKZW5kc3RyZWFtCmVuZG9mCmVuZGZpbg==".replace(/\s+/g,"");
      const bin = atob(base64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      downloadBlob(new Blob([bytes], { type: "application/pdf" }), "chart-of-account.pdf");
      setDownloadOpen(false);
    }
  };

  const onSaveAccount = () => {
    if (!accName.trim() || !accGroup.trim()) return;
    const now = new Date();
    const newRow = {
      id: rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1,
      accountName: accName.trim(),
      groupName: accGroup.includes("(") ? accGroup.split("(")[0].trim() : accGroup,
      groupNature: accGroup.includes("(Assets)") ? "Assets"
                  : accGroup.includes("(Liabilities)") ? "Liabilities"
                  : accGroup.includes("(Expenses)") ? "Expenses"
                  : accGroup.includes("(Income)") ? "Income" : "",
      accountType: "customers",
      createdOn: now.toLocaleString("en-IN", { hour12: true }),
      createdBy: "Neeraj Singh",
      location: LOCATIONS[0],
      openingDebit: openDr ? Number(openDr) : 0,
      openingCredit: openCr ? Number(openCr) : 0,
    };
    setRows([newRow, ...rows]);
    setAccName(""); setAccGroup(""); setOpenDr(""); setOpenCr("");
    setModalOpen(false); setAccGroupOpen(false);
  };

  return (
    <div className="coa-page">
      <a ref={hiddenARef} style={{ display: "none" }} aria-hidden />

      <div className="coa-topbar">
        <div className="coa-title">
          <span>Chart of Account</span>
          <span className="material-icons-outlined home-ic" aria-hidden>home</span>
        </div>

        {/* Navigate to Opening Balance page with sidebar */}
        <button
          type="button"
          className="coa-opening-link"
          onClick={() => navigate("/accounting/opening-balance")}
        >
          Setup Opening Balance
        </button>
      </div>

      <div className="coa-card">
        <div className="coa-toolbar">
          <div className="coa-left">
            <div className="dl-wrap" ref={dlWrapRef}>
              <button
                className="btn icon solid"
                title="Download"
                onClick={() => setDownloadOpen(v => !v)}
                aria-haspopup="menu"
                aria-expanded={downloadOpen}
                type="button"
              >
                <span className="material-icons-outlined">download</span>
              </button>

              {downloadOpen && (
                <div className="menu" role="menu" onMouseDown={(e)=>e.stopPropagation()}>
                  <button onClick={exportToExcel} role="menuitem" type="button">
                    <span className="material-icons-outlined">grid_on</span> Excel
                  </button>
                  <button onClick={exportToPDF} role="menuitem" type="button">
                    <span className="material-icons-outlined">picture_as_pdf</span> PDF
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
                <option key={n} value={n}>{n}</option>
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
            <button className="btn primary" type="button" onClick={() => setModalOpen(true)}>
              Create New
            </button>
          </div>
        </div>

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
                    <button className="link-icon" title="Edit" type="button">
                      <span className="material-icons-outlined">edit</span>
                    </button>
                    <button className="link-icon" title="Delete" type="button">
                      <span className="material-icons-outlined">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={9} className="empty">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="coa-pager">
          <div className="pager-left">
            Showing <strong>{visible.length}</strong> of <strong>{filtered.length}</strong>
          </div>
          <div className="pager-right">
            <button
              className="pg-btn"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              type="button"
            >‹</button>

            {Array.from({ length: Math.max(1, Math.ceil(filtered.length / pageSize)) }, (_, i) => i + 1)
              .filter(n => {
                if (n === 1 || n === Math.ceil(filtered.length / pageSize)) return true;
                if (Math.abs(n - pageSafe) <= 1) return true;
                if (pageSafe <= 3 && n <= 4) return true;
                if (pageSafe >= Math.ceil(filtered.length / pageSize) - 2 && n >= Math.ceil(filtered.length / pageSize) - 3) return true;
                return false;
              })
              .reduce((acc, n, idx, arr) => {
                if (idx && n - arr[idx - 1] > 1) acc.push("…");
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === "…" ? (
                  <span className="pg-ellipsis" key={`e${i}`}>…</span>
                ) : (
                  <button
                    key={n}
                    className={`pg-btn ${n === pageSafe ? "active" : ""}`}
                    onClick={() => setPage(n)}
                    type="button"
                  >{n}</button>
                )
              )}

            <button
              className="pg-btn"
              disabled={pageSafe >= Math.ceil(filtered.length / pageSize)}
              onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / pageSize), p + 1))}
              aria-label="Next page"
              type="button"
            >›</button>
          </div>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="mdl-title">
            <div className="modal-head">
              <h3 id="mdl-title">New Account</h3>
              <button className="x" onClick={() => setModalOpen(false)} aria-label="Close" type="button">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>

            <div className="modal-body">
              <label className="fld">
                <span>Account Name<span className="req">*</span></span>
                <input
                  className="ipt"
                  placeholder="Account Name"
                  value={accName}
                  onChange={(e)=>setAccName(e.target.value)}
                />
              </label>

              {/* —— Account Group (anchored dropdown) —— */}
              <label className="fld select-wrap" ref={accGroupWrapRef}>
                <span>Account Group<span className="req">*</span></span>

                {/* anchor wrapper so menu positions under the input */}
                <div className="sel-anchor">
                  <button
                    type="button"
                    className="ipt fake-select"
                    onClick={(e) => { e.stopPropagation(); setAccGroupOpen(v => !v); }}
                    onMouseDown={(e)=>e.stopPropagation()}
                    aria-haspopup="listbox"
                    aria-expanded={accGroupOpen}
                  >
                    {accGroup || "Account Group"}
                    <span className="material-icons-outlined caret">expand_more</span>
                  </button>

                  {accGroupOpen && (
                    <div className="md-opts" role="listbox" onMouseDown={(e)=>e.stopPropagation()}>
                      <div className="opt-hd">Account Group</div>
                      {ACCOUNT_GROUPS.map((g) => (
                        <button
                          key={g}
                          role="option"
                          type="button"
                          className={`opt ${accGroup === g ? "sel" : ""}`}
                          onClick={() => { setAccGroup(g); setAccGroupOpen(false); }}
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
                    onChange={(e)=>/^\d*\.?\d*$/.test(e.target.value) && setOpenDr(e.target.value)}
                  />
                </label>
                <label className="fld">
                  <span className="vis">&nbsp;</span>
                  <input
                    className="ipt"
                    placeholder="Credit"
                    value={openCr}
                    onChange={(e)=>/^\d*\.?\d*$/.test(e.target.value) && setOpenCr(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn light" onClick={()=>setModalOpen(false)} type="button">Close</button>
              <button
                className="btn primary"
                onClick={onSaveAccount}
                disabled={!accName.trim() || !accGroup.trim()}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
