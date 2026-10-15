// Dev probe: run a JS file (async function body) inside a classpass.com tab and print its return value.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
const ctx = await chromium.launchPersistentContext(`${homedir()}/.config/class-finder/chromium-profile`, { headless: true, channel: 'chromium', args: ['--disable-blink-features=AutomationControlled'], userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto(process.env.URL || 'https://classpass.com/plans', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !/just a moment/i.test(document.title), null, { timeout: 60e3 });
await page.waitForTimeout(2500);
const body = readFileSync(process.argv[2], 'utf8');
console.log(await page.evaluate(`(async()=>{${body}})()`));
await ctx.close();
