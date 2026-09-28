// config: { providerId: TeamUp provider id (the number in goteamup.com/p/<id>-<slug>/), tz?: 'America/Toronto' }
import { getJson, toLocalIso } from './_util.mjs';

export async function fetchSchedule(config, { from, to }) {
  const tz = config.tz || 'America/Toronto';
  // Same public endpoint the customer schedule page calls; it needs only the provider header, no login.
  const q = new URLSearchParams({
    starts_at_gte: toLocalIso(from, tz), starts_at_lte: toLocalIso(to, tz),
    sort: 'start', status: 'active', page_size: '100', expand: 'instructors,offering_type,venue',
  });
  const headers = { 'Teamup-Provider-ID': String(config.providerId) };
  const events = [];
  for (let url = `https://goteamup.com/api/v2/events?${q}`; url; ) {
    const page = await getJson(url, { headers });
    events.push(...page.results);
    url = page.next;
  }
  return events.filter(e => !e.is_appointment).map(e => ({
    start: toLocalIso(e.starts_at, tz),
    end: toLocalIso(e.ends_at, tz),
    name: e.name,
    instructor: e.instructors?.map(i => i.name).join(', ') || null,
    spotsLeft: e.max_occupancy != null && e.attending_count != null ? Math.max(0, e.max_occupancy - e.attending_count) : null,
    capacity: e.max_occupancy ?? null,
    waitlist: e.waiting_count ?? null,
    price: e.offering_type?.dropin_price?.decimal ?? null,
    bookUrl: e.customer_url ? 'https://goteamup.com' + e.customer_url : null,
    raw: e,
  }));
}
