// config: { baseUrl: 'https://etobicokebjj.gymdesk.com' (or the gym's custom domain), tz?: 'America/Toronto' }
import { getJson, wallToIso, ymd } from './_util.mjs';

const unescape = s => s.replace(/&(quot|#0?39|amp|lt|gt);/g, (_, e) => ({ quot: '"', '#039': "'", '#39': "'", amp: '&', lt: '<', gt: '>' })[e]);

export async function fetchSchedule(config, { from, to }) {
  const tz = config.tz || 'America/Toronto';
  const base = config.baseUrl.replace(/\/$/, '');
  const out = [];
  const seen = new Set();
  let date = ymd(from);
  // Each call returns the whole week (per the gym's first_day_week) containing `date`.
  while (date <= ymd(to)) {
    const res = await getJson(`${base}/schedule/getevents?date=${date}`, { headers: { 'x-requested-with': 'XMLHttpRequest' } });
    for (const [, attr] of res.events.matchAll(/data-event-info="([^"]*)"/g)) {
      const e = JSON.parse(unescape(attr));
      const start = wallToIso(e.ts.replace(' ', 'T'), tz);
      const key = `${e.id}|${e.ts}`;
      if (e.canceled || seen.has(key)) continue;
      seen.add(key);
      const t = Date.parse(start);
      if (t < from.getTime() || t >= to.getTime()) continue;
      const cap = e.book_limit || null;
      out.push({
        start,
        end: wallToIso(new Date(Date.parse(e.ts.replace(' ', 'T') + 'Z') + e.duration * 60e3).toISOString().slice(0, 19), tz),
        name: e.title.trim(),
        instructor: e.instructors && typeof e.instructors === 'object' ? Object.values(e.instructors).map(i => i.name).join(', ') : null,
        spotsLeft: cap != null ? Math.max(0, cap - (e.booked || 0)) : null,
        capacity: cap,
        waitlist: e.waitlisted ?? null,
        price: Number(e.book_cost) > 0 ? Number(e.book_cost) : null,
        bookUrl: `${base}/schedule`,
        raw: e,
      });
    }
    // range.end is DD/MM/YYYY; continue from the day after it.
    const [d, m, y] = res.range.end.split('/');
    date = ymd(new Date(Date.UTC(y, m - 1, d) + 36 * 3600e3));
  }
  return out.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
