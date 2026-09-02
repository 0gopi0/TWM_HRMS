import { chromium } from "playwright-core";
const BASE = "http://localhost:5173";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"] });
for (const dsf of [1, 2]) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: dsf });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "chai@twm.local");
  await page.fill('input[type="password"]', "LocalDev!23");
  await page.click('button[type="submit"]');
  await page.waitForSelector(".app-shell .sidebar", { timeout: 15000 });
  await page.waitForTimeout(400);
  const out = [];
  for (let i = 0; i < 7; i++) {
    await page.locator(".sidebar-link .sidebar-label").nth(i).hover();
    await page.waitForTimeout(100);
    const r = await page.evaluate(() => {
      const links = [...document.querySelectorAll(".sidebar-link")];
      const idx = links.findIndex((l) => l.matches(":hover"));
      return idx;
    });
    out.push(r);
  }
  console.log(`dsf=${dsf} hoveredIndexByLabelIndex => ${JSON.stringify(out)}`);
  await context.close();
}
await browser.close();
