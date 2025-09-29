import React, { useMemo, useState } from "react";
import "../styles/NotificationSettingsPage.css";

/* ===== Pills ===== */
const PILL = {
    CUSTOMER: { text: "CUSTOMER", tone: "blue" },
    "SUPER ADMIN": { text: "SUPER ADMIN", tone: "red" },
    "LOCATION ADMIN": { text: "LOCATION ADMIN", tone: "green" },
    "SENDER LOCATION ADMIN": { text: "SENDER LOCATION ADMIN", tone: "green" },
    "REQUESTED LOCATION ADMIN": { text: "REQUESTED LOCATION ADMIN", tone: "green" },
    SUPPLIER: { text: "SUPPLIER", tone: "blue" },
};

/* ===== Data (40 rows) ===== */
const ROWS = [
    { id: 1, event: "New Estimate", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: true, e: true },
    { id: 2, event: "Edit Estimate", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 3, event: "New Sales Order", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 4, event: "Edit Sales Order", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 5, event: "New Invoice", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: true, e: true },
    { id: 6, event: "Edit Invoice", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 7, event: "Delete Invoice", module: "Sales & POS", sender: "System", receiver: ["SUPER ADMIN"], w: true, s: false, e: true },
    { id: 8, event: "Register Open", module: "POS", sender: "System", receiver: ["SUPER ADMIN", "LOCATION ADMIN"], w: true, s: false, e: true },
    { id: 9, event: "Register Close", module: "POS", sender: "System", receiver: ["SUPER ADMIN", "LOCATION ADMIN"], w: true, s: false, e: true },
    { id: 10, event: "New Delivery Challan", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 11, event: "Edit Delivery Challan", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 12, event: "New Credit Note", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 13, event: "Edit Credit Note", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 14, event: "New Purchase Order", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
    { id: 15, event: "Edit Purchase Order", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
    { id: 16, event: "New Material Inward", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
    { id: 17, event: "Edit Material Inward", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
    { id: 18, event: "New Bill", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
    { id: 19, event: "Edit Bill", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
    { id: 20, event: "New Debit Note", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
    { id: 21, event: "Edit Debit Note", module: "Purchase", sender: "Admin", receiver: ["SUPPLIER"], w: true, s: false, e: true },
    { id: 22, event: "New eCommerce Order", module: "E- Commerce", sender: "System", receiver: ["SUPER ADMIN", "LOCATION ADMIN"], w: true, s: false, e: true },
    { id: 23, event: "Ecommerce New Order", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 24, event: "Ecommerce Order In-Progress", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 25, event: "Ecommerce Order Confirmation", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 26, event: "Ecommerce Out for Delivery", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 27, event: "Ecommerce Order Delivered", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 28, event: "Ecommerce Order Cancelled", module: "E- Commerce", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 29, event: "Birthday Wishes", module: "Others", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 30, event: "OTP on Credit Note Redemption", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: false },
    { id: 31, event: "OTP on Advance Payment", module: "Sales & POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: false },
    { id: 32, event: "Anniversary Wishes", module: "Others", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 33, event: "Stock Transfer", module: "Inventory", sender: "System", receiver: ["LOCATION ADMIN"], w: true, s: false, e: true },
    { id: 34, event: "Stock Transfer Approve/Reject", module: "Inventory", sender: "System", receiver: ["SENDER LOCATION ADMIN"], w: true, s: false, e: true },
    { id: 35, event: "Stock Transfer Request", module: "Inventory", sender: "System", receiver: ["LOCATION ADMIN"], w: true, s: false, e: true },
    { id: 36, event: "Stock Transfer Request Approved/Rejected", module: "Inventory", sender: "System", receiver: ["REQUESTED LOCATION ADMIN"], w: true, s: false, e: true },
    { id: 37, event: "Stock Verification", module: "Inventory", sender: "System", receiver: ["LOCATION ADMIN"], w: true, s: false, e: false },
    { id: 38, event: "Stock Verification Approved/Rejected", module: "Inventory", sender: "System", receiver: ["LOCATION ADMIN"], w: true, s: false, e: true },
    { id: 39, event: "Redeemed Loyalty points", module: "POS", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
    { id: 40, event: "New Delivery Challan", module: "Sales", sender: "Admin", receiver: ["CUSTOMER"], w: true, s: false, e: true },
];

const uniq = (arr) => Array.from(new Set(arr));

export default function NotificationSettingsPage() {
    const [moduleFilter, setModuleFilter] = useState("");
    const [senderFilter, setSenderFilter] = useState("");
    const [receiverFilter, setReceiverFilter] = useState("");
    const [q, setQ] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    const modules = useMemo(() => ["", ...uniq(ROWS.map(r => r.module))], []);
    const senders = useMemo(() => ["", ...uniq(ROWS.map(r => r.sender))], []);
    const receivers = useMemo(() => ["", ...uniq(ROWS.flatMap(r => r.receiver))], []);

    const rows = useMemo(() => {
        return ROWS.filter(r =>
            (!moduleFilter || r.module === moduleFilter) &&
            (!senderFilter || r.sender === senderFilter) &&
            (!receiverFilter || r.receiver.includes(receiverFilter)) &&
            (!q || r.event.toLowerCase().includes(q.toLowerCase()))
        );
    }, [moduleFilter, senderFilter, receiverFilter, q]);

    const toggle = (id, key) => {
        const idx = ROWS.findIndex(r => r.id === id);
        if (idx >= 0) ROWS[idx][key] = !ROWS[idx][key];
    };

    return (
        <div className="ns-wrap">
            <div className="ns-bc">
                <div className="ns-left">
                    <span className="material-icons ns-home">home</span>
                    <span className="ns-title">Whatsapp/SMS/Email Notifications</span>
                </div>
            </div>

            <div className="ns-card">
                {/* top right bar */}
                <div className="ns-topbar">
                    <button
                        className={`ns-btn ns-btn--filter ${showFilters ? "active" : ""}`}
                        onClick={() => setShowFilters(v => !v)}
                        type="button"
                    >
                        <span className="material-icons">filter_list</span>
                        Filter
                    </button>

                    <div className="ns-search">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search List..."
                        />
                    </div>

                    <button className="ns-btn ns-btn--primary" type="button">
                        Configure Template
                    </button>
                </div>

                {/* collapsible filters row */}
                {showFilters && (
                    <div className="ns-filters">
                        <div className="ns-fg">
                            <label>Module</label>
                            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
                                {modules.map(m => <option key={m} value={m}>{m || "Select Module"}</option>)}
                            </select>
                        </div>
                        <div className="ns-fg">
                            <label>Sender</label>
                            <select value={senderFilter} onChange={(e) => setSenderFilter(e.target.value)}>
                                {senders.map(s => <option key={s} value={s}>{s || "Select Sender"}</option>)}
                            </select>
                        </div>
                        <div className="ns-fg">
                            <label>Receiver</label>
                            <select value={receiverFilter} onChange={(e) => setReceiverFilter(e.target.value)}>
                                {receivers.map(r => <option key={r} value={r}>{r || "Select Receiver"}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                {/* table */}
                <div className="ns-table-wrap">
                    <table className="ns-table">
                        <thead>
                            <tr>
                                <th className="c-sr">Sr. No.</th>
                                <th className="c-event">Notification Events</th>
                                <th className="c-module">Module</th>
                                <th className="c-sender">Sender</th>
                                <th className="c-receiver">Receiver</th>
                                <th className="c-chan">Whatsapp</th>
                                <th className="c-chan">SMS</th>
                                <th className="c-chan">Email</th>
                                <th className="c-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td className="c-sr">{r.id}</td>
                                    <td className="c-event">{r.event}</td>
                                    <td className="c-module">{r.module}</td>
                                    <td className="c-sender">{r.sender}</td>
                                    <td className="c-receiver">
                                        {r.receiver.map((rv, k) => {
                                            const p = PILL[rv] || { text: rv, tone: "blue" };
                                            return <span key={k} className={`pill pill--${p.tone}`}>{p.text}</span>;
                                        })}
                                    </td>
                                    <td className="c-chan">
                                        <label className="chk">
                                            <input type="checkbox" defaultChecked={r.w} onChange={() => toggle(r.id, "w")} />
                                            <span className="box" />
                                        </label>
                                    </td>
                                    <td className="c-chan">
                                        <label className="chk">
                                            <input type="checkbox" defaultChecked={r.s} onChange={() => toggle(r.id, "s")} />
                                            <span className="box" />
                                        </label>
                                    </td>
                                    <td className="c-chan">
                                        <label className="chk">
                                            <input type="checkbox" defaultChecked={r.e} onChange={() => toggle(r.id, "e")} />
                                            <span className="box" />
                                        </label>
                                    </td>
                                    <td className="c-actions">
                                        <div className="act">
                                            <button className="ico" title="Info"><span className="material-icons">info</span></button>
                                            <button className="ico" title="Message"><span className="material-icons">sms</span></button>
                                            <button className="ico" title="Email"><span className="material-icons">email</span></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}
