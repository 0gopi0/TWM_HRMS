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

// Wait for the authenticated shell (sidebar present).
await page.waitForSelector(".app-shell .sidebar", { timeout: 15000 });

// Let fonts/layout settle a touch.
await page.waitForTimeout(700);

const navText = (await page.locator(".sidebar-nav").innerText()).trim();
const userText = (await page.locator(".sidebar-footer").innerText()).trim();
console.log("=== SIDEBAR NAV ===\n" + navText);
console.log("=== SIDEBAR FOOTER ===\n" + userText);
console.log("=== URL === " + page.url());

await page.screenshot({ path: "dashboard_sidebar.png" });

// Also capture the mobile drawer (hamburger) state at a phone viewport.
const mobile = await browser.newContext({ viewport: { width: 420, height: 900 } });
const mp = await mobile.newPage();
await mp.goto(BASE, { waitUntil: "networkidle" });
await mp.fill('input[type="email"]', EMAIL);
await mp.fill('input[type="password"]', PASSWORD);
await mp.click('button[type="submit"]');
await mp.waitForSelector(".mobile-topbar", { timeout: 15000 });
await mp.waitForTimeout(700);
await mp.screenshot({ path: "mobile_closed.png" });
await mp.click(".menu-btn");
await mp.waitForTimeout(500);
await mp.screenshot({ path: "mobile_open.png" });

await browser.close();
console.log("DONE");
