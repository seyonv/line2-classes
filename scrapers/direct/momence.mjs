// config: { hostId: number (from data-host_id / host_id on the studio's embedded schedule plugin), tz?: IANA zone (default America/Toronto), locationIds?: number[] }
import { getJson, toLocalIso } from './_util.mjs';

export async function fetchSchedule(config, { from, to }) {
  const tz = config.tz || 'America/Toronto';
  const out = [];
  for (let page = 0; page < 50; page++) {
    const q = new URLSearchParams({ fromDate: from.toISOString(), toDate: to.toISOString(), pageSize: '20', page: String(page), timeZone: tz });
    for (const id of config.locationIds || []) q.append('locationIds[]', String(id));
    const { payload, pagination } = await getJson(`https://api.momence.com/host-plugins/host/${config.hostId}/host-schedule/sessions?${q}`);
    for (const s of payload) {
      const start = new Date(s.startsAt);
      if (s.isCancelled || start < from || start >= to) continue; // multi-week courses come back with their first-session date
      const sold = s.ticketsSold ?? null;
      out.push({
        start: toLocalIso(s.startsAt, tz),
        end: toLocalIso(s.endsAt, tz),
        name: s.sessionName,
        instructor: s.teacher || null,
        spotsLeft: s.remainingSpots ?? (s.capacity != null && sold != null ? Math.max(0, s.capacity - sold) : null),
        capacity: s.capacity ?? null,
        waitlist: null,
        price: s.fixedTicketPrice ?? s.price ?? null,
        bookUrl: s.link || `https://momence.com/s/${s.id}`,
        raw: s,
      });
    }
    if (!payload.length || (page + 1) * pagination.pageSize >= pagination.totalCount) break;
  }
  return out;
}
