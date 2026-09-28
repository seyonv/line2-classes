// config: { gymIdBase64: base64 of the Kilo gym uuid (from the gym's embedded schedule), salesPortalUrl?, tz?: default 'America/Toronto' }
import { getJson, wallToIso, ymd } from './_util.mjs';

export async function fetchSchedule(config, { from, to }) {
  const tz = config.tz || 'America/Toronto';
  const url = `https://app.usekilo.com/api/public/kilo-classes/agenda/?gym_id=${encodeURIComponent(config.gymIdBase64)}&start_date=${ymd(from)}&end_date=${ymd(to)}`;
  const list = await getJson(url);
  return list.map(c => ({
    start: wallToIso(`${c.startDate}T${c.startTime}`, tz),
    end: c.endTime ? wallToIso(`${c.startDate}T${c.endTime}`, tz) : null,
    name: c.className,
    instructor: (c.coaches || []).join(', ') || null,
    spotsLeft: c.availableSpots ?? null,
    capacity: c.capacity ?? null,
    waitlist: null,
    price: null,
    bookUrl: config.salesPortalUrl || null,
    raw: c,
  }));
}
