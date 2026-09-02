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
await page.goto(BASE + "/leave", { waitUntil: "networkidle" });
await page.locator(".page-tab", { hasText: "Leave Management" }).first().click();
await page.waitForTimeout(700);

const formInfo = await page.evaluate(() => {
  const form = document.querySelector(".leave-mgmt form.card.form");
  if (!form) return { found: false };
  const cs = getComputedStyle(form);
  const labels = [...form.querySelectorAll("label")].map((l) => {
    const r = l.getBoundingClientRect();
    const s = getComputedStyle(l);
    return {
      text: l.textContent.trim().slice(0, 20),
      w: Math.round(r.width),
      h: Math.round(r.height),
      display: s.display,
      visibility: s.visibility,
      opacity: s.opacity,
    };
  });
  return {
    found: true,
    formDisplay: cs.display,
    formMaxWidth: cs.maxWidth,
    formHeight: Math.round(form.getBoundingClientRect().height),
    childCount: form.children.length,
    labels,
  };
});
console.log("FORM INFO:", JSON.stringify(formInfo, null, 2));

const grid = await page.evaluate(() => {
  const g = document.querySelector(".leave-mgmt .card-form-grid");
  if (!g) return { found: false };
  const cs = getComputedStyle(g);
  const cols = cs.gridTemplateColumns;
  return { found: true, display: cs.display, gridTemplateColumns: cols, width: Math.round(g.getBoundingClientRect().width) };
});
console.log("GRID:", JSON.stringify(grid, null, 2));

await browser.close();
