/* =========================================================================
   QZ + TSPL two-up label printer for TVS LP-46 NEO (203dpi)
   ======================================================================== */

async function loadQZScriptIfNeeded() {
  if (window.qz) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/qz-tray.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load /qz-tray.js"));
    document.head.appendChild(s);
  });
}

function setupDevSecurity() {
  if (!window.qz?.security) return;
  window.qz.security.setCertificatePromise((resolve) => resolve(null));
  window.qz.security.setSignaturePromise(() => (resolve) => resolve(null));
}

export async function qzConnectSafe() {
  await loadQZScriptIfNeeded();
  if (!window.qz) throw new Error("QZ Tray script not loaded");
  setupDevSecurity();
  if (window.qz.websocket.isActive()) return;
  await window.qz.websocket.connect({ retries: 5, delay: 1 });
}

const pad2 = (n) => String(n).padStart(2, "0");
export const todayDMY = () => {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// 203 dpi ≈ 8 dots per mm
function mm(n) { return Math.round(n * 8); }

/* =========== Fixed label geometry =========== */
const SINGLE_W_MM = 35;
const SINGLE_H_MM = 40;
const H_GAP_MM    = 3;

const PAGE_W_MM   = SINGLE_W_MM * 2 + H_GAP_MM;
const PAGE_H_MM   = SINGLE_H_MM;

const SPEED       = 4;
const DENSITY     = 10;

/* ===== Layout (tuned spacing) ===== */
const Y_TITLE_MM         = 1.0;
const Y_NAME_MM          = 5.0;

/* more air around SIZE */
const SIZE_TOP_GAP_MM    = 0.8;  // reduced margin above size
const SIZE_BOTTOM_GAP_MM = 3.5;  // increased space below size to prevent overlap

/* gently push the whole lower block down */
const Y_MRP_MM_BASE      = 10.0;  // minimum Y position for MRP
const MRP_SP_GAP_MM      = 2.5;   // gap between MRP and SP
const SP_BC_GAP_MM       = 1.8;   // gap between SP and barcode
const Y_BC_MM            = 18.8;  // fallback barcode Y position

const BARCODE_HEIGHT_MM  = 5.0;

/* cleaner gaps between lower elements */
const Y_CODE_GAP_MM      = 1.6;  // ↑ was 1.2
const Y_DATE_GAP_MM      = 3.8;  // ↑ was 3.6
const Y_LOC_GAP_MM       = 4.0;  // ↑ was 3.0  (push Location lower to use bottom space)

/* ===== Width helpers ===== */
const CHAR_MM = 1.2; // TSPL "1" ≈ 1.2mm/char at scale 1
function textWidthMM(text, scaleX = 1) {
  return (text?.length || 0) * CHAR_MM * scaleX;
}
/* Rough Code128 width estimate to center barcode */
function code128WidthMM(code, narrowDots = 2) {
  const len = (code?.length || 0);
  const modules = (len * 11) + 35;
  const dots = modules * narrowDots;
  const mmPerDot = 25.4 / 203;
  return dots * mmPerDot;
}

/* ===== Sort helpers so rows print 6-7 / 8-9 / 10 ===== */
function normalizeCode(v) {
  return String(v || "").toUpperCase().replace(/[–—−‐]/g, "-").trim();
}
function codeKey(code) {
  const c = normalizeCode(code);
  const m = c.match(/^([A-Z])-(\d{1,3})$/);
  if (!m) return [c, 0];
  return [m[1], Number(m[2])];
}

/* =========== TSPL generators =========== */
function tsplOneLabel({ title, name, size, mrp, sp, code, location, date }, x0mm) {
  const x0 = mm(x0mm);
  title    = (title || "BRANDS 4 LESS").toString();
  name     = (name  || "").toString();
  size     = (size  || "").toString(); // only real size; no fallback from name
  mrp      = Number(mrp || 0);
  sp       = Number(sp || 0);
  code     = (code || "").toString();
  location = (location || "").toString();
  date     = (date || todayDMY());

  const cmds = [];
  const INNER_MARGIN_MM = 2.1;
  const LEFT   = x0 + mm(INNER_MARGIN_MM);
  const RIGHT  = x0 + mm(SINGLE_W_MM - INNER_MARGIN_MM);
  const WIDTH  = RIGHT - LEFT;
  const centerX = LEFT + Math.floor(WIDTH / 2);

  /* Title: "BRANDS" + "4LESS" tight */
  const t1 = "BRANDS";
  const t2 = "4LESS";
  const gapMM = 1.0;
  const t1w = textWidthMM(t1, 2);
  const t2w = textWidthMM(t2, 2);
  const totalW = t1w + gapMM + t2w;
  const t1x = centerX - mm(totalW / 2);
  const t2x = t1x + mm(t1w + gapMM);
  cmds.push(`TEXT ${t1x},${mm(Y_TITLE_MM)},"1",0,2,2,"${t1}"`);
  cmds.push(`TEXT ${t2x},${mm(Y_TITLE_MM)},"1",0,2,2,"${t2}"`);

  /* Name - wrap to multiple lines if needed */
  const nameY = mm(Y_NAME_MM);
  const maxCharsPerLine = 20;
  const nameLines = [];
  
  if (name.length <= maxCharsPerLine) {
    nameLines.push(name);
  } else {
    // Split by words and fit into lines
    const words = name.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) nameLines.push(currentLine);
        currentLine = word.length > maxCharsPerLine ? word.slice(0, maxCharsPerLine) : word;
      }
    }
    if (currentLine) nameLines.push(currentLine);
  }
  
  // Print each line centered
  const lineHeightMM = 1.8;
  nameLines.forEach((line, idx) => {
    const lineWidthMM = textWidthMM(line, 1);
    const lineY = nameY + mm(idx * lineHeightMM);
    cmds.push(`TEXT ${centerX - mm(lineWidthMM / 2)},${lineY},"1",0,1,1,"${line}"`);
  });

  /* Size with margins - adjust position based on number of name lines */
  const nameHeightMM = nameLines.length * 1.8;
  let yCursor = nameY + mm(nameHeightMM);
  if (size) {
    const sizeText = `( ${size} )`;
    const sizeW = textWidthMM(sizeText, 1.3);
    const ySize = yCursor + mm(SIZE_TOP_GAP_MM);
    cmds.push(`TEXT ${centerX - mm(sizeW / 2)},${ySize},"1",0,1,2,"${sizeText}"`); // 1×2 for readability
    yCursor = ySize + mm(SIZE_BOTTOM_GAP_MM);
  }

  /* MRP (2×) + thin strike */
  const MRP_SCALE_X = 2, MRP_SCALE_Y = 2;
  const mrpStr = `${mrp.toFixed(0)}`;
  const mrpWmm = textWidthMM(mrpStr, MRP_SCALE_X);
  const mrpX = centerX - mm(mrpWmm / 2);
  const mrpY = Math.max(yCursor, mm(Y_MRP_MM_BASE));
  cmds.push(`TEXT ${mrpX},${mrpY},"1",0,${MRP_SCALE_X},${MRP_SCALE_Y},"${mrpStr}"`);
  cmds.push(`BAR ${mrpX},${mrpY + mm(0.8)},${mm(mrpWmm)},2`);

  /* Selling Price (2×) - position relative to MRP */
  const spStr = sp.toFixed(0);
  const spWmm = textWidthMM(spStr, 2);
  const mrpHeight = mm(2.4); // approximate height of MRP text at 2× scale
  const spY = mrpY + mrpHeight + mm(MRP_SP_GAP_MM);
  cmds.push(`TEXT ${centerX - mm(spWmm / 2)},${spY},"1",0,2,2,"${spStr}"`);

  /* Barcode (centered) - position relative to SP */
  const spHeight = mm(2.4); // approximate height of SP text at 2× scale
  const bcY = spY + spHeight + mm(SP_BC_GAP_MM);
  const estWmm = Math.max(22, Math.min(32, code128WidthMM(code)));
  const bcX = centerX - mm(estWmm / 2);
  cmds.push(`BARCODE ${bcX},${bcY},"128",${mm(BARCODE_HEIGHT_MM)},0,0,2,3,"${code}"`);

  /* Code (1×2) */
  const barH = mm(BARCODE_HEIGHT_MM);
  const codeY = bcY + barH + mm(Y_CODE_GAP_MM);
  const codeWmm = textWidthMM(code, 1);
  cmds.push(`TEXT ${centerX - mm(codeWmm / 2)},${codeY},"1",0,1,2,"${code}"`);

  /* Date left + Location centered (pushed lower) */
  const dateY = codeY + mm(Y_DATE_GAP_MM);
  cmds.push(`TEXT ${LEFT},${dateY},"1",0,1,1,"${date}"`);
  const locY = dateY + mm(Y_LOC_GAP_MM);
  const locWmm = textWidthMM(location, 1.5);
  cmds.push(`TEXT ${centerX - mm(locWmm / 2)},${locY},"1",0,1,2,"${location}"`);

  return cmds;
}

