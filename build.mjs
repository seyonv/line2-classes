// Merges every source into docs/data.json for the page.
//   data/venues.json           researched venues (prices, showers, booking platform), hand-curated
//   data/raw/classpass.json    ClassPass venues + classes (scrapers/classpass.mjs)
//   data/raw/direct.json       studio-direct schedules (scrapers/direct-run.mjs)
//   data/raw/city.json         City of Toronto community-centre drop-ins (scrapers/city.mjs)
//   data/classpass-pricing.json credit plans + estimated credit ranges by category
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = new URL('.', import.meta.url).pathname;
const read = (p, fallback) => existsSync(ROOT + p) ? JSON.parse(readFileSync(ROOT + p, 'utf8')) : fallback;
const HOME = 'Victoria Park';
const stations = read('data/stations.json');
const curated = read('data/venues.json', []);
const cp = read('data/raw/classpass.json', { venues: {}, schedules: [] });
const direct = read('data/raw/direct.json', { venues: {} });
const city = read('data/raw/city.json', { locations: {}, classes: [] });
const reviewMentions = read('data/review-mentions.json', { venues: {} }).venues;
const pricing = read('data/classpass-pricing.json', { creditValue: 89 / 38, plan: '38 credits for $89/month', categoryCredits: {} });

// ---------- geometry ----------
const rad = x => x * Math.PI / 180;
const metres = (a, b, c, d) => { const x = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2; return 12742e3 * Math.asin(Math.sqrt(x)); };
const home = stations.find(s => s.name === HOME);
function place(lat, lon) {
  let best = null;
  for (const s of stations) { const m = metres(lat, lon, s.lat, s.lon); if (!best || m < best.m) best = { s, m }; }
  const walkMin = Math.max(1, Math.ceil(best.m * 1.3 / 78)); // street grid detour ~1.3x, 4.7 km/h
  const stops = Math.abs(best.s.index - home.index);
  return { station: best.s.name, metres: Math.round(best.m), walkMin, stops, tripMin: walkMin + (stops ? stops * 2 + 5 : 0) };
}
// City "free centres" (toronto.ca/explore-enjoy/recreation/free-lower-cost-recreation-options/, checked 2026-09-28)
const FREE_CENTRE = /chalkfarm|driftwood|elmbank|emery|falstaff|john english|islington community school|kingsview|north kipling|oakdale|the elms|york recreation|antibes|timbrell|grandravine|jenner jean|lawrence heights|oriole|cedarbrook|centennial recreation centre - scarborough|don montgomery|heron park|l'amoreaux|malvern|oakridge|scarborough village|stephen leacock|harrison pool|jimmie simpson|john innes|masaryk|o'connor|pam mcconnell|regent park|scadding court|secord|wellesley community/i;
const WALK_LIMIT = { default: 20, crossfit: 25, bjj: 25, martial: 25 };

// ---------- categories ----------
const CAT_RULES = [
  ['crossfit', /crossfit|\bwod\b/i],
  ['bjj', /jiu|jitsu|\bbjj\b|grappl|no[- ]?gi|submission/i],
  ['martial', /muay|thai box|\bmma\b|kickbox|boxing|\bbox\b|karate|judo|wrestl|kung fu|taekwondo|capoeira|aikido|martial|krav|sambo|fight/i],
  ['pilates', /pilates|reformer|lagree|megaformer|\bstrong\b/i],
  ['barre', /barre/i],
  ['hot-yoga', /(hot|heated|infrared|bikram|moksha|modo).*(yoga|flow|yin|vinyasa|hatha)|(yoga|flow).*\bhot\b|^hot /i],
  ['yoga', /yoga|vinyasa|\byin\b|hatha|ashtanga|restorative|kundalini|nidra|\bflow\b/i],
  ['spin', /spin|cycl|\bride\b|rhythm ride|pedal/i],
  ['climbing', /climb|boulder/i],
  ['dance', /dance|zumba|soca|belly|pole|burlesque|hip ?hop|salsa|ballet|afro|twerk|heels/i],
  ['hiit', /hiit|boot ?camp|f45|circuit|tabata|conditioning|metcon|interval|cardio|sweat|bootcamp|step|kickboxing/i],
  ['strength', /strength|lift|barbell|weights|kettlebell|sculpt|pump|functional|power|build|muscle/i],
];
const catOf = (...texts) => { for (const t of texts.filter(Boolean)) for (const [c, re] of CAT_RULES) if (re.test(t)) return c; return 'other'; };
// A studio's main kind, used when a class name alone says nothing ("Level 2", "Open Mat").
const PRIORITY = ['crossfit', 'bjj', 'martial', 'hot-yoga', 'pilates', 'barre', 'spin', 'climbing', 'yoga', 'dance', 'hiit', 'strength'];
const CAT_ALIAS = { 'muay-thai': 'martial', mma: 'martial', boxing: 'martial', kickboxing: 'martial', wrestling: 'martial', judo: 'martial', karate: 'martial', reformer: 'pilates', bootcamp: 'hiit', 'community-centre': 'community' };
const mainCat = cats => PRIORITY.find(p => cats.map(c => CAT_ALIAS[c] || c).includes(p)) || 'other';

