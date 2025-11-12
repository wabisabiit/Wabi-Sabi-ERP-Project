import React, { useMemo, useState, useRef, useEffect } from "react";
import "../styles/NewDiscountPage.css";
import { listLocations, createDiscount } from "../api/client";

/* ---------- Static lists (UI only) ---------- */
const DISCOUNT_TYPES = ["Percentage", "Fixed amount", "Combo Fix Amount"];
const APPLY_TO = ["Specific Category", "Specific Brand", "Specific Products"];
const GIVEN_TO = ["Specific Category", "Specific Brand", "Specific Products", "Free", "Amount"];
const CONDITION_ON = ["Product Qty", "Cart Qty", "Cart Amount"];

/* Category/Brand master (demo) */
const CATEGORIES = [
  "All Category",
  "Accessories",
  "Boys & Girls – Blouse",
  "Boys & Girls – Dress",
  "Boys & Girls – Pant",
  "Boys & Girls – Shirt",
  "Boys & Girls – Shoes",
  "Boys & Girls – Shorts",
];

const BRANDS = ["All Brand", "Adidas", "Nike", "Puma", "Levi’s", "H&M"];
const PRODUCTS = [
  "Men T-Shirt Cotton","Women Dress Floral","Kids Shirt Blue","Leather Belt Black","Sneakers White",
  "Socks Pack of 3","Cap – Classic","Hoodie – Grey","Jeans – Slim Fit","Jacket – Winter Parka",
];

