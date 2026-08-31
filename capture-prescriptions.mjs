import { chromium } from "playwright";

const OUT = "e:/my startup/Clinic-management/marketing-screenshots";
const BASE = "http://localhost:4200";

async function login(page, username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.waitForSelector("form input", { timeout: 15000 });
  const inputs = page.locator("form input");
  await inputs.nth(0).fill(username);
  await inputs.nth(1).fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch({ headless: true, timeout: 120000 });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const page = await context.newPage();

await login(page, "dr.benali", "Demo1234!");
await page.goto(`${BASE}/prescriptions`, { waitUntil: "load", timeout: 60000 });
await page
  .waitForSelector("mat-spinner, mat-progress-spinner", { state: "detached", timeout: 20000 })
  .catch(() => {});
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/13-prescriptions-list.png` });
console.log("captured: 13-prescriptions-list (retry)");

await browser.close();
