import { chromium } from "playwright-core";

const BASE = "http://localhost:5173";
const EMAIL = process.env.HRMS_EMAIL || "chai@twm.local";
const PASSWORD = process.env.HRMS_PASSWORD || "LocalDev!23";

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

async function login(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector(".app-shell .sidebar", { timeout: 15000 });
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await login(page);

await page.locator(".sidebar-link", { hasText: "Org Chart" }).click();
await page.waitForSelector(".org-layout", { timeout: 15000 });
await page.waitForTimeout(600);

const active = (await page.locator(".org-node.you .org-identity strong").first().innerText()).trim();
console.log("ACTIVE (You) node:", active);
console.log("DETAIL title:", (await page.locator(".org-detail-head h3").innerText()).trim());

await page.screenshot({ path: "org_page.png" });

// Pick a node (choose the "Aman" business associate under the tree) and select it.
const aman = page.locator(".org-row", { hasText: "Aman" }).first();
await aman.click();
await page.waitForTimeout(400);
console.log("DETAIL after selecting Aman:", (await page.locator(".org-detail-head h3").innerText()).trim());
await page.screenshot({ path: "org_selected.png" });

// Collapse the root (Manoj) to verify the expand/collapse interaction.
await page.locator(".org-toggle").first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: "org_collapsed.png" });

// Mobile view of the org page.
const mobile = await browser.newContext({ viewport: { width: 420, height: 900 } });
const mp = await mobile.newPage();
await login(mp);
await mp.locator(".menu-btn").click();
await mp.locator(".sidebar-link", { hasText: "Org Chart" }).click();
await mp.waitForSelector(".org-layout", { timeout: 15000 });
await mp.waitForTimeout(500);
await mp.screenshot({ path: "org_mobile.png" });

await browser.close();
console.log("DONE");
