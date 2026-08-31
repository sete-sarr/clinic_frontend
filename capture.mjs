import { chromium } from "playwright";
import fs from "fs";

const OUT = "e:/my startup/Clinic-management/marketing-screenshots";
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:4200";

async function login(page, username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.waitForSelector("form input", { timeout: 15000 });
  const inputs = page.locator("form input");
  await inputs.nth(0).fill(username);
  await inputs.nth(1).fill(password);
  await page.locator('button[type="submit"]').first().click();
  // Wait for the actual redirect away from /login (post-auth), not a fixed delay — the auth
  // request itself can be slow on this machine, same as page navigations.
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60000 }).catch((e) => {
    console.log("  login redirect wait failed:", e.message, "current url:", page.url());
  });
  await page.waitForTimeout(1500);
}

async function shot(page, name) {
  // Wait for loading spinners (mat-spinner / mat-progress-spinner) to clear before capturing —
  // API calls on this machine are slow, a fixed short delay isn't enough.
  await page
    .waitForSelector("mat-spinner, mat-progress-spinner", { state: "detached", timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log("captured:", name);
}

async function tryGoto(page, path) {
  await page
    .goto(`${BASE}${path}`, { waitUntil: "load", timeout: 60000 })
    .catch((e) => console.log("goto failed", path, e.message));
  await page.waitForTimeout(1500);
}

const browser = await chromium.launch({ headless: true, timeout: 120000 });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const page = await context.newPage();

console.log("Logging in as clinic admin...");
await login(page, "admin.demo", "Demo1234!");
await shot(page, "01-dashboard");

await tryGoto(page, "/patients");
await shot(page, "02-patients-list");

await tryGoto(page, "/doctors");
await shot(page, "03-doctors-list");

await tryGoto(page, "/appointments");
await shot(page, "04-appointments-list");

await tryGoto(page, "/billing");
await shot(page, "05-billing-list");

await tryGoto(page, "/payments");
await shot(page, "06-payments-list");

await tryGoto(page, "/staff");
await shot(page, "07-staff-list");

await tryGoto(page, "/audit-log");
await shot(page, "08-audit-log");

await tryGoto(page, "/settings");
await shot(page, "09-settings");

await context.close();

// Doctor view — consultations / medical records / prescriptions
const context2 = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const page2 = await context2.newPage();
console.log("Logging in as doctor...");
await login(page2, "dr.benali", "Demo1234!");
await shot(page2, "10-doctor-dashboard");

await tryGoto(page2, "/consultations");
await shot(page2, "11-consultations-list");

await tryGoto(page2, "/medical-records");
await shot(page2, "12-medical-records-list");

await tryGoto(page2, "/prescriptions");
await shot(page2, "13-prescriptions-list");

await context2.close();
await browser.close();
console.log("Done.");
