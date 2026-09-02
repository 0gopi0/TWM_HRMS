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

const info = await page.evaluate(() => {
  const nav = document.querySelector(".sidebar-nav");
  const links = [...document.querySelectorAll(".sidebar-link")];
  const detail = links.map((l) => {
    const r = l.getBoundingClientRect();
    const cs = getComputedStyle(l);
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const at = document.elementFromPoint(cx, cy);
    const atInfo = at ? { tag: at.tagName, cls: !at.classList || at.classList.length === 0 ? "" : at.className, inLink: !!at.closest(".sidebar-link") } : null;
    return {
      label: l.textContent.trim(),
      w: Math.round(r.width),
      h: Math.round(r.height),
      left: Math.round(r.left),
      top: Math.round(r.top),
      parentW: Math.round(l.parentElement.getBoundingClientRect().width),
      cursor: cs.cursor,
      display: cs.display,
      centerAt: atInfo,
    };
  });
  const navRect = nav.getBoundingClientRect();
  const sidebarRect = document.querySelector(".sidebar").getBoundingClientRect();
  const scrim = document.querySelector(".sidebar-scrim");
  return {
    links: detail,
    navW: Math.round(navRect.width),
    sidebarW: Math.round(sidebarRect.width),
    scrim: scrim ? { pe: getComputedStyle(scrim).pointerEvents, opacity: getComputedStyle(scrim).opacity, z: getComputedStyle(scrim).zIndex } : null,
    bodyScrollW: document.body.scrollWidth,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
