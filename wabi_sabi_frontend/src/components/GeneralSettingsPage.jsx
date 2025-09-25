// src/components/GeneralSettingsPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/GeneralSettingsPage.css";

export default function GeneralSettingsPage() {
  const [tab, setTab] = useState("profile"); // 'profile' | 'taxes'
  const navigate = useNavigate();
  /* ---------- Default taxes (stable) ---------- */
  const defaultTaxes = useMemo(
    () => [
      { id: 1, name: "Gst 15", rate: 15, createdBy: "Krishna Pandit" },
      { id: 2, name: "GST 28", rate: 28, createdBy: "System Generated" },
      { id: 3, name: "GST 18", rate: 18, createdBy: "System Generated" },
      { id: 4, name: "GST 12", rate: 12, createdBy: "System Generated" },
      { id: 5, name: "GST 5", rate: 5, createdBy: "System Generated" },
      { id: 6, name: "NON GST 0", rate: 0, createdBy: "System Generated" },
      { id: 7, name: "EXEMPT 0", rate: 0, createdBy: "System Generated" },
      { id: 8, name: "GST 0", rate: 0, createdBy: "System Generated" },
    ],
    []
  );

  /* ---------- Working taxes state ---------- */
  const [taxes, setTaxes] = useState(() => defaultTaxes);

  /* ---------- Taxes UI state ---------- */
  const [taxSearch, setTaxSearch] = useState("");
  const [taxPage, setTaxPage] = useState(1);
  const [taxPageSize, setTaxPageSize] = useState(10); // 10,50,100,500,1000

  /* ---------- Create New modal state ---------- */
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [taxForm, setTaxForm] = useState({ name: "", rate: "" });

  const openTaxModal = () => {
    setTaxForm({ name: "", rate: "" });
    setTaxModalOpen(true);
  };
  const closeTaxModal = () => setTaxModalOpen(false);
  const onTaxChange = (e) =>
    setTaxForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const saveTax = () => {
    if (!taxForm.name.trim()) return;
    const nextId = taxes.length ? Math.max(...taxes.map((t) => t.id)) + 1 : 1;
    const row = {
      id: nextId,
      name: taxForm.name.trim(),
      rate: Number(taxForm.rate) || 0,
      createdBy: "System Generated",
    };
    setTaxes((rows) => [...rows, row]);
    setTaxModalOpen(false);
  };

  /* ---------- Derived table data ---------- */
  const filteredTaxes = useMemo(() => {
    const q = taxSearch.trim().toLowerCase();
    if (!q) return taxes;
    return taxes.filter((t) =>
      [t.name, String(t.rate), t.createdBy].some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [taxes, taxSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredTaxes.length / taxPageSize));
  const page = Math.min(taxPage, totalPages);
  const startIdx = (page - 1) * taxPageSize;
  const endIdx = Math.min(startIdx + taxPageSize, filteredTaxes.length);
  const pageRows = filteredTaxes.slice(startIdx, endIdx);

  const onSearchClick = () => setTaxPage(1);
  const onPageSizeChange = (e) => {
    setTaxPageSize(Number(e.target.value));
    setTaxPage(1);
  };

  return (
    <div className="gs-wrap">
      {/* Page header */}
      <div className="gs-header">
        <div className="gs-title">
          <span className="material-icons">settings</span>
          <span>General Settings</span>
        </div>
        <div className="gs-breadcrumb">
          <span className="material-icons">home</span>
        </div>
      </div>

      {/* Body: left nav + right content */}
      <div className="gs-body">
        {/* LEFT: tabs */}
        <div className="gs-tabs">
          <button
            className={`gs-tab ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
            type="button"
          >
            <span className="material-icons">account_circle</span>
            <span>Profile</span>
          </button>

          <button
            className={`gs-tab ${tab === "taxes" ? "active" : ""}`}
            onClick={() => setTab("taxes")}
            type="button"
          >
            <span className="material-icons">request_quote</span>
            <span>Taxes</span>
          </button>
        </div>

        {/* RIGHT: content */}
        <div className="gs-content">
          {tab === "profile" && (
            <>
              {/* Panel header */}
              <div className="gs-panel-head">
                <div className="gs-panel-title">
                  <span className="material-icons">account_circle</span>
                  <span>Profile</span>
                </div>
                <button className="gs-icon-btn" type="button" aria-label="Edit profile" onClick={() => navigate("/settings/general/profile/edit")}>
                  <span className="material-icons">edit_square</span>
                </button>
              </div>

              {/* Profile cards */}
              <div className="gs-card">
                {/* Basic Details */}
                <div className="gs-section">
                  <div className="gs-section-head">
                    <span className="material-icons">settings</span>
                    <h3>Basic Details</h3>
                  </div>

                  <div className="gs-kv grid-2-2">
                    <div className="kv">
                      <div className="k">Accounting Type</div>
                      <div className="v clamp-2">
                        Ho - branch centralized &amp; decentralised franchise
                      </div>
                    </div>
                    <div className="kv muted-col"></div>

                    <div className="kv">
                      <div className="k">Name</div>
                      <div className="v">IT Account</div>
                    </div>
                    <div className="kv muted-col">
                      <div className="k">Support Email</div>
                      <div className="v">&nbsp;</div>
                    </div>

                    <div className="kv">
                      <div className="k">Display Name</div>
                      <div className="v">&nbsp;</div>
                    </div>
                    <div className="kv muted-col">
                      <div className="k">Email</div>
                      <div className="v">&nbsp;</div>
                    </div>

                    <div className="kv">
                      <div className="k">Contact Name</div>
                      <div className="v">&nbsp;</div>
                    </div>
                    <div className="kv muted-col">
                      <div className="k">Mobile No.</div>
                      <div className="v">+91-7859456858</div>
                    </div>

                    <div className="kv">
                      <div className="k">Owner No</div>
                      <div className="v">&nbsp;</div>
                    </div>
                    <div className="kv muted-col">
                      <div className="k">Customer Care No.</div>
                      <div className="v">&nbsp;</div>
                    </div>
                  </div>
                </div>

                {/* Communication + Bank */}
                <div className="gs-2col">
                  <div className="gs-section">
                    <div className="gs-section-head">
                      <span className="material-icons">settings</span>
                      <h3>Communication Details</h3>
                    </div>

                    <div className="gs-kv grid-1">
                      <div className="kv"><div className="k">Address</div><div className="v">&nbsp;</div></div>
                      <div className="kv"><div className="k">City</div><div className="v">Gurugram</div></div>
                      <div className="kv"><div className="k">State</div><div className="v">Haryana</div></div>
                      <div className="kv"><div className="k">Country</div><div className="v">India</div></div>
                      <div className="kv"><div className="k">Pin Code</div><div className="v">&nbsp;</div></div>
                      <div className="kv"><div className="k">Timezone</div><div className="v clamp-2">Chennai, Kolkata, Mumbai, New Delhi (UTC+05:30)</div></div>
                      <div className="kv"><div className="k">Web Site</div><div className="v">&nbsp;</div></div>
                      <div className="kv"><div className="k">Latitude</div><div className="v">0.0</div></div>
                      <div className="kv"><div className="k">Longitude</div><div className="v">0.0</div></div>
                    </div>
                  </div>

                  <div className="gs-section">
                    <div className="gs-section-head">
                      <span className="material-icons">settings</span>
                      <h3>Bank Details</h3>
                    </div>

                    <div className="gs-kv grid-1 shaded-right">
                      <div className="kv"><div className="k">Bank Name</div><div className="v">&nbsp;</div></div>
                      <div className="kv"><div className="k">Bank IFSC</div><div className="v">&nbsp;</div></div>
                      <div className="kv"><div className="k">UPI</div><div className="v">&nbsp;</div></div>
                      <div className="kv"><div className="k">Branch Name</div><div className="v">&nbsp;</div></div>
                      <div className="kv"><div className="k">Account Holder Name</div><div className="v">&nbsp;</div></div>
                      <div className="kv"><div className="k">Bank Account No.</div><div className="v">&nbsp;</div></div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="gs-section">
                  <div className="gs-section-head">
                    <span className="material-icons">settings</span>
                    <h3>Additional Details</h3>
                  </div>
                  <div className="gs-kv grid-2">
                    <div className="kv"><div className="k">User Name</div><div className="v">IT</div></div>
                    <div className="kv"><div className="k">Financial Month Interval</div><div className="v">April - March</div></div>
                    <div className="kv"><div className="k">Default Financial Year</div><div className="v">2025-2026</div></div>
                  </div>
                </div>

                {/* Other Details */}
                <div className="gs-section">
                  <div className="gs-section-head">
                    <span className="material-icons">settings</span>
                    <h3>Other Details</h3>
                  </div>
                  <div className="gs-kv grid-1">
                    <div className="kv"><div className="k">CIN No.</div><div className="v">&nbsp;</div></div>
                    <div className="kv"><div className="k">LUT No.</div><div className="v">&nbsp;</div></div>
                    <div className="kv"><div className="k">TAN No.</div><div className="v">&nbsp;</div></div>
                    <div className="kv"><div className="k">IEC No.</div><div className="v">&nbsp;</div></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "taxes" && (
            <>
              {/* Tax Master card */}
              <div className="gs-card">
                <div className="tax-head">
                  <div className="tax-title">
                    <span className="material-icons">request_quote</span>
                    <span>Tax Master</span>
                  </div>

                  <div className="tax-tools">
                    <select
                      className="tax-select"
                      value={taxPageSize}
                      onChange={onPageSizeChange}
                    >
                      {[10, 50, 100, 500, 1000].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>

                    <div className="tax-search">
                      <input
                        value={taxSearch}
                        onChange={(e) => setTaxSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onSearchClick()}
                        placeholder="Search List..."
                      />
                      <button
                        className="tax-search-btn"
                        type="button"
                        aria-label="Search"
                        onClick={onSearchClick}
                      >
                        <span className="material-icons">search</span>
                      </button>
                    </div>

                    <button
                      className="btn primary tax-new"
                      type="button"
                      onClick={openTaxModal}
                    >
                      Create New
                    </button>
                  </div>
                </div>

                <div className="tax-table-wrap">
                  <table className="tax-table">
                    <thead>
                      <tr>
                        <th className="chkcol"></th>
                        <th className="numcol">#</th>
                        <th>Name</th>
                        <th className="ratecol">Rate</th>
                        <th>Created By</th>
                        <th className="actcol">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.length === 0 ? (
                        <tr>
                          <td className="empty" colSpan={6}>Result not found</td>
                        </tr>
                      ) : (
                        pageRows.map((r) => (
                          <tr key={r.id}>
                            <td className="chkcol">
                              <span className="tax-ghost-box" aria-hidden="true" />
                            </td>
                            <td className="numcol">{r.id}</td>
                            <td>{r.name}</td>
                            <td className="ratecol">{r.rate}</td>
                            <td>{r.createdBy}</td>
                            <td className="actcol"></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="tax-footer">
                  <div className="tax-count">
                    {filteredTaxes.length > 0
                      ? `Showing ${startIdx + 1} to ${endIdx} of ${filteredTaxes.length} entries`
                      : "Showing 0 to 0 of 0 entries"}
                  </div>

                  <div className="tax-pager">
                    <button
                      className="pg-btn"
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setTaxPage((p) => Math.max(1, p - 1))}
                    >
                      <span className="material-icons">chevron_left</span>
                    </button>

                    <button className="pg-page active" type="button">{page}</button>

                    <button
                      className="pg-btn"
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setTaxPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <span className="material-icons">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Create New Tax Modal */}
              {taxModalOpen && (
                <>
                  <div className="gs-modal-overlay" onClick={closeTaxModal} />
                  <div className="gs-modal" role="dialog" aria-modal="true" aria-labelledby="dlg-title-tax">
                    <div className="gs-dialog">
                      <div className="dlg-head">
                        <h3 id="dlg-title-tax">New Tax</h3>
                        <button type="button" className="dlg-x" aria-label="Close" onClick={closeTaxModal}>
                          <span className="material-icons">close</span>
                        </button>
                      </div>

                      <div className="dlg-body">
                        <div className="fcol">
                          <label htmlFor="tax-name">
                            Tax Name<span className="req">*</span>
                          </label>
                          <input
                            id="tax-name"
                            name="name"
                            value={taxForm.name}
                            onChange={onTaxChange}
                            placeholder="Enter Tax Name"
                            className="dlg-input"
                            autoFocus
                          />
                        </div>

                        <div className="fcol">
                          <label htmlFor="tax-rate">Tax Rate</label>
                          <input
                            id="tax-rate"
                            name="rate"
                            value={taxForm.rate}
                            onChange={onTaxChange}
                            placeholder="Enter Tax Rate"
                            className="dlg-input"
                            inputMode="decimal"
                          />
                        </div>
                      </div>

                      <div className="dlg-foot">
                        <button type="button" className="btn outline dlg-close" onClick={closeTaxModal}>
                          Close
                        </button>
                        <button
                          type="button"
                          className="btn primary dlg-save"
                          onClick={saveTax}
                          disabled={!taxForm.name.trim()}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
