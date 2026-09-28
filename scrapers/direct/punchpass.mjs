// config: { url: schedule base, e.g. 'https://app.punchpass.com/org/1281' or 'https://<studio>.punchpass.com', tz?: 'America/Toronto' }
import { getText, wallToIso, toLocalIso } from './_util.mjs';

const clean = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

export async function fetchSchedule(config, { from, to }) {
  const tz = config.tz || 'America/Toronto';
  const html = await getText(config.url.replace(/\/$/, '') + '/classes');
  const out = [];
  // The public /classes page lists ~3 weeks, grouped by <section id="date-YYYY-MM-DD">.
  for (const day of html.split(/<section id="date-/).slice(1)) {
    const date = day.slice(0, 10);
    for (const row of day.split('<li class="calendar-list-instance-row').slice(1)) {
      const href = row.match(/href="([^"]+\/classes\/\d+)"/)?.[1];
      const time = row.match(/<time[^>]*>([^<]+)<\/time>/)?.[1].trim();
      const name = row.match(/list-instance-row-title[^>]*>([\s\S]*?)<\/div>/)?.[1];
      if (!href || !time || !name) continue;
      let [, h, m, ap] = time.match(/(\d{1,2}):(\d\d)\s*(am|pm)?/i);
      if (ap) h = +h % 12 + (ap.toLowerCase() === 'pm' ? 12 : 0);
      const start = wallToIso(`${date}T${String(h).padStart(2, '0')}:${m}`, tz);
      if (new Date(start) < from || new Date(start) >= to) continue;
      const dur = row.match(/name="clock"[\s\S]*?<span[^>]*>([^<]+)<\/span>/)?.[1] || '';
      const mins = (+(dur.match(/(\d+) hours?/)?.[1] || 0)) * 60 + +(dur.match(/(\d+) minutes?/)?.[1] || 0);
      const instructor = row.match(/name="user"[^>]*><\/wa-icon>([^<]+)/)?.[1];
      const location = row.match(/name="location-dot"[^>]*><\/wa-icon>([^<]+)/)?.[1];
      const badges = [...row.matchAll(/<wa-badge[^>]*>([\s\S]*?)<\/wa-badge>/g)].map(b => clean(b[1]));
      if (badges.some(b => /canceled/i.test(b))) continue;
      const left = badges.map(b => b.match(/(\d+) spots? left/i)?.[1]).find(Boolean);
      const full = badges.some(b => /class full/i.test(b));
      out.push({
        start,
        end: mins ? toLocalIso(new Date(start).getTime() + mins * 60e3, tz) : null,
        name: clean(name),
        instructor: instructor ? clean(instructor) : null,
        spotsLeft: left ? +left : full ? 0 : null,
        capacity: null,
        waitlist: badges.some(b => /waitlist/i.test(b)) ? true : null,
        price: null,
        bookUrl: href,
        raw: { date, time, duration: dur || null, location: location ? clean(location) : null, badges },
      });
    }
  }
  return out;
}
