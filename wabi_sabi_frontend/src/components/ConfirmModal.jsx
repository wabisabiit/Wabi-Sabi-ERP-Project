import React, { useEffect } from "react";
import "../styles/ConfirmModal.css";


export default function ConfirmModal({ open, title = "Discard Sale ?", onOk, onCancel }) {
if (!open) return null;


useEffect(() => {
const onEsc = (e) => e.key === "Escape" && onCancel?.();
document.addEventListener("keydown", onEsc);
return () => document.removeEventListener("keydown", onEsc);
}, [onCancel]);


return (
<div className="cm-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onCancel}>
<div className="cm-modal" onClick={(e) => e.stopPropagation()}>
<button className="cm-close" aria-label="Close" onClick={onCancel}>×</button>
<div className="cm-icon">i</div>
<h2 className="cm-title">{title}</h2>
<div className="cm-actions">
<button className="cm-btn ok" onClick={onOk}>Ok!</button>
<button className="cm-btn dislike" onClick={onCancel}>
<span className="material-icons" style={{ fontSize: 18, verticalAlign: "text-bottom" }}>thumb_down</span>
</button>
</div>
</div>
</div>
);
}