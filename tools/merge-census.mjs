// Normalises the researched venue lists (data/research/<segment>.json) into data/venues.json,
// then applies hand fixes from data/overrides.json ({id: {field: value}}).
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const dir = `${ROOT}data/research/`;
const overrides = existsSync(`${ROOT}data/overrides.json`) ? JSON.parse(readFileSync(`${ROOT}data/overrides.json`, 'utf8')) : {};
const rad = x => x * Math.PI / 180;
const metres = (a, b, c, d) => { const x = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2; return 12742e3 * Math.asin(Math.sqrt(x)); };
const txt = v => v == null || v === '' ? null : typeof v === 'string' ? v : Array.isArray(v) ? v.map(txt).filter(Boolean).join('; ') : typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k}: ${txt(x)}`).join('; ') : String(v);

function money(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  if (/free/i.test(v) && !/\$\s*\d/.test(v)) return /free (first|trial|intro)/i.test(v) ? null : 0;
  const m = v.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  return m && !/behind|not (shown|visible|listed)|unknown/i.test(v) ? Number(m[1]) : null;
}
function showers(v) {
  const s = v.showers;
  const value = typeof s === 'string' ? s.toLowerCase() : s?.value?.toLowerCase?.() || 'unknown';
  const ev = v.showersEvidence || (typeof s === 'object' ? s : {}) || {};
  const quote = ev.quote || ev.evidence || null;
  return { value: ['yes', 'no'].includes(value) ? value : 'unknown', evidence: quote ? `“${quote.replace(/^“|”$/g, '')}”` : null, source: ev.url || ev.source || null };
}

const seen = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  for (const v of JSON.parse(readFileSync(dir + f, 'utf8'))) {
    if (v.lat == null || v.lon == null) continue;
    if (/^\s*(closed|permanently closed|moved)/i.test(v.status || '') || v.closed === true) continue;
    const dup = seen.find(u => u.id === v.id || (metres(u.lat, u.lon, v.lat, v.lon) < 80 && u.name.toLowerCase().split(/\W+/)[0] === v.name.toLowerCase().split(/\W+/)[0]));
    if (dup) continue;
    const p = v.pricing || {};
    const dropIn = money(p.dropIn);
    let booking = v.booking && v.booking.platform ? v.booking : null;
    if (!booking && v.bookingPlatform === 'kilo' && v.bookingIds?.kiloGymIdBase64) booking = { platform: 'kilo', config: { gymIdBase64: v.bookingIds.kiloGymIdBase64 } };
    const allowed = v.dropInAllowed;
    seen.push({
      id: v.id, name: v.name, address: v.address, lat: v.lat, lon: v.lon, categories: v.categories || [],
      website: v.website || null, scheduleUrl: v.scheduleUrl || null, booking,
      showers: showers(v),
      pricing: {
        dropIn, introOffer: txt(p.introOffer), classPacks: txt(p.classPacks), unlimitedMonthly: txt(p.unlimitedMonthly),
        note: [dropIn == null && typeof p.dropIn === 'string' ? `Drop-in: ${p.dropIn}` : null, txt(p.otherMemberships), p.openMatFee ? `Open mat: ${txt(p.openMatFee)}` : null, p.mustBeMember ? 'Membership required' : null].filter(Boolean).join(' · ') || null,
        source: txt(p.sources) || txt(p.source) || null, dateSeen: p.dateSeen || null,
      },
      scheduleSummary: v.scheduleSummary || null,
      dropInAllowed: allowed === false || (typeof allowed === 'string' && /^no\b/i.test(allowed)) ? false : allowed == null ? null : true,
      dropInNote: typeof allowed === 'string' ? allowed : null,
      notes: txt(v.notes), stretch: !!v.stretch, onClassPass: v.onClassPass ?? null, classPassUrl: v.classPassUrl || null,
      cityLocationId: v.cityLocationId ? String(v.cityLocationId) : null,
      segment: f.replace('.json', ''),
    });
  }
}
for (const v of seen) if (overrides[v.id]) Object.assign(v, overrides[v.id]);
writeFileSync(`${ROOT}data/venues.json`, JSON.stringify(seen, null, 1));
const n = k => seen.filter(v => v.categories.includes(k)).length;
console.log(`venues.json: ${seen.length} venues, ${seen.filter(v => v.booking).length} with booking configs; crossfit ${n('crossfit')}, bjj ${n('bjj')}, showers yes ${seen.filter(v => v.showers.value === 'yes').length}`);
