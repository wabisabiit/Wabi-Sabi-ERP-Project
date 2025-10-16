import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import "../styles/InventoryProductDetailPage.css";

/** Get product data from router state if available; otherwise fallback demo */
function useProductSeed() {
  const { state } = useLocation();
  const fallback = {
    id: 1,
    itemCode: "90799–M",
    name: "(153) (L) Printed Shirt",
    printName: "(L) Printed Shirt",
    category: "Clothing",
    subCategory: "",
    brand: "B4L",
    subBrand: "",
    uom: "Pcs",
    hsn: "63090000",
    salesTax: "GST 5",
    purchaseTax: "GST 5",
    purchaseTaxIncluding: "Yes",
    salesTaxIncluding: "Yes",
    netWeight: "",
    description: "",
    dept: "T-Shirt",
    multipleBatch: "No",
    createdOn: "01/10/2025 11:10:03 AM",
    createdBy: "Krishna Pandit",
    totalQty: 0.0,
    pricing: {
      purchasePrice: 266.67,
      landingCost: 280.0,
      mrp: 1749.0,
      discount: 1050.0,
      price: 699.0,
      margin: 419.0,
      onlinePrice: 699.0,
      minQty: 0.0,
      batch: {
        createdDate: "01/10/2025 11:10:03 AM",
        details: "Batch No : B348370532801749",
        purchasePrice: 266.67,
        landingCost: 280.0,
        mrp: 1749.0,
        discount: 1050.0,
        sellingPrice: 699.0,
        margin: 419.0,
        qty: 0.0,
        disabled: false,
      },
    },
    ledgerRows: [
      { name: "Brand4Less–Tilak Nagar Brand4Less–Tilak Nagar –", date: "01/10/2025", voucherType: "sales", invoiceNo: "INV847", price: 266.67, inQty: 0.0, outQty: 1.0, createdBy: "WABI SABI SUSTAINABILITY LLP", createdOn: "01/10/2025, 11:11:18 AM", closing: 0.0 },
      { name: "-", date: "01/04/2025", voucherType: "new", invoiceNo: "Opening Stock", price: 266.67, inQty: 1.0, outQty: 0.0, createdBy: "Krishna Pandit", createdOn: "01/10/2025, 11:10:03 AM", closing: 1.0 },
    ],
    variantLabel: "(153) (L) Printed Shirt -",
    barcodes: ["90799–M"],
  };

  if (state?.row) {
    const r = state.row;
    return {
      ...fallback,
      id: r.id,
      itemCode: r.itemCode,
      name: r.name,                // ← from list row (Product.name or computed)
      brand: r.brand,
      category: r.category,        // ← from TaskMaster via mapper
      mrp: r.mrp,
      hsn: r.hsn,
      createdOn: r.createdOn || fallback.createdOn, // ← from Product table
      // keep fallback pricing/other fields
    };
  }
  return fallback;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const seed = useProductSeed();

  const [tab, setTab] = useState("details");
  const [pricing, setPricing] = useState(seed.pricing);
  const [barcodes, setBarcodes] = useState(seed.barcodes);
  const [newCode, setNewCode] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);

  /** ---------- Image upload (modal) ---------- */
  const [images, setImages] = useState([]);
  const [imgModalOpen, setImgModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => images.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  const acceptFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const remainingSlots = Math.max(0, 10 - images.length);
    const pick = files.slice(0, remainingSlots);
    const urls = pick.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...urls]);
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    acceptFiles(e.dataTransfer.files);
  };

  /** ---------- Multi-barcode (row delete confirm) ---------- */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // code to delete

  const handleAddCode = () => {
    const v = newCode.trim();
    if (!v) return;
    if (barcodes.includes(v)) return alert("Already added.");
    setBarcodes((l) => [...l, v]);
    setNewCode("");
  };
  const askDeleteCode = (code) => {
    setPendingDelete(code);
    setConfirmOpen(true);
  };
  const confirmDelete = () => {
    if (pendingDelete) setBarcodes((l) => l.filter((c) => c !== pendingDelete));
    setPendingDelete(null);
    setConfirmOpen(false);
  };
  const cancelDelete = () => {
    setPendingDelete(null);
    setConfirmOpen(false);
  };

  /** ---------- Top-right actions ---------- */
  const [productConfirmOpen, setProductConfirmOpen] = useState(false);

  const goToProducts = () => navigate("/inventory/products");

  const handleEdit = () => {
    navigate(`/inventory/products/${seed.id || id}/edit`, {
      state: {
        row: {
          id: seed.id || id,
          itemCode: seed.itemCode,
          name: seed.name,
          brand: seed.brand,
          category: seed.category,
          mrp: seed.pricing?.mrp ?? seed.mrp,
          hsn: seed.hsn,
        },
        merged: true,
      },
      replace: false,
    });
  };

  const askDeleteProduct = () => setProductConfirmOpen(true);
  const confirmDeleteProduct = () => {
    // put your API deletion here if needed, then bounce to list
    goToProducts();
  };
  const cancelDeleteProduct = () => setProductConfirmOpen(false);

  return (
    <div className="pd-wrap page-bg">
      <div className="pd-top">
        <div className="pd-title">{seed.name}</div>
        <div className="pd-breadcrumb">
          &nbsp;–&nbsp;
          <button
            type="button"
            className="pd-bc-link"
            onClick={goToProducts}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToProducts();
              }
            }}
            aria-label="Go to Products list"
            title="Go to Products"
          >
            Product
          </button>
        </div>
      </div>

      <div className="pd-card">
        {/* Tabs */}
        <div className="pd-tabs">
          <button className={tab === "details" ? "active" : ""} onClick={() => setTab("details")}>Product Details</button>
          <button className={tab === "ledger" ? "active" : ""} onClick={() => setTab("ledger")}>Product Ledger</button>
          <button className={tab === "pricing" ? "active" : ""} onClick={() => setTab("pricing")}>Pricing Details</button>
          <button className={tab === "barcode" ? "active" : ""} onClick={() => setTab("barcode")}>Multi Barcode</button>

          <div className="pd-actions">
            <button className="edit" title="Edit" onClick={handleEdit}>
              <span className="mi">edit</span>
            </button>
            <button className="danger delete" title="Delete" onClick={askDeleteProduct}>
              <span className="mi">delete</span>
            </button>
          </div>
        </div>

        {/* TAB: Product Details */}
        {tab === "details" && (
          <div className="pd-panel">
            <div className="pd-row">
              {/* image */}
              <button
                className="pd-thumb"
                title="Add New Image"
                onClick={() => setImgModalOpen(true)}
                style={{
                  background: images.length ? `center/cover no-repeat url("${images[0]}")` : undefined,
                }}
              />
              <div className="pd-head">
                <div className="pd-name">{seed.name}</div>
                <div className="pd-sub">
                  <div className="pd-line">
                    <div className="pd-lbl">Short Description</div>
                    <div className="pd-val">&nbsp;</div>
                  </div>
                  <div className="pd-line">
                    <div className="pd-lbl">Description</div>
                    <div className="pd-val">&nbsp;</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pd-grid">
              <div className="pd-kv">
                <div className="k">Print Name</div><div className="v">{seed.printName}</div>
                <div className="k">Multiple Batch</div><div className="v">{seed.multipleBatch}</div>
                <div className="k">Department</div><div className="v">{seed.dept}</div>
                <div className="k">Category</div><div className="v">{seed.category}</div>
                <div className="k">Sub Category</div><div className="v">{seed.subCategory || "-"}</div>
                <div className="k">Purchase Tax</div><div className="v">{seed.purchaseTax}</div>
                <div className="k">Purchase Tax Including</div><div className="v">{seed.purchaseTaxIncluding}</div>
                <div className="k">Net Weight</div><div className="v">{seed.netWeight || "-"}</div>
              </div>

              <div className="pd-kv">
                <div className="k">Unit of Measurement</div><div className="v">{seed.uom}</div>
                <div className="k">HSN Code</div><div className="v">{seed.hsn}</div>
                <div className="k">Brand</div><div className="v">{seed.brand}</div>
                <div className="k">Sub Brand</div><div className="v">{seed.subBrand || "-"}</div>
                <div className="k">Sales Tax</div><div className="v">{seed.salesTax}</div>
                <div className="k">Sales Tax Including</div><div className="v">{seed.salesTaxIncluding}</div>
                <div className="k">Ingredients</div><div className="v">-</div>
                <div className="k">Cess</div><div className="v">No</div>
                <div className="k">Created On</div><div className="v">{seed.createdOn}</div>
                <div className="k">Created By</div><div className="v">{seed.createdBy}</div>
              </div>

              <div className="pd-box">
                <div className="pd-box-title-row"><div className="left">Nutrition Name</div><div className="right">Nutrition Value</div></div>
                <div className="pd-box-row single"><span className="left">&nbsp;</span><b className="right">Data Not Available</b></div>
                <div className="pd-box-title mt">Total Qty</div>
                <div className="pd-box-row"><b>{seed.totalQty.toFixed(2)}</b></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Product Ledger */}
        {tab === "ledger" && (
          <div className="pd-panel">
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th><th>Name</th><th>Date</th><th>Voucher Type</th><th>Invoice No</th>
                    <th>Price</th><th>In Qty</th><th>Out Qty</th><th>Created By</th><th>Created On</th><th>Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {seed.ledgerRows.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td><td className="wrap">{r.name}</td><td>{r.date}</td><td>{r.voucherType}</td>
                      <td className="link">{r.invoiceNo}</td><td>{r.price.toFixed(2)}</td><td>{r.inQty.toFixed(2)}</td>
                      <td>{r.outQty.toFixed(2)}</td><td className="wrap">{r.createdBy}</td><td className="wrap">{r.createdOn}</td><td>{r.closing.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="tbl-foot">Showing 1 to 2 of 2 entries</div>
              <div className="tbl-pages"><button className="page active">1</button></div>
            </div>
          </div>
        )}

        {/* TAB: Pricing Details */}
        {tab === "pricing" && (
          <div className="pd-panel">
            <div className="pricing-top">
              <table className="tbl head pricing-table">
                <colgroup>
                  <col /><col /><col /><col />
                  <col /><col /><col />
                  <col /><col /><col />
                </colgroup>
                <thead>
                  <tr className="tier1">
                    <th rowSpan={2}>Item Code/Barcode</th>
                    <th rowSpan={2}>Purchase Price</th>
                    <th rowSpan={2}>Landing Cost</th>
                    <th rowSpan={2}>MRP</th>
                    <th className="group-head" colSpan={3}>Selling</th>
                    <th rowSpan={2}>Online Price</th>
                    <th rowSpan={2}>Minimum Qty</th>
                    <th rowSpan={2}>Batch Price with Qty</th>
                  </tr>
                  <tr className="tier2">
                    <th>Discount</th>
                    <th>Price</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{seed.itemCode}</td>
                    <td>{pricing.purchasePrice.toFixed(2)}</td>
                    <td>{pricing.landingCost.toFixed(2)}</td>
                    <td>{pricing.mrp.toFixed(2)}</td>
                    <td>₹{pricing.discount.toFixed(2)}</td>
                    <td>{pricing.price.toFixed(2)}</td>
                    <td>₹{pricing.margin.toFixed(2)}</td>
                    <td>{pricing.onlinePrice.toFixed(2)}</td>
                    <td>{pricing.minQty.toFixed(1)}</td>
                    <td>
                      <button
                        className={`btn-sm toggle ${batchOpen ? "open" : ""}`}
                        onClick={() => setBatchOpen((v) => !v)}
                        aria-expanded={batchOpen}
                        aria-controls="batch-table"
                      >
                        <span>Batch</span><span className="caret">▾</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {batchOpen && (
              <div id="batch-table" className="batch-table-wrap">
                <table className="tbl batch-table">
                  <colgroup>
                    <col /><col /><col /><col /><col />
                    <col /><col /><col /><col /><col /><col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Created Date</th>
                      <th>Batch Details</th>
                      <th>Purchase Price</th>
                      <th>Landing Cost</th>
                      <th>MRP</th>
                      <th>Discount</th>
                      <th>Selling Price</th>
                      <th>Margin</th>
                      <th>Qty</th>
                      <th>Batch Disable</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>{pricing.batch.createdDate}</td>
                      <td className="wrap">{pricing.batch.details}</td>
                      <td>{pricing.batch.purchasePrice.toFixed(2)}</td>
                      <td>{pricing.batch.landingCost.toFixed(2)}</td>
                      <td>
                        <input
                          className="cell-input"
                          value={pricing.batch.mrp}
                          onChange={(e) => setPricing((p) => ({ ...p, batch: { ...p.batch, mrp: e.target.value } }))}
                        />
                      </td>
                      <td>₹{pricing.batch.discount.toFixed(2)}</td>
                      <td>
                        <input
                          className="cell-input"
                          value={pricing.batch.sellingPrice}
                          onChange={(e) => setPricing((p) => ({ ...p, batch: { ...p.batch, sellingPrice: e.target.value } }))}
                        />
                      </td>
                      <td>₹{pricing.batch.margin.toFixed(2)}</td>
                      <td>{pricing.batch.qty.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: Multi Barcode */}
        {tab === "barcode" && (
          <div className="pd-panel">
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>#</th><th>Variant</th></tr></thead>
                <tbody><tr><td>1</td><td className="mono">{seed.variantLabel}</td></tr></tbody>
              </table>

              <div className="tbl mt8">
                <table className="tbl inner">
                  <thead><tr><th>ItemCode</th><th>Action</th></tr></thead>
                  <tbody>
                    {barcodes.map((c, idx) => (
                      <tr key={c}>
                        <td className="mono">{c}</td>
                        <td>
                          {idx !== 0 && (
                            <button className="icon-btn" title="Delete" onClick={() => askDeleteCode(c)}>
                              <span className="mi">delete</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="barcode-right-card mt8">
                <input
                  className="barcode-input"
                  placeholder="ItemCode"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
                <button className="btn primary" onClick={handleAddCode}>Add</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Upload Modal */}
      {imgModalOpen && (
        <div
          className="pd-img-overlay"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <div className="pd-img-card" role="dialog" aria-modal="true">
            <div className="pd-img-head">
              <div className="title">Image</div>
              <button
                className="x"
                onClick={() => setImgModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="pd-img-body">
              <div
                className="pd-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="dz-text">
                  <div className="main">Drop Files here or Click to Upload.</div>
                  <div className="sub">
                    We recommend adding up to 10 files at a time.
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => acceptFiles(e.target.files)}
              />
            </div>

            <div className="pd-img-foot">
              <button className="btn ghost" onClick={() => setImgModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Delete Confirmation */}
      {confirmOpen && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-card">
            <div className="confirm-icon">!</div>
            <div className="confirm-title">Are You Sure?</div>
            <div className="confirm-sub">You Won't Be Able To Revert This!</div>
            <div className="confirm-actions">
              <button className="btn yes" onClick={confirmDelete}>
                Yes, Delete It!
              </button>
              <button className="btn cancel" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation */}
      {productConfirmOpen && (
        <div className="confirm-overlay" role="dialog" aria-modal="true">
          <div className="confirm-card">
            <div className="confirm-icon">!</div>
            <div className="confirm-title">Delete this Product?</div>
            <div className="confirm-sub">You Won't Be Able To Revert This!</div>
            <div className="confirm-actions">
              <button className="btn yes" onClick={confirmDeleteProduct}>
                Yes, Delete It!
              </button>
              <button className="btn cancel" onClick={cancelDeleteProduct}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
