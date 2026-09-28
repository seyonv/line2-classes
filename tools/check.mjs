// Sanity checks on docs/data.json before it is published. Exits 1 with the reasons if anything is off.
import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync(new URL('../docs/data.json', import.meta.url), 'utf8'));
const fail = [];
const days = new Set(d.classes.map(c => new Date(c.s * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })));
const cp = d.classes.filter(c => c.cp).length, direct = d.classes.filter(c => c.direct).length;
if (Object.keys(d.venues).length < 60) fail.push(`only ${Object.keys(d.venues).length} venues`);
if (days.size < 6) fail.push(`classes cover only ${days.size} days`);
if (cp < 1000) fail.push(`only ${cp} ClassPass classes`);
if (direct < 100) fail.push(`only ${direct} direct classes`);
for (const c of d.classes) {
  if (!d.venues[c.v]) { fail.push(`class ${c.n} points at missing venue ${c.v}`); break; }
  if (!(c.e > c.s) || c.e - c.s > 6 * 3600) { fail.push(`class ${c.n} at ${c.v} has bad times ${c.s}..${c.e}`); break; }
}
for (const [id, v] of Object.entries(d.venues)) {
  if (!v.station || !(v.walkMin > 0)) { fail.push(`venue ${id} has no station/walk`); break; }
}
const age = (Date.now() - Date.parse(d.generatedAt)) / 36e5;
if (age > 2) fail.push(`data.json is ${age.toFixed(1)} h old`);
console.log(`check: ${Object.keys(d.venues).length} venues, ${d.classes.length} classes (${cp} ClassPass, ${direct} direct) over ${days.size} days`);
if (fail.length) { console.error('FAIL:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('check: ok');
