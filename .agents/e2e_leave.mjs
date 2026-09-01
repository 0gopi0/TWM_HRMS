import { chromium } from "playwright-core";

const BASE = "http://localhost:5173";
const EMAIL = process.env.HRMS_EMAIL || "chai@twm.local";
const PASSWORD = process.env.HRMS_PASSWORD || "LocalDev!23";

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(BASE, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForSelector(".app-shell .sidebar", { timeout: 15000 });

await page.goto(BASE + "/leave", { waitUntil: "networkidle" });
await page.waitForSelector(".page-tabs", { timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: "leave_requests.png" });

// Switch to the Leave Management tab (HR only).
const btn = page.locator(".page-tab", { hasText: "Leave Management" }).first();
console.log("Leave Management tab present:", await btn.count());
await btn.click();
await page.waitForTimeout(700);
await page.screenshot({ path: "leave_mgmt.png" });

await browser.close();
console.log("DONE");
