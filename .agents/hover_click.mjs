import { chromium } from "playwright-core";

const BASE = "http://localhost:5173";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "chai@twm.local");
await page.fill('input[type="password"]', "LocalDev!23");
await page.click('button[type="submit"]');
await page.waitForSelector(".app-shell .sidebar", { timeout: 15000 });
await page.waitForTimeout(500);

const results = [];
for (const label of ["Leave", "Approvals", "People", "Org Chart", "Calendar", "Payroll"]) {
  const link = page.locator(".sidebar-link", { hasText: label }).first();
  // hover
  await link.hover();
  await page.waitForTimeout(120);
  const bg = await link.evaluate((el) => getComputedStyle(el).backgroundColor);
  // click
  await link.click();
  await page.waitForTimeout(300);
  results.push({ label, hoverBg: bg, url: page.url() });
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
