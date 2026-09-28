// config: { slug: 'tjblocpilates' (from app.arketa.co/<slug> or /iframe/<slug>/schedule), partnerId: '9MJm53S6O7V3bwCtGn75hhz2qv13' (widget.id from app.arketa.co/api/widget/data?widgetName=<slug>&type=classes), tz?: 'America/Toronto' }
import { getJson, toLocalIso } from './_util.mjs';

export async function fetchSchedule(config, { from, to }) {
  const q = new URLSearchParams({ startDateTime: from.toISOString(), endDateTime: to.toISOString(), timezone: config.tz || 'America/Toronto' });
  const res = await getJson(`https://widget-api-tkaeguucxq-uc.a.run.app/${config.partnerId}/schedule?${q}`);
  return res.data.classes
    .filter(c => !c.canceled && c.display === 'public')
    .map(c => {
      const tz = config.tz || c.timezoneCalculated || 'America/Toronto';
      // 9999 is how Arketa stores "unlimited".
      const cap = c.max_capacity && c.max_capacity < 9999 ? c.max_capacity : null;
      return {
        start: toLocalIso(c.start_time * 1000, tz),
        end: c.duration ? toLocalIso((c.start_time + c.duration * 60) * 1000, tz) : null,
        name: c.name.trim(),
        instructor: c.hostData?.length ? c.hostData.map(h => h.name).join(', ') : c.hostName || null,
        spotsLeft: cap != null ? Math.max(0, cap - (c.total_booked || 0)) : null,
        capacity: cap,
        waitlist: c.waitlistLength ?? null,
        price: null,
        bookUrl: `https://app.arketa.co/iframe/${config.slug}/schedule/checkout/${c.id}`,
        raw: c,
      };
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
