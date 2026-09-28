// Tiny shared helpers for direct platform fetchers.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
let last = 0;

// Sequential-friendly fetch with a small delay between requests and a browser UA.
export async function get(url, opts = {}) {
  const wait = last + 400 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(url, { ...opts, headers: { 'user-agent': UA, accept: 'application/json, text/html;q=0.9, */*;q=0.8', ...opts.headers } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}\n${(await res.text()).slice(0, 300)}`);
  return res;
}
export const getJson = async (url, opts) => (await get(url, opts)).json();
export const getText = async (url, opts) => (await get(url, opts)).text();

// Offset string like "-04:00" for a zone at a given instant.
function offsetAt(date, tz) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(date);
  const o = p.find(x => x.type === 'timeZoneName').value.replace('GMT', '');
  return o === '' ? '+00:00' : o;
}

// Wall-clock "YYYY-MM-DDTHH:mm[:ss]" in tz -> ISO with offset.
export function wallToIso(wall, tz = 'America/Toronto') {
  const w = wall.length === 16 ? wall + ':00' : wall.slice(0, 19);
  const approx = offsetAt(new Date(Date.parse(w + 'Z') + 5 * 3600e3), tz);
  return w + offsetAt(new Date(Date.parse(w + approx)), tz);
}

// Any instant (Date, ms, or ISO with Z/offset) -> ISO with the tz's offset.
export function toLocalIso(input, tz = 'America/Toronto') {
  if (input == null) return null;
  const d = new Date(input);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(d).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${offsetAt(d, tz)}`;
}

export const ymd = d => toLocalIso(d).slice(0, 10);

// Default window for tests: now .. now+7d.
export function nextWeek() {
  const from = new Date();
  return { from, to: new Date(from.getTime() + 7 * 86400e3) };
}

export function printClasses(label, classes) {
  console.log(`${label}: ${classes.length} classes`);
  for (const c of classes.slice(0, 10)) {
    const { raw, ...rest } = c;
    console.log(JSON.stringify(rest));
  }
  if (!classes.length) { console.error('FAIL: no classes'); process.exit(1); }
  const bad = classes.find(c => !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/.test(c.start) || !c.name);
  if (bad) { console.error('FAIL: bad class', bad); process.exit(1); }
}
