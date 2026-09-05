import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const pages = ["/", "/planificar", "/cerebro"];
const viewports = [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 900 }];
const browser = await chromium.launch({ headless: true });
let failures = 0;

async function waitForApp() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try { const response = await fetch(baseUrl); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`application did not become ready at ${baseUrl}`);
}

await waitForApp();

for (const viewport of viewports) {
  for (const path of pages) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const consoleErrors = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    try {
      const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (!response || !response.ok()) throw new Error(`HTTP ${response?.status() ?? "no response"}`);
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const unnamedButtons = await page.locator("button").evaluateAll((buttons) => buttons.filter((button) => !button.textContent?.trim() && !button.getAttribute("aria-label") && !button.getAttribute("title")).length);
      const emptyLinks = await page.locator("a").evaluateAll((links) => links.filter((link) => !link.textContent?.trim() && !link.getAttribute("aria-label") && !link.getAttribute("title")).length);
      await page.screenshot({ path: `browser-audit-${viewport.name}-${path === "/" ? "home" : path.slice(1)}.png`, fullPage: true });
      if (overflow) throw new Error("horizontal overflow detected");
      if (unnamedButtons) throw new Error(`${unnamedButtons} unnamed button(s)`);
      if (emptyLinks) throw new Error(`${emptyLinks} unnamed link(s)`);
      if (consoleErrors.length) throw new Error(`console errors: ${consoleErrors.join(" | ")}`);
      console.log(`PASS ${viewport.name} ${path}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${viewport.name} ${path}: ${error instanceof Error ? error.message : String(error)}`);
    } finally { await page.close(); }
  }
}
await browser.close();
if (failures) process.exit(1);
