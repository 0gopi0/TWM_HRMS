import { chromium } from "playwright-core";

const BASE = "http://localhost:5173";
const PASSWORD = "LocalDev!23";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function login(email) {
  const r = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  return r.json();
}

async function api(email, path, body, method) {
  const { accessToken } = await login(email);
  const opts = { method: method || (body ? "POST" : "GET"), headers: { Authorization: `Bearer ${accessToken}` } };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(`${BASE}/api/v1${path}`, opts);
  return r.json().catch(() => ({}));
}

const T = today();
const from = new Date(); from.setDate(from.getDate() - 3);
const to = new Date(); to.setDate(to.getDate() + 3);
const rangeStart = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
const rangeEnd = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`;
console.log("today:", T, "range:", rangeStart, "->", rangeEnd);

// Clean slate: create approved leave covering a wide window around today for two people (via HR), clock in two others.
await api("chai@twm.local", "/leave/managed", { employeeId: "emp-aman", leaveType: "casual", startDate: rangeStart, endDate: rangeEnd, status: "approved", reason: "Demo on leave" });
await api("chai@twm.local", "/leave/managed", { employeeId: "emp-suman", leaveType: "casual", startDate: rangeStart, endDate: rangeEnd, status: "approved", reason: "Demo on leave" });
await api("naveen@twm.local", "/attendance/clock-in", null, "POST");
await api("gopi@twm.local", "/attendance/clock-in", null, "POST");

// Read the org chart and print each node's status.
const org = await api("chai@twm.local", "/employees/org");
function walk(nodes, depth = 0) {
  for (const n of nodes) {
    console.log("  ".repeat(depth) + `${n.name} -> ${n.status}`);
    if (n.reports?.length) walk(n.reports, depth + 1);
  }
}
walk(org.tree || []);

// Screenshot the org chart in the UI.
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "chai@twm.local");
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForSelector(".app-shell .sidebar", { timeout: 15000 });
await page.locator(".sidebar-link", { hasText: "Org Chart" }).click();
await page.waitForSelector(".org-layout", { timeout: 15000 });
await page.waitForTimeout(600);
await page.screenshot({ path: "org_status.png" });
await browser.close();
console.log("DONE");
