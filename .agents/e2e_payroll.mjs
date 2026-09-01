import { chromium } from "playwright-core";

const BASE = "http://localhost:5173";
let failures = 0;
function check(cond, label) {
  if (cond) console.log(`  ok  ${label}`);
  else {
    failures++;
    console.log(`  FAIL ${label}`);
  }
}

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

// ── Login as Nagendra (HR) ─────────────────────────────────────────────
await page.goto(BASE, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "nagendra@twm.local");
await page.fill('input[type="password"]', "LocalDev!23");
await page.click('button[type="submit"]');
await page.waitForSelector(".app-shell .sidebar", { timeout: 15000 });

// ── Open Payroll ───────────────────────────────────────────────────────
await page.locator(".sidebar-link", { hasText: "Payroll" }).click();
await page.waitForSelector(".payroll-form", { timeout: 15000 });
await page.waitForFunction(
  () => document.querySelectorAll(".payroll-form select option").length > 1,
  { timeout: 15000 },
);
const options = await page.$$eval(".payroll-form select option", (os) =>
  os.filter((o) => o.value).map((o) => ({ value: o.value, label: o.textContent })),
);
check(options.length >= 2, `employee dropdown has ${options.length} people`);
const empA = options[0];
const empB = options[1];

function totalsText() {
  return page.locator(".payroll-totals").innerText();
}

// ── Scenario A: base 22000 + extra 3000 → gross 25000 → PF 200 → net 24800
console.log("Scenario A: gross exactly 25k → PF applies");
await page.selectOption(".payroll-form select", empA.value);
await page.fill('.payroll-form input[type="month"]', "2026-07");
await page.fill('.payroll-form input[type="number"]', "22000");
await page.click(".payroll-form .btn-ghost"); // + Add amount
await page.fill(".payroll-extra-row input[type='text']", "Travel expenses");
await page.fill(".payroll-extra-row input[type='number']", "3000");
await page.waitForTimeout(150);
let t = await totalsText();
check(t.includes("25,000.00") && t.includes("gross ≥"), `totals show gross ₹25,000 with PF note: ${JSON.stringify(t.split("\n").slice(3).join(" | "))}`);
check(t.includes("24,800.00"), "net shows 24,800.00");
await page.click(".payroll-form button[type='submit']");
await page.waitForSelector(".success", { timeout: 8000 });
let body = await page.evaluate(() => document.querySelector(".table-card table").innerText);
check(body.includes("2026-07") && body.includes("24,800.00"), "table row for 2026-07 with net 24,800.00");
check(body.includes("Travel expenses") || body.includes("1 item"), "extras summarized in table");
check(body.includes("− ₹200.00") || body.includes("200.00"), "PF 200 visible in table");

// ── Scenario B: duplicate (same employee + period) → friendly error
console.log("Scenario B: duplicate employee+period → 409 message");
await page.selectOption(".payroll-form select", empA.value);
await page.fill('.payroll-form input[type="month"]', "2026-07");
await page.fill('.payroll-form input[type="number"]', "10000");
await page.click(".payroll-form button[type='submit']");
await page.waitForSelector(".error", { timeout: 8000 });
const err = await page.locator(".error").innerText();
check(/already exists/i.test(err), `duplicate error shown: ${JSON.stringify(err)}`);

// ── Scenario C: below 25k → PF waived
console.log("Scenario C: gross < 25k → PF waived");
await page.selectOption(".payroll-form select", empB.value);
await page.fill('.payroll-form input[type="month"]', "2026-07");
await page.fill('.payroll-form input[type="number"]', "24000");
await page.waitForTimeout(150);
t = await totalsText();
check(t.includes("waived") && t.includes("24,000.00"), `PF waived for ${empB.label}: ${JSON.stringify(t.split("\n").slice(3).join(" | "))}`);
check(!t.includes("− ₹200"), "no 200 deduction below threshold");
await page.click(".payroll-form button[type='submit']");
await page.waitForSelector(".success", { timeout: 8000 });
body = await page.evaluate(() => document.querySelector(".table-card table").innerText);
check(body.includes(empB.label) || /24,000\.00/.test(body), `row for ${empB.label} net 24,000.00`);

// ── Scenario D: empty extra rows are ignored (no zero-amount junk)
console.log("Scenario D: empty extra row ignored");
await page.fill('.payroll-form input[type="number"]', "30000");
await page.click(".payroll-form .btn-ghost"); // add an empty row
await page.waitForTimeout(100);
t = await totalsText();
check(t.includes("30,000.00") && t.includes("29,800.00"), "gross 30000 → net 29800 with PF, empty row ignored");

await browser.close();
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
