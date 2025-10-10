import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "../styles/NewInvoicePage.css";

/* ---------------- Demo data (replace with API) ---------------- */
const CUSTOMERS = [
  {
    id: 1,
    name: "DHEERAJ 9911905095",
    phone: "+91-9911905095",
    billing: {
      line1: "DHEERAJ",
      line2: "West Delhi,",
      line3: "Delhi , India",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      pincode: "",
    },
    shipping: {
      line1: "DHEERAJ",
      line2: "West Delhi,",
      line3: "Delhi , India",
      city: "West Delhi",
      state: "Delhi",
      country: "India",
      pincode: "",
    },
  },
  {
    id: 2,
    name: "DHIRENDRA 7667580928",
    phone: "+91-7667580928",
    billing: {
      line1: "DHIRENDRA",
      line2: "Kanpur,",
      line3: "UP , India",
      city: "Kanpur",
      state: "Uttar Pradesh",
      country: "India",
      pincode: "",
    },
    shipping: {
      line1: "DHIRENDRA",
      line2: "Kanpur,",
      line3: "UP , India",
      city: "Kanpur",
      state: "Uttar Pradesh",
      country: "India",
      pincode: "",
    },
  },
];

const PAYMENT_TERMS = ["90 Days", "60 Days", "30 Days", "15 Days", "7 Days"];
const CREATE_FROM = ["Sales Order", "Delivery Challan"];
const SALESMEN = ["IT Account", "Select Employee", "sandeep", "Rajdeep", "Nishant", "Krishna Pandit"];
const TAX_TYPES = ["Default", "Tax Inclusive", "Tax Exclusive", "Out of Scope"];
const LEDGERS = ["Sales"];

const SHIPPING_TYPES = ["Delivery", "Pickup"];
const TRANSPORTERS = ["Select Transport Name"];

/* ===== Countries (full ISO-ish list) ===== */
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla","Antarctica","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","British Indian Ocean Territory","Brunei Darussalam","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Cayman Islands","Central African Republic","Chad","Chile","China","Christmas Island","Cocos (Keeling) Islands","Colombia","Comoros","Congo","Congo, Democratic Republic of the","Cook Islands","Costa Rica","Côte d’Ivoire","Croatia","Cuba","Curaçao","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Falkland Islands","Faroe Islands","Fiji","Finland","France","French Guiana","French Polynesia","Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guadeloupe","Guam","Guatemala","Guernsey","Guinea","Guinea-Bissau","Guyana","Haiti","Holy See","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Jamaica","Japan","Jersey","Jordan","Kazakhstan","Kenya","Kiribati","Korea, North","Korea, South","Kuwait","Kyrgyzstan","Lao PDR","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macao","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Martinique","Mauritania","Mauritius","Mayotte","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Caledonia","New Zealand","Nicaragua","Niger","Nigeria","Niue","Norfolk Island","North Macedonia","Northern Mariana Islands","Norway","Oman","Pakistan","Palau","Palestine, State of","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Pitcairn","Poland","Portugal","Puerto Rico","Qatar","Réunion","Romania","Russian Federation","Rwanda","Saint Barthélemy","Saint Helena","Saint Kitts and Nevis","Saint Lucia","Saint Martin","Saint Pierre and Miquelon","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Sint Maarten","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Svalbard and Jan Mayen","Sweden","Switzerland","Syrian Arab Republic","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tokelau","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Turks and Caicos Islands","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Venezuela","Viet Nam","Virgin Islands (British)","Virgin Islands (U.S.)","Wallis and Futuna","Western Sahara","Yemen","Zambia","Zimbabwe"
];

/* ===== India: All States/UTs ===== */
const INDIA_STATES = [
  "Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"
];

/* sample cities for demo */
const SAMPLE_CITIES_INDIA = [
  "West Delhi","New Delhi","Mumbai","Pune","Bengaluru","Chennai","Hyderabad","Kolkata","Ahmedabad","Chandigarh","Ujjain","Ernakulam","Jalgaon","RAIPUR","Godavarikhani"
];

const AC_TAXES = [
  { key:"gst15", label:"Gst 15 (15.0%)", pct:15 },
  { key:"gst28", label:"Gst 28 (28.0%)", pct:28 },
  { key:"gst18", label:"Gst 18 (18.0%)", pct:18 },
  { key:"gst12", label:"Gst 12 (12.0%)", pct:12 },
  { key:"gst5",  label:"Gst 5 (5.0%)",  pct:5  },
  { key:"none",  label:"None",          pct:0  },
];

/* ---------------- Helpers ---------------- */
const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/* ---------------- Generic Popover ---------------- */
function Popover({ open, anchorRef, onClose, children, width, align = "left" }) {
  const [style, setStyle] = useState({ top: 0, left: 0, width: width || undefined });

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const w = width || r.width;
    setStyle({
      top: Math.round(r.bottom + 6),
      left: Math.round(align === "right" ? r.right - w : r.left),
      width: Math.round(w),
    });
  }, [open, anchorRef, width, align]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    const onAway = (e) => {
      const inAnchor = anchorRef?.current?.contains(e.target);
      const inPop = e.target.closest?.(".pop");
      if (!inAnchor && !inPop) onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    window.addEventListener("mousedown", onAway);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("mousedown", onAway);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return <div className="pop" style={style}>{children}</div>;
}

