// config: { companyId: bsport company id (the number in backoffice.bsport.io/m/<name>/<id>/calendar or the widget's data-company), tz?: 'America/Toronto' }
import { getJson, toLocalIso, ymd } from './_util.mjs';

const API = 'https://api.production.bsport.io/api/v1';

export async function fetchSchedule(config, { from, to }) {
  const tz = config.tz || 'America/Toronto';
  // min/max_date are matched on the server's own (Paris) day, so pad a day each side and filter by instant below.
  const q = new URLSearchParams({
    company: config.companyId, min_date: ymd(new Date(from - 86400e3)), max_date: ymd(new Date(+to + 86400e3)), page_size: '100',
  });
  const offers = [];
  for (let url = `${API}/offer/?${q}`; url; ) {
    const page = await getJson(url);
    offers.push(...page.results);
    url = page.links?.next;
  }
  const inRange = offers.filter(o => !o.manager_only && new Date(o.date_start) >= from && new Date(o.date_start) < to);

  const coachIds = [...new Set(inRange.map(o => o.coach_override || o.coach).filter(Boolean))];
  const coaches = {};
  for (let i = 0; i < coachIds.length; i += 50) {
    const res = await getJson(`${API}/coach/?id__in=${coachIds.slice(i, i + 50).join(',')}&page_size=50`);
    for (const c of res.results) coaches[c.id] = c.user?.name?.trim() || null;
  }

  return inRange.map(o => {
    const start = new Date(o.date_start);
    return {
      start: toLocalIso(start, tz),
      end: o.duration_minute ? toLocalIso(start.getTime() + o.duration_minute * 60e3, tz) : null,
      name: (o.name_override || o.activity_name || '').trim(),
      instructor: coaches[o.coach_override || o.coach] ?? null,
      spotsLeft: o.effectif != null ? Math.max(0, o.effectif - (o.validated_booking_count ?? 0)) : null,
      capacity: o.effectif ?? null,
      waitlist: o.waiting_list_disabled ? false : o.full ? !o.is_waiting_list_full : null,
      price: null,
      bookUrl: `https://backoffice.bsport.io/m/studio/${o.company}/calendar`,
      raw: o,
    };
  });
}
