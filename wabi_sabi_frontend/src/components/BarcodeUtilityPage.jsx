import React, { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import "../styles/BarcodeUtilityPage.css";

const MOCK_PRODUCTS = [
  { code: "AS123465", name: "Lenova LCD", brand: "B4L", category: "Electronics", mrp: 3500, price: 3200, batchNo: "B001", packDate: "01/09/2025" },
  { code: "AS999111", name: "HP Keyboard", brand: "B4L", category: "Electronics", mrp: 899,  price: 799,  batchNo: "B002", packDate: "02/09/2025" },
  { code: "AS222333", name: "Mi Power Bank 10k", brand: "B4L", category: "Electronics", mrp: 1499, price: 1299, batchNo: "B003", packDate: "03/09/2025" },
  { code: "AS444555", name: "LG LED 32\"", brand: "B4L", category: "Electronics", mrp: 14990, price: 13990, batchNo: "B004", packDate: "04/09/2025" },
  { code: "AS777888", name: "Boat Earbuds Airdopes", brand: "B4L", category: "Accessories", mrp: 2499, price: 1999, batchNo: "B005", packDate: "05/09/2025" },
];

export default function BarcodeUtilityPage() {
  // top filters
  const [source, setSource] = useState("Product");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [clearForm, setClearForm] = useState(false);
  const [focusOn, setFocusOn] = useState("Physical Qty");

  const [printType, setPrintType] = useState("");
  const [showDateFormat, setShowDateFormat] = useState(false);
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [barcodeSize, setBarcodeSize] = useState("");

  // search
  const [search, setSearch] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // table rows
  const [rows, setRows] = useState([]); // {code,name,qty,batchNo,packDate,mrp,price,checked}
  const [selectAll, setSelectAll] = useState(false);

  // preview
  const [previewTitle, setPreviewTitle] = useState("Lenova LCD");
  const [previewMrp, setPreviewMrp] = useState("3500.0");
  const [previewCode, setPreviewCode] = useState("AS123465");
  const svgRef = useRef(null);
  const [err, setErr] = useState("");

  // ===== barcode render =====
  useEffect(() => {
    if (!svgRef.current) return;
    try {
      while (svgRef.current.firstChild) svgRef.current.removeChild(svgRef.current.firstChild);
      JsBarcode(svgRef.current, previewCode || " ", {
        format: "CODE128",
        height: 50,
        width: 2,
        margin: 6,
        displayValue: false,
        background: "#ffffff",
        lineColor: "#000000",
      });
      setErr("");
    } catch (e) {
      console.error(e);
      setErr("Barcode render failed. Is 'jsbarcode' installed?");
    }
  }, [previewCode]);

  // ===== product search (filter + debounce) =====
  const filtered = useMemo(() => {
    const term = (search || "").trim().toLowerCase();
    return MOCK_PRODUCTS.filter(p => {
      if (brand && p.brand !== brand) return false;
      if (category && p.category !== category) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term)
      );
    }).slice(0, 8);
  }, [search, brand, category]);

  useEffect(() => {
    if (!search) { setSuggestOpen(false); setActiveIndex(-1); return; }
    const t = setTimeout(() => setSuggestOpen(true), 120);
    return () => clearTimeout(t);
  }, [search]);

  const addOrBumpRow = (p) => {
    setRows(prev => {
      const ix = prev.findIndex(r => r.code === p.code);
      if (ix >= 0) {
        const next = [...prev];
        next[ix] = { ...next[ix], qty: next[ix].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          code: p.code,
          name: p.name,
          qty: 1,
          batchNo: p.batchNo ?? "",
          packDate: p.packDate ?? "",
          mrp: p.mrp ?? 0,
          price: p.price ?? 0,
          checked: false,
        },
      ];
    });

    // preview update
    setPreviewTitle(p.name);
    setPreviewMrp(String(p.mrp ?? ""));
    setPreviewCode(p.code);

    // UX focus preference
    if (focusOn === "Scan/Search") {
      // keep cursor in search
      requestAnimationFrame(() => document.getElementById("bu-search")?.focus());
    }
  };

  const handlePick = (p) => {
    addOrBumpRow(p);
    setSuggestOpen(false);
    setSearch("");
    if (clearForm) {
      setBrand(""); setCategory("");
      setPrintType(""); setBarcodeSize("");
      setShowDateFormat(false); setDateFormat("DD/MM/YYYY");
    }
  };

  const handleSearchKey = (e) => {
    if (!suggestOpen) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[activeIndex >= 0 ? activeIndex : 0];
      pick && handlePick(pick);
    } else if (e.key === "Escape") {
      setSuggestOpen(false);
    }
  };

  // ===== table helpers =====
  const toggleAll = (checked) => {
    setSelectAll(checked);
    setRows(prev => prev.map(r => ({ ...r, checked })));
  };
  const toggleRow = (code, checked) => {
    setRows(prev => prev.map(r => (r.code === code ? { ...r, checked } : r)));
    setSelectAll(false);
  };
  const changeQty = (code, qty) => {
    const q = Math.max(0, Number(qty) || 0);
    setRows(prev => prev.map(r => (r.code === code ? { ...r, qty: q } : r)));
  };
  const changePackDate = (code, val) => {
    setRows(prev => prev.map(r => (r.code === code ? { ...r, packDate: val } : r)));
  };

  // ===== actions =====
  const handleClearAll = () => {
    setRows([]);
    setSelectAll(false);
    setSource("Product"); setCategory(""); setBrand("");
    setClearForm(false); setSearch(""); setFocusOn("Physical Qty");
    setPrintType(""); setShowDateFormat(false); setDateFormat("DD/MM/YYYY");
    setBarcodeSize("");
    setPreviewTitle("Lenova LCD"); setPreviewMrp("3500.0"); setPreviewCode("AS123465");
  };

  const ensureRequired = () => {
    const miss = [];
    if (!printType) miss.push("Print Type");
    if (!barcodeSize) miss.push("Barcode Size");
    if (showDateFormat && !dateFormat) miss.push("Date Format");
    if (miss.length) {
      alert(`Please select: ${miss.join(", ")}`);
      return false;
    }
    return true;
  };

  const handleGenerate = () => {
    if (!ensureRequired()) return;
    const selected = rows.filter(r => r.checked);
    const used = selected.length ? selected : rows;
    if (!used.length) { alert("Add at least one product."); return; }
    alert(`OK. Ready to generate ${used.length} barcode${used.length>1?"s":""}.`);
  };

  const download = (filename, text, mime="text/csv;charset=utf-8") => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const used = rows.length ? rows : [];
    const head = ["Item Code","Product Name","Qty","Batch No.","Packing Date","MRP","Selling Price"];
    const lines = used.map(r => [r.code,r.name,r.qty,r.batchNo,r.packDate,r.mrp,r.price]
      .map(v => `"${String(v??"").replace(/"/g,'""')}"`).join(","));
    download("barcode_items.csv", head.join(",") + "\n" + lines.join("\n"));
  };

  const exportExcel = () => {
    // simple: Excel-friendly CSV with .xls extension
    const used = rows.length ? rows : [];
    const head = ["Item Code","Product Name","Qty","Batch No.","Packing Date","MRP","Selling Price"];
    const lines = used.map(r => [r.code,r.name,r.qty,r.batchNo,r.packDate,r.mrp,r.price]
      .map(String).join("\t"));
    download("barcode_items.xls", head.join("\t") + "\n" + lines.join("\n"), "application/vnd.ms-excel");
  };

  const sendToVlabel = () => {
    if (!ensureRequired()) return;
    alert("Queued for Vlabel (demo). Hook this to your actual API.");
  };

  return (
    <div className="bu-wrap">
      <div className="bu-container">
        <div className="bu-title-row">
          <h2>Common Barcode Printing</h2>
          <span className="bu-home" aria-label="home">🏠</span>
        </div>

        <div className="bu-card">
          <div className="bu-left">
            {/* Row 1 */}
            <div className="bu-row">
              <div className="bu-field">
                <label>Barcode Generate From</label>
                <select value={source} onChange={e=>setSource(e.target.value)}>
                  <option>Product</option>
                  <option>Purchase</option>
                  <option>Stock Transfer</option>
                  <option>Material Creation</option>
                </select>
              </div>

              <div className="bu-field">
                <label>Category <span className="bu-muted">(Category &amp; Subcategory Selection)</span></label>
                <select value={category} onChange={e=>setCategory(e.target.value)} />
              </div>

              <div className="bu-field">
                <label>Brand <span className="bu-muted">(Brand &amp; Subbrand Selection)</span></label>
                <div className="bu-brand-row">
                  <select value={brand} onChange={e=>setBrand(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="B4L">B4L</option>
                  </select>
                  <button className="bu-apply" onClick={()=>{ /* kept for parity */ }}>Apply</button>
                </div>
              </div>

              <div className="bu-field">
                <label>Print Type<span className="bu-req">*</span></label>
                <select value={printType} onChange={e=>setPrintType(e.target.value)}>
                  <option value="">Select Print Type</option>
                  <option value="1UPS">1 UPS</option>
                  <option value="2UPS">2 UPS</option>
                  <option value="3UPS">3 UPS</option>
                  <option value="4UPS">4 UPS</option>
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                </select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="bu-row">
              <div className="bu-field bu-inline">
                <label className="bu-checkbox">
                  <input type="checkbox" checked={clearForm} onChange={e=>setClearForm(e.target.checked)} />
                  <span>Clear Form</span>
                </label>
              </div>

              <div className="bu-field bu-grow bu-searchwrap">
                <input
                  id="bu-search"
                  type="text"
                  placeholder="Scan Barcode/Enter Product Name"
                  value={search}
                  onChange={e=>setSearch(e.target.value)}
                  onKeyDown={handleSearchKey}
                  onFocus={()=> search && setSuggestOpen(true)}
                  autoComplete="off"
                />
                {suggestOpen && filtered.length > 0 && (
                  <div className="bu-suggest">
                    {filtered.map((p, i) => (
                      <div
                        key={p.code}
                        className={`bu-suggest-item ${i===activeIndex ? "active" : ""}`}
                        onMouseDown={e=>e.preventDefault()}
                        onClick={()=>handlePick(p)}
                      >
                        <div className="nm">{p.name}</div>
                        <div className="meta">
                          <span>{p.code}</span>
                          <span>• {p.brand}</span>
                          <span>• ₹{p.mrp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bu-field">
                <label>Focus on:</label>
                <select value={focusOn} onChange={e=>setFocusOn(e.target.value)}>
                  <option>Physical Qty</option>
                  <option>Scan/Search</option>
                </select>
              </div>

              <div className="bu-field">
                <label className="bu-df-label">
                  Date Format{showDateFormat && <span className="bu-req"> *</span>}
                  <input type="checkbox" checked={showDateFormat} onChange={e=>setShowDateFormat(e.target.checked)} />
                </label>
                {showDateFormat && (
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={dateFormat}
                    onChange={e=>setDateFormat(e.target.value)}
                  />
                )}
              </div>

              <div className="bu-field">
                <label>Barcode Size<span className="bu-req">*</span></label>
                <select value={barcodeSize} onChange={e=>setBarcodeSize(e.target.value)} className="bu-empty-select">
                  <option value="">Select Barcode Size</option>
                </select>
                {!barcodeSize && <div className="bu-no-results">No results found</div>}
              </div>
            </div>
          </div>

          {/* RIGHT preview */}
          <div className="bu-right">
            <div className="bu-preview">
              <div className="bu-preview-header">vyaparerp</div>
              <div className="bu-preview-title">{previewTitle}</div>
              <div className="bu-preview-mrp">MRP : {previewMrp}</div>
              <div className="bu-preview-barcode">
                <svg ref={svgRef} preserveAspectRatio="xMidYMid meet" />
              </div>
              <div className="bu-preview-code">{previewCode}</div>
            </div>

            <button className="bu-generate" onClick={handleGenerate}>Generate Barcode</button>
            {err && <div className="bu-alert bu-error">{err}</div>}
          </div>
        </div>

        {/* Table */}
        <div className="bu-table">
          <div className="bu-thead">
            <div className="bu-th bu-check">
              <input type="checkbox" checked={selectAll} onChange={e=>toggleAll(e.target.checked)} />
            </div>
            <div className="bu-th">Item Code</div>
            <div className="bu-th">Product Name</div>
            <div className="bu-th">Qty</div>
            <div className="bu-th">Batch No.</div>
            <div className="bu-th">Packing Date</div>
            <div className="bu-th">MRP</div>
            <div className="bu-th">Selling Price</div>
          </div>

          {/* body */}
          {rows.map(r => (
            <div className="bu-trow" key={r.code}>
              <div className="bu-td bu-check">
                <input type="checkbox" checked={r.checked} onChange={e=>toggleRow(r.code, e.target.checked)} />
              </div>
              <div className="bu-td">{r.code}</div>
              <div className="bu-td">{r.name}</div>
              <div className="bu-td">
                <input className="bu-qty" type="number" min="0" value={r.qty} onChange={e=>changeQty(r.code, e.target.value)} />
              </div>
              <div className="bu-td">{r.batchNo}</div>
              <div className="bu-td">
                <input className="bu-date" type="text" placeholder={showDateFormat ? dateFormat : "DD/MM/YYYY"} value={r.packDate} onChange={e=>changePackDate(r.code, e.target.value)} />
              </div>
              <div className="bu-td">₹{r.mrp}</div>
              <div className="bu-td">₹{r.price}</div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="bu-bottom">
          <button className="bu-btn bu-danger" onClick={handleClearAll}>Clear</button>
          <div className="bu-actions">
            <button className="bu-btn" onClick={exportExcel}>Get Excel</button>
            <button className="bu-btn" onClick={exportCSV}>Get CSV</button>
            <button className="bu-btn" onClick={sendToVlabel}>Send To Vlabel</button>
            <button className="bu-btn bu-primary" onClick={handleGenerate}>Generate Barcode</button>
          </div>
        </div>
      </div>
    </div>
  );
}
