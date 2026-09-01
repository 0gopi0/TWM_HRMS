import { chromium } from "playwright-core";

const BASE = "http://localhost:5173";

const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

async function navFor(email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "LocalDev!23");
  await page.click('button[type="submit"]');
  await page.waitForSelector(".app-shell .sidebar", { timeout: 15000 });
  await page.waitForTimeout(500);
  const items = (await page.locator(".sidebar-link .sidebar-label").allInnerTexts()).map((s) => s.trim());
  const role = (await page.locator(".sidebar-user-name").innerText()).trim();
  await page.screenshot({ path: `role_${email.split("@")[0]}.png` });
  await context.close();
  return { role, items };
}

const manoj = await navFor("manoj@twm.local");
console.log("MANOJ:", JSON.stringify(manoj));
const chai = await navFor("chai@twm.local");
console.log("CHAI:", JSON.stringify(chai));

await browser.close();
console.log("DONE");