/* ---------------- Searchable Select ---------------- */
function SelectSearch({ value, onChange, options, placeholder = "Select", buttonClass = "btn-sel w" }) {
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inpRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inpRef.current?.focus(), 0);
    }
  }, [open]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.toLowerCase().includes(t));
  }, [q, options]);

  return (
    <>
      <button ref={btnRef} className={buttonClass} onClick={() => setOpen((v) => !v)}>
        {value || placeholder} <span className="mi">expand_more</span>
      </button>
      <Popover open={open} anchorRef={btnRef} onClose={() => setOpen(false)}>
        <div className="sel-pop">
          <div className="sel-search">
            <input ref={inpRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="" />
          </div>
          <div className="sel-list">
            {list.length === 0 && <div className="hint">No results found</div>}
            {list.map((o) => (
              <div
                key={o}
                className={`mi-item ${value === o ? "sel" : ""}`}
                onMouseDown={() => {
                  onChange(o);
                  setOpen(false);
                }}
              >
                {o}
              </div>
            ))}
          </div>
        </div>
      </Popover>
    </>
  );
}

/* ---------------- Customer select (typeahead + clear) ---------------- */
function CustomerSelect({ value, onSelect }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const list = useMemo(() => {
    const t = (q || "").toLowerCase();
    if (!t) return [];
    return CUSTOMERS.filter((c) => c.name.toLowerCase().includes(t));
  }, [q]);
  useEffect(() => {
    const onAway = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onAway);
    return () => document.removeEventListener("mousedown", onAway);
  }, []);
  useEffect(() => {
    if (!value) setQ("");
  }, [value]);
  const clear = () => {
    setQ("");
    onSelect?.(null);
    setOpen(false);
  };
  const selectedDisplay = value
    ? value.name?.includes(value.phone || "")
      ? value.name
      : `${value.name}${value.phone ? ` ${value.phone}` : ""}`
    : "";
  const displayText = q !== "" ? q : selectedDisplay;
  return (
    <div className="cust-select" ref={wrapRef}>
      <div className="inp-wrap">
        <input
          className="inp cust-inp"
          placeholder="Search Customer"
          value={displayText}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
        />
        {displayText?.length > 0 && (
          <button
            className="clear-btn"
            title="Clear"
            onMouseDown={(e) => {
              e.preventDefault();
              clear();
            }}
          >
            ×
          </button>
        )}
        <span className="mi">expand_more</span>
      </div>
      {open && (
        <div className="cust-dd">
          {!q && <div className="hint">Please enter 1 or more characters</div>}
          {q && list.length === 0 && <div className="hint">No results</div>}
          {list.map((c) => (
            <div
              key={c.id}
              className="cust-item"
              onMouseDown={() => {
                onSelect(c);
                setOpen(false);
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- AC Name selector + New AC modal ---------------- */
function AdditionalChargeSelector({ value, onChange, onAddNewClick }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return value.options.filter((o) => o.label.toLowerCase().includes(t));
  }, [q, value.options]);
  const canAdd = q.trim().length >= 2;
  return (
    <div className="sel-input" ref={ref}>
      <input
        className="inp"
        placeholder="Search Additional"
        value={value.currentText}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setOpen(true);
          value.setCurrentText(e.target.value);
          setQ(e.target.value);
        }}
      />
      <span className="mi">expand_more</span>
      <Popover open={open} anchorRef={ref} onClose={() => setOpen(false)}>
        <div className="ac-name-pop">
          <div className="sel-search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="" autoFocus />
          </div>
          <div className="sel-list">
            {q.trim().length < 2 && <div className="hint">Please enter 2 or more characters</div>}
            {q.trim().length >= 2 && list.length === 0 && <div className="hint">No results</div>}
            {list.map((opt) => (
              <div
                key={opt.id}
                className="mi-item"
                onMouseDown={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
          {canAdd && (
            <div className="ac-dd-footer">
              <button
                className="ac-dd-btn"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  onAddNewClick(q);
                }}
              >
                + Add Additional Charge
              </button>
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
}

function NewACModal({ open, onClose, onSave, presetName }) {
  const [name, setName] = useState(presetName || "");
  const [value, setValue] = useState("");
  const [taxKey, setTaxKey] = useState("gst15");
  const [group, setGroup] = useState("Indirect Incomes");
  const [hsn, setHsn] = useState("");
  useEffect(() => {
    if (open) {
      setName(presetName || "");
      setValue("");
      setTaxKey("gst15");
      setGroup("Indirect Incomes");
      setHsn("");
    }
  }, [open, presetName]);
  if (!open) return null;
  return (
    <div className="modal">
      <div className="modal-card">
        <div className="modal-head">
          <b>New Additional Charge</b>
          <button className="modal-x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="mb-row">
            <label>
              Additional Charge<span className="req">*</span>
            </label>
            <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-row">
            <label>
              Default Value<span className="req">*</span>
            </label>
            <div className="currency-wrap">
              <span className="cur">₹</span>
              <input className="inp" value={value} onChange={(e) => setValue(e.target.value)} />
              {value && (
                <button className="mini-x" onClick={() => setValue("")}>
                  ×
                </button>
              )}
            </div>
          </div>
          <div className="mb-row">
            <label>
              Select Tax<span className="req">*</span>
            </label>
            <div className="select">
              <select value={taxKey} onChange={(e) => setTaxKey(e.target.value)}>
                {AC_TAXES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span className="mi">expand_more</span>
            </div>
          </div>
          <div className="mb-row">
            <label>
              Select Group<span className="req">*</span>
            </label>
            <div className="select">
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                <option>Direct Incomes</option>
                <option>Indirect Incomes</option>
              </select>
              <span className="mi">expand_more</span>
            </div>
          </div>
          <div className="mb-row">
            <label>HSN/SAC</label>
            <input className="inp" value={hsn} onChange={(e) => setHsn(e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button
            className="btn primary"
            onClick={() => onSave({ name, defaultValue: Number(value) || 0, taxKey, group, hsn })}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Mini Address Picker (tiny box) ---------- */
function AddressMiniPop({ open, anchorRef, onClose, title, addr, phone, onSelect }) {
  return (
    <Popover open={open} anchorRef={anchorRef} onClose={onClose} width={220}>
      <div className="addr-pop">
        <div className="addr-pop-head">
          <span className="addr-pop-title">{title}</span>
          <button className="addr-pop-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
        <div className="addr-pop-body">
          <div className="addr-name">{addr?.line1 || "-"}</div>
          <div className="addr-lines">
            <div>{addr?.line2 || ""}</div>
            <div>{addr?.line3 || ""}</div>
          </div>
          <div className="addr-phone">
            <span className="mi">call</span> {phone || ""}
          </div>
          <div className="addr-pop-actions">
            <button
              className="addr-select"
              onClick={() => {
                onSelect?.();
                onClose?.();
              }}
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </Popover>
  );
}

/* ---------- Edit Shipping Address MODAL ---------- */
function EditShippingModal({ open, onClose, initial, phone, onSubmit }) {
  const [company, setCompany] = useState(initial?.line1 || "");
  const [addr1, setAddr1] = useState(initial?.line2 || "");
  const [addr2, setAddr2] = useState(initial?.line3 || "");
  const [country, setCountry] = useState(initial?.country || "India");
  const [state, setState] = useState(initial?.state || "Delhi");
  const [city, setCity] = useState(initial?.city || "West Delhi");
  const [pin, setPin] = useState(initial?.pincode || "");
  const [mobile] = useState(phone || "");

  useEffect(() => {
    if (!open) return;
    setCompany(initial?.line1 || "");
    setAddr1(initial?.line2 || "");
    setAddr2(initial?.line3 || "");
    setCountry(initial?.country || "India");
    setState(initial?.state || "Delhi");
    setCity(initial?.city || "West Delhi");
    setPin(initial?.pincode || "");
  }, [open, initial]);

  const statesForCountry = useMemo(() => (country === "India" ? INDIA_STATES : []), [country]);
  const citiesForState = useMemo(() => (country === "India" ? SAMPLE_CITIES_INDIA : []), [country, state]);

  if (!open) return null;
  return (
    <div className="modal">
      <div className="ship-edit-card">
        <div className="ship-edit-head">
          <b>Edit Shipping Address</b>
          <button className="modal-x" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ship-edit-body">
          <div className="se-grid">
            <div className="se-fld">
              <label>Shipping Company Name:</label>
              <input
                className="inp"
                placeholder="Shipping Company Name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div className="se-fld">
              <label>Mobile Number:</label>
              <div className="se-phone">
                <span className="se-flag">🇮🇳</span>
                <span className="se-cc">+91</span>
                <input className="se-ph-inp" value={mobile.replace("+91-", "").replace("+91", "")} readOnly />
              </div>
            </div>

            <div className="se-fld">
              <label>Shipping Address Line 1:</label>
              <input
                className="inp"
                placeholder="Shipping Address Line 1"
                value={addr1}
                onChange={(e) => setAddr1(e.target.value)}
              />
            </div>

            <div className="se-fld">
              <label>Shipping Address Line 2:</label>
              <input
                className="inp"
                placeholder="Shipping Address Line 2"
                value={addr2}
                onChange={(e) => setAddr2(e.target.value)}
              />
            </div>

            <div className="se-fld">
              <label>Select Shipping Country:</label>
              <SelectSearch
                value={country}
                onChange={(v) => {
                  setCountry(v);
                  setState("");
                  setCity("");
                }}
                options={COUNTRIES}
                placeholder="Country"
              />
            </div>

            <div className="se-fld">
              <label>Select Shipping State:</label>
              <SelectSearch value={state} onChange={setState} options={statesForCountry} placeholder="State" />
            </div>

            <div className="se-fld">
              <label>Select Shipping City:</label>
              <SelectSearch value={city} onChange={setCity} options={citiesForState} placeholder="City" />
            </div>

            <div className="se-fld">
              <label>Shipping Pin code:</label>
              <input className="inp" placeholder="Pincode" value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="ship-edit-foot">
          <button
            className="btn primary"
            onClick={() => {
              onSubmit({
                line1: company || initial?.line1 || "",
                line2: addr1 || "",
                line3: addr2 || "",
                country: country || "",
                state: state || "",
                city: city || "",
                pincode: pin || "",
              });
              onClose();
            }}
          >
            Submit
          </button>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Main Page ---------------- */
export default function NewInvoicePage() {
  const [activeTab, setActiveTab] = useState("products");

  const [customer, setCustomer] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [reverseCharge, setReverseCharge] = useState("No");
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [invoiceNo, setInvoiceNo] = useState("991");
  const [taxType, setTaxType] = useState("Default");
  const [paymentTerm, setPaymentTerm] = useState("");
  const [createFrom, setCreateFrom] = useState("Select");
  const [salesman, setSalesman] = useState("IT Account");
  const [exportSEZ, setExportSEZ] = useState(false);
  const [ledger, setLedger] = useState("Sales");
  const [paymentReminder, setPaymentReminder] = useState(false);

  /* >>> Shipping tab state (declared early; used later) */
  const [shippingType, setShippingType] = useState("Delivery");
  const [shippingDate, setShippingDate] = useState(todayISO());
  const [referenceNo, setReferenceNo] = useState("");
  const [transportDate, setTransportDate] = useState(todayISO());
  const [modeOfTransport, setModeOfTransport] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [weight, setWeight] = useState("");

  // Upload controls (COMMON button)
  const [uploadOpen, setUploadOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  // shipping override after editing
  const [shippingOverride, setShippingOverride] = useState(null);
  const billing = customer?.billing;
  const shipping = shippingOverride || customer?.shipping;

  /* --------- Product rows --------- */
  const [rows, setRows] = useState([]);
  useEffect(() => {
    if (customer && rows.length === 0) {
      setRows([
        {
          id: 1,
          salesman: "",
          itemcode: "",
          product: "",
          batch: "",
          qty: 0,
          free: 0,
          price: 0,
          dis1: 0,
          dis2: 0,
          taxPct: 0,
        },
      ]);
    }
    if (!customer) {
      setRows([]);
      setAcRows([]);
      setShippingOverride(null);
    }
  }, [customer]); // eslint-disable-line

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        id: r.length ? r[r.length - 1].id + 1 : 1,
        salesman: "",
        itemcode: "",
        product: "",
        batch: "",
        qty: 0,
        free: 0,
        price: 0,
        dis1: 0,
        dis2: 0,
        taxPct: 0,
      },
    ]);
  const updateRow = (id, patch) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  /* --------- Additional charge master + rows --------- */
  const [acMaster, setAcMaster] = useState([
    { id: "ac-shipping", label: "Shipping Charges", defaultValue: 0, taxKey: "gst18", group: "Indirect Incomes", hsn: "" },
    { id: "ac-packing", label: "Packing Charges", defaultValue: 0, taxKey: "gst12", group: "Indirect Incomes", hsn: "" },
  ]);
  const [acRows, setAcRows] = useState([]);
  const addACRow = () => setAcRows((r) => [...r, { id: r.length ? r[r.length - 1].id + 1 : 1, name: "", value: 0, taxKey: "gst15" }]);
  const updateAC = (id, patch) => setAcRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  /* --------- New AC modal --------- */
  const [acModalOpen, setAcModalOpen] = useState(false);
  const [presetACName, setPresetACName] = useState("");
  const [activeRowIdForNewAC, setActiveRowIdForNewAC] = useState(null);
  const openNewAC = (text, rowId) => {
    setPresetACName(text || "");
    setActiveRowIdForNewAC(rowId);
    setAcModalOpen(true);
  };
  const saveNewAC = ({ name, defaultValue, taxKey, group, hsn }) => {
    const id = `ac-${Date.now()}`;
    const option = { id, label: name, defaultValue, taxKey, group, hsn };
    setAcMaster((prev) => [...prev, option]);
    if (activeRowIdForNewAC != null) {
      updateAC(activeRowIdForNewAC, { name, value: defaultValue, taxKey });
    }
    setAcModalOpen(false);
  };

  const acTotals = useMemo(() => {
    let sum = 0,
      valSum = 0;
    const rows = acRows.map((r) => {
      const taxPct = AC_TAXES.find((t) => t.key === r.taxKey)?.pct ?? 0;
      const val = Number(r.value) || 0;
      const taxAmt = val * (taxPct / 100);
      const total = val + taxAmt;
      valSum += val;
      sum += total;
      return { ...r, taxAmt, total };
    });
    return { rows, valueSum: valSum, grand: sum };
  }, [acRows]);

  /* --------- Totals from product rows --------- */
  const computed = useMemo(() => {
    let gross = 0,
      discount = 0,
      taxable = 0,
      tax = 0,
      total = 0,
      qty = 0;
    const items = rows.map((r) => {
      const price = Number(r.price) || 0,
        q = Number(r.qty) || 0,
        d1 = Number(r.dis1) || 0,
        d2 = Number(r.dis2) || 0,
        taxPct = Number(r.taxPct) || 0;
      const lineGross = price * q,
        afterD1 = lineGross * (1 - d1 / 100),
        afterD2 = afterD1 * (1 - d2 / 100),
        lineTax = afterD2 * (taxPct / 100),
        lineTotal = afterD2 + lineTax;
      qty += q;
      gross += lineGross;
      discount += lineGross - afterD2;
      taxable += afterD2;
      tax += lineTax;
      total += lineTotal;
      return { ...r, lineGross, lineTax, lineTotal, taxable: afterD2 };
    });
    return { items, totals: { gross, discount, taxable, tax, roundoff: 0, net: total, qty } };
  }, [rows]);

  /* ===================== T&C state + modal ===================== */
  const [tnModalOpen, setTnModalOpen] = useState(false);
  const [tnList, setTnList] = useState([
    { id: 1, value: "Goods once sold, cannot be returned. Wabi Sabi xxxxxx", isDefault: true },
  ]);
  const [tnNote, setTnNote] = useState("");
  const tnCharLeft = 200 - (tnNote?.length || 0);
  const addNewTerm = ({ value, isDefault }) => {
    setTnList((prev) => {
      const next = [...prev, { id: prev.length ? prev[prev.length - 1].id + 1 : 1, value, isDefault }];
      return isDefault ? next.map((t) => ({ ...t, isDefault: t.value === value })) : next;
    });
    setTnModalOpen(false);
  };

  /* ====== Address mini-popover triggers ====== */
  const billLinkRef = useRef(null);
  const shipLinkRef = useRef(null);
  const [billPopOpen, setBillPopOpen] = useState(false);
  const [shipPopOpen, setShipPopOpen] = useState(false);

  /* ====== Edit Shipping modal ====== */
  const [editShipOpen, setEditShipOpen] = useState(false);

  /* --------- payload / buttons --------- */
  const buildPayload = () => ({
    header: {
      customer: customer?.name || "",
      invoiceDate,
      dueDate,
      reverseCharge,
      invoiceNo: `${invoicePrefix}-${invoiceNo}`,
      taxType,
      paymentTerm,
      createFrom,
      salesman,
      exportSEZ,
      ledger,
      paymentReminder,
      placeOfSupply: billing?.state || "-",
    },
    addresses: { billing, shipping },
    shippingCard: {
      shippingType,
      shippingDate,
      referenceNo,
      transportDate,
      modeOfTransport,
      transporterName,
      vehicleNo,
      weight,
    },
    items: computed.items,
    additionalCharges: acTotals.rows,
    totals: { ...computed.totals, additionalCharges: acTotals.grand, grandNet: computed.totals.net + acTotals.grand },
    tn: { terms: tnList, note: tnNote },
  });

  const handleClear = () => {
    setCustomer(null);
    setInvoicePrefix("INV");
    setInvoiceNo("991");
    setPaymentTerm("");
    setCreateFrom("Select");
    setSalesman("IT Account");
    setReverseCharge("No");
    setTaxType("Default");
    setExportSEZ(false);
    setPaymentReminder(false);
    setLedger("Sales");
    setRows([]);
    setAcRows([]);
    setInvoiceDate(todayISO());
    setDueDate(todayISO());
    setTnList([{ id: 1, value: "Goods once sold, cannot be returned. Wabi Sabi xxxxxx", isDefault: true }]);
    setTnNote("");
    // reset shipping
    setShippingType("Delivery");
    setShippingDate(todayISO());
    setReferenceNo("");
    setTransportDate(todayISO());
    setModeOfTransport("");
    setTransporterName("");
    setVehicleNo("");
    setWeight("");
    setShippingOverride(null);
  };

  const save = (mode) => {
    const payload = buildPayload();
    console.log("SAVE MODE:", mode, payload);
    window.alert(
      mode === "print"
        ? "Saved! Opening Print/Preview…"
        : mode === "payment"
        ? "Saved! Redirecting to Payment…"
        : mode === "new"
        ? "Saved! Creating new invoice…"
        : "Saved!"
    );
    if (mode === "new") handleClear();
  };

  const handleCancel = () => {
    if (window.confirm("Discard changes and go back?")) handleClear();
  };
  const onUploadClick = () => {
    if (!customer) {
      setAlertMsg("Please select customer first…");
      setTimeout(() => setAlertMsg(""), 4000);
      return;
    }
    setUploadOpen(true);
  };

  return (
    <div className="ni-page">
      {alertMsg && (
        <div className="top-alert error">
          <span className="mi">gpp_maybe</span>
          <span>{alertMsg}</span>
          <button className="top-alert-x" onClick={() => setAlertMsg("")}>
            <span className="mi">close</span>
          </button>
        </div>
      )}

      <div className="ni-bc">
        <span className="mi">home</span>
        <span>Sales</span>
        <span className="active">New Invoice</span>
      </div>

      {/* ===== TOP CARD ===== */}
      <div className="box">
        <div className="fg">
          {/* Customer */}
          <div className="fld">
            <label>
              {" "}
              Select Customer <span className="req">*</span>
            </label>
            <CustomerSelect value={customer} onSelect={setCustomer} />
          </div>

          {/* Invoice Date */}
          <div className="fld">
            <label>
              {" "}
              Invoice Date <span className="req">*</span>
            </label>
            <div className="date">
              <input type="date" className="inp" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              <span className="mi">event</span>
            </div>
          </div>

          {/* Reverse Charge */}
          <div className="fld">
            <label>Reverse Charge</label>
            <div className="select">
              <select value={reverseCharge} onChange={(e) => setReverseCharge(e.target.value)}>
                <option>No</option>
                <option>Yes</option>
              </select>
              <span className="mi">expand_more</span>
            </div>
          </div>

          {/* Invoice No */}
          <div className="fld">
            <label>
              {" "}
              Invoice No. <span className="req">*</span>
            </label>
            <div className="row">
              <input className="inp" style={{ maxWidth: 88 }} value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
              <input className="inp" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            </div>
          </div>

          {/* Place of Supply */}
          <div className="fld">
            <label>Place of Supply: {billing?.state || "-"}</label>
            <div className="muted">—</div>
          </div>

          {/* Payment Term */}
          <div className="fld">
            <label>Payment Term</label>
            <SelectSearch value={paymentTerm} onChange={setPaymentTerm} options={PAYMENT_TERMS} placeholder="Select Payment Term" />
          </div>

          {/* Due Date */}
          <div className="fld">
            <label>
              {" "}
              Due Date <span className="req">*</span>
            </label>
            <div className="date">
              <input type="date" className="inp" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <span className="mi">event</span>
            </div>
          </div>

          {/* Tax Type */}
          <div className="fld">
            <label>Tax Type</label>
            <SelectSearch value={taxType} onChange={setTaxType} options={TAX_TYPES} />
          </div>

          {/* Billing Address */}
          <div className="fld">
            <label>Billing Address</label>
            {!billing ? (
              <div className="muted">Billing Address is Not Provided</div>
            ) : (
              <div className="addr">
                <div>{billing.line1}</div>
                <div>{billing.line2}</div>
                <div>{billing.line3}</div>
                <div className="addr-row">
                  <span className="mi">call</span>
                  {customer?.phone}
                </div>
                <button ref={billLinkRef} className="addr-link" onClick={() => setBillPopOpen(true)}>
                  Change Address
                </button>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div className="fld">
            <label>Shipping Address</label>
            {!shipping ? (
              <div className="muted">Shipping Address is Not Provided</div>
            ) : (
              <div className="addr">
                <div>{shipping.line1}</div>
                <div>{shipping.line2}</div>
                <div>{shipping.line3}</div>
                <div className="addr-row">
                  <span className="mi">call</span>
                  {customer?.phone}
                </div>
                <div className="addr-actions">
                  <button ref={shipLinkRef} className="addr-link" onClick={() => setShipPopOpen(true)}>
                    Change Address
                  </button>
                  <button className="addr-link" onClick={() => setEditShipOpen(true)}>
                    Edit Shipping Address
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Create From */}
          <div className="fld">
            <label>Create Invoice From</label>
            <SelectSearch value={createFrom} onChange={setCreateFrom} options={CREATE_FROM} placeholder="Select" />
          </div>

          {/* Sales Man */}
          <div className="fld">
            <label>Sales Man</label>
            <SelectSearch value={salesman} onChange={setSalesman} options={SALESMEN} />
          </div>

          {/* Reminder & Export */}
          <div className="fld chk">
            <label>
              <input type="checkbox" checked={paymentReminder} onChange={(e) => setPaymentReminder(e.target.checked)} /> Payment
              Reminder
            </label>
          </div>
          <div className="fld chk">
            <label>
              <input type="checkbox" checked={exportSEZ} onChange={(e) => setExportSEZ(e.target.checked)} /> Export/SEZ
            </label>
          </div>

          {/* Ledger */}
          <div className="fld">
            <label>
              {" "}
              Select Account Ledger <span className="req">*</span>
            </label>
            <SelectSearch value={ledger} onChange={setLedger} options={LEDGERS} />
          </div>
        </div>
      </div>

      {/* ===== Tabs strip (Upload button COMMON) ===== */}
      <div className="tabs-strip">
        <div className="tabs-left">
          <button className={`tab ${activeTab === "products" ? "active" : ""}`} onClick={() => setActiveTab("products")}>
            Product Details
          </button>
        </div>
        <div className="tabs-left">
          <button className={`tab ${activeTab === "tn" ? "active" : ""}`} onClick={() => setActiveTab("tn")}>
            Terms & Condition/Note
          </button>
        </div>
        <div className="tabs-left">
          <button className={`tab ${activeTab === "shipping" ? "active" : ""}`} onClick={() => setActiveTab("shipping")}>
            Shipping Details
          </button>
        </div>
        <button className="upload-btn" onClick={onUploadClick}>
          <span className="mi">file_upload</span> Upload Products
        </button>
      </div>

      {/* ===== SWITCHABLE CONTENT CARD ===== */}
      {activeTab === "products" && (
        <div className="box table-card">
          <table className="grid">
            <thead>
              <tr>
                <th className="w40"></th>
                <th className="w40">#</th>
                <th>Sales Man</th>
                <th>Itemcode</th>
                <th>
                  Product <span className="req">*</span>
                </th>
                <th>Batch</th>
                <th className="num">
                  Qty <span className="req">*</span>
                </th>
                <th className="num">Free Qty</th>
                <th className="num">
                  Price <span className="req">*</span>
                </th>
                <th className="num">
                  Dis1 <span className="req">*</span>
                </th>
                <th className="num">
                  Dis2 <span className="req">*</span>
                </th>
                <th className="num">Taxable</th>
                <th className="num">Tax</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id}>
                  <td className="w40">
                    {idx === 0 ? (
                      <button className="circle add" title="Add row" onClick={addRow}>
                        +
                      </button>
                    ) : (
                      <button
                        className="circle remove"
                        title="Remove row"
                        onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
                      >
                        –
                      </button>
                    )}
                  </td>
                  <td className="w40">{idx + 1}</td>
                  <td>
                    <input className="inp" value={r.salesman} onChange={(e) => updateRow(r.id, { salesman: e.target.value })} />
                  </td>
                  <td>
                    <input className="inp" value={r.itemcode} onChange={(e) => updateRow(r.id, { itemcode: e.target.value })} placeholder="ItemCode" />
                  </td>
                  <td>
                    <input className="inp" value={r.product} onChange={(e) => updateRow(r.id, { product: e.target.value })} placeholder="Search Product" />
                  </td>
                  <td>
                    <input className="inp" value={r.batch} onChange={(e) => updateRow(r.id, { batch: e.target.value })} />
                  </td>
                  <td className="num">
                    <input className="num-in" value={r.qty} onChange={(e) => updateRow(r.id, { qty: e.target.value })} />
                  </td>
                  <td className="num">
                    <input className="num-in" value={r.free} onChange={(e) => updateRow(r.id, { free: e.target.value })} />
                  </td>
                  <td className="num">
                    <input className="num-in" value={r.price} onChange={(e) => updateRow(r.id, { price: e.target.value })} />
                  </td>
                  <td className="num">
                    <input className="num-in" value={r.dis1} onChange={(e) => updateRow(r.id, { dis1: e.target.value })} />
                    <span className="pct-cell">%</span>
                  </td>
                  <td className="num">
                    <input className="num-in" value={r.dis2} onChange={(e) => updateRow(r.id, { dis2: e.target.value })} />
                    <span className="pct-cell">%</span>
                  </td>
                  <td className="num">{(computed.items[idx]?.taxable ?? 0).toFixed(2)}</td>
                  <td className="num">{(computed.items[idx]?.lineTax ?? 0).toFixed(2)}</td>
                  <td className="num">{(computed.items[idx]?.lineTotal ?? 0).toFixed(2)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={14} className="center">Total</td></tr>}
              {rows.length > 0 && (
                <tr className="tfoot">
                  <td colSpan={6}>Total</td>
                  <td className="num">{computed.totals.qty}</td>
                  <td className="num">0</td>
                  <td className="num">—</td>
                  <td className="num">—</td>
                  <td className="num">{computed.totals.taxable.toFixed(2)}</td>
                  <td className="num">{computed.totals.tax.toFixed(2)}</td>
                  <td className="num">{computed.totals.net.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "tn" && (
        <div className="box tn-card">
          <div className="tn-grid">
            <div className="tn-left">
              <div className="tn-left-head">
                <span className="tn-col-s">#</span>
                <span className="tn-col-t">Terms &amp; Condition</span>
                <div className="tn-actions">
                  <button className="tn-new" onClick={() => setTnModalOpen(true)}>
                    <span className="mi">add</span> New Term And Condition
                  </button>
                  <button className="tn-icon" title="Edit">
                    <span className="mi">edit</span>
                  </button>
                </div>
              </div>
              {tnList.map((t, i) => (
                <div className="tn-row" key={t.id}>
                  <div className="tn-col-s">{i + 1}</div>
                  <div className="tn-col-t">{t.value}</div>
                </div>
              ))}
            </div>
            <div className="tn-right">
              <label className="tn-note-label">Note</label>
              <textarea
                className="tn-note"
                maxLength={200}
                placeholder="Enter a note (max 200 characters)"
                value={tnNote}
                onChange={(e) => setTnNote(e.target.value)}
              />
              <div className="tn-count">{Math.max(0, tnCharLeft)}/200 characters</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "shipping" && (
        <div className="box ship-card">
          <div className="fg ship-grid">
            <div className="fld">
              <label>Shipping Type</label>
              <SelectSearch value={shippingType} onChange={setShippingType} options={SHIPPING_TYPES} placeholder="Delivery" />
            </div>

            <div className="fld">
              <label>Shipping Date</label>
              <div className="date">
                <input type="date" className="inp" value={shippingDate} onChange={(e) => setShippingDate(e.target.value)} />
                <span className="mi">event</span>
              </div>
            </div>

            <div className="fld">
              <label>Reference No.</label>
              <input className="inp" placeholder="Reference No" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
            </div>

            <div className="fld">
              <label>Transport Date</label>
              <div className="date">
                <input type="date" className="inp" value={transportDate} onChange={(e) => setTransportDate(e.target.value)} />
                <span className="mi">event</span>
              </div>
            </div>

            <div className="fld">
              <label>Mode of Transport</label>
              <input className="inp" placeholder="Mode of Transport" value={modeOfTransport} onChange={(e) => setModeOfTransport(e.target.value)} />
            </div>

            <div className="fld">
              <label>Transporter Name</label>
              <SelectSearch value={transporterName} onChange={setTransporterName} options={TRANSPORTERS} placeholder="Select Transport Name" />
            </div>

            <div className="fld">
              <label>Vehicle No.</label>
              <input className="inp" placeholder="Vehicle No" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
            </div>

            <div className="fld">
              <label>Weight</label>
              <input className="inp" placeholder="Weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* ===== Additional Charges ===== */}
      <div className="box ac-card">
        <div className="ac-top">
          <button type="button" className="ac-add" onClick={addACRow}>
            <span className="mi">add_circle</span> Add Additional Charges
          </button>
        </div>
        <div className="ac-body">
          {acTotals.rows.length > 0 && (
            <table className="ac-grid">
              <thead>
                <tr>
                  <th className="w60"></th>
                  <th className="w60">#</th>
                  <th>
                    Additional Charge <span className="req">*</span>
                  </th>
                  <th className="right">
                    Value <span className="req">*</span>
                  </th>
                  <th>Tax</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {acTotals.rows.map((r, idx) => {
                  const selValue = {
                    currentText: r.name,
                    setCurrentText: (t) => updateAC(r.id, { name: t }),
                    options: acMaster,
                  };
                  return (
                    <tr key={r.id}>
                      <td className="w60 control-cell">
                        {idx === 0 && (
                          <button className="circle add" title="Add" onClick={addACRow}>
                            +
                          </button>
                        )}
                        <button className="circle x" title="Remove" onClick={() => setAcRows((list) => list.filter((x) => x.id !== r.id))}>
                          ×
                        </button>
                      </td>
                      <td className="w60">{idx + 1}</td>
                      <td>
                        <AdditionalChargeSelector
                          value={selValue}
                          onChange={(opt) => updateAC(r.id, { name: opt.label, value: opt.defaultValue ?? 0, taxKey: opt.taxKey || "gst15" })}
                          onAddNewClick={(text) => openNewAC(text, r.id)}
                        />
                      </td>
                      <td className="right">
                        <div className="currency-wrap">
                          <span className="cur">₹</span>
                          <input className="num-in" value={r.value} onChange={(e) => updateAC(r.id, { value: e.target.value })} />
                          {!!r.value && (
                            <button className="mini-x" onClick={() => updateAC(r.id, { value: 0 })}>
                              ×
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="select">
                          <select value={r.taxKey} onChange={(e) => updateAC(r.id, { taxKey: e.target.value })}>
                            {AC_TAXES.map((t) => (
                              <option key={t.key} value={t.key}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <span className="mi">expand_more</span>
                        </div>
                      </td>
                      <td className="right">{r.total.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}></td>
                  <td className="right">{acTotals.valueSum.toFixed(2)}</td>
                  <td className="right">—</td>
                  <td className="right">{acTotals.grand.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* ===== Totals (ALWAYS visible) ===== */}
      <div className="box sum side under-ac">
        <div className="row">
          <span>Flat Discount</span>
          <div className="fd-inputs">
            <input defaultValue={0} />
            <button className="pct">%</button>
          </div>
        </div>
        <div className="row">
          <span>Gross Amount</span>
          <b>{computed.totals.gross.toFixed(2)}</b>
        </div>
        <div className="row">
          <span>Discount</span>
          <b>{computed.totals.discount.toFixed(2)}</b>
        </div>
        <div className="row">
          <span>Taxable Amount</span>
          <b>{computed.totals.taxable.toFixed(2)}</b>
        </div>
        <div className="row">
          <span>Tax Amount</span>
          <b>{computed.totals.tax.toFixed(2)}</b>
        </div>
        <div className="row">
          <span>Roundoff</span>
          <b>{computed.totals.roundoff.toFixed(2)}</b>
        </div>
        <div className="row net">
          <span>Net Amount</span>
          <b>{(computed.totals.net + acTotals.grand).toFixed(2)}</b>
        </div>
      </div>

      {/* ===== Sticky footer ===== */}
      <div className="sticky-actions">
        <div>
          <button className="btn danger" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn warn" style={{ marginLeft: 8 }} onClick={handleClear}>
            Clear
          </button>
        </div>
        <button className="btn dark" onClick={() => save("print")}>
          Save & Print/Preview
        </button>
        <div>
          <button className="btn primary" onClick={() => save("save")}>
            Save
          </button>
          <button className="btn primary" style={{ marginLeft: 8 }} onClick={() => save("new")}>
            Save & Create New
          </button>
          <button className="btn primary" style={{ marginLeft: 8 }} onClick={() => save("payment")}>
            Save & Payment
          </button>
        </div>
      </div>

      {/* ===== Modals ===== */}
      <NewACModal open={acModalOpen} onClose={() => setAcModalOpen(false)} onSave={saveNewAC} presetName={presetACName} />
      <UploadProductsModal open={uploadOpen} onClose={() => setUploadOpen(false)} />

      {/* T&C center modal */}
      {tnModalOpen && (
        <div className="tn-modal-backdrop">
          <div className="tn-modal">
            <div className="tn-modal-head">
              <b>New Terms &amp; Conditions</b>
              <button className="tn-x" onClick={() => setTnModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="tn-modal-body">
              <label className="tn-label">
                Terms And Conditions<span className="tn-req">*</span>
              </label>
              <textarea className="tn-ta" placeholder="Enter a Condition" id="tn-text"></textarea>
              <div className="tn-default">
                <label className="tn-checkbox">
                  <input id="tn-def" type="checkbox" /> <span>Default</span>
                </label>
                <span className="tn-help" title="If checked, this condition will be auto-selected next time.">
                  ?
                </span>
              </div>
            </div>
            <div className="tn-modal-foot">
              <button className="tn-btn" onClick={() => setTnModalOpen(false)}>
                Close
              </button>
              <button
                className="tn-btn primary"
                onClick={() => {
                  const text = document.getElementById("tn-text")?.value?.trim() || "";
                  const isDef = !!document.getElementById("tn-def")?.checked;
                  if (!text) return;
                  addNewTerm({ value: text, isDefault: isDef });
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Address mini popovers ===== */}
      <AddressMiniPop
        open={!!billPopOpen}
        anchorRef={billLinkRef}
        onClose={() => setBillPopOpen(false)}
        title="Billing Address"
        addr={billing}
        phone={customer?.phone}
        onSelect={() => {}}
      />
      <AddressMiniPop
        open={!!shipPopOpen}
        anchorRef={shipLinkRef}
        onClose={() => setShipPopOpen(false)}
        title="Shipping Address"
        addr={shipping}
        phone={customer?.phone}
        onSelect={() => {}}
      />

      {/* ===== Edit Shipping Address (full modal) ===== */}
      <EditShippingModal
        open={editShipOpen}
        onClose={() => setEditShipOpen(false)}
        initial={customer?.shipping}
        phone={customer?.phone}
        onSubmit={(updated) => {
          setShippingOverride({
            ...customer?.shipping,
            ...updated,
            line1: updated.line1 || customer?.shipping?.line1,
            line2: updated.line2 || customer?.shipping?.line2,
            line3: updated.line3 || customer?.shipping?.line3,
          });
        }}
      />
    </div>
  );
}

/* ---------------- Upload Products Modal ---------------- */
function UploadProductsModal({ open, onClose }) {
  const [fileName, setFileName] = useState("");
  if (!open) return null;
  return (
    <div className="modal">
      <div className="upload-card">
        <div className="um-head">
          <b>Upload Sheet</b>
          <button className="modal-x" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="um-body">
          <div className="um-caption">
            Download <a className="um-demo">Demo</a> File.
          </div>
          <div className="um-file-row">
            <input className="um-file-inp" placeholder="" value={fileName} onChange={(e) => setFileName(e.target.value)} />
            <button className="um-file-btn" title="Browse">
              <span className="mi">folder_open</span>
            </button>
          </div>
          <div className="um-note">
            <ul>
              <li>
                <b>If NOT specified</b> &lt;&lt;&lt; automatically <b>latest batch</b> will be considered.
              </li>
              <li>
                <b>If specified WRONG</b> &lt;&lt;&lt; a fail file of all records will be downloaded with failure reason and invoice will not be saved.
              </li>
            </ul>
          </div>
        </div>
        <div className="um-foot">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn warn-soft">Verify</button>
          <button className="btn primary" onClick={onClose}>
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
