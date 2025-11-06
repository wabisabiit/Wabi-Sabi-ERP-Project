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

/* =========== TSPL generators =========== */
function tsplOneLabel({ title, name, mrp, sp, code, location, date }, x0mm) {
  const x0 = mm(x0mm);
  title    = (title || "BRANDS 4 LESS").toString();
  name     = (name  || "").toString();
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

  // Title – centered (2×2)
  const titleWidth = title.length * 2.5;
  cmds.push(`TEXT ${centerX - mm(titleWidth / 2)},${mm(1)},"1",0,2,2,"${title}"`);

  // Product – centered (1×1)
  const pname = name.length > 20 ? name.slice(0, 20) : name;
  const pnameWidth = pname.length * 1.2;
  cmds.push(`TEXT ${centerX - mm(pnameWidth / 2)},${mm(5)},"1",0,1,1,"${pname}"`);

  /* ===== MRP (not bold), bigger + STRIKE EXACTLY MID ===== */
  const MRP_SCALE_X = 2, MRP_SCALE_Y = 2;
  const mrpY = mm(7.2);
  const mrpStr = `${mrp.toFixed(0)}`;

  // width estimate ≈ 1.2mm per char × scale
  const mrpCharMM = 1.2 * MRP_SCALE_X;
  const mrpWidthMM = mrpStr.length * mrpCharMM;
  const mrpX = centerX - mm(mrpWidthMM / 2);
  cmds.push(`TEXT ${mrpX},${mrpY},"1",0,${MRP_SCALE_X},${MRP_SCALE_Y},"${mrpStr}"`);

  // Strike-through: thin line across the vertical middle of 2× text
  // (2× font height ≈ ~5.2mm visually; set offset ~half)
  const strikeYOffsetMM = 0.8;     // middle of the taller 2× glyphs
  const strikeHeightDots = 2;      // thin line (NOT bold)
  cmds.push(`BAR ${mrpX},${mrpY + mm(strikeYOffsetMM)},${mm(mrpWidthMM)},${strikeHeightDots}`);

  // Selling price – centered (2×2)
  const spStr = sp.toFixed(0);
  const spWidth = spStr.length * 2.5;
  const spY = mm(11.6);
  cmds.push(`TEXT ${centerX - mm(spWidth / 2)},${spY},"1",0,2,2,"${spStr}"`);

  /* ===== Barcode ===== */
  const bcY = mm(16.2);
  cmds.push(`BARCODE ${x0 + mm(1.7)},${bcY},"128",${mm(5)},0,0,2,3,"${code}"`);

  /* ===== Code & Date ===== */
  const barH = mm(5);
  const codeY = bcY + barH + mm(1.2);
  const codeWidth = code.length * 1.2;
  cmds.push(`TEXT ${centerX - mm(codeWidth / 2)},${codeY},"1",0,1,2,"${code}"`);

  // DATE: **LEFT-ALIGNED** (per your request)
  const dateY = codeY + mm(3.6);
  cmds.push(`TEXT ${LEFT},${dateY},"1",0,1,1,"${date}"`);

  // Location – centered, a bit larger (1×2)
  const locY = dateY + mm(3.0);
  const locWidth = location.length * 1.5;
  cmds.push(`TEXT ${centerX - mm(locWidth / 2)},${locY},"1",0,1,2,"${location}"`);

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
  const left  = tsplOneLabel(r1, 0);
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
export async function printTwoUpLabels(rows, opts = {}) {
  await qzConnectSafe();
  const cfg = await getQzConfig();

  const title = opts.title || "BRANDS 4 LESS";
  const date  = opts.date || todayDMY();

  if (!Array.isArray(rows) || rows.length === 0) throw new Error("No rows to print.");

  const expanded = [];
  for (const r of rows) {
    if (!r) continue;
    const copies = Math.max(1, Number(r.qty || 1));
    const safe = {
      title,
      name: (r.name || r.product || "").toString(),
      mrp: Number(r.mrp || 0),
      sp: Number(r.sp || r.selling_price || r.sellingPrice || 0),
      code: (r.code || r.barcode || r.barcodeNumber || "").toString(),
      location: (r.location || r.location_code || "").toString(),
      date,
    };
    if (!safe.code) { console.warn("Skipping row with empty code:", r); continue; }
    for (let i = 0; i < copies; i++) expanded.push({ ...safe });
  }
  if (!expanded.length) throw new Error("No valid barcodes to print.");

  for (let i = 0; i < expanded.length; i += 2) {
    const left  = expanded[i];
    const right = expanded[i + 1] || null;
    const cmdsStr = tsplTwoUpPage(left, right).join("\r\n");
    const dataArray = [{ type: "raw", format: "command", data: cmdsStr }];
    await window.qz.print(cfg, dataArray);
  }
}

/* Sample */
export async function printSample() {
  await printTwoUpLabels([
    { name: "(L) Denim Skirt", mrp: 3000, sp: 2400, code: "WS-270-01", location: "IC", qty: 1 },
    { name: "(L) Denim Skirt", mrp: 3000, sp: 2400, code: "WS-270-02", location: "IC", qty: 1 },
  ]);
}