const RIGHT_SHIFT_MM = -0.9;

function tsplTwoUpPage(r1, r2) {
  const header = [
    `SIZE ${PAGE_W_MM} mm, ${PAGE_H_MM} mm`,
    `GAP ${H_GAP_MM} mm, 0 mm`,
    `SPEED ${SPEED}`,
    `DENSITY ${DENSITY}`,
    `DIRECTION 1`,
    `CLS`,
  ];
  const left  = r1 ? tsplOneLabel(r1, 0) : [];
  const right = r2 ? tsplOneLabel(r2, SINGLE_W_MM + H_GAP_MM + RIGHT_SHIFT_MM) : [];
  return [...header, ...left, ...right, `PRINT 1,1`];
}

/* =========== QZ config =========== */
let _qzConfig = null;
async function getQzConfig() {
  await qzConnectSafe();
  if (_qzConfig) return _qzConfig;
  let printer = null;
  try { printer = await window.qz.printers.getDefault(); } catch {}
  if (!printer) { try { printer = await window.qz.printers.find("TVS"); } catch {} }
  _qzConfig = window.qz.configs.create(printer || null);
  return _qzConfig;
}

/* =========== Public API =========== */
/* Small global queue so print jobs never overlap */
let _printQueue = Promise.resolve();

/**
 * Public function – call this exactly as before:
 *   await printTwoUpLabels(rows, opts)
 */
