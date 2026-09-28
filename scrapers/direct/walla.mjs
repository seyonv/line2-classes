// config: { uuid: Walla widget integration uuid (the ?uuid= in widget.hellowalla.com links on the studio site), locationId?: only this Walla location, tz?: 'America/Toronto' }
import { getJson, toLocalIso } from './_util.mjs';

export async function fetchSchedule(config, { from, to }) {
  const tz = config.tz || 'America/Toronto';
  // Same public endpoint the booking widget calls; the integration uuid header is all it needs, no login.
  const headers = { 'Integration-Id': config.uuid, 'HTTP-JWT-AUD': 'widget' };
  const records = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const q = new URLSearchParams({
      page, per_page: '100', sort: 'class_instances.start_time:asc', active: 'active',
      start_time: `between|${from.toISOString()}|${to.toISOString()}`,
    });
    if (config.locationId) q.set('location_ids[]', config.locationId);
    const res = await getJson(`https://api.hellowalla.com/api/dingo/v1/class_instances?${q}`, { headers });
    records.push(...res.records);
    pages = res.total_pages;
  }
  return records.filter(r => r.is_public !== false && r.available_in_person !== false).map(r => {
    const capacity = r.online_booking_capacity ?? r.in_studio_capacity ?? null;
    const price = r.in_studio_non_member_price?.cents;
    const s = r.staff;
    return {
      start: toLocalIso(r.start_time, tz),
      end: toLocalIso(r.end_time, tz),
      name: r.display_name || r.name,
      instructor: s ? (s.nickname || [s.first_name, s.last_name].filter(Boolean).join(' ')) : null,
      spotsLeft: capacity != null ? Math.max(0, capacity - (r.in_person_booking_count ?? 0)) : null,
      capacity,
      waitlist: r.in_person_waitlist_count ?? null,
      price: price != null ? price / 100 : null,
      bookUrl: `https://widget.hellowalla.com/classes/${r.id}?uuid=${config.uuid}`,
      raw: r,
    };
  });
}
