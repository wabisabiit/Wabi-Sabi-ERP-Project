import React, { useMemo, useState, useRef, useEffect } from "react";
import "../styles/TaxWiseSalesSummary.css";

/* ---------- Demo locations ---------- */
const LOCATIONS = [
  "WABI SABI SUSTAINABILITY",
  "Brands 4 less – Ansal Plaza",
  "Brands 4 less – Rajouri Garden",
  "Brand4Less – Tilak Nagar",
  "Brands 4 less – M3M Urbana",
  "Brands 4 less – IFFCO Chowk",
  "Brands Loot – Udyog Vihar",
  "Brands loot – Krishna Nagar",
];

/* ---------- Helpers ---------- */
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const l = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", l);
    document.addEventListener("touchstart", l);
    return () => {
      document.removeEventListener("mousedown", l);
      document.removeEventListener("touchstart", l);
    };
  }, [ref, handler]);
}

export default function TaxWiseSalesSummary() {
  /* UI state */
  const [fromDate, setFromDate] = useState("2025-04-01");
  const [toDate, setToDate] = useState("2026-03-31");

  const [locOpen, setLocOpen] = useState(false);
  const [locQuery, setLocQuery] = useState("");
  const [selectedLocs, setSelectedLocs] = useState([]);
  const popRef = useRef(null);
  useOnClickOutside(popRef, () => setLocOpen(false));

  const [showTable, setShowTable] = useState(false);

  /* Filtered list in the popover search */
  const filteredLocs = useMemo(() => {
    const q = locQuery.trim().toLowerCase();
    if (!q) return LOCATIONS;
    return LOCATIONS.filter((l) => l.toLowerCase().includes(q));
  }, [locQuery]);

  const allChecked = selectedLocs.length === LOCATIONS.length;

  const toggleAll = () => {
    setSelectedLocs((prev) => (prev.length === LOCATIONS.length ? [] : [...LOCATIONS]));
  };

  const toggleOne = (l) => {
    setSelectedLocs((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  };

  /* Downloads: empty files by spec */
  const handlePdf = () => {
    const blob = new Blob([], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "TaxWiseSalesSummary.pdf";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExcel = () => {
    const blob = new Blob([], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "TaxWiseSalesSummary.xlsx";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /* Demo data for the grid (appears only after Search) */
  const rows = useMemo(() => {
    if (!showTable) return [];
    // Keeps the structure similar to your screenshot
    const mk = (r) => ({
      date: r.date,
      tag: r.tag, // "Other" / "Total" or blank
      nonTax: r.nonTax ?? "0.00",
      tx5: r.tx5 ?? "0.00",
      sgst25: r.sgst25 ?? "0.00",
      cgst25: r.cgst25 ?? "0.00",
      igst5: r.igst5 ?? "0.00",
      tx12: r.tx12 ?? "0.00",
      sgst6: r.sgst6 ?? "0.00",
      cgst6: r.cgst6 ?? "0.00",
      igst12: r.igst12 ?? "0.00",
      tx18: r.tx18 ?? "0.00",
      sgst9: r.sgst9 ?? "0.00",
      cgst9: r.cgst9 ?? "0.00",
      igst18: r.igst18 ?? "0.00",
    });

    return [
      mk({ date: "01/07/2025" }),
      mk({ date: "", tag: "Other", tx5: "107,352.74", igst5: "5,367.65" }),
      mk({ date: "", tag: "Total", tx5: "107,352.74", igst5: "5,367.65" }),

      mk({ date: "01/08/2025" }),
      mk({ date: "", tag: "Other", tx5: "425,428.88", igst5: "21,271.45", tx12: "90,714.28" }),
      mk({ date: "", tag: "Total", tx5: "425,428.88", igst5: "21,271.45", tx12: "90,714.28" }),

      mk({ date: "01/10/2025" }),
      mk({
        date: "",
        tag: "Other",
        nonTax: "0.00",
        tx5: "163,771.20",
        igst5: "8,188.56",
        tx12: "37,964.00",
        sgst6: "0.00",
        cgst6: "0.00",
        igst12: "4,555.68",
      }),
      mk({
        date: "",
        tag: "Total",
        nonTax: "0.00",
        tx5: "163,771.20",
        igst5: "8,188.56",
        tx12: "37,964.00",
        igst12: "4,555.68",
      }),
    ];
  }, [showTable]);

  return (
    <div className="tws-wrap">
      {/* Title + breadcrumb */}
      <div className="tws-top">
        <div className="tws-title">Tax wise Sales Summary</div>
        <div className="tws-crumb">
          <span className="material-icons-outlined tws-home" aria-hidden="true">home</span>
          <span className="tws-crumb-dash">-</span>
          <span className="tws-crumb-muted">Report</span>
        </div>
      </div>

      {/* Filter card */}
      <div className="tws-card tws-toolbar">
        {/* Location */}
        <div className="tws-field tws-field-loc">
          <label className="tws-label">Select Location</label>

          <button
            type="button"
            className="tws-select"
            onClick={() => setLocOpen((s) => !s)}
            aria-haspopup="listbox"
            aria-expanded={locOpen}
          >
            <span className="tws-select-text">
              {selectedLocs.length ? "Select Location" : "Select Location"}
            </span>

            {/* Count badge */}
            <span className={`tws-badge ${selectedLocs.length ? "show" : ""}`}>
              {selectedLocs.length || 0}
            </span>

            {/* Clear (X) */}
            <span
              className={`material-icons-outlined tws-clear ${selectedLocs.length ? "show" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLocs([]);
              }}
              title="Clear selection"
            >
              close
            </span>
          </button>

          {locOpen && (
            <div className="tws-popover" ref={popRef} onClick={(e) => e.stopPropagation()}>
              <div className="tws-pop-search">
                <span className="material-icons-outlined">search</span>
                <input
                  value={locQuery}
                  onChange={(e) => setLocQuery(e.target.value)}
                  placeholder="Search..."
                />
              </div>

              <div className="tws-checks">
                <label className="tws-check">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  <span>All</span>
                </label>

                {filteredLocs.map((l) => (
                  <label key={l} className="tws-check">
                    <input
                      type="checkbox"
                      checked={selectedLocs.includes(l)}
                      onChange={() => toggleOne(l)}
                    />
                    <span>{l}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* From Date */}
        <div className="tws-field">
          <label className="tws-label">From Date</label>
          <div className="tws-input with-icon">
            <input
              type="text"
              value={formatDisplayDate(fromDate)}
              onChange={() => {}}
              readOnly
            />
            <span className="material-icons-outlined">calendar_month</span>
            {/* Native date input layered, but hidden visually for consistent look */}
            <input
              className="tws-native-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="From date"
            />
          </div>
        </div>

        {/* To Date */}
        <div className="tws-field">
          <label className="tws-label">To Date</label>
          <div className="tws-input with-icon">
            <input
              type="text"
              value={formatDisplayDate(toDate)}
              onChange={() => {}}
              readOnly
            />
            <span className="material-icons-outlined">calendar_month</span>
            <input
              className="tws-native-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="tws-actions">
          <button className="tws-btn primary" type="button" onClick={() => setShowTable(true)}>
            Search
          </button>
          <button className="tws-btn teal" type="button" onClick={handlePdf}>
            PDF
          </button>
          <button className="tws-btn amber" type="button" onClick={handleExcel}>
            Excel
          </button>
        </div>
      </div>

      {/* Results surface */}
      <div className="tws-card tws-result">
        {!showTable ? (
          <div className="tws-placeholder">Run a search to view results.</div>
        ) : (
          <div className="tws-table-scroll">
            <table className="tws-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Non Taxable</th>
                  <th>Taxable @5%</th>
                  <th>SGST @ 2.5%</th>
                  <th>CGST @ 2.5%</th>
                  <th>IGST @ 5%</th>
                  <th>Taxable @ 12%</th>
                  <th>SGST @ 6%</th>
                  <th>CGST @ 6%</th>
                  <th>IGST @ 12%</th>
                  <th>Taxable @ 18%</th>
                  <th>SGST @ 9%</th>
                  <th>CGST @ 9%</th>
                  <th>IGST @ 18%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="tws-col-date">
                      {r.date}
                      {r.tag ? <div className="tws-subtag">{r.tag}</div> : null}
                    </td>
                    <td className="tws-num">{r.nonTax}</td>
                    <td className="tws-num">{r.tx5}</td>
                    <td className="tws-num">{r.sgst25}</td>
                    <td className="tws-num">{r.cgst25}</td>
                    <td className="tws-num">{r.igst5}</td>
                    <td className="tws-num">{r.tx12}</td>
                    <td className="tws-num">{r.sgst6}</td>
                    <td className="tws-num">{r.cgst6}</td>
                    <td className="tws-num">{r.igst12}</td>
                    <td className="tws-num">{r.tx18}</td>
                    <td className="tws-num">{r.sgst9}</td>
                    <td className="tws-num">{r.cgst9}</td>
                    <td className="tws-num">{r.igst18}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Small util to display dd/mm/yyyy like the screenshot ---------- */
function formatDisplayDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
