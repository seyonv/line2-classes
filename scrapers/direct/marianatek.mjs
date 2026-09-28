// config: { tenant: string (<tenant>.marianatek.com), locationIds?: string[] (from /api/customer/v1/locations; omit = all), bookingPage?: studio page hosting the Mariana widget (class link = bookingPage?_mt=/classes/<id>), tz?: IANA zone (default America/Toronto) }
import { getJson, toLocalIso, ymd } from './_util.mjs';

export async function fetchSchedule(config, { from, to }) {
  const tz = config.tz || 'America/Toronto';
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const q = new URLSearchParams({ min_start_date: ymd(from), max_start_date: ymd(to), page_size: '100', page: String(page) });
    if (config.locationIds?.length) q.set('location', config.locationIds.join(','));
    const { results, meta } = await getJson(`https://${config.tenant}.marianatek.com/api/customer/v1/classes?${q}`);
    for (const c of results) {
      const start = new Date(c.start_datetime);
      if (c.is_cancelled || start < from || start >= to) continue;
      const mins = c.class_type?.duration;
      out.push({
        start: toLocalIso(start, tz),
        end: mins ? toLocalIso(start.getTime() + mins * 60e3, tz) : null,
        name: c.name || c.class_type?.name,
        instructor: c.instructors?.map(i => i.name).join(', ') || null,
        spotsLeft: c.available_spot_count ?? null,
        capacity: c.capacity ?? null,
        waitlist: c.waitlist_count ?? null,
        price: null,
        bookUrl: config.bookingPage ? `${config.bookingPage}?_mt=${encodeURIComponent(`/classes/${c.id}`)}` : null,
        raw: c,
      });
    }
    if (page >= meta.pagination.pages) break;
  }
  return out;
}
