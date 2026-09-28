// Pulls studio-direct schedules for every venue in data/venues.json that has a `booking` block:
//   "booking": {"platform": "mindbody", "config": {...}}   (config fields: see scrapers/direct/<platform>.mjs)
// Output: data/raw/direct.json {fetchedAt, venues: {venueId: [classes]}, errors: {venueId: message}}
// A venue that fails keeps its classes from the previous run.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = `${ROOT}data/raw/direct.json`;
const venues = JSON.parse(readFileSync(`${ROOT}data/venues.json`, 'utf8')).filter(v => v.booking?.platform && !v.closed);
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { venues: {} };
const from = new Date(), to = new Date(Date.now() + 7 * 864e5);
const out = { fetchedAt: new Date().toISOString(), venues: {}, errors: {} };
const fetchers = {};

const only = process.argv[2];
for (const v of venues) {
  if (only && v.id !== only) continue;
  const { platform, config } = v.booking;
  try {
    fetchers[platform] ||= (await import(`./direct/${platform}.mjs`)).fetchSchedule;
    const list = await Promise.race([
      fetchers[platform](config, { from, to }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 60e3)),
    ]);
    const f = v.booking.filter;
    const keep = c => !f || [c.raw?.location_ids, c.raw?.defaultLocationId, c.raw?.location?.id, c.raw?.locationId].flat().includes(f.locationId)
      || (f.locationName && String(c.raw?.location_name || c.raw?.location?.name || '').includes(f.locationName));
    out.venues[v.id] = list.filter(c => c.start && c.name && keep(c)).map(({ raw, ...c }) => c);
    console.log(`${v.id} [${platform}] ${out.venues[v.id].length} classes`);
  } catch (e) {
    out.errors[v.id] = String(e.message || e).slice(0, 300);
    if (prev.venues[v.id]) out.venues[v.id] = prev.venues[v.id].filter(c => Date.parse(c.start) > Date.now() - 864e5);
    console.log(`${v.id} [${platform}] FAILED: ${out.errors[v.id].split('\n')[0]}`);
  }
}
if (only) { out.venues = { ...prev.venues, ...out.venues }; out.errors = { ...prev.errors, ...out.errors }; delete out.errors[only]; if (out.venues[only]) delete out.errors[only]; }
writeFileSync(OUT, JSON.stringify(out));
console.log(`direct: ${Object.keys(out.venues).length} venues, ${Object.values(out.venues).flat().length} classes, ${Object.keys(out.errors).length} errors`);
