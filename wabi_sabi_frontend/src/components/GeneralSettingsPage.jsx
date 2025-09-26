// src/components/GeneralSettingsPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/GeneralSettingsPage.css";

export default function GeneralSettingsPage() {
  const [tab, setTab] = useState("profile"); // 'profile' | 'taxes' | 'roles'
  const navigate = useNavigate();

  /* ======================= TAXES (as-is) ======================= */
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
  const [taxes, setTaxes] = useState(() => defaultTaxes);
  const [taxSearch, setTaxSearch] = useState("");
  const [taxPage, setTaxPage] = useState(1);
  const [taxPageSize, setTaxPageSize] = useState(10);
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [taxForm, setTaxForm] = useState({ name: "", rate: "" });

  const openTaxModal = () => { setTaxForm({ name: "", rate: "" }); setTaxModalOpen(true); };
  const closeTaxModal = () => setTaxModalOpen(false);
  const onTaxChange = (e) => setTaxForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const saveTax = () => {
    if (!taxForm.name.trim()) return;
    const nextId = taxes.length ? Math.max(...taxes.map((t) => t.id)) + 1 : 1;
    const row = { id: nextId, name: taxForm.name.trim(), rate: Number(taxForm.rate) || 0, createdBy: "System Generated" };
    setTaxes((rows) => [...rows, row]);
    setTaxModalOpen(false);
  };

  const filteredTaxes = useMemo(() => {
    const q = taxSearch.trim().toLowerCase();
    if (!q) return taxes;
    return taxes.filter((t) =>
      [t.name, String(t.rate), t.createdBy].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [taxes, taxSearch]);

  const taxTotalPages = Math.max(1, Math.ceil(filteredTaxes.length / taxPageSize));
  const taxPageClamped = Math.min(taxPage, taxTotalPages);
  const taxStart = (taxPageClamped - 1) * taxPageSize;
  const taxEnd = Math.min(taxStart + taxPageSize, filteredTaxes.length);
  const taxRows = filteredTaxes.slice(taxStart, taxEnd);

  /* ======================= USER ROLES (new) ======================= */
  const defaultRoles = useMemo(
    () => [
      "Tagging 2",
      "Head Manager",
      "IT",
      "Accountant Admin",
      "Tagging Accountant",
      "Accounts Manager",
      "Billing",
      "Default Admin",
      "Purchase Manager",
      "Cashier",
    ].map((name, i) => ({ id: i + 1, name })),
    []
  );

  const [roles, setRoles] = useState(defaultRoles);
  const [roleSearch, setRoleSearch] = useState("");
  const [rolePage, setRolePage] = useState(1);
  const [rolePageSize, setRolePageSize] = useState(10);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: "" });

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, roleSearch]);

  const roleTotalPages = Math.max(1, Math.ceil(filteredRoles.length / rolePageSize));
  const rolePageClamped = Math.min(rolePage, roleTotalPages);
  const roleStart = (rolePageClamped - 1) * rolePageSize;
  const roleEnd = Math.min(roleStart + rolePageSize, filteredRoles.length);
  const roleRows = filteredRoles.slice(roleStart, roleEnd);

  const openRoleModal = () => { setRoleForm({ name: "" }); setRoleModalOpen(true); };
  const closeRoleModal = () => setRoleModalOpen(false);
  const saveRole = () => {
    if (!roleForm.name.trim()) return;
    const nextId = roles.length ? Math.max(...roles.map((r) => r.id)) + 1 : 1;
    setRoles((rs) => [...rs, { id: nextId, name: roleForm.name.trim() }]);
    setRoleModalOpen(false);
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

      {/* Body */}
      <div className="gs-body">
        {/* LEFT tabs */}
        <div className="gs-tabs">
          <button className={`gs-tab ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")} type="button">
            <span className="material-icons">account_circle</span><span>Profile</span>
          </button>
          <button className={`gs-tab ${tab === "taxes" ? "active" : ""}`} onClick={() => setTab("taxes")} type="button">
            <span className="material-icons">request_quote</span><span>Taxes</span>
          </button>
          {/* NEW tab */}
          <button className={`gs-tab ${tab === "roles" ? "active" : ""}`} onClick={() => setTab("roles")} type="button">
            <span className="material-icons">groups</span><span>User Roles</span>
          </button>
        </div>

        {/* RIGHT content */}
        <div className="gs-content">
          {/* ===== PROFILE (unchanged) ===== */}
          {tab === "profile" && (
            <>
              <div className="gs-panel-head">
                <div className="gs-panel-title">
                  <span className="material-icons">account_circle</span>
                  <span>Profile</span>
                </div>
                <button className="gs-icon-btn" type="button" aria-label="Edit profile" onClick={() => navigate("/settings/general/profile/edit")}>
                  <span className="material-icons">edit_square</span>
                </button>
              </div>

              <div className="gs-card">
                {/* Basic Details */}
                <div className="gs-section">
                  <div className="gs-section-head">
                    <span className="material-icons">settings</span>
                    <h3>Basic Details</h3>
                  </div>

                  <div className="gs-kv grid-2-2">
                    <div className="kv"><div className="k">Accounting Type</div><div className="v clamp-2">Ho - branch centralized &amp; decentralised franchise</div></div>
                    <div className="kv muted-col"></div>
                    <div className="kv"><div className="k">Name</div><div className="v">IT Account</div></div>
                    <div className="kv muted-col"><div className="k">Support Email</div><div className="v">&nbsp;</div></div>
                    <div className="kv"><div className="k">Display Name</div><div className="v">&nbsp;</div></div>
                    <div className="kv muted-col"><div className="k">Email</div><div className="v">&nbsp;</div></div>
                    <div className="kv"><div className="k">Contact Name</div><div className="v">&nbsp;</div></div>
                    <div className="kv muted-col"><div className="k">Mobile No.</div><div className="v">+91-7859456858</div></div>
                    <div className="kv"><div className="k">Owner No</div><div className="v">&nbsp;</div></div>
                    <div className="kv muted-col"><div className="k">Customer Care No.</div><div className="v">&nbsp;</div></div>
                  </div>
                </div>

                {/* Communication + Bank */}
                <div className="gs-2col">
                  <div className="gs-section">
                    <div className="gs-section-head"><span className="material-icons">settings</span><h3>Communication Details</h3></div>
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
                    <div className="gs-section-head"><span className="material-icons">settings</span><h3>Bank Details</h3></div>
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
                  <div className="gs-section-head"><span className="material-icons">settings</span><h3>Additional Details</h3></div>
                  <div className="gs-kv grid-2">
                    <div className="kv"><div className="k">User Name</div><div className="v">IT</div></div>
                    <div className="kv"><div className="k">Financial Month Interval</div><div className="v">April - March</div></div>
                    <div className="kv"><div className="k">Default Financial Year</div><div className="v">2025-2026</div></div>
                  </div>
                </div>

                {/* Other Details */}
                <div className="gs-section">
                  <div className="gs-section-head"><span className="material-icons">settings</span><h3>Other Details</h3></div>
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

          {/* ===== TAXES (unchanged UI) ===== */}
          {tab === "taxes" && (
            <>
              <div className="gs-card">
                <div className="tax-head">
                  <div className="tax-title"><span className="material-icons">request_quote</span><span>Tax Master</span></div>
                  <div className="tax-tools">
                    <select className="tax-select" value={taxPageSize} onChange={(e)=>{setTaxPageSize(Number(e.target.value));setTaxPage(1);}}>
                      {[10,50,100,500,1000].map(n=><option key={n} value={n}>{n}</option>)}
                    </select>
                    <div className="tax-search">
                      <input value={taxSearch} onChange={(e)=>setTaxSearch(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&setTaxPage(1)} placeholder="Search List..." />
                      <button className="tax-search-btn" type="button" onClick={()=>setTaxPage(1)} aria-label="Search"><span className="material-icons">search</span></button>
                    </div>
                    <button className="btn primary tax-new" type="button" onClick={openTaxModal}>Create New</button>
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
                      {taxRows.length === 0 ? (
                        <tr><td className="empty" colSpan={6}>Result not found</td></tr>
                      ) : (
                        taxRows.map((r) => (
                          <tr key={r.id}>
                            <td className="chkcol"><span className="tax-ghost-box" aria-hidden="true" /></td>
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
                    {filteredTaxes.length > 0 ? `Showing ${taxStart + 1} to ${taxEnd} of ${filteredTaxes.length} entries` : "Showing 0 to 0 of 0 entries"}
                  </div>
                  <div className="tax-pager">
                    <button className="pg-btn" type="button" disabled={taxPageClamped<=1} onClick={()=>setTaxPage(p=>Math.max(1,p-1))}><span className="material-icons">chevron_left</span></button>
                    <button className="pg-page active" type="button">{taxPageClamped}</button>
                    <button className="pg-btn" type="button" disabled={taxPageClamped>=taxTotalPages} onClick={()=>setTaxPage(p=>Math.min(taxTotalPages,p+1))}><span className="material-icons">chevron_right</span></button>
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
                        <button type="button" className="dlg-x" aria-label="Close" onClick={closeTaxModal}><span className="material-icons">close</span></button>
                      </div>
                      <div className="dlg-body">
                        <div className="fcol">
                          <label htmlFor="tax-name">Tax Name<span className="req">*</span></label>
                          <input id="tax-name" name="name" value={taxForm.name} onChange={onTaxChange} placeholder="Enter Tax Name" className="dlg-input" autoFocus />
                        </div>
                        <div className="fcol">
                          <label htmlFor="tax-rate">Tax Rate</label>
                          <input id="tax-rate" name="rate" value={taxForm.rate} onChange={onTaxChange} placeholder="Enter Tax Rate" className="dlg-input" inputMode="decimal" />
                        </div>
                      </div>
                      <div className="dlg-foot">
                        <button type="button" className="btn outline dlg-close" onClick={closeTaxModal}>Close</button>
                        <button type="button" className="btn primary dlg-save" onClick={saveTax} disabled={!taxForm.name.trim()}>Save</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ===== USER ROLES (new UI) ===== */}
          {tab === "roles" && (
            <div className="gs-card">
              <div className="roles-head">
                <div className="roles-title">
                  <span className="material-icons">groups</span>
                  <span>User Roles</span>
                </div>
                <div className="roles-tools">
                  <select className="roles-select" value={rolePageSize} onChange={(e)=>{setRolePageSize(Number(e.target.value));setRolePage(1);}}>
                    {[10,50,100,500,1000].map(n=> <option key={n} value={n}>{n}</option>)}
                  </select>
                  <div className="roles-search">
                    <input
                      value={roleSearch}
                      onChange={(e)=>setRoleSearch(e.target.value)}
                      onKeyDown={(e)=>e.key==="Enter" && setRolePage(1)}
                      placeholder="Search List..."
                    />
                    <button className="roles-search-btn" type="button" onClick={()=>setRolePage(1)} aria-label="Search">
                      <span className="material-icons">search</span>
                    </button>
                  </div>
                  <button className="btn primary roles-new" type="button" onClick={() => navigate("/settings/general/roles/new")}>Create New</button>
                </div>
              </div>

              <div className="roles-table-wrap">
                <table className="roles-table">
                  <thead>
                    <tr>
                      <th className="numcol">#</th>
                      <th>Role Name</th>
                      <th className="actcol">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roleRows.length === 0 ? (
                      <tr><td className="empty" colSpan={3}>Result not found</td></tr>
                    ) : (
                      roleRows.map((r) => (
                        <tr key={r.id}>
                          <td className="numcol">{r.id}</td>
                          <td>{r.name}</td>
                          <td className="actcol">
                            <button className="icon-mini" title="Edit"><span className="material-icons">edit</span></button>
                            <button className="icon-mini danger" title="Delete"><span className="material-icons">delete</span></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="roles-footer">
                <div className="roles-count">
                  {filteredRoles.length > 0 ? `Showing ${roleStart + 1} to ${roleEnd} of ${filteredRoles.length} entries` : "Showing 0 to 0 of 0 entries"}
                </div>
                <div className="roles-pager">
                  <button className="pg-btn" type="button" disabled={rolePageClamped<=1} onClick={()=>setRolePage(p=>Math.max(1,p-1))}>
                    <span className="material-icons">chevron_left</span>
                  </button>
                  <button className="pg-page active" type="button">{rolePageClamped}</button>
                  <button className="pg-btn" type="button" disabled={rolePageClamped>=roleTotalPages} onClick={()=>setRolePage(p=>Math.min(roleTotalPages,p+1))}>
                    <span className="material-icons">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Create New Role modal */}
              {roleModalOpen && (
                <>
                  <div className="gs-modal-overlay" onClick={closeRoleModal} />
                  <div className="gs-modal" role="dialog" aria-modal="true" aria-labelledby="dlg-title-role">
                    <div className="gs-dialog">
                      <div className="dlg-head">
                        <h3 id="dlg-title-role">New Role</h3>
                        <button type="button" className="dlg-x" aria-label="Close" onClick={closeRoleModal}><span className="material-icons">close</span></button>
                      </div>
                      <div className="dlg-body">
                        <div className="fcol">
                          <label htmlFor="role-name">Role Name<span className="req">*</span></label>
                          <input id="role-name" className="dlg-input" value={roleForm.name} onChange={(e)=>setRoleForm({name:e.target.value})} placeholder="Enter Role Name" autoFocus />
                        </div>
                      </div>
                      <div className="dlg-foot">
                        <button type="button" className="btn outline dlg-close" onClick={closeRoleModal}>Close</button>
                        <button type="button" className="btn primary dlg-save" onClick={saveRole} disabled={!roleForm.name.trim()}>Save</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
