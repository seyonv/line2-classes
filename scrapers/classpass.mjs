// Pulls ClassPass venues + 7 days of classes near every Line 2 station.
// ClassPass sits behind Cloudflare, so this opens a real Chromium (persistent profile, so the
// Cloudflare clearance and test-account login stick) and runs classpass-page.js inside a classpass.com tab.
// Output: data/raw/classpass.json
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;
const DAYS = Number(process.env.DAYS || 7);
const HEADLESS = !!process.env.HEADLESS; // headless gets 403 from the API; headed runs off-screen
const stations = JSON.parse(readFileSync(`${ROOT}data/stations.json`, 'utf8'));
const days = [...Array(DAYS)].map((_, i) => new Date(Date.now() + i * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }));

const ctx = await chromium.launchPersistentContext(`${homedir()}/.config/class-finder/chromium-profile`, {
  headless: HEADLESS,
  args: ['--disable-blink-features=AutomationControlled', '--window-position=-2400,0'],
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 900 },
  locale: 'en-CA',
  timezoneId: 'America/Toronto',
});
try {
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto('https://classpass.com/plans', { waitUntil: 'domcontentloaded', timeout: 60e3 });
  await page.waitForFunction(() => document.title && !/just a moment/i.test(document.title), null, { timeout: 60e3 });
  await page.waitForTimeout(3000);
  const probe = await page.evaluate(() => fetch('/_api/v3/search/schedules', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"venue":204396,"date":"' + new Date().toISOString().slice(0, 10) + '"}' }).then(r => r.status));
  if (probe !== 200) throw new Error(`ClassPass API probe returned ${probe} (Cloudflare?). `);

  const script = readFileSync(`${ROOT}scrapers/classpass-page.js`, 'utf8');
  const args = { stations: stations.map(({ name, lat, lon }) => ({ name, lat, lon })), days, radiusKm: 1.7 };
  await page.evaluate(a => { window.__cp = null; window.__cpStatus = 'starting'; window.__cpArgs = a; }, args);
  await page.evaluate(script);

  const started = Date.now();
  let last = '';
  for (;;) {
    await page.waitForTimeout(5000);
    const status = await page.evaluate(() => window.__cpStatus);
    if (status !== last && (status === 'done' || Date.now() % 4 < 1 || !status.startsWith(last.split(' ')[0]))) console.log(new Date().toISOString().slice(11, 19), status);
    last = status;
    if (status === 'done') break;
    if (Date.now() - started > 45 * 60e3) throw new Error('ClassPass scrape timed out: ' + status);
  }
  const data = JSON.parse(await page.evaluate(() => window.__cp));
  mkdirSync(`${ROOT}data/raw`, { recursive: true });
  writeFileSync(`${ROOT}data/raw/classpass.json`, JSON.stringify(data));
  console.log(`venues ${Object.keys(data.venues).length} (ids ${data.venueIds.length}), classes ${data.schedules.length}, errors ${data.errors.length}`);

  // Weekly: scan reviews for shower mentions (new venues get scanned on the next run).
  const RV = `${ROOT}data/review-mentions.json`;
  const reviews = existsSync(RV) ? JSON.parse(readFileSync(RV, 'utf8')) : { venues: {} };
  const stale = Date.now() - Date.parse(reviews.scannedAt || 0) > 7 * 864e5;
  const todo = Object.keys(data.venues).filter(id => stale || !reviews.venues[id]);
  if (todo.length) {
    await page.evaluate(a => { window.__rv = null; window.__rvStatus = 'starting'; window.__rvArgs = a; }, { venueIds: todo, pages: 12 });
    await page.evaluate(readFileSync(`${ROOT}scrapers/classpass-reviews-page.js`, 'utf8'));
    for (;;) { await page.waitForTimeout(5000); const st = await page.evaluate(() => window.__rvStatus); if (st === 'done') break; }
    Object.assign(reviews.venues, JSON.parse(await page.evaluate(() => window.__rv)));
    if (stale) reviews.scannedAt = new Date().toISOString();
    writeFileSync(RV, JSON.stringify(reviews, null, 1));
    console.log(`reviews scanned for ${todo.length} venues`);
  }
} finally {
  await ctx.close();
}
