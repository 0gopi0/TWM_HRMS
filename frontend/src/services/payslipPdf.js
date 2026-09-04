// Payslip PDF generator — pure browser (no dependencies).
// Builds an A4 PDF with the TWM (The Website Makers) logo embedded,
// employee details, earnings breakdown, PF/tax deduction and net pay.

const PAGE_W = 595.28; // A4 portrait in points
const PAGE_H = 841.89;
const MARGIN = 56;
const RIGHT = PAGE_W - MARGIN;

// Helvetica width table (AFM, per 1000 units) for right-aligned layout.
const W = {
  " ": 278, "!": 278, '"': 355, "#": 556, "$": 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556,
  "8": 556, "9": 556, ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556,
  "@": 1015, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778,
  R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  "[": 278, "\\": 278, "]": 278, "^": 469, _: 556, "`": 333,
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222,
  j: 222, k: 500, l: 222, m: 833, n: 556, o: 556, p: 556, q: 556, r: 333,
  s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  "{": 334, "|": 260, "}": 334, "~": 584,
};

function escText(s) {
  return String(s)
    .replace(/[\u2014\u2013]/g, "-") // em/en dash -> hyphen
    .replace(/[\u2018\u2019]/g, "'") // curly quotes
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function textWidth(str, size) {
  let units = 0;
  for (const ch of String(str)) units += W[ch] ?? 556;
  return (units / 1000) * size;
}

function money(n) {
  const v = Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  if (!Number.isFinite(v)) return "INR 0.00";
  return `INR ${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function periodLabel(p) {
  const [y, m] = String(p).split("-").map(Number);
  if (!y || !m) return String(p);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Encode a latin1 string into exact bytes (keeps binary header comment intact).
function latin1Bytes(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// Cache the logo (fetch + base64 + natural size).
let logoPromise = null;
function loadLogo() {
  if (!logoPromise) {
    logoPromise = (async () => {
      const res = await fetch("/twm-logo.jpg");
      if (!res.ok) throw new Error("Could not load company logo");
      const bytes = new Uint8Array(await res.arrayBuffer());
      const jpegBase64 = bytesToBase64(bytes);
      const size = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Could not decode logo"));
        img.src = `data:image/jpeg;base64,${jpegBase64}`;
      });
      return { jpegBase64, ...size };
    })().catch((err) => {
      logoPromise = null;
      throw err;
    });
  }
  return logoPromise;
}

function buildPayslipPdf({ employeeName, employeeNumber, jobTitle, period, extras, pfTax, baseAmount, netAmount, logo }) {
  const ops = [];
  const out = (s) => ops.push(s);

  // Layout runs top-down from a baseline cursor `y` (origin bottom-left).
  // A text row at baseline y occupies roughly y-3 .. y+9 for 10-11pt fonts,
  // so steps of >= 16pt guarantee separation; bands are drawn under the text
  // first (band bottom = baseline - 9, band top = baseline + 11).
  let y = 0;
  const text = (x, base, str, { size = 10.5, bold = false, color = "0.2 0.26 0.34 rg", align = "left" } = {}) => {
    const font = bold ? "/F2" : "/F1";
    const xPos = align === "right" ? x - textWidth(str, size) : x;
    out(`BT ${font} ${size} Tf ${color}`);
    out(`${xPos.toFixed(2)} ${base.toFixed(2)} Td (${escText(str)}) Tj`);
    out("ET");
  };
  const band = (bottom, height, fill) => {
    out(fill); // full color op, e.g. "0.95 0.965 0.985 rg"
    out(`0 ${bottom.toFixed(2)} ${PAGE_W} ${height.toFixed(2)} re f`);
  };
  const line = (base, color = "0.78 0.86 0.94 RG", w = "1 w") => {
    out(`${color} ${w}`);
    out(`${MARGIN} ${base.toFixed(2)} m ${RIGHT} ${base.toFixed(2)} l S`);
  };

  // ── Header ────────────────────────────────────────────────────────────
  const logoH = 40;
  const logoW = logo && logo.width ? (logoH * logo.width) / logo.height : 150;
  const logoBottom = PAGE_H - 40;
  if (logo) {
    out("q");
    out(`${logoW.toFixed(2)} 0 0 ${logoH} ${MARGIN} ${logoBottom} cm /Im1 Do`);
    out("Q");
  }

  const textX = MARGIN + logoW + 22;
  text(textX, PAGE_H - 58, "TWM HRMS", { size: 19, bold: true, color: "0.08 0.12 0.18 rg" });
  text(textX, PAGE_H - 72, "The Website Makers", { size: 10.5, color: "0.42 0.5 0.58 rg" });

  text(RIGHT, PAGE_H - 58, "Payslip", { size: 16, bold: true, color: "0.08 0.12 0.18 rg", align: "right" });
  text(RIGHT, PAGE_H - 72, periodLabel(period), { size: 11, color: "0.42 0.5 0.58 rg", align: "right" });

  line(PAGE_H - 90);

  // ── Details block ─────────────────────────────────────────────────────
  const details = [
    ["EMPLOYEE", employeeName || "—"],
    ["EMPLOYEE ID", employeeNumber || "—"],
    ["DESIGNATION", jobTitle || "—"],
    ["PAY PERIOD", `${periodLabel(period)} (${period})`],
    ["STATEMENT DATE", todayYmd()],
  ];
  y = PAGE_H - 118;
  for (const [label, value] of details) {
    text(MARGIN, y, label, { size: 9.5, color: "0.42 0.5 0.58 rg" });
    text(MARGIN + 118, y, value, { size: 10.5, color: "0.1 0.14 0.2 rg" });
    y -= 18;
  }

  // ── Table helpers (band sits under the row text, never over it) ──────
  const amtX = RIGHT - 10;
  const rowH = 22; // baseline step

  const row = (label, amount, { bold = false, white = false } = {}) => {
    band(y - 9, 20, white ? "0.08 0.12 0.18 rg" : "0.95 0.965 0.985 rg");
    text(MARGIN + 8, y, label, { size: 10.5, bold, color: bold ? "0.08 0.12 0.18 rg" : "0.35 0.42 0.5 rg" });
    if (amount != null) {
      text(amtX, y, String(amount), { size: 10.5, bold, color: white ? "1 1 1 rg" : "0.08 0.12 0.18 rg", align: "right" });
    }
    y -= rowH;
  };

  const subHead = (label, amountLabel) => {
    band(y - 8, 18, "0.95 0.965 0.985 rg");
    text(MARGIN + 8, y, label, { size: 9.5, color: "0.45 0.52 0.62 rg" });
    text(amtX, y, amountLabel, { size: 9.5, color: "0.45 0.52 0.62 rg", align: "right" });
    y -= rowH;
  };

  const section = (label) => {
    y -= 14; // breathing room before a section heading
    text(MARGIN, y, label, { size: 11, bold: true, color: "0.08 0.12 0.18 rg" });
    y -= 20; // heading baseline -> table area
  };

  // ── Earnings table ────────────────────────────────────────────────────
  // Extras carry a sign: positive lines are earnings (bonus, travel), negative
  // lines are deductions (LOP, PF, advances) — split them into their own
  // sections rather than netting a deduction into "gross earnings".
  const earningsItems = (extras ?? []).filter((l) => Number(l.amount) > 0);
  const deductionItems = (extras ?? []).filter((l) => Number(l.amount) < 0);
  const earningsTotal =
    Math.round((Number(baseAmount) + earningsItems.reduce((s, l) => s + Number(l.amount), 0) + Number.EPSILON) * 100) /
    100;

  section("EARNINGS");
  subHead("Description", "Amount");
  row("Base salary", money(baseAmount));
  for (const lineItem of earningsItems) {
    row(String(lineItem.label || "Additional amount"), money(lineItem.amount));
  }
  row("Gross earnings", money(earningsTotal), { bold: true });

  // ── Deductions table ──────────────────────────────────────────────────
  section("DEDUCTIONS");
  subHead("Description", "Amount");
  for (const lineItem of deductionItems) {
    row(String(lineItem.label || "Deduction"), money(Math.abs(lineItem.amount)));
  }
  row("PF Tax", money(pfTax));
  y -= 10;

  // Net pay band
  const netStr = money(netAmount);
  band(y - 8, 24, "0.08 0.12 0.18 rg");
  text(MARGIN + 8, y, "Net pay", { size: 11.5, bold: true, color: "1 1 1 rg" });
  text(amtX, y, netStr, { size: 11.5, bold: true, color: "1 1 1 rg", align: "right" });

  // ── Footer ────────────────────────────────────────────────────────────
  line(96, "0.78 0.86 0.94 RG", "0.75 w");
  text(MARGIN, 78, "TWM HRMS — The Website Makers | This is a computer-generated payslip.", {
    size: 8.5,
    color: "0.55 0.62 0.7 rg",
  });

  // ── Assemble PDF parts ────────────────────────────────────────────────
  const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const objs = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objs[3] =
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] " +
    "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 7 0 R >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  const imgBytes = logo ? base64ToBytes(logo.jpegBase64) : new Uint8Array(0);
  objs[6] = logo
    ? `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>`
    : `<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 1 >>`;
  const content = ops.join("\n");
  objs[7] = `<< /Length ${content.length} >>`;

  // Build as byte chunks so the JPEG stream is raw binary.
  const chunks = [latin1Bytes(header)];
  let pos = header.length;
  const offsets = [0];
  for (let i = 1; i <= 7; i++) {
    offsets[i] = pos;
    chunks.push(latin1Bytes(`${i} 0 obj\n${objs[i]}\n`));
    pos += latin1Bytes(`${i} 0 obj\n${objs[i]}\n`).length;
    if (i === 6) {
      chunks.push(latin1Bytes("stream\n"));
      pos += "stream\n".length;
      if (logo) {
        chunks.push(imgBytes);
        pos += imgBytes.length;
      }
      chunks.push(latin1Bytes("\nendstream\n"));
      pos += "\nendstream\n".length;
    } else if (i === 7) {
      chunks.push(latin1Bytes("stream\n"));
      pos += "stream\n".length;
      chunks.push(latin1Bytes(content));
      pos += content.length;
      chunks.push(latin1Bytes("\nendstream\n"));
      pos += "\nendstream\n".length;
    }
    chunks.push(latin1Bytes("endobj\n"));
    pos += "endobj\n".length;
  }
  const xrefPos = pos;
  let trailer = "xref\n0 8\n0000000000 65535 f \n";
  for (let i = 1; i <= 7; i++) {
    trailer += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  trailer += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  // Assemble final byte array.
  const tr = latin1Bytes(trailer);
  const pdf = new Uint8Array(pos + tr.length);
  let w = 0;
  for (const c of chunks) {
    pdf.set(c, w);
    w += c.length;
  }
  pdf.set(tr, w);
  return pdf;
}

export async function downloadPayslipPdf(payslip) {
  const logo = await loadLogo().catch(() => null);
  const bytes = buildPayslipPdf({ ...payslip, logo });
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const who = String(payslip.employeeName || "employee").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
  a.href = url;
  a.download = `payslip-${who}-${payslip.period}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
