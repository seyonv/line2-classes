// config: { locationSlug: mindbody explore slug (www.mindbodyonline.com/explore/locations/<slug>), tz?: default 'America/Toronto' }
import { getJson, toLocalIso } from './_util.mjs';

const API = 'https://prod-mkt-gateway.mindbody.io/v1/search/class_times';
const SIZE = 100;

const num = v => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));

function priceOf(a) {
  const d = a.dropInPrice;
  if (d != null) return num(typeof d === 'object' ? d.online ?? d.retail ?? d.amount : d);
  const opts = a.purchaseOptions || [];
  const o = opts.find(p => p.isSingleSession) || (opts.length === 1 ? opts[0] : null);
  return o ? num(o.pricing?.online ?? o.pricing?.retail) : null;
}

export async function fetchSchedule(config, { from, to }) {
  const tz = config.tz || 'America/Toronto';
  const data = [];
  const included = new Map();
  for (let page = 1; ; page++) {
    const body = {
      sort: 'start_time',
      page: { size: SIZE, number: page },
      filter: {
        radius: 0,
        locationSlugs: [config.locationSlug],
        include_dynamic_pricing: 'true',
        inventory_source: ['MB'],
        startTimeRanges: [{ from: from.toISOString(), to: to.toISOString() }],
      },
    };
    const res = await getJson(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    data.push(...res.data);
    for (const x of res.included || []) included.set(`${x.type}:${x.id}`, x.attributes);
    if (res.data.length < SIZE || data.length >= res.meta.found) break;
  }

  return data.map(r => {
    const a = r.attributes;
    const rel = k => included.get(`${k}:${r.relationships?.[k]?.data?.id}`);
    const course = rel('course');
    return {
      start: toLocalIso(a.startTime, tz),
      end: toLocalIso(a.endTime, tz),
      name: a.displayName || course?.name || null,
      instructor: rel('staff')?.name ?? null,
      spotsLeft: num(a.openings),
      capacity: num(a.capacity),
      waitlist: a.waitlistable == null ? null : Boolean(a.waitlistable),
      price: priceOf(a),
      bookUrl: course?.slug
        ? `https://www.mindbodyonline.com/explore/fitness/classes/${course.slug}`
        : `https://www.mindbodyonline.com/explore/locations/${config.locationSlug}`,
      raw: r,
    };
  });
}
