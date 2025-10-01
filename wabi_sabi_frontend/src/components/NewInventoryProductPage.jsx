import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NewInventoryProductPage.css";

/* ---------- masters ---------- */
const INITIAL_UOMS = ["PIECES", "PACK", "BOX", "SET"];
const CATEGORIES = [
  "Accessories",
  "Boys & Girls – Blouse",
  "Boys & Girls – Dress",
  "Boys & Girls – Pant",
  "Boys & Girls – Shirt",
  "Boys & Girls – Shoes",
  "Clothing",
  "Footwear",
];
const BRANDS = ["B4L", "Lee", "Test"];
const SUB_BRANDS = ["—"];
const INITIAL_TAXES = ["GST 5(5.0%)", "GST 12(12%)", "GST 18(18%)"];

/* ---------- helpers ---------- */
const initialForm = {
  itemCode: "",
  autoGenerate: true,
  productName: "",
  printName: "",
  category: "",
  subCategory: "",
  brand: "",
  subBrand: "",
  uom: "PIECES",
  hsn: "",
  purchaseTax: "GST 5(5.0%)",
  salesTax: "GST 5(5.0%)",
  purchaseTaxIncl: false,
  salesTaxIncl: true,
  cess: false,
  cessPercent: "",
  manageBatch: true,
  shortDescription: "",
  description: "",
  netWeight: "",
  purchasePrice: "0.00",
  landingCost: "0.00",
  mrp: "0.00",
  sellingDiscount: "0.00",
  sellingPrice: "0.00",
  sellingMargin: "0",
  onlinePrice: "0.00",
  minQty: "0",
  openingQty: "0",
};

function generateItemCode() {
  const n = Math.floor((Date.now() / 1000) % 900) + 100;
  return `WS0${n}`;
}
const slug = (s) =>
  String(s || "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "")
    .toUpperCase();

const cartesian = (arrays) =>
  arrays.reduce(
    (acc, cur) =>
      acc
        .map((a) => cur.map((b) => a.concat([b])))
        .reduce((p, n) => p.concat(n), []),
    [[]]
  );

/* ---------- click-away (for dropdowns) ---------- */
function useClickAway(ref, onAway) {
  useEffect(() => {
    const fn = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onAway();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onAway, ref]);
}

/* ============================================================
   Rich Text Editor
   ============================================================ */
function RichTextEditor({ label = "Description", value, onChange }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const focusEditor = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (window.getSelection && document.createRange && el.childNodes.length === 0) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const exec = (cmd, arg = null) => {
    focusEditor();
    document.execCommand(cmd, false, arg);
    onChange(editorRef.current.innerHTML);
  };

  const insertHtml = (html) => {
    focusEditor();
    document.execCommand("insertHTML", false, html);
    onChange(editorRef.current.innerHTML);
  };

  const insertCodeBlock = () => {
    insertHtml(`<pre class="np-code"><code>// code...</code></pre><p><br/></p>`);
  };

  const insertTable = () => {
    const rows = 3, cols = 3;
    let cells = "";
    for (let r = 0; r < rows; r++) {
      cells += "<tr>";
      for (let c = 0; c < cols; c++) cells += "<td>&nbsp;</td>";
      cells += "</tr>";
    }
    insertHtml(
      `<table class="np-table">
        <tbody>${cells}</tbody>
      </table><p><br/></p>`
    );
  };

  const handleInput = () => onChange(editorRef.current.innerHTML);

  return (
    <div className="np-field full">
      <label>{label}</label>

      <div className="np-editor">
        <div className="np-toolbar">
          <button type="button" className="tbtn" title="Bold" onClick={() => exec("bold")}>B</button>
          <button type="button" className="tbtn" title="Italic" onClick={() => exec("italic")}><i>I</i></button>
          <button type="button" className="tbtn" title="Underline" onClick={() => exec("underline")}><u>U</u></button>

          <span className="tsep" />

          <button type="button" className="tbtn" title="Bulleted list" onClick={() => exec("insertUnorderedList")}>•</button>
          <button type="button" className="tbtn" title="Numbered list" onClick={() => exec("insertOrderedList")}>1.</button>

          <span className="tsep" />

          <button type="button" className="tbtn" title="Align left" onClick={() => exec("justifyLeft")}>≡</button>
          <button type="button" className="tbtn" title="Align center" onClick={() => exec("justifyCenter")}>≡</button>
          <button type="button" className="tbtn" title="Align right" onClick={() => exec("justifyRight")}>≡</button>

          <span className="tsep" />

          <button type="button" className="tbtn code" title="Code block" onClick={insertCodeBlock}>
            {"</>"}
          </button>
          <button type="button" className="tbtn grid" title="Insert table" onClick={insertTable}>
            ▦
          </button>
        </div>

        <div
          ref={editorRef}
          className="np-editor-area"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleInput}
          spellCheck={false}
        />

        <div className="np-editor-resize" />
      </div>
    </div>
  );
}