/* ── Reusable searchable dropdown (single pick) ── */
function SearchProduct({ value, onSelect, placeholder = "Search Product", width = 360 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);

  const matches = useMemo(() => {
    if (q.length < 3) return [];
    const norm = q.toLowerCase();
    return PRODUCTS.filter((p) => p.toLowerCase().includes(norm));
  }, [q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectItem = (name) => {
    onSelect(name);
    setQ("");
    setOpen(false);
  };

  return (
    <div
      className="nd-search-select nd-has-dd"
      style={{ width }}
      ref={wrapRef}
      onFocus={() => setOpen(true)}
    >
      <input
        value={value ? value : q}
        onChange={(e) => {
          onSelect("");
          setQ(e.target.value);
        }}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
      />
      <span className="material-icons">expand_more</span>

      {open && (
        <div className="nd-dd">
          {q.length < 3 ? (
            <div className="nd-dd-empty">Please enter 3 or more characters</div>
          ) : matches.length === 0 ? (
            <div className="nd-dd-empty">No products found</div>
          ) : (
            matches.map((m) => (
              <div key={m} className="nd-dd-item" onMouseDown={() => selectItem(m)}>
                {m}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tiny multi-select (select + removable chips) ── */
function MultiSelect({ options, selected, onChange, placeholder = "Select...", width = 360 }) {
  const [temp, setTemp] = useState("");
  const add = (v) => {
    if (!v) return;
    if (!selected.includes(v)) onChange([...selected, v]);
    setTemp("");
  };
  const remove = (v) => onChange(selected.filter((x) => x !== v));
  return (
    <div style={{ maxWidth: width }}>
      <div className="dp-select nd-cat" style={{ width }}>
        <select value={temp} onChange={(e) => add(e.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <span className="material-icons">expand_more</span>
      </div>

      {selected.length > 0 && (
        <div className="nd-tokenlist">
          {selected.map((s) => (
            <div key={s} className="nd-token">
              <span className="nd-token-text">{s}</span>
              <button type="button" className="nd-token-x" onClick={() => remove(s)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Product multi add ── */
function ProductPicker({ selected, onChange, width = 360 }) {
  const add = (name) => { if (name && !selected.includes(name)) onChange([...selected, name]); };
  const remove = (v) => onChange(selected.filter((x) => x !== v));
  return (
    <div style={{ maxWidth: width }}>
      <SearchProduct value="" onSelect={add} placeholder="Search Product" width={width} />
      {selected.length > 0 && (
        <div className="nd-tokenlist">
          {selected.map((s) => (
            <div key={s} className="nd-token">
              <span className="nd-token-text">{s}</span>
              <button type="button" className="nd-token-x" onClick={() => remove(s)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewDiscountPage() {
  /* ---------- Form state ---------- */
  const [autoApply, setAutoApply] = useState(false);
  const [excludeAlreadyDiscounted, setExcludeAlreadyDiscounted] = useState("Yes");

  const [applicable, setApplicable] = useState("Product Wise"); // Product Wise | Entire Bill
  const isEntireBill = applicable === "Entire Bill";

  // Discount mode
  const [discountMode, setDiscountMode] = useState("Normal"); // Normal | Range Wise | Buy X Get Y | Product at Fix Amount
  const isBXGY = discountMode === "Buy X Get Y";
  const isFixAmt = discountMode === "Product at Fix Amount";
  const isRangeWise = discountMode === "Range Wise";

  const [discountType, setDiscountType] = useState("Percentage"); // Percentage | Fixed amount | Combo Fix Amount
  const [discountValue, setDiscountValue] = useState("1");

  const [appliesTo, setAppliesTo] = useState("Specific Category");
  const [applyEntire, setApplyEntire] = useState(false);

  /* ------- Branches (REAL from backend) ------- */
  const [allBranches, setAllBranches] = useState([]); // [{id, name}, ...]
  const [useAllBranches, setUseAllBranches] = useState(true); // default ON
  const [selectedBranchIds, setSelectedBranchIds] = useState([]); // [id,...]
  const selectedCount = useAllBranches ? "ALL" : String(selectedBranchIds.length);

  useEffect(() => {
    (async () => {
      try {
        const data = await listLocations(); // expects array of {id, code?, name}
        const arr = Array.isArray(data) ? data : [];
        setAllBranches(arr.map(b => ({ id: b.id, name: b.name || b.display_name || b.code || `#${b.id}` })));
      } catch {
        setAllBranches([]);
      }
    })();
  }, []);

  const toggleBranch = (id) =>
    setSelectedBranchIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const [category, setCategory] = useState("");

  // BXGY
  const [givenTo, setGivenTo] = useState("Specific Category");
  const [conditionOn, setConditionOn] = useState("Product Qty");
  const [selectQty, setSelectQty] = useState("1");

  // Given To pickers
  const [gtCategories, setGtCategories] = useState([]);
  const [gtBrands, setGtBrands] = useState([]);
  const [gtProducts, setGtProducts] = useState([]);
  const [gtAmount, setGtAmount] = useState("");

  const [excludeProduct, setExcludeProduct] = useState("");

  // Minimum Requirement (shared)
  const [minReq, setMinReq] = useState("None");
  const [normalMinAmount, setNormalMinAmount] = useState("");
  const [normalMinQty, setNormalMinQty] = useState("");
  const [rangeMinAmount, setRangeMinAmount] = useState("");
  const [rangeMaxAmount, setRangeMaxAmount] = useState("");

  // Fix amount
  const [givenProduct, setGivenProduct] = useState("");
  const [fixQty, setFixQty] = useState("1");
  const [minAmount, setMinAmount] = useState("");

  // Common
  const [eligible, setEligible] = useState("All");
  const [oldCustomerScope, setOldCustomerScope] = useState("Everyone");
  const [limitTotal, setLimitTotal] = useState(false);
  const [limitTotalValue, setLimitTotalValue] = useState("");
  const [limitPerCustomer, setLimitPerCustomer] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDateVal] = useState("");
  const [endTime, setEndTime] = useState("00:00");
  const [discountCode, setDiscountCode] = useState("");
  const [savingMsg, setSavingMsg] = useState("");

  const rangeMinRef = useRef(null);

  /* ---------- Mode-driven Minimum Requirement behaviour ---------- */
  useEffect(() => {
    if (isFixAmt) {
      setMinReq("Minimum Purchase Amount");
    } else if (isRangeWise) {
      setMinReq("Minimum Purchase Amount");
      setRangeMinAmount("");
      setRangeMaxAmount("");
      setTimeout(() => rangeMinRef.current?.focus(), 0);
    } else if (discountMode === "Normal") {
      setMinReq("None");
      setRangeMinAmount("");
      setRangeMaxAmount("");
    }
  }, [discountMode, isFixAmt, isRangeWise]);

  useEffect(() => {
    if (discountMode === "Normal") {
      if (minReq === "Minimum Purchase Amount") setNormalMinQty("");
      if (minReq === "Minimum Quantity of Items") setNormalMinAmount("");
    }
  }, [discountMode, minReq]);

  /* ---------- Helpers ---------- */
  const codeValid = (code) => /^[A-Z0-9]{4,12}$/.test(code || "");
  const toDateOnly = (d) => String(d || "").slice(0, 10);
  const enumApplicable = applicable === "Entire Bill" ? "BILL" : "PRODUCT";
  const enumMode =
    discountMode === "Range Wise" ? "RANGE" :
    discountMode === "Buy X Get Y" ? "BUYXGETY" :
    discountMode === "Product at Fix Amount" ? "FIXPRICE" : "NORMAL";
  const enumValueType = discountType === "Percentage" ? "PERCENT" : "AMOUNT";

  /* ---------- Save to API ---------- */
  async function handleSave() {
    setSavingMsg("");
    const code = (discountCode || "").toUpperCase();

    if (!codeValid(code)) { setSavingMsg("Discount Code required (A–Z/0–9, 4–12 chars)."); return; }
    if (!startDate) { setSavingMsg("Start Date is required."); return; }
    const end = hasEndDate ? endDate : startDate;

    // If not "All Branches", make sure at least 1 selected
    if (!useAllBranches && selectedBranchIds.length === 0) {
      setSavingMsg("Please select at least one branch or enable All Branches.");
      return;
    }

    // Build payload exactly as your DiscountSerializer expects
    const payload = {
      title: `${discountMode} ${enumApplicable === "BILL" ? "(Bill)" : "(Product)"}`,
      code,
      applicable: enumApplicable,
      mode: enumMode,
      value_type: enumValueType,
      value: Number(discountValue || 0),

      range_min_amount: isRangeWise ? Number(rangeMinAmount || 0) : null,
      range_max_amount: isRangeWise ? Number(rangeMaxAmount || 0) : null,

      x_qty: isBXGY ? Number(selectQty || 0) : 0,
      y_qty: isBXGY ? 1 : 0,

      min_amount_for_fix: isFixAmt ? Number(minAmount || 0) : null,
      applies_category: category || "",

      start_date: toDateOnly(startDate),
      end_date: toDateOnly(end),

      // ⬇️ key part:
      branch_ids: useAllBranches ? [] : selectedBranchIds,
      all_branches: useAllBranches, // backend can treat true as “apply everywhere”
    };

    // simple guards
    if (payload.value_type === "PERCENT" && payload.value > 100) {
      setSavingMsg("Percentage cannot exceed 100.");
      return;
    }

    try {
      await createDiscount(payload);
      setSavingMsg("Saved successfully.");
      // minimal reset
      setDiscountCode("");
    } catch (e) {
      setSavingMsg(e?.message || "Failed to save.");
    }
  }

  /* ---------- Import modal state (unchanged demo) ---------- */
  const [showImportPicker, setShowImportPicker] = useState(false);
  const [importChoice, setImportChoice] = useState("Specific Products Given To");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef(null);
  const [fileObj, setFileObj] = useState(null);
  const [fileName, setFileName] = useState("");
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyOk, setVerifyOk] = useState(false);

  const openUpload = () => {
    setShowImportPicker(false);
    setShowUploadModal(true);
    setFileObj(null); setFileName(""); setVerifyOk(false); setVerifyMsg("");
  };
  const onChooseFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileObj(f); setFileName(f.name); setVerifyOk(false); setVerifyMsg("");
  };
  const handleVerify = () => {
    if (!fileObj) { setVerifyOk(false); setVerifyMsg("Please choose a file first."); return; }
    const name = fileObj.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setVerifyOk(false); setVerifyMsg("Only CSV or Excel files are supported."); return;
    }
    if (name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        const firstLine = text.split(/\r?\n/)[0] || "";
        const norm = firstLine.toLowerCase();
        const ok = norm.includes("sku") || norm.includes("product") || norm.includes("barcode") || norm.includes("category");
        setVerifyOk(ok); setVerifyMsg(ok ? "Verified successfully." : "Template headers not recognized.");
      };
      reader.readAsText(fileObj);
    } else { setVerifyOk(true); setVerifyMsg("Verified successfully."); }
  };
  const handleUploadDemo = () => {
    if (!fileObj) { setVerifyOk(false); setVerifyMsg("Please choose a file first."); return; }
    if (!verifyOk) { setVerifyMsg("Please verify the file before uploading."); return; }
    alert("Uploaded (demo)"); setShowUploadModal(false);
  };
  const downloadDemo = () => {
    let csv = "SKU,Product,Category\nSKU001,Sample Product,Accessories\n";
    if (importChoice.includes("Applies")) csv = "Category\nAccessories\nBoys & Girls – Shirt\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "demo.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dp-wrap">
      <div className="nd-top">
        <div className="nd-bc">
          <span className="nd-title">New Discount</span>
          <span className="material-icons nd-home">home</span>
          <span className="nd-dash">-</span>
          <span className="nd-bc-dim">Discount</span>
        </div>
      </div>

      <div className="nd-card">
        <div className="nd-head">
          <span className="material-icons nd-gear">settings</span>
          <span>Discount Details</span>
        </div>

        {savingMsg && <div className="alert info" style={{ margin: "10px 16px 0" }}>{savingMsg}</div>}

        <div className="nd-grid">
          {/* ===== Left ===== */}
          <div className="nd-main">
            {/* Auto apply / exclude / applicable */}
            <div className="nd-row threecol">
              <div className="nd-block">
                <label className="nd-label">Discount Auto Apply</label>
                <div className="nd-toggle">
                  <button type="button" className={`nd-tg-btn ${!autoApply ? "on" : ""}`} onClick={() => setAutoApply(false)}>NO</button>
                  <button type="button" className={`nd-tg-btn ${autoApply ? "on" : ""}`} onClick={() => setAutoApply(true)}>YES</button>
                </div>
              </div>

              {!isEntireBill && (
                <div className="nd-block">
                  <label className="nd-label">Exclude Products Which Already have Discount Applied</label>
                  <div className="nd-radio-inline nowrap">
                    {["Yes", "No"].map((v) => (
                      <label key={v} className="nd-radio">
                        <input type="radio" name="exclude" checked={excludeAlreadyDiscounted === v} onChange={() => setExcludeAlreadyDiscounted(v)} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="nd-block">
                <label className="nd-label">Discount Applicable</label>
                <div className="nd-radio-inline nowrap">
                  {["Product Wise", "Entire Bill"].map((v) => (
                    <label key={v} className="nd-radio">
                      <input type="radio" name="applicable" checked={applicable === v} onChange={() => setApplicable(v)} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Mode + code */}
            <div className="nd-row discountline">
              <div className="nd-block">
                <label className="nd-label">Discount</label>
                <div className="nd-radio-inline">
                  {["Normal", "Range Wise", "Buy X Get Y", "Product at Fix Amount"].map((v) => (
                    <label key={v} className="nd-radio">
                      <input type="radio" name="mode" checked={discountMode === v} onChange={() => setDiscountMode(v)} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="nd-code">
                <label className="nd-label">Discount Code <span className="req">*</span></label>
                <input className="nd-input" placeholder="Discount Code" value={discountCode} onChange={(e) => setDiscountCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())} />
              </div>
            </div>

            {/* Type/Value */}
            {!isBXGY && !isFixAmt && (
              <div className="nd-row twocol">
                <div className="nd-block">
                  <label className="nd-label">Discount Type</label>
                  <div className="dp-select" style={{ width: 220 }}>
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                      {DISCOUNT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                    <span className="material-icons">expand_more</span>
                  </div>
                </div>

                <div className="nd-block">
                  <label className="nd-label">Discount Value</label>
                  <div className="nd-val">
                    <span className="nd-val-unit">{discountType === "Percentage" ? "%" : "₹"}</span>
                    <input className="nd-val-input" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* PRODUCT-WISE: Normal / Range Wise */}
            {!isEntireBill && !isBXGY && !isFixAmt && (
              <>
                <div className="nd-row">
                  <label className="nd-label">Applies To <span className="req">*</span></label>
                  <div className="nd-radio-inline">
                    {APPLY_TO.map((v) => (
                      <label key={v} className="nd-radio">
                        <input type="radio" name="applies" checked={appliesTo === v} onChange={() => setAppliesTo(v)} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>

                  <label className="nd-check mt6">
                    <input type="checkbox" checked={applyEntire} onChange={(e) => setApplyEntire(e.target.checked)} />
                    <span>Apply to entire selection</span>
                    <span className="material-icons nd-help">help_outline</span>
                  </label>
                </div>

                <div className="nd-row">
                  <label className="nd-label">Select Category and Subcategory <span className="req">*</span>
                    <span className="material-icons nd-help">info</span>
                  </label>
                  <div className="dp-select nd-cat">
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">Select Category</option>
                      {CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
                    </select>
                    <span className="material-icons">expand_more</span>
                  </div>
                </div>

                <div className="nd-row">
                  <label className="nd-label">Minimum Requirement <span className="req">*</span></label>
                  <div className="nd-radio-inline">
                    {["None", "Minimum Purchase Amount", "Minimum Quantity of Items"].map((v) => (
                      <label key={v} className="nd-radio">
                        <input type="radio" name="minreq_normal" checked={minReq === v} onChange={() => setMinReq(v)} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>

                  {discountMode === "Normal" && minReq === "Minimum Purchase Amount" && (
                    <div className="mt8" style={{ maxWidth: 300 }}>
                      <input className="nd-input" placeholder="Minimum Purchase Amount" value={normalMinAmount} onChange={(e) => setNormalMinAmount(e.target.value)} />
                    </div>
                  )}
                  {discountMode === "Normal" && minReq === "Minimum Quantity of Items" && (
                    <div className="mt8" style={{ maxWidth: 300 }}>
                      <input className="nd-input" placeholder="Minimum Purchase Qty" value={normalMinQty} onChange={(e) => setNormalMinQty(e.target.value)} />
                    </div>
                  )}

                  {isRangeWise && minReq === "Minimum Purchase Amount" && (
                    <div className="nd-inline mt8">
                      <input ref={rangeMinRef} className="nd-input nd-mini" placeholder="Minimum Amount" value={rangeMinAmount} onChange={(e) => setRangeMinAmount(e.target.value)} />
                      <input className="nd-input nd-mini" placeholder="maximum Amount" value={rangeMaxAmount} onChange={(e) => setRangeMaxAmount(e.target.value)} />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* BUY X GET Y */}
            {isBXGY && (
              <>
                <div className="nd-row">
                  <label className="nd-label">Applies To <span className="req">*</span></label>
                  <div className="nd-radio-inline">
                    {APPLY_TO.map((v) => (
                      <label key={v} className="nd-radio">
                        <input type="radio" name="applies_bxgy" checked={appliesTo === v} onChange={() => setAppliesTo(v)} />
                        <span>{v}</span>
                      </label>
                    ))}
                  </div>
                  <label className="nd-check mt6">
                    <input type="checkbox" checked={applyEntire} onChange={(e) => setApplyEntire(e.target.checked)} />
                    <span>Apply to entire selection</span>
                    <span className="material-icons nd-help">help_outline</span>
                  </label>
                </div>

                <div className="nd-row nd-grid-3">
                  <div className="nd-block">
                    <label className="nd-label">Select Category and Subcategory <span className="req">*</span>
                      <span className="material-icons nd-help">info</span>
                    </label>
                    <div className="dp-select nd-cat">
                      <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">Select Category</option>
                        {CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
                      </select>
                      <span className="material-icons">expand_more</span>
                    </div>
                  </div>

                  <div className="nd-block">
                    <label className="nd-label">Condition On</label>
                    <div className="dp-select">
                      <select value={conditionOn} onChange={(e) => setConditionOn(e.target.value)}>
                        {CONDITION_ON.map((c) => (<option key={c}>{c}</option>))}
                      </select>
                      <span className="material-icons">expand_more</span>
                    </div>
                  </div>

                  <div className="nd-block">
                    <label className="nd-label">Select Qty</label>
                    <input className="nd-input" value={selectQty} onChange={(e) => setSelectQty(e.target.value)} />
                  </div>
                </div>

                <div className="nd-row">
                  <label className="nd-label">Excluding Products</label>
                  <SearchProduct value={excludeProduct} onSelect={setExcludeProduct} placeholder="Search Product" width={360} />
                </div>

                <div className="nd-row">
                  <label className="nd-label">Given To <span className="req">*</span></label>
                  <div className="nd-radio-inline">
                    {GIVEN_TO.map((g) => (
                      <label key={g} className="nd-radio">
                        <input type="radio" name="given_to" checked={givenTo === g} onChange={() => setGivenTo(g)} />
                        <span>{g}</span>
                      </label>
                    ))}
                  </div>

                  <div className="nd-grid-2 mt8">
                    <div>
                      {givenTo === "Specific Category" && (
                        <MultiSelect options={CATEGORIES} selected={gtCategories} onChange={setGtCategories} placeholder="Select Category" width={360} />
                      )}
                      {givenTo === "Specific Brand" && (
                        <MultiSelect options={BRANDS} selected={gtBrands} onChange={setGtBrands} placeholder="Select Brand" width={360} />
                      )}
                      {givenTo === "Specific Products" && (
                        <ProductPicker selected={gtProducts} onChange={setGtProducts} width={360} />
                      )}
                      {givenTo === "Amount" && (
                        <input className="nd-input" placeholder="Amount" value={gtAmount} onChange={(e) => setGtAmount(e.target.value)} />
                      )}
                      {givenTo === "Free" && <div className="nd-ghost" />}
                    </div>

                    <div>
                      <label className="nd-small-label">Select Qty</label>
                      <input className="nd-input" value={selectQty} onChange={(e) => setSelectQty(e.target.value)} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* FIX AMOUNT */}
            {isFixAmt && (
              <>
                <div className="nd-row">
                  <label className="nd-label">Minimum Requirement <span className="req">*</span></label>
                  <div className="nd-radio-inline">
                    <label className="nd-radio">
                      <input type="radio" name="minreq_fix" checked readOnly />
                      <span>Minimum Purchase Amount</span>
                    </label>
                  </div>
                  <div className="mt8" style={{ maxWidth: 300 }}>
                    <input className="nd-input" placeholder="Minimum Purchase Amount" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
                  </div>
                </div>

                <div className="nd-row nd-grid-2">
                  <div className="nd-block">
                    <label className="nd-label">Given To <span className="req">*</span></label>
                    <div className="nd-radio-inline">
                      <label className="nd-radio">
                        <input type="radio" name="fix_given_to" checked readOnly />
                        <span>Specific Products</span>
                      </label>
                    </div>

                    <div className="mt8">
                      <SearchProduct value={givenProduct} onSelect={setGivenProduct} placeholder="Search Product" width={360} />
                    </div>
                  </div>

                  <div className="nd-block">
                    <label className="nd-label">Select Qty</label>
                    <input className="nd-input" value={fixQty} onChange={(e) => setFixQty(e.target.value)} />
                  </div>
                </div>

                <div className="nd-row">
                  <label className="nd-label">Excluding Products</label>
                  <SearchProduct value={excludeProduct} onSelect={setExcludeProduct} placeholder="Search Product" width={360} />
                </div>
              </>
            )}

            {/* Common rows */}
            <div className="nd-row">
              <label className="nd-label">Customer Eligibility</label>
              <div className="nd-radio-inline">
                {["All", "New Customer", "Old Customer"].map((v) => (
                  <label key={v} className="nd-radio">
                    <input type="radio" name="elig" checked={eligible === v} onChange={() => { setEligible(v); if (v === "Old Customer") setOldCustomerScope("Everyone"); }} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>

              {eligible === "Old Customer" && (
                <div className="nd-radio-inline mt6">
                  <label className="nd-radio">
                    <input type="radio" name="elig_old_scope" checked={oldCustomerScope === "Everyone"} onChange={() => setOldCustomerScope("Everyone")} />
                    <span>Everyone</span>
                  </label>
                  <label className="nd-radio">
                    <input type="radio" name="elig_old_scope" checked={oldCustomerScope === "Specific Customers"} onChange={() => setOldCustomerScope("Specific Customers")} />
                    <span>Specific Customers</span>
                  </label>
                </div>
              )}
            </div>

            <div className="nd-row">
              <label className="nd-label">Usage Limits</label>

              <div className="nd-limit-line">
                <label className="nd-check">
                  <input type="checkbox" checked={limitTotal} onChange={(e) => setLimitTotal(e.target.checked)} />
                  <span>Limit Number of Times This Discount can be Used in Total</span>
                </label>
                {limitTotal && (
                  <input className="nd-input nd-limit-input" type="number" min="1" placeholder="Limit" value={limitTotalValue} onChange={(e) => setLimitTotalValue(e.target.value)} />
                )}
              </div>

              <label className="nd-check mt6">
                <input type="checkbox" checked={limitPerCustomer} onChange={(e) => setLimitPerCustomer(e.target.checked)} />
                <span>Limit to One Use Per Customer</span>
              </label>
            </div>

            <div className="nd-row twocol">
              <div className="nd-block">
                <label className="nd-label">Active Dates</label>
                <div className="nd-grid-2">
                  <div>
                    <div className="nd-small-label">Start Date <span className="req">*</span></div>
                    <input type="date" className="nd-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <div className="nd-small-label">Start Time <span className="req">*</span></div>
                    <input type="time" className="nd-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="nd-block">
                <label className="nd-check">
                  <input type="checkbox" checked={hasEndDate} onChange={(e) => setHasEndDate(e.target.checked)} />
                  <span>Set End Date</span>
                </label>

                {hasEndDate && (
                  <div className="nd-grid-2 mt6">
                    <div>
                      <div className="nd-small-label">End Date</div>
                      <input type="date" className="nd-input" value={endDate} onChange={(e) => setEndDateVal(e.target.value)} />
                    </div>
                    <div>
                      <div className="nd-small-label">End Time</div>
                      <input type="time" className="nd-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== Right: Branches ===== */}
          <aside className="nd-side">
            <button className="nd-import" onClick={() => setShowImportPicker(true)}>Import Files</button>

            <div className="nd-field">
              <div className="nd-side-head">
                <label className="nd-label">Branches <span className="req">*</span></label>
                <span className="nd-badge">{selectedCount}</span>
              </div>

              <label className="nd-branch nd-all">
                <input
                  type="checkbox"
                  checked={useAllBranches}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setUseAllBranches(on);
                    if (on) setSelectedBranchIds([]);
                  }}
                />
                <span>All Branches</span>
              </label>

              <div className={`nd-branches ${useAllBranches ? "nd-disabled" : ""}`}>
                {allBranches.length === 0 && <div className="muted">No branches found.</div>}
                {allBranches.map((b) => (
                  <label key={b.id} className="nd-branch">
                    <input
                      type="checkbox"
                      disabled={useAllBranches}
                      checked={useAllBranches ? true : selectedBranchIds.includes(b.id)}
                      onChange={() => toggleBranch(b.id)}
                    />
                    <span>{b.name}</span>
                  </label>
                ))}
              </div>

              {useAllBranches && <div className="muted" style={{ marginTop: 6 }}>Applying to all branches.</div>}
            </div>
          </aside>
        </div>

        <div className="nd-foot">
          <button className="nd-btn cancel" onClick={() => window.history.back()}>Cancel</button>
          <button className="nd-btn clear" onClick={() => window.location.reload()}>Clear</button>
          <button className="nd-btn save" onClick={handleSave}>Save</button>
        </div>
      </div>

      {/* ------------ MODAL #1 ------------ */}
      {showImportPicker && (
        <div className="nd-overlay" onClick={() => setShowImportPicker(false)}>
          <div className="nd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nd-modal-head">
              <div className="nd-modal-title">Import Files</div>
              <button className="nd-x" onClick={() => setShowImportPicker(false)}>×</button>
            </div>

            <div className="nd-modal-body">
              <label className="nd-radio nd-block">
                <input type="radio" name="imp" checked={importChoice === "Specific Products Given To"} onChange={() => setImportChoice("Specific Products Given To")} />
                <span>Specific Products Given To</span>
              </label>
              <label className="nd-radio nd-block">
                <input type="radio" name="imp" checked={importChoice === "Excluding Products For Applies To"} onChange={() => setImportChoice("Excluding Products For Applies To")} />
                <span>Excluding Products For Applies To</span>
              </label>
              <label className="nd-radio nd-block">
                <input type="radio" name="imp" checked={importChoice === "Excluding Products For Givens To"} onChange={() => setImportChoice("Excluding Products For Givens To")} />
                <span>Excluding Products For Givens To</span>
              </label>
            </div>

            <div className="nd-modal-foot">
              <button className="nd-btn save" onClick={openUpload}>Import Files</button>
            </div>
          </div>
        </div>
      )}

      {/* ------------ MODAL #2 ------------ */}
      {showUploadModal && (
        <div className="nd-overlay top" onClick={() => setShowUploadModal(false)}>
          <div className="nd-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="nd-modal-head">
              <div className="nd-modal-title">Upload Product Sheet</div>
              <button className="nd-x" onClick={() => setShowUploadModal(false)}>×</button>
            </div>

            <div className="nd-modal-body">
              <div className="nd-row" style={{ marginBottom: 10 }}>
                <span className="nd-label" style={{ marginBottom: 6 }}>
                  Download <button className="nd-link" type="button" onClick={downloadDemo}>Demo</button> File
                </span>
                <div className="nd-file-row">
                  <input className="nd-input" placeholder="Choose file" value={fileName} readOnly />
                  <div className="nd-file-icons">
                    <button type="button" className="nd-iconbtn" title="Browse" onClick={() => fileInputRef.current?.click()}>
                      <span className="material-icons">folder_open</span>
                    </button>
                    <button type="button" className="nd-iconbtn" title="Pick" onClick={() => fileInputRef.current?.click()}>
                      <span className="material-icons">attach_file</span>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: "none" }}
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={onChooseFile}
                  />
                </div>
              </div>

              {verifyMsg && (<div className={`nd-verify ${verifyOk ? "ok" : "err"}`}>{verifyMsg}</div>)}
            </div>

            <div className="nd-modal-foot">
              <button className="nd-btn" onClick={handleVerify}>Verify</button>
              <button className="nd-btn save" onClick={handleUploadDemo}>Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
