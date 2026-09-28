// config: { subdomain: 'tidalcrossfit' (<subdomain>.sites.zenplanner.com), locationId?: GUID from the calendar's location dropdown, tz?: 'America/Toronto' }
import { getText, wallToIso, ymd } from './_util.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const strip = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

export async function fetchSchedule(config, { from, to }) {
  const { subdomain, locationId = '', tz = 'America/Toronto' } = config;
  const base = `https://${subdomain}.sites.zenplanner.com`;
  const out = [];

  // The public list view shows one Sunday-Saturday week per page, so start at the Sunday on/before `from`.
  const first = new Date(ymd(from) + 'T12:00:00Z');
  for (let d = new Date(first.getTime() - first.getUTCDay() * 86400e3); ymd(d) <= ymd(to); d = new Date(d.getTime() + 7 * 86400e3)) {
    const html = await getText(`${base}/calendar.cfm?frame=true&VIEW=list&DATE=${ymd(d)}&locationId=${encodeURIComponent(locationId)}`);
    const table = html.slice(html.indexOf('<table class="list calendar"'));
    let day = null;
    for (const [, group, row] of table.matchAll(/<tr class="group">\s*<td[^>]*>([^<]+)<\/td>|<tr class="item"([\s\S]*?)<\/tr>/g)) {
      if (group) {
        const [, month, date, year] = group.trim().match(/, (\w+) (\d+), (\d{4})$/);
        day = `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}-${date.padStart(2, '0')}`;
        continue;
      }
      const id = row.match(/appointmentId=([\w-]+)/)?.[1];
      let [h, m, ap] = strip(row.match(/<td class="label">([\s\S]*?)<\/td>/)[1]).match(/(\d+):(\d+)\s*([AP]M)/i).slice(1);
      h = (+h % 12) + (ap.toUpperCase() === 'PM' ? 12 : 0);
      const start = wallToIso(`${day}T${String(h).padStart(2, '0')}:${m}`, tz);
      if (new Date(start) < from || new Date(start) > to) continue;

      // Columns: "Name - Weekday (booked/cap)", instructor, location, "(N spots left)", misc.
      const [title, instructor, location, spots, extra] = [...row.matchAll(/<td class="items">([\s\S]*?)<\/td>/g)].map(x => strip(x[1]));
      const ratio = title.match(/\((\d+)\/(\d+)\)\s*$/);
      const left = spots.match(/(-?\d+) spots? left/i);
      out.push({
        start,
        end: null,
        name: title.replace(/\s*\(\d+\/\d+\)\s*$/, '').replace(/\s*-\s*(Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)day$/i, ''),
        instructor: instructor || null,
        spotsLeft: left ? Math.max(0, +left[1]) : null,
        capacity: ratio ? +ratio[2] : null,
        waitlist: null,
        price: null,
        bookUrl: id ? `${base}/enrollment.cfm?appointmentId=${id}` : `${base}/calendar.cfm`,
        raw: { id, day, title, instructor, location, spots, extra, full: /sessionFull/.test(row) },
      });
    }
  }
  return out;
}
