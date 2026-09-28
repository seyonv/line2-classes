// Runs inside a classpass.com tab (Cloudflare blocks plain HTTP clients).
// Reads window.__cpArgs = {stations, days, radiusKm}; writes progress to window.__cpStatus and the result to window.__cp.
(async () => {
  const { stations, days, radiusKm } = window.__cpArgs;
  const post = (path, body) =>
    fetch('/_api' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(path + ' ' + r.status))));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const errors = [];

  // 1. Discover venues around every station (map_items only returns venues with inventory on that date,
  //    so union across several dates).
  const venueIds = new Set();
  const dlat = radiusKm / 111, dlon = radiusKm / 80.5;
  for (const s of stations) {
    for (const date of days.slice(0, 4)) {
      const filters = {
        date, lat: s.lat, lon: s.lon, result_type: 'VENUE', vertical: 'fitness', tag: [],
        map_bounds: [s.lon - dlon, s.lat - dlat, s.lon + dlon, s.lat + dlat].join(','),
      };
      try {
        const j = await post('/unisearch/v3/layout/map_items', { filters, map_item_search_options: { use_minimal_venue_model: true } });
        for (const m of j.map_search?.map_items || []) venueIds.add(m.venue_id);
      } catch (e) { errors.push(String(e)); }
      window.__cpStatus = `discover ${s.name} ${date}: ${venueIds.size} venues`;
      await sleep(150);
    }
  }

  // 2. Every class at every venue for every day.
  const venues = {}, schedules = [];
  const jobs = [];
  for (const id of venueIds) for (const date of days) jobs.push({ id, date });
  let done = 0;
  const worker = async () => {
    while (jobs.length) {
      const { id, date } = jobs.shift();
      try {
        const j = await post('/v3/search/schedules', { venue: id, date });
        for (const s of j.schedules || []) {
          const v = s.venue;
          if (v && !venues[v.id]) venues[v.id] = {
            id: v.id, name: v.name, subtitle: v.subtitle, alias: v.alias, activities: v.activities,
            address: v.address, location: v.location, amenities: v.amenities, ratings: v.ratings,
            booking_window: v.booking_window, source: v.source, website: v.website, description: v.description,
            studio_direct_enabled: v.studio_direct_enabled, available_for_trialers: v.available_for_trialers,
            late_cancellation: v.late_cancellation, requirements: v.requirements, when_to_arrive: v.when_to_arrive,
            how_to_get_there: v.how_to_get_there,
            site_id: v.site_id ?? null, organization_id: v.organization_id ?? null, google_place_id: v.google_place_id ?? null,
          };
          schedules.push({
            id: s.id, venueId: v?.id ?? id, start: s.starttime, end: s.endtime, name: s.class?.name,
            activities: s.class?.activities, level: s.class?.level, classAlias: s.class?.alias,
            classRating: s.class?.ratings?.mean ?? null, classRatingCount: s.class?.ratings?.count?.total ?? null,
            teacher: s.teacher_name || s.teacher?.name || null, status: s.availability?.status,
            demand: (s.demand_signals || []).map(d => d.label), livestream: s.is_livestream,
            credits: s.credits ?? s.credit_price ?? null,
          });
        }
      } catch (e) { errors.push(String(e)); }
      done++;
      window.__cpStatus = `schedules ${done} requests, ${schedules.length} classes`;
      await sleep(120);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  window.__cp = JSON.stringify({ fetchedAt: new Date().toISOString(), venueIds: [...venueIds], venues, schedules, errors });
  window.__cpStatus = 'done';
})();
'started';
