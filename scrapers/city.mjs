// City of Toronto community-centre fitness drop-ins (FitnessTO), from the open data portal.
// Dataset: "Registered Programs and Drop In Courses Offering" (refreshed by the City weekly).
// Output: data/raw/city.json  {locations: {id: {name, address, lat, lon}}, classes: [...]}
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const BASE = 'https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/1a5be46a-4039-48cd-a2d2-8e702abf9516/resource';
const DROPIN = `${BASE}/067b41e7-ac8a-4d3f-ad08-089f8cd70316/download/drop-in.json`;
const LOCATIONS = `${BASE}/87f95a5a-184f-4df5-ad37-84bcc1ea99a9/download/locations.json`;
const UA = { 'user-agent': 'line2-classes/1.0 (personal class finder)' };
const SKIP = /weight\/cardio room|track|walking|walk fit|outdoor walk|open fitness studio|with baby|physical therapy/i;
const CACHE = `${ROOT}data/geocode-cache.json`;

const get = async url => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
const [dropins, locations] = await Promise.all([get(DROPIN), get(LOCATIONS)]);
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
const until = new Date(Date.now() + 8 * 864e5).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
const rows = dropins.filter(d => d.Section.startsWith('FitnessTO') && !SKIP.test(d['Course Title'])
  && Number(d['Age Min']) <= 19 && (d['Age Max'] === 'None' || Number(d['Age Max']) >= 40)
  && d['Last Date'] >= today && d['First Date'] <= until);

const locById = Object.fromEntries(locations.map(l => [l['Location ID'], l]));
const address = l => [l['Street No'], l['Street No Suffix'], l['Street Name'], l['Street Type'], l['Street Direction']]
  .filter(x => x && x !== 'None').join(' ') + ', Toronto, ON';

const out = { fetchedAt: new Date().toISOString(), source: 'https://open.toronto.ca/dataset/registered-programs-and-drop-in-courses-offering/', locations: {}, classes: [] };
for (const id of new Set(rows.map(r => r['Location ID']))) {
  const l = locById[id]; if (!l) continue;
  const addr = address(l);
  if (!cache[addr]) {
    const q = new URLSearchParams({ q: addr, format: 'json', limit: '1', countrycodes: 'ca' });
    const hit = (await get(`https://nominatim.openstreetmap.org/search?${q}`))[0];
    cache[addr] = hit ? { lat: +hit.lat, lon: +hit.lon } : { lat: null, lon: null };
    await new Promise(r => setTimeout(r, 1100));
  }
  out.locations[id] = { name: l['Location Name'], address: addr, ...cache[addr], ttc: l['TTC Information'] !== 'None' ? l['TTC Information'] : null,
    url: `https://www.toronto.ca/explore-enjoy/parks-recreation/places-spaces/parks-and-recreation-facilities/location/?id=${id}` };
}
writeFileSync(CACHE, JSON.stringify(cache, null, 1));

// Each row is one date (First Date == Last Date) in the current dataset; expand ranges just in case.
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
for (const r of rows) {
  if (!out.locations[r['Location ID']]) continue;
  for (let d = new Date(r['First Date'] + 'T12:00:00'); d.toISOString().slice(0, 10) <= r['Last Date']; d = new Date(+d + 864e5)) {
    const day = d.toISOString().slice(0, 10);
    if (day < today || day > until || WD[d.getDay()] !== r.DayOftheWeek) continue;
    const t = (h, m) => `${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    out.classes.push({ locationId: r['Location ID'], name: r['Course Title'], section: r.Section, start: t(r['Start Hour'], r['Start Minute']), end: t(r['End Hour'], r['End Min']), ageMin: r['Age Min'] });
  }
}
writeFileSync(`${ROOT}data/raw/city.json`, JSON.stringify(out));
console.log(`city: ${Object.keys(out.locations).length} locations, ${out.classes.length} classes (${today}..${until})`);
