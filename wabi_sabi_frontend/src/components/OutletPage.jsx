import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/OutletPage.css";

/* ----- demo data ----- */
const OUTLETS = [
  { id: 1, type: "Branch", name: "Brands 4 Less – Ansal Plaza", contactName: "Brands 4 Less – Ansal Plaza", contactNo: "+91-8688944560", year: "2025–2026", month: "April - March" },
  { id: 2, type: "Branch", name: "Brands 4 Less – M3M Urbana", contactName: "Brands 4 Less – M3M Urbana", contactNo: "+91-7333024520", year: "2025–2026", month: "April - March" },
  { id: 3, type: "Branch", name: "Brands 4 Less – Tilak Nagar", contactName: "Brands4Less – Tilak Nagar", contactNo: "+91-9998883461", year: "2025–2026", month: "April - March" },
  { id: 4, type: "Branch", name: "Brands 4 Less – Rajouri Garden Outside", contactName: "Brands4Less – Rajouri Garden Outside", contactNo: "+91-7017402732", year: "2025–2026", month: "April - March" },
  { id: 5, type: "Branch", name: "Brands Loot – Udyog Vihar", contactName: "Brands Loot – Udyog Vihar", contactNo: "+91-7303467670", year: "2025–2026", month: "April - March" },
  { id: 6, type: "Branch", name: "Brands 4 Less – IFFCO Chowk", contactName: "Brands4Less – IFFCO Chowk", contactNo: "+91-9998886067", year: "2025–2026", month: "April - March" },
  { id: 7, type: "Branch", name: "Brands4Less – Krishna Nagar", contactName: "Brands4Less – Krishna Nagar", contactNo: "+91-7303479020", year: "2025–2026", month: "April - March" },
  { id: 8, type: "Branch", name: "Brands 4 Less – Rajouri Garden Inside", contactName: "Brands4Less – Rajouri Garden Inside", contactNo: "+91-7307387070", year: "2025–2026", month: "April - March" },
];

export default function OutletPage() {
  const [pageSize, setPageSize] = useState(15);
  const [query, setQuery] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return OUTLETS;
    return OUTLETS.filter((r) =>
      [r.type, r.name, r.contactName, r.contactNo, r.year, r.month]
        .some(v => String(v || "").toLowerCase().includes(q))
    );
  }, [query]);

  const showingFrom = filtered.length ? 1 : 0;
  const showingTo = Math.min(filtered.length, pageSize);

  useEffect(() => {
    const onDoc = (e) => exportRef.current && !exportRef.current.contains(e.target) && setExportOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const headers = ["#", "Outlet Type", "Name", "Contact Name", "Contact No", "Year Interval", "Month Interval"];
  const getRows = () =>
    filtered.slice(0, pageSize).map(r => [
      r.id, r.type, `${r.name} %`, r.contactName, r.contactNo, r.year, r.month
    ]);

  const download = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const rows = getRows();
    const th = headers.map(h => `<th style="font-weight:600;border:1px solid #d9dee6;text-align:left;padding:6px 8px;background:#f5f7fb;">${h}</th>`).join("");
    const tr = rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #d9dee6;padding:6px 8px;">${String(c ?? "")}</td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"></head>
      <body><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></body></html>`;
    download(new Blob([html], { type: "application/vnd.ms-excel" }), "outlets.xls");
    setExportOpen(false);
  };

  const pdfEscape = (s = "") => String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const exportPDF = () => {
    const rows = getRows();
    const lines = [headers.join("  |  "), ...rows.map(r => r.join("  |  "))];

    let pdf = `%PDF-1.4\n`;
    const offs = [];
    const add = (s) => { offs.push(pdf.length); pdf += s; };

    let stream = "BT /F1 10 Tf 36 806 Td 14 TL\n(Outlets Export) Tj T* \n0 -8 Td 0 g 0.5 w 543 0 m S 0 0 Td 0 g 1 w\n";
    lines.forEach(line => { stream += `(${pdfEscape(line)}) Tj T* \n`; });
    stream += "ET\n";

    add(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
    add(`2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n`);
    add(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`);
    add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
    add(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n`);

    const xref = pdf.length;
    const pad = (n) => String(n).padStart(10, "0");
    pdf += `xref\n0 6\n0000000000 65535 f \n`;
    offs.forEach(o => { pdf += `${pad(o)} 00000 n \n`; });
    pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

    download(new Blob([pdf]), "outlets.pdf");
    setExportOpen(false);
  };

  return (
    <div className="out-wrap">
      <div className="out-pagebar">
        <h1>Outlet</h1>
        <span className="material-icons home-ico">home</span>
      </div>

      <div className="out-card">
        {/* Toolbar */}
        <div className="out-toolbar">
          <div className="flex-spacer" />
          <div className="out-export" ref={exportRef}>
            <button className="btn-export" onClick={() => setExportOpen(v => !v)}>
              <span className="material-icons">file_download</span>
              <span className="material-icons">arrow_drop_down</span>
            </button>
            {exportOpen && (
              <div className="out-export-pop" role="menu">
                <button className="out-export-item" onClick={exportExcel}>Excel</button>
                <button className="out-export-item" onClick={exportPDF}>PDF</button>
              </div>
            )}
          </div>
          <select className="out-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} title="Rows per page">
            {[10, 100, 200, 500, 1000].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <div className="out-search">
            <span className="material-icons">search</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search List..." />
          </div>
          <button className="btn primary" onClick={() => navigate("/admin/outlet/new")}>Create New</button>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="out-table">
            <thead>
              <tr>
                <th className="col-sr"><span>#</span></th>
                <th className="col-type th-sort"><span>Outlet Type</span></th>
                <th className="col-name th-sort"><span>Name</span></th>
                <th className="col-cname th-sort"><span>Contact Name</span></th>
                <th className="col-cno th-sort"><span>Contact No</span></th>
                <th className="col-year th-sort"><span>Year Interval</span></th>
                <th className="col-month th-sort"><span>Month Interval</span></th>
                <th className="col-actions th-sort"><span>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, pageSize).map(r => (
                <tr key={r.id}>
                  <td className="col-sr">{r.id}</td>
                  <td className="col-type">{r.type}</td>
                  <td className="col-name">
                    <span className="name-with-perc">
                      <a href="#!" className="out-link">{r.name}</a>
                      {/* <span className="name-perc">%</span> */}
                    </span>
                  </td>
                  <td className="col-cname">
                    <a href="#!" className="out-link">{r.contactName}</a>
                  </td>
                  <td className="col-cno">{r.contactNo}</td>
                  <td className="col-year">{r.year}</td>
                  <td className="col-month">{r.month}</td>
                  <td className="col-actions">
                    <button className="ico ico-round" title="Open" aria-label="Open">
                      <span className="material-icons">open_in_new</span>
                    </button>
                    <button className="ico ico-round" title="Edit" aria-label="Edit">
                      <span className="material-icons-outlined">edit</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-row">No outlets found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / pager */}
        <div className="out-foot">
          <div className="foot-left">
            {`Showing ${showingFrom} to ${showingTo} of ${filtered.length} entries`}
          </div>
          <div className="foot-right">
            <button className="page arrow" type="button"><span className="material-icons">chevron_left</span></button>
            <button className="page current" type="button">1</button>
            <button className="page arrow" type="button"><span className="material-icons">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