export function printTwoUpLabels(rows, opts = {}) {
  // Chain this job onto the queue so jobs run strictly one after another
  _printQueue = _printQueue.then(
    () => innerPrintTwoUpLabels(rows, opts),
    () => innerPrintTwoUpLabels(rows, opts)
  );
  return _printQueue;
}

/* Actual implementation (unchanged logic) */
async function innerPrintTwoUpLabels(rows, opts = {}) {
  await qzConnectSafe();
  const cfg = await getQzConfig();

  const title = opts.title || "BRANDS 4 LESS";
  const date  = opts.date || todayDMY();

  if (!Array.isArray(rows) || rows.length === 0) throw new Error("No rows to print.");

  // 1) Expand copies
  const expanded = [];
  for (const r of rows) {
    if (!r) continue;
    const copies = Math.max(1, Number(r.qty || 1));
    const safe = {
      title,
      name: (r.name || r.product || "").toString(),
      size: (r.size || r.product_size || "").toString(),
      mrp: Number(r.mrp || 0),
      sp: Number(r.sp || r.selling_price || r.sellingPrice || 0),
      code: normalizeCode(r.code || r.barcode || r.barcodeNumber || ""),
      location: (r.location || r.location_code || "").toString(),
      date,
    };
    if (!safe.code) {
      console.warn("Skipping row with empty code:", r);
      continue;
    }
    for (let i = 0; i < copies; i++) expanded.push({ ...safe });
  }
  if (!expanded.length) throw new Error("No valid barcodes to print.");

  // 2) Sort ascending so physical labels are uniform (…06,07 / 08,09 / 10)
  expanded.sort((a, b) => {
    const [la, na] = codeKey(a.code);
    const [lb, nb] = codeKey(b.code);
    if (la !== lb) return la < lb ? -1 : 1;
    return na - nb;
  });

  // 3) Build ONE big print payload (all two-up pages)
  const printPayload = [];
  for (let i = 0; i < expanded.length; ) {
    let left = null, right = null;
    const remaining = expanded.length - i;
    if (remaining >= 2) {
      left  = expanded[i];
      right = expanded[i + 1];
      i += 2;
    } else {
      left = expanded[i];
      right = null;
      i += 1;
    }
    const cmdsStr = tsplTwoUpPage(left, right).join("\r\n");
    printPayload.push({ type: "raw", format: "command", data: cmdsStr });
  }

  // optional: extra flush inside same job (no extra security prompt)
  printPayload.push({ type: "raw", format: "command", data: "PRINT 1,1\r\n" });

  try {
    // ✅ ONE print call → ONE QZ security prompt per click
    await window.qz.print(cfg, printPayload);
  } finally {
    try {
      if (window.qz?.websocket?.isActive()) {
        await window.qz.websocket.disconnect();
      }
    } catch (e) {
      console.warn("QZ disconnect failed (ignored):", e);
    }
    _qzConfig = null;
  }
}

