// Runs inside a classpass.com tab. Reads window.__rvArgs = {venueIds, pages}; scans each venue's recent
// reviews for shower / change-room mentions. Keeps a short snippet around the match (no reviewer names).
(async () => {
  const { venueIds, pages } = window.__rvArgs;
  const RE = /shower|change ?room|changing room|locker ?room|towel/i;
  const out = {};
  let done = 0;
  const jobs = [...venueIds];
  const worker = async () => {
    while (jobs.length) {
      const id = jobs.shift();
      const rec = { checked: 0, total: null, mentions: [] };
      for (let p = 0; p < pages; p++) {
        let j;
        try { j = await fetch(`/_api/v2/venues/${id}/reviews?page_size=50&page=${p}`).then(r => r.json()); } catch { break; }
        const list = j.reviews || [];
        rec.checked += list.length;
        for (const r of list) {
          const t = String(r.review || '');
          const m = t.match(RE);
          if (!m) continue;
          const i = m.index, a = Math.max(0, t.lastIndexOf('.', i - 1) + 1, i - 140), b = Math.min(t.length, (t.indexOf('.', i) + 1) || t.length, i + 160);
          rec.mentions.push({ text: t.slice(a, b).trim(), date: r.created_on, rating: Number(r.rating) });
        }
        if (list.length < 50) break;
        await new Promise(r => setTimeout(r, 150));
      }
      out[id] = rec;
      window.__rvStatus = `reviews ${++done}/${venueIds.length}`;
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  window.__rv = JSON.stringify(out);
  window.__rvStatus = 'done';
})();
'started';
