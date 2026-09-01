import { chromium } from "playwright-core";

const BASE = "http://localhost:5173";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "chai@twm.local");
await page.fill('input[type="password"]', "LocalDev!23");
await page.click('button[type="submit"]');
await page.waitForSelector(".app-shell .sidebar", { timeout: 15000 });
await page.waitForTimeout(500);

// 1) Are there duplicate links? How many, and their boxes?
const boxes = await page.evaluate(() => {
  const links = [...document.querySelectorAll(".sidebar-link")];
  return links.map((l, i) => {
    const r = l.getBoundingClientRect();
    return { i, label: l.textContent.trim(), top: Math.round(r.top), h: Math.round(r.height), left: Math.round(r.left), w: Math.round(r.width) };
  });
});
console.log("LINK COUNT:", boxes.length);
console.log("BOXES:", JSON.stringify(boxes, null, 2));

// 2) Hover over the VISIBLE TEXT of the first tab and report which element is now :hover
async function hoverText(tabIndex) {
  const label = page.locator(".sidebar-link .sidebar-label").nth(tabIndex);
  await label.hover();
  await page.waitForTimeout(150);
  const hovered = await page.evaluate(() => {
    const links = [...document.querySelectorAll(".sidebar-link")];
    const idx = links.findIndex((l) => l.matches(":hover"));
    return { hoveredIndex: idx, hoveredLabel: idx >= 0 ? links[idx].textContent.trim() : null };
  });
  return hovered;
}
for (let i = 0; i < boxes.length; i++) {
  const r = await hoverText(i);
  console.log(`hover label#${i} ("${boxes[i].label}") -> hovered:`, JSON.stringify(r));
}

await browser.close();
