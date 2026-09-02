import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox","--disable-gpu","--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const groups = await page.evaluate(() => {
  return [...document.querySelectorAll(".people-group")].map((g) => ({
    label: g.querySelector(".people-group-label")?.textContent.trim(),
    accounts: [...g.querySelectorAll(".person-tab .person-tab-name")].map(e => e.textContent.trim()),
  }));
});
console.log(JSON.stringify(groups, null, 2));
// count total
console.log("total person-tabs:", await page.locator(".person-tab").count());
await browser.close();