/* ============================================================
   Searchable Select
   ============================================================ */
function SearchSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  required = false,
  allowAddNew = false,
  addNewLabel = "+ Add New",
  onAddNew,
  width,
}) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useClickAway(wrapRef, () => setOpen(false));

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(t));
  }, [options, q]);

  const choose = (val) => {
    onChange(val);
    setOpen(false);
    setQ("");
  };

  const selectedText = value || placeholder;
  const hasQuery = q.trim().length > 0;

  return (
    <div className="np-field" style={{ width }} ref={wrapRef}>
      <label>
        {label} {required && <span className="req">*</span>}
      </label>

      <button
        type="button"
        className={`np-ss-trigger ${value ? "" : "placeholder"}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="np-ss-text">{selectedText}</span>
        <span className="np-ss-caret" />
      </button>

      {open && (
        <div className="np-ss-pop">
          <input
            autoFocus
            className="np-ss-search"
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="np-ss-list">
            {filtered.length > 0 ? (
              filtered.map((opt) => (
                <div key={opt} className="np-ss-item" onClick={() => choose(opt)}>
                  {opt}
                </div>
              ))
            ) : hasQuery ? (
              <div className="np-ss-empty">
                <div>No results found</div>
                {allowAddNew && (
                  <button
                    className="np-ss-add"
                    type="button"
                    onClick={() => {
                      const term = q.trim();
                      if (!term) return;
                      onAddNew && onAddNew(term);
                      setOpen(false); // close pop on add new
                    }}
                  >
                    {addNewLabel}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   UOM Modal (same as before)
   ============================================================ */
const UQC_CODES = [
  "PCS - Pieces",
  "KGS - Kilograms",
  "MTR - Meter",
  "LTR - Litre",
  "BAG - Bag",
  "BOX - Box",
  "SET - Set",
];

function NewUOMModal({ open, onClose, onSave }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [uqc, setUqc] = useState("");
  const [decimals, setDecimals] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setCode("");
      setUqc("");
      setDecimals("");
    }
  }, [open]);

  if (!open) return null;

  const errors = {
    name: !name.trim(),
    code: !code.trim(),
    uqc: !uqc.trim(),
    decimals: String(decimals).trim() === "" || Number(decimals) < 0,
  };

  const handleSave = () => {
    if (Object.values(errors).some(Boolean)) return;
    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      uqc,
      decimals: String(decimals).trim(),
    });
  };

  return (
    <div className="uom-overlay">
      <div className="uom-card">
        <div className="uom-header">
          <h3>New Unit Of Measurement</h3>
          <button className="uom-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="uom-body">
          <div className="np-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div className="np-field">
              <label>Name <span className="req">*</span></label>
              <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={errors.name}
              />
            </div>

            <div className="np-field">
              <label>Unit Code <span className="req">*</span></label>
              <input
                placeholder="Unit Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-invalid={errors.code}
              />
            </div>

            <SearchSelect
              label="UQC Code"
              required
              value={uqc}
              onChange={setUqc}
              options={UQC_CODES}
              placeholder="Select Unit Quantity Code"
            />

            <div className="np-field">
              <label>No of Decimal Places <span className="req">*</span></label>
              <input
                type="number"
                placeholder="No of Decimal Places"
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
                aria-invalid={errors.decimals}
              />
            </div>
          </div>
        </div>

        <div className="uom-footer">
          <button className="btn ghost" onClick={onClose}>Close</button>
          <button className="btn primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   NEW TAX MODAL (exact screenshot-like)
   ============================================================ */
function NewTaxModal({ open, onClose, onSave, prefillName = "" }) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");

  useEffect(() => {
    if (open) {
      setName(prefillName || "");
      setRate("");
    }
  }, [open, prefillName]);

  if (!open) return null;

  const errors = {
    name: !String(name).trim(),
    rate:
      String(rate).trim() === "" ||
      Number.isNaN(Number(rate)) ||
      Number(rate) < 0,
  };

  const handleSave = () => {
    if (Object.values(errors).some(Boolean)) return;

    const r = String(Number(rate)).replace(/\.0+$/, "");
    const display = `${name.trim()} ${r}(${r}%)`;
    onSave({ display });
  };

  return (
    <div className="tax-overlay">
      <div className="tax-card">
        <div className="tax-header">
          <h3>New Tax</h3>
          <button className="tax-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="tax-body">
          <div className="np-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div className="np-field">
              <label>Tax Name <span className="req">*</span></label>
              <input
                placeholder="Tax Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={errors.name}
              />
            </div>

            <div className="np-field">
              <label>Tax Rate</label>
              <input
                placeholder="Enter Tax Rate"
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                aria-invalid={errors.rate}
              />
            </div>
          </div>
        </div>

        <div className="tax-footer">
          <button className="btn ghost" onClick={onClose}>Close</button>
          <button className="btn primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ======================= PAGE ======================= */
export default function NewInventoryProductPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(() => ({
    ...initialForm,
    itemCode: generateItemCode(),
  }));
  const [saving, setSaving] = useState(false);

  /* dynamic masters */
  const [uoms, setUoms] = useState(INITIAL_UOMS);
  const [taxes, setTaxes] = useState(INITIAL_TAXES);

  /* modals */
  const [uomModalOpen, setUomModalOpen] = useState(false);
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [taxTarget, setTaxTarget] = useState(null); // 'purchase' | 'sales'
  const [taxPrefill, setTaxPrefill] = useState("");

  // ===== Variants =====
  const [showVariants, setShowVariants] = useState(false);
  const [options, setOptions] = useState([{ id: 1, name: "", values: "" }]);
  const [variants, setVariants] = useState([]);

  const itemCodeDisabled = form.autoGenerate;

  const requiredErrors = useMemo(() => {
    const e = {};
    if (!form.productName) e.productName = "Required";
    if (!form.printName) e.printName = "Required";
    if (!form.category) e.category = "Required";
    if (!form.salesTax) e.salesTax = "Required";
    if (!form.purchaseTax) e.purchaseTax = "Required";
    if (!form.uom) e.uom = "Required";
    if (!form.itemCode) e.itemCode = "Required";
    if (form.cess && !String(form.hsn || "").trim()) {
      e.hsn = "HSN Code is required when Cess is checked";
    }
    return e;
  }, [form]);

  const setVal = (key, v) => setForm((f) => ({ ...f, [key]: v }));
  const onChange = (key) => (eOrHtml) => {
    const isEditor = typeof eOrHtml === "string";
    const nextVal = isEditor
      ? eOrHtml
      : eOrHtml?.target?.type === "checkbox"
      ? eOrHtml.target.checked
      : eOrHtml.target.value;
    setVal(key, nextVal);
  };

  const onToggleAutoGen = (checked) => {
    setForm((f) => ({
      ...f,
      autoGenerate: checked,
      itemCode: checked ? generateItemCode() : "",
    }));
  };

  const clearForm = () => {
    setForm({ ...initialForm, itemCode: generateItemCode() });
    setShowVariants(false);
    setVariants([]);
    setOptions([{ id: 1, name: "", values: "" }]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveToLocal = (payload) => {
    const key = "wabisabi_products_drafts";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    list.push({ ...payload, _savedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(list));
  };

  const handleSave = async () => {
    if (Object.keys(requiredErrors).length) {
      alert("Please fill all required fields marked with *");
      return false;
    }
    try {
      setSaving(true);
      await new Promise((r) => setTimeout(r, 350));
      saveToLocal({ ...form, variants, options });
      alert("Product saved successfully!");
      return true;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNew = async () => {
    const ok = await handleSave();
    if (!ok) return;
    clearForm();
  };

  const handleCancel = () => navigate("/inventory/products");

  /* ===== Variant helpers ===== */
  const addOptionRow = () =>
    setOptions((rows) => [...rows, { id: Date.now(), name: "", values: "" }]);

  const removeOptionRow = (id) =>
    setOptions((rows) => rows.filter((r) => r.id !== id));

  const updateOption = (id, key, val) =>
    setOptions((rows) => rows.map((r) => (r.id === id ? { ...r, [key]: val } : r)));

  const generateVariantRows = () => {
    const parsed = options.map((o) =>
      (o.values || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

    if (
      options.length === 0 ||
      options.some((o) => !o.name.trim()) ||
      parsed.some((arr) => arr.length === 0)
    ) {
      alert("Fill Option Name and comma-separated Option Values for each row.");
      return;
    }

    const combos = cartesian(parsed);
    const next = combos.map((vals, idx) => {
      const label = vals.join(" / ");
      return {
        id: `${slug(label)}-${idx}`,
        label,
        code: `${form.itemCode}-${slug(label)}`,
        purchasePrice: form.purchasePrice,
        landingCost: form.landingCost,
        mrp: form.mrp,
        sellingDiscount: form.sellingDiscount,
        sellingPrice: form.sellingPrice,
        sellingMargin: form.sellingMargin,
        onlinePrice: form.onlinePrice,
        minQty: form.minQty,
        openingQty: form.openingQty,
      };
    });

    setVariants(next);
  };

  const updateVariant = (id, key, value) =>
    setVariants((rows) => rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  const removeVariants = () => {
    setVariants([]);
    setOptions([{ id: 1, name: "", values: "" }]);
    setShowVariants(false);
  };

  /* ===== UOM modal handlers ===== */
  const openUomModal = () => setUomModalOpen(true);
  const closeUomModal = () => setUomModalOpen(false);

  const saveNewUom = (u) => {
    const display = u.name.toUpperCase();
    setUoms((list) => (list.includes(display) ? list : [...list, display]));
    setVal("uom", display); // auto-select
    setUomModalOpen(false);
  };

  /* ===== TAX modal handlers ===== */
  const openTaxModal = (target, prefill = "") => {
    setTaxTarget(target);      // 'purchase' or 'sales'
    setTaxPrefill(prefill);    // pass search term as name
    setTaxModalOpen(true);
  };
  const closeTaxModal = () => setTaxModalOpen(false);

  const saveNewTax = ({ display }) => {
    setTaxes((list) => (list.includes(display) ? list : [...list, display]));
    if (taxTarget === "purchase") setVal("purchaseTax", display);
    if (taxTarget === "sales") setVal("salesTax", display);
    setTaxModalOpen(false);
  };

  return (
    <div className="np-wrap">
      {/* header */}
      <div className="np-header">
        <div className="np-title">New Product</div>
        <div className="np-breadcrumb">– Product</div>
      </div>

      {/* General Details */}
      <div className="np-card">
        <div className="np-card-title">
          <span className="mi">info</span> General Details
        </div>

        <div className="np-grid">
          {/* Item Code */}
          <div className="np-field">
            <label>Item Code/Barcode <span className="req">*</span></label>
            <input
              placeholder="Item Code/Barcode"
              value={form.itemCode}
              onChange={onChange("itemCode")}
              disabled={itemCodeDisabled}
              aria-invalid={!!requiredErrors.itemCode}
            />
          </div>

          {/* Auto-generate */}
          <div className="np-field np-inline">
            <label className="np-check">
              <input
                type="checkbox"
                checked={form.autoGenerate}
                onChange={(e) => onToggleAutoGen(e.target.checked)}
              />
              <span /> Auto Generate
            </label>
          </div>

          {/* Names */}
          <div className="np-field">
            <label>Product Name <span className="req">*</span></label>
            <input
              placeholder="Product Name"
              value={form.productName}
              onChange={onChange("productName")}
              aria-invalid={!!requiredErrors.productName}
            />
          </div>

          <div className="np-field">
            <label>Print Name <span className="req">*</span></label>
            <input
              placeholder="Print Name"
              value={form.printName}
              onChange={onChange("printName")}
              aria-invalid={!!requiredErrors.printName}
            />
          </div>

          {/* Category, Subcategory, Brand, Sub Brand */}
          <SearchSelect
            label="Category"
            required
            value={form.category}
            onChange={(v) => setVal("category", v)}
            options={CATEGORIES}
            placeholder="Select Category"
          />

          <SearchSelect
            label="Sub Category"
            value={form.subCategory}
            onChange={(v) => setVal("subCategory", v)}
            options={[]}
            placeholder="Select Sub Category"
            allowAddNew
          />

          <SearchSelect
            label="Select Brand"
            required
            value={form.brand}
            onChange={(v) => setVal("brand", v)}
            options={BRANDS}
            placeholder="Select Brand"
            allowAddNew
          />

          <SearchSelect
            label="Sub Brand"
            value={form.subBrand}
            onChange={(v) => setVal("subBrand", v)}
            options={SUB_BRANDS}
            placeholder="Select Sub Brand"
            allowAddNew
          />

          {/* UOM */}
          <SearchSelect
            label="Select UOM"
            required
            value={form.uom}
            onChange={(v) => setVal("uom", v)}
            options={uoms}
            placeholder="Select UOM"
            allowAddNew
            addNewLabel="+ Add New"
            onAddNew={() => openUomModal()}
          />

          {/* HSN */}
          <div className="np-field">
            <label>HSN Code</label>
            <input
              placeholder="HSN Code"
              value={form.hsn}
              onChange={onChange("hsn")}
              aria-invalid={!!requiredErrors.hsn}
            />
            {requiredErrors.hsn && (
              <div style={{ color: "#d92d20", fontSize: 12, marginTop: 4 }}>
                HSN Code is required when Cess is checked
              </div>
            )}
          </div>

          {/* Purchase Tax */}
          <SearchSelect
            label="Purchase Tax"
            required
            value={form.purchaseTax}
            onChange={(v) => setVal("purchaseTax", v)}
            options={taxes}
            placeholder="Select Purchase Tax"
            allowAddNew
            onAddNew={(term) => openTaxModal("purchase", term)}
          />

          {/* Sales Tax */}
          <SearchSelect
            label="Sales Tax"
            required
            value={form.salesTax}
            onChange={(v) => setVal("salesTax", v)}
            options={taxes}
            placeholder="Select Sales Tax"
            allowAddNew
            onAddNew={(term) => openTaxModal("sales", term)}
          />

          {/* Toggles row */}
          <div className="np-line">
            <label className="np-check">
              <input
                type="checkbox"
                checked={form.purchaseTaxIncl}
                onChange={onChange("purchaseTaxIncl")}
              />
              <span /> Purchase Tax Including
            </label>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label className="np-check" style={{ marginBottom: 4 }}>
                <input
                  type="checkbox"
                  checked={form.cess}
                  onChange={onChange("cess")}
                />
                <span /> Cess %
              </label>

              {form.cess && (
                <div className="np-field" style={{ width: 180, marginTop: 0 }}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cess %"
                    value={form.cessPercent}
                    onChange={onChange("cessPercent")}
                  />
                </div>
              )}
            </div>

            <label className="np-check">
              <input
                type="checkbox"
                checked={form.salesTaxIncl}
                onChange={onChange("salesTaxIncl")}
              />
              <span /> Sales Tax Including
            </label>

            <label className="np-check">
              <input
                type="checkbox"
                checked={form.manageBatch}
                onChange={onChange("manageBatch")}
              />
              <span /> Manage Multiple Batch
            </label>
          </div>

          {/* Short Description */}
          <div className="np-field full">
            <label>Short Description</label>
            <input
              placeholder="Enter Short Description"
              value={form.shortDescription}
              onChange={onChange("shortDescription")}
            />
          </div>

          {/* Description */}
          <RichTextEditor
            label="Description"
            value={form.description}
            onChange={onChange("description")}
          />

          {/* Net Weight */}
          <div className="np-field">
            <label>Net Weight</label>
            <input
              placeholder="Net Weight"
              value={form.netWeight}
              onChange={onChange("netWeight")}
            />
          </div>
        </div>
      </div>

      {/* Pricing Details */}
      <div className="np-card">
        <div className="np-card-title">
          <span className="mi">sell</span> Pricing Details
        </div>

        <div className="np-grid pricing">
          <div className="np-field">
            <label>Purchase Price <span className="req">*</span></label>
            <input type="number" step="0.01" value={form.purchasePrice} onChange={onChange("purchasePrice")} />
          </div>
          <div className="np-field">
            <label>Landing Cost <span className="req">*</span></label>
            <input type="number" step="0.01" value={form.landingCost} onChange={onChange("landingCost")} />
          </div>
          <div className="np-field">
            <label>MRP <span className="req">*</span></label>
            <input type="number" step="0.01" value={form.mrp} onChange={onChange("mrp")} />
          </div>
          <div className="np-field">
            <label>Selling Discount <span className="req">*</span></label>
            <div className="np-prefix">
              <span className="np-curr">₹</span>
              <input type="number" step="0.01" value={form.sellingDiscount} onChange={onChange("sellingDiscount")} />
            </div>
          </div>
          <div className="np-field">
            <label>Selling Price <span className="req">*</span></label>
            <input type="number" step="0.01" value={form.sellingPrice} onChange={onChange("sellingPrice")} />
          </div>
          <div className="np-field">
            <label>Selling Margin <span className="req">*</span></label>
            <div className="np-prefix">
              <span className="np-curr">₹</span>
              <input type="number" step="0.01" value={form.sellingMargin} onChange={onChange("sellingMargin")} />
            </div>
          </div>
          <div className="np-field">
            <label>Online Price <span className="req">*</span></label>
            <input type="number" step="0.01" value={form.onlinePrice} onChange={onChange("onlinePrice")} />
          </div>
          <div className="np-field">
            <label>Minimum Quantity <span className="req">*</span></label>
            <input type="number" value={form.minQty} onChange={onChange("minQty")} />
          </div>
          <div className="np-field">
            <label>Opening Qty</label>
            <input type="number" value={form.openingQty} onChange={onChange("openingQty")} />
          </div>
        </div>

        {!showVariants && (
          <div className="np-variant-note">
            <button type="button" className="btn tiny blue" onClick={() => setShowVariants(true)}>
              Add Variant
            </button>
            <div>
              Add Variants If This Product Comes In Multiple Versions, Like Different Sizes or Colors.
            </div>
          </div>
        )}
      </div>

      {/* Variants */}
      {showVariants && (
        <div className="np-card np-variants">
          <div className="np-var-head">
            <div className="np-var-title">
              <span className="np-var-link">Variants</span>
              <span className="np-var-help">&nbsp;product comes in multiple versions, like different sizes or colors.</span>
            </div>
            <button className="np-var-cancel" onClick={removeVariants}>Cancel</button>
          </div>

          <div className="np-var-lines">
            {options.map((o, i) => (
              <div className={`np-var-line ${i % 2 ? "alt" : ""}`} key={o.id}>
                <div className="np-field">
                  <label>Option Name <span className="req">*</span></label>
                  <input
                    placeholder="Eg. Size, Color"
                    value={o.name}
                    onChange={(e) => updateOption(o.id, "name", e.target.value)}
                  />
                </div>
                <div className="np-field">
                  <label>Option Values <span className="req">*</span></label>
                  <input
                    placeholder="Enter Option Value"
                    value={o.values}
                    onChange={(e) => updateOption(o.id, "values", e.target.value)}
                  />
                </div>
                <button type="button" className="np-var-del" title="Remove" onClick={() => removeOptionRow(o.id)}>
                  ✖
                </button>
              </div>
            ))}

            <div className="np-var-actions">
              <button type="button" className="btn tiny blue" onClick={addOptionRow}>Add Row</button>
              <button type="button" className="btn tiny blue gen" onClick={generateVariantRows}>Generate Variants</button>
            </div>
          </div>

          <div className="np-var-table-wrap">
            <table className="np-var-table">
              <thead>
                <tr>
                  <th>Variant<span className="req">*</span></th>
                  <th>Item Code/Barcode<span className="req">*</span></th>
                  <th>Purchase Price<span className="req">*</span></th>
                  <th>Landing Cost<span className="req">*</span></th>
                  <th>MRP<span className="req">*</span></th>
                  <th>Selling Discount<span className="req">*</span></th>
                  <th>Selling Price<span className="req">*</span></th>
                  <th>Selling Margin<span className="req">*</span></th>
                  <th>Online Price<span className="req">*</span></th>
                  <th>Minimum Qty<span className="req">*</span></th>
                  <th>Opening Qty<span className="req">*</span></th>
                </tr>
              </thead>
              <tbody>
                {variants.length === 0 ? (
                  <tr><td colSpan={11} className="np-var-empty" /></tr>
                ) : (
                  variants.map((v) => (
                    <tr key={v.id}>
                      <td className="mono">{v.label}</td>
                      <td><input value={v.code} onChange={(e)=>updateVariant(v.id,"code",e.target.value)} /></td>
                      <td><input type="number" step="0.01" value={v.purchasePrice} onChange={(e)=>updateVariant(v.id,"purchasePrice",e.target.value)} /></td>
                      <td><input type="number" step="0.01" value={v.landingCost} onChange={(e)=>updateVariant(v.id,"landingCost",e.target.value)} /></td>
                      <td><input type="number" step="0.01" value={v.mrp} onChange={(e)=>updateVariant(v.id,"mrp",e.target.value)} /></td>
                      <td><input type="number" step="0.01" value={v.sellingDiscount} onChange={(e)=>updateVariant(v.id,"sellingDiscount",e.target.value)} /></td>
                      <td><input type="number" step="0.01" value={v.sellingPrice} onChange={(e)=>updateVariant(v.id,"sellingPrice",e.target.value)} /></td>
                      <td><input type="number" step="0.01" value={v.sellingMargin} onChange={(e)=>updateVariant(v.id,"sellingMargin",e.target.value)} /></td>
                      <td><input type="number" step="0.01" value={v.onlinePrice} onChange={(e)=>updateVariant(v.id,"onlinePrice",e.target.value)} /></td>
                      <td><input type="number" value={v.minQty} onChange={(e)=>updateVariant(v.id,"minQty",e.target.value)} /></td>
                      <td><input type="number" value={v.openingQty} onChange={(e)=>updateVariant(v.id,"openingQty",e.target.value)} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="np-footer">
        <div className="np-footer-inner">
          <button className="btn ghost" onClick={handleCancel}>Cancel</button>
          <button className="btn warn" onClick={clearForm}>Clear</button>
          <div className="spacer" />
          <button className="btn primary subtle" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button className="btn primary" onClick={handleSaveAndNew} disabled={saving}>
            {saving ? "Saving…" : "Save & Create New"}
          </button>
        </div>
      </div>

      {/* Modals */}
      <NewUOMModal open={uomModalOpen} onClose={closeUomModal} onSave={saveNewUom} />
      <NewTaxModal open={taxModalOpen} onClose={closeTaxModal} onSave={saveNewTax} prefillName={taxPrefill} />
    </div>
  );
}
