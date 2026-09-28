// Pulls ClassPass venues + 7 days of classes near every Line 2 station, and weekly scans reviews for shower mentions.
// ClassPass sits behind Cloudflare, so every API call runs as a fetch() inside a real Chromium tab on classpass.com
// (persistent profile, so the Cloudflare clearance sticks; headed and off-screen because headless gets 403).
// The loop lives here in Node, one call per page.evaluate, so a page reload mid-run only costs a retry.
// Output: data/raw/classpass.json, data/review-mentions.json
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;
const DAYS = Number(process.env.DAYS || 7);
const RADIUS_KM = 1.7;
const stations = JSON.parse(readFileSync(`${ROOT}data/stations.json`, 'utf8'));
const days = [...Array(DAYS)].map((_, i) => new Date(Date.now() + i * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ctx = await chromium.launchPersistentContext(`${homedir()}/.config/class-finder/chromium-profile`, {
  headless: !!process.env.HEADLESS,
  args: ['--disable-blink-features=AutomationControlled', '--window-position=-2400,0'],
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 900 }, locale: 'en-CA', timezoneId: 'America/Toronto',
});
const page = ctx.pages()[0] || await ctx.newPage();

// Open classpass.com and wait until the API answers (Cloudflare sometimes holds the first visit on a challenge).
async function openSite() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto('https://classpass.com/plans', { waitUntil: 'domcontentloaded', timeout: 60e3 });
      await page.waitForFunction(() => document.title && !/just a moment/i.test(document.title), null, { timeout: 90e3 });
      await page.waitForTimeout(3000);
      const status = await page.evaluate(() => fetch('/_api/v2/venues/204396/reviews?page_size=1&page=0').then(r => r.status));
      if (status === 200) return;
      console.log(`attempt ${attempt}: API probe ${status}`);
    } catch (e) { console.log(`attempt ${attempt}: ${e.message.split('\n')[0]}`); }
    await sleep(20e3);
  }
  throw new Error('ClassPass API not reachable after 3 attempts');
}

// One API call from inside the tab. Reopens the site and retries if the page navigated or Cloudflare re-challenged.
let reopening = null;
async function api(path, body) {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await page.evaluate(async ([p, b]) => {
        const res = await fetch('/_api' + p, b ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) } : {});
        return { status: res.status, json: res.ok ? await res.json() : null };
      }, [path, body]);
      if (r.status === 200) return r.json;
      if (r.status === 404) return null;
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (attempt >= 3) throw new Error(`${path}: ${e.message.split('\n')[0]}`);
      reopening ||= openSite().finally(() => { reopening = null; });
      await reopening;
    }
  }
}

async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all([...Array(n)].map(async () => { while (queue.length) { await fn(queue.shift()); await sleep(120); } }));
}

