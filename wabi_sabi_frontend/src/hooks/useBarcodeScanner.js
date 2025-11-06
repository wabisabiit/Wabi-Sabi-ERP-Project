// src/hooks/useBarcodeScanner.js
import { useEffect, useRef } from "react";

/**
 * Detects fast keyboard "wedge" input from a USB scanner and calls onScan(buffer).
 * Default assumes the scanner sends an Enter at the end of each code.
 */
export default function useBarcodeScanner({
  onScan,
  suffixKey = "Enter",
  minLength = 5,         // ignore very short junk
  charTimeoutMs = 45,    // gap > this => start a new buffer
  enabled = true,
} = {}) {
  const bufRef = useRef("");
  const lastTsRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e) => {
      // Allow typing in text fields as normal if user is clearly typing slowly
      const tag = (e.target?.tagName || "").toLowerCase();
      const isEditable =
        tag === "input" || tag === "textarea" || e.target?.isContentEditable;

      const now = performance.now();
      const gap = now - (lastTsRef.current || 0);
      lastTsRef.current = now;

      // If the stream is slow (human typing), reset unless explicitly focused on "scan" input
      if (gap > charTimeoutMs) bufRef.current = "";

      if (e.key === suffixKey) {
        const code = bufRef.current.trim();
        bufRef.current = "";
        if (code.length >= minLength) {
          // Prevent submitting forms / beeps
          e.preventDefault?.();
          onScan?.(code);
        }
        return;
      }

      // Skip control keys
      if (e.key.length !== 1) return;

      // Accept all printable characters from scanner
      bufRef.current += e.key;
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onScan, suffixKey, minLength, charTimeoutMs, enabled]);
}
