// config: { branchId: '648b82f219dcf8a12504f3c9' (24-hex id from app.glofox.com/portal/#/branch/<id>/...), tz?: defaults to the branch's own timezone }
import { getJson, toLocalIso } from './_util.mjs';

const API = 'https://api.glofox.com/2.0';

export async function fetchSchedule(config, { from, to }) {
  // Same anonymous guest login the web portal does on load (fixed GUEST/GUEST, no user account).
  const login = await getJson(`${API}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ branch_id: config.branchId, login: 'GUEST', password: 'GUEST' }),
  });
  const tz = config.tz || login.branch?.address?.timezone_id || 'America/Toronto';
  const headers = { authorization: `Bearer ${login.token}` };
  const start = Math.floor(from.getTime() / 1000);
  const end = Math.floor(to.getTime() / 1000);
  const out = [];
  for (let page = 1; ; page++) {
    const res = await getJson(`${API}/events?start=${start}&end=${end}&include=trainers,facility,program&sort_by=time_start&private=false&page=${page}`, { headers });
    for (const e of res.data) {
      if (e.private || e.active === false) continue;
      const payg = e.program_obj?.pricing?.find(p => p.type === 'payg');
      out.push({
        start: toLocalIso(e.time_start * 1000, tz),
        end: e.duration ? toLocalIso((e.time_start + e.duration * 60) * 1000, tz) : null,
        name: e.name.trim(),
        instructor: e.trainers_obj?.length ? e.trainers_obj.map(t => t.name).join(', ') : null,
        spotsLeft: e.size != null ? Math.max(0, e.size - (e.booked || 0)) : null,
        capacity: e.size ?? null,
        waitlist: e.waiting ?? null,
        price: payg ? payg.price : null,
        bookUrl: `https://app.glofox.com/portal/#/branch/${config.branchId}/classes-day-view/${e._id}/book`,
        raw: e,
      });
    }
    if (!res.has_more) break;
  }
  return out;
}