try {
  await openSite();
  const errors = [];

  // 1. Venues around every station. map_items only returns venues with inventory on that date, so union a few dates.
  const venueIds = new Set();
  const dlat = RADIUS_KM / 111, dlon = RADIUS_KM / 80.5;
  for (const s of stations) {
    for (const date of days.slice(0, 4)) {
      const filters = { date, lat: s.lat, lon: s.lon, result_type: 'VENUE', vertical: 'fitness', tag: [], map_bounds: [s.lon - dlon, s.lat - dlat, s.lon + dlon, s.lat + dlat].join(',') };
      try {
        const j = await api('/unisearch/v3/layout/map_items', { filters, map_item_search_options: { use_minimal_venue_model: true } });
        for (const m of j?.map_search?.map_items || []) venueIds.add(m.venue_id);
      } catch (e) { errors.push(String(e.message)); }
      await sleep(150);
    }
  }
  console.log(`discovered ${venueIds.size} venues`);

  // 2. Every class at every venue for every day.
  const venues = {}, schedules = [];
  const jobs = [...venueIds].flatMap(id => days.map(date => ({ id, date })));
  let done = 0;
  await pool(jobs, 3, async ({ id, date }) => {
    try {
      const j = await api('/v3/search/schedules', { venue: id, date });
      for (const s of j?.schedules || []) {
        const v = s.venue;
        if (v && !venues[v.id]) venues[v.id] = {
          id: v.id, name: v.name, subtitle: v.subtitle, alias: v.alias, activities: v.activities, address: v.address,
          location: v.location, amenities: v.amenities, ratings: v.ratings, booking_window: v.booking_window, source: v.source,
          website: v.website, description: v.description, studio_direct_enabled: v.studio_direct_enabled,
          available_for_trialers: v.available_for_trialers, late_cancellation: v.late_cancellation, requirements: v.requirements,
          when_to_arrive: v.when_to_arrive, how_to_get_there: v.how_to_get_there,
          site_id: v.site_id ?? null, organization_id: v.organization_id ?? null, google_place_id: v.google_place_id ?? null,
        };
        schedules.push({
          id: s.id, venueId: v?.id ?? id, start: s.starttime, end: s.endtime, name: s.class?.name, activities: s.class?.activities,
          level: s.class?.level, classAlias: s.class?.alias, classRating: s.class?.ratings?.mean ?? null,
          classRatingCount: s.class?.ratings?.count?.total ?? null, teacher: s.teacher_name || s.teacher?.name || null,
          status: s.availability?.status, demand: (s.demand_signals || []).map(d => d.label), livestream: s.is_livestream,
          credits: s.credits ?? s.credit_price ?? null,
        });
      }
    } catch (e) { errors.push(String(e.message)); }
    if (++done % 200 === 0) console.log(`schedules ${done}/${jobs.length}, ${schedules.length} classes`);
  });
  if (schedules.length < 500) throw new Error(`only ${schedules.length} classes; keeping the last good data (${errors.slice(0, 3).join('; ')})`);
  mkdirSync(`${ROOT}data/raw`, { recursive: true });
  writeFileSync(`${ROOT}data/raw/classpass.json`, JSON.stringify({ fetchedAt: new Date().toISOString(), venueIds: [...venueIds], venues, schedules, errors }));
  console.log(`classpass: ${Object.keys(venues).length} venues, ${schedules.length} classes, ${errors.length} errors`);

  // 3. Weekly: scan recent reviews for shower / change-room mentions (new venues get scanned on the next run).
  const RV = `${ROOT}data/review-mentions.json`;
  const reviews = existsSync(RV) ? JSON.parse(readFileSync(RV, 'utf8')) : { venues: {} };
  const stale = Date.now() - Date.parse(reviews.scannedAt || 0) > 7 * 864e5;
  const todo = Object.keys(venues).filter(id => stale || !reviews.venues[id]);
  const RE = /shower|change ?room|changing room|locker ?room|towel/i;
  await pool(todo, 3, async id => {
    const rec = { checked: 0, mentions: [] };
    for (let p = 0; p < 12; p++) {
      let list;
      try { list = (await api(`/v2/venues/${id}/reviews?page_size=50&page=${p}`))?.reviews || []; } catch { break; }
      rec.checked += list.length;
      for (const r of list) {
        const t = String(r.review || ''), m = t.match(RE);
        if (!m) continue;
        const a = Math.max(0, t.lastIndexOf('.', m.index - 1) + 1, m.index - 140), b = Math.min(t.length, (t.indexOf('.', m.index) + 1) || t.length, m.index + 160);
        rec.mentions.push({ text: t.slice(a, b).trim(), date: r.created_on, rating: Number(r.rating) }); // no reviewer names
      }
      if (list.length < 50) break;
    }
    reviews.venues[id] = rec;
  });
  if (todo.length) {
    if (stale) reviews.scannedAt = new Date().toISOString();
    writeFileSync(RV, JSON.stringify(reviews, null, 1));
    console.log(`reviews scanned for ${todo.length} venues`);
  }
} finally {
  await ctx.close();
}