// ---------- matching ClassPass venues to researched venues ----------
const STOP = new Set(['the', 'studio', 'studios', 'fitness', 'toronto', 'inc', 'ltd', 'club', 'gym', 'co', 'and', 'centre', 'center', 'danforth', 'west', 'east', 'bloor']);
const tokens = s => new Set(String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)));
const similar = (a, b) => { const A = tokens(a), B = tokens(b); if (!A.size || !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return n / Math.min(A.size, B.size); };

const venues = {};
const addVenue = (id, v) => { venues[id] = v; return v; };
const cpUrl = alias => `https://classpass.com/studios/${alias}`;

const cityNotes = {};
for (const c of curated) if (c.cityLocationId) cityNotes[c.cityLocationId] = c;
for (const c of curated) {
  if (c.closed || c.lat == null || c.cityLocationId) continue;
  const p = place(c.lat, c.lon);
  const cats = [...new Set((c.categories || []).map(x => CAT_ALIAS[x] || x))];
  addVenue(c.id, {
    name: c.name, address: c.address, lat: c.lat, lon: c.lon, ...p, cats,
    website: c.website, bookUrl: c.scheduleUrl || c.website,
    showers: c.showers ? { v: c.showers.value || c.showers, note: c.showers.evidence || c.showers.note || null, src: c.showers.source || null } : { v: 'unknown' },
    price: c.pricing ? { dropIn: c.pricing.dropIn ?? null, intro: c.pricing.introOffer ?? null, pack: c.pricing.classPacks ?? null, unlimited: c.pricing.unlimitedMonthly ?? null, note: c.pricing.note ?? null, src: c.pricing.source ?? null } : null,
    notes: [c.scheduleSummary && `Usual schedule: ${c.scheduleSummary}`, c.dropInAllowed === false && 'Drop-ins not allowed: intro/foundations or membership required', c.notes].filter(Boolean).join(' · ') || null,
    stretch: !!c.stretch, curated: true, cp: null, schedule: c.scheduleSummary || null,
  });
}

const cpToVenue = {};
for (const v of Object.values(cp.venues)) {
  const lat = v.location?.lat, lon = v.location?.lon;
  if (lat == null) continue;
  let match = null, best = 0;
  for (const [id, u] of Object.entries(venues)) {
    if (!u.curated) continue;
    const m = metres(lat, lon, u.lat, u.lon), s = similar(v.name + ' ' + (v.subtitle || ''), u.name);
    const score = m < 60 ? s + 0.4 : m < 300 ? s : 0;
    if (score >= 0.6 && score > best) { best = score; match = id; }
  }
  const cpInfo = { id: v.id, url: cpUrl(v.alias), rating: v.ratings?.mean ?? null, ratings: v.ratings?.count?.total ?? null, source: v.source, bookingWindow: v.booking_window };
  const showers = showerVerdict(reviewMentions[v.id], v.amenities?.showers, cpInfo.url);
  if (match) {
    const u = venues[match];
    u.cp = cpInfo;
    if (showers && (u.showers.v === 'unknown' || (showers.fromReviews && showers.v !== u.showers.v && !u.showers.note))) u.showers = showers;
    u.rating = u.rating ?? cpInfo.rating;
    cpToVenue[v.id] = match;
    continue;
  }
  const p = place(lat, lon);
  const cats = [...new Set(String(v.activities || '').split(',').map(a => catOf(a)).filter(c => c !== 'other'))];
  const limit = Math.max(...cats.map(c => WALK_LIMIT[c] || WALK_LIMIT.default), WALK_LIMIT.default);
  if (p.walkMin > limit) continue;
  const id = 'cp-' + v.id;
  cpToVenue[v.id] = id;
  const addr = v.address ? [v.address.address_line1, v.address.address_line2].filter(Boolean).join(', ') : null;
  addVenue(id, {
    name: v.name + (v.subtitle ? ` (${v.subtitle})` : ''), address: addr, lat, lon, ...p, cats,
    website: v.website ? (/^https?:/.test(v.website) ? v.website : 'https://' + v.website) : null, bookUrl: null,
    showers: showers || { v: 'unknown', note: 'Not listed on ClassPass and no reviews mention them', src: cpInfo.url },
    price: null, notes: v.booking_window ? `ClassPass booking opens: ${v.booking_window.replace(/^Opens /, '')}` : null,
    rating: cpInfo.rating, cp: cpInfo, curated: false,
  });
}

// ---------- classes ----------
// Not adult group classes: kids/teen programs, private/PT slots, spa services and room bookings.
const NOT_A_CLASS = /\bkids?\b|junior|\bteens?\b|youth|little|tots|toddler|\b\d+\s*[-–]\s*\d+\s*y\/?o|\byears?\b.*\bold\b|after school|\bASP\b|parent|mom ?& ?baby|\bPT\b|personal training|private|semi-private|1:1|one[- ]on[- ]one|sauna|red light|cold plunge|massage|facial|rental|room booking|appointment|consult|assessment|intro call|staff|closed|cancell?ed/i;
const classes = [];
const epoch = iso => Math.round(Date.parse(iso) / 1000);
const est = cat => pricing.categoryCredits[cat] || pricing.categoryCredits.default || null;

for (const s of cp.schedules) {
  const vid = cpToVenue[s.venueId]; const v = venues[vid];
  if (!v || s.livestream || NOT_A_CLASS.test(s.name)) continue;
  classes.push({ v: vid, s: s.start, e: s.end, n: s.name, c: catOf(s.name, s.activities) !== 'other' ? catOf(s.name, s.activities) : mainCat(v.cats), i: s.teacher, cp: true, cr: s.credits ?? null,
    st: s.status === 'available' ? null : s.status, lvl: s.level, dem: s.demand?.[0] || null });
}

for (const [vid, list] of Object.entries(direct.venues || {})) {
  const v = venues[vid]; if (!v) continue;
  for (const d of list) {
    if (NOT_A_CLASS.test(d.name)) continue;
    const s = epoch(d.start), e = d.end ? epoch(d.end) : s + 3600;
    if (e - s > 4 * 3600 || e <= s) continue; // multi-week series and all-day workshops aren't drop-in classes
    const dup = classes.find(c => c.v === vid && Math.abs(c.s - s) <= 300 && (similar(c.n, d.name) >= 0.5 || c.c === catOf(d.name)));
    const extra = { direct: true, u: d.bookUrl || v.bookUrl, sp: d.spotsLeft ?? null, price: d.price ?? null };
    if (d.spotsLeft === 0) extra.st = d.waitlist ? 'waitlist' : 'full';
    if (dup) { Object.assign(dup, extra); continue; }
    classes.push({ v: vid, s, e, n: d.name, c: catOf(d.name) !== 'other' ? catOf(d.name) : mainCat(v.cats), i: d.instructor || null, ...extra });
  }
}

for (const [lid, l] of Object.entries(city.locations)) {
  if (l.lat == null) continue;
  const p = place(l.lat, l.lon);
  if (p.walkMin > WALK_LIMIT.default) continue;
  const id = 'city-' + lid;
  addVenue(id, {
    name: l.name, address: l.address, lat: l.lat, lon: l.lon, ...p, cats: ['community'], website: l.url, bookUrl: l.url,
    showers: { v: 'unknown', note: 'City community centres usually have change rooms; showers vary by building' },
    price: FREE_CENTRE.test(l.name)
      ? { dropIn: 0, note: 'A City "free centre": drop-in classes, weight room and lane swim cost nothing. Space is first come, first served.', src: 'https://www.toronto.ca/explore-enjoy/recreation/free-lower-cost-recreation-options/' }
      : { dropIn: 10.64, unlimited: 'FitnessTO All Access $49.44/month (any City centre: classes, weight room, lane swim)', note: 'City FitnessTO single drop-in class, adult, plus tax. Space is first come, first served.', src: 'https://www.toronto.ca/explore-enjoy/recreation/fitness/' },
    notes: l.ttc, cp: null, curated: false, city: true,
  });
  const r = cityNotes[lid];
  if (r?.showers && r.showers.value !== 'unknown') venues[id].showers = { v: r.showers.value, note: r.showers.evidence, src: r.showers.source };
}
for (const c of city.classes) {
  const id = 'city-' + c.locationId; if (!venues[id]) continue;
  const s = torontoEpoch(c.start), e = torontoEpoch(c.end);
  classes.push({ v: id, s, e, n: c.name.replace('®', ''), c: catOf(c.name), direct: true, u: venues[id].bookUrl, price: venues[id].price.dropIn });
}
function torontoEpoch(local) {
  // local "YYYY-MM-DDTHH:MM:SS" in America/Toronto → epoch seconds
  const guess = Date.parse(local + 'Z');
  const off = new Date(guess).toLocaleString('en-US', { timeZone: 'America/Toronto', timeZoneName: 'shortOffset' }).match(/GMT([+-]\d+)/);
  return Math.round((guess - Number(off ? off[1] : -4) * 36e5) / 1000);
}

// venue categories = what they actually run
const used = new Set(classes.map(c => c.v));
for (const [id, v] of Object.entries(venues)) {
  const cats = new Set(v.cats);
  for (const c of classes) if (c.v === id) cats.add(c.c);
  v.cats = [...cats];
  if (!used.has(id) && !v.curated) delete venues[id];
  else if (!used.has(id)) v.noSchedule = true;
}
// Credit estimates: member-reported range for this studio if we have one, else the range for the kind of class.
const reported = v => (pricing.venueCredits || []).find(([n]) => v.name.toLowerCase().includes(n));
for (const v of Object.values(venues)) if (v.cp) {
  const rep = reported(v);
  if (rep) { v.cp.credits = [rep[1], rep[2]]; v.cp.reported = true; continue; }
  const r = est(v.cats.find(c => est(c)) || 'default');
  if (r) v.cp.credits = [r.min, r.max];
}
for (const c of classes) if (c.cp && c.cr == null) {
  const v = venues[c.v];
  if (v.cp?.reported) { c.crEst = v.cp.credits; c.crRep = true; continue; }
  const r = est(c.c); if (r) c.crEst = [r.min, r.max];
}

const counts = {};
for (const v of Object.values(venues)) counts[v.station] = (counts[v.station] || 0) + 1;
const now = Date.now() / 1000;
const out = {
  generatedAt: new Date().toISOString(), home: HOME, creditValue: pricing.creditValue, plan: pricing.plan,
  stations: stations.map(s => ({ name: s.name, stops: s.stopsFromVictoriaPark, home: s.name === HOME, count: counts[s.name] || 0 })),
  venues, classes: classes.filter(c => c.e > now - 3600).sort((a, b) => a.s - b.s),
  sources: { classpass: cp.fetchedAt || null, direct: direct.fetchedAt || null, city: city.fetchedAt || null },
};
out.footnote = footnote(out);
writeFileSync(ROOT + 'docs/data.json', JSON.stringify(out));
const by = k => classes.filter(c => c[k]).length;
console.log(`venues ${Object.keys(venues).length} (curated ${curated.length}), classes ${out.classes.length} (classpass ${by('cp')}, direct ${by('direct')})`);

function footnote(o) {
  const t = iso => iso ? new Date(iso).toLocaleString('en-CA', { timeZone: 'America/Toronto', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'not yet';
  return `<p>Walk times are straight-line distance plus 30% for the street grid, at an easy pace. “Total” adds about 2 minutes a stop and 5 minutes of waiting, counted from ${HOME} station.</p>
<p>ClassPass credit prices only show to active members, so credit ranges are estimates for the kind of class. Dollar amounts use the ${esc(o.plan)} plan (about $${o.creditValue.toFixed(2)} a credit, before tax). Open ClassPass to see the exact price before booking.</p>
<p>Direct prices are the studio's published drop-in rate. Intro offers for new clients are usually much cheaper. Community-centre drop-ins come from the City of Toronto's open data.</p>
<p>Sources refreshed: ClassPass ${t(o.sources.classpass)}, studio schedules ${t(o.sources.direct)}, City ${t(o.sources.city)}</p>`;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

// Shower verdict from ClassPass reviews (quotes) + the amenities flag. Reviews win over the flag.
function showerVerdict(rec, listed, src) {
  const quotes = (rec?.mentions || []).filter(m => /shower/i.test(m.text)).sort((a, b) => b.date - a.date);
  const NO = /\bno showers?\b|(don.?t|doesn.?t|do not|does not) have (a |any )?showers?|without (a |any )?showers?|wish (it|they|there|the studio) (had|was|were|offered)[^.]*showers?|lack of showers?|no (shower|change) ?(room|facilit)|not (have|offer)[^.]*showers?/i;
  const neg = quotes.filter(m => NO.test(m.text)), pos = quotes.filter(m => !NO.test(m.text));
  const q = m => `“${m.text}” (ClassPass review, ${new Date(m.date * 1000).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })})`;
  if (pos.length && (listed || pos.length >= neg.length)) return { v: 'yes', note: pos.slice(0, 2).map(q).join(' '), src, fromReviews: true };
  if (neg.length) return { v: 'no', note: neg.slice(0, 2).map(q).join(' '), src, fromReviews: true };
  if (listed) return { v: 'yes', note: `Listed under amenities on ClassPass (no review mentions in the ${rec?.checked ?? 0} most recent reviews)`, src };
  return null;
}
