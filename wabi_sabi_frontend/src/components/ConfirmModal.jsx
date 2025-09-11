// src/components/ConfirmModal.jsx
import React, { useEffect, useRef } from "react";
import "../styles/ConfirmModal.css";

export default function ConfirmModal({
  open,
  title = "Discard Sale ?",
  onOk,
  onCancel,
}) {
  const okRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onEsc = (e) => e.key === "Escape" && onCancel?.();
    document.addEventListener("keydown", onEsc);

    // lock background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus primary action
    okRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="cm-backdrop" onClick={onCancel}>
      <div
        className="cm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="cm-close" aria-label="Close" onClick={onCancel}>
          ×
        </button>

        <div className="cm-icon">i</div>
        <h2 className="cm-title">{title}</h2>

        <div className="cm-actions">
          <button ref={okRef} className="cm-btn ok" onClick={onOk}>
            Ok!
          </button>
          <button className="cm-btn dislike" onClick={onCancel} aria-label="Cancel">
            <span
              className="material-icons"
              style={{ fontSize: 18, verticalAlign: "text-bottom" }}
            >
              thumb_down
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
