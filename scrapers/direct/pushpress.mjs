// config: { subdomain: 'crossfitaio' (<subdomain>.pushpress.com member portal), tz?: 'America/Toronto' (default: the gym's timezone from the portal) }
import { getJson, getText, wallToIso, ymd } from './_util.mjs';

const QUERY = `query GetPublicCalendarItems($getCalendarItemsInput: GetCalendarItemsInput!) {
  getPublicCalendarItems(getCalendarItemsInput: $getCalendarItemsInput) {
    uuid title type isAllDay startDatetime endDatetime attendanceCap spotsAvailable
    calendarItemType { uuid name } location { uuid } mainCoach { firstName lastName }
  }
}`;

export async function fetchSchedule(config, { from, to }) {
  const bookUrl = `https://${config.subdomain}.pushpress.com/calendar`;
  // The portal's landing page (/ -> /login) embeds the client record and a short-lived anonymous "public" JWT in __NEXT_DATA__.
  const html = await getText(`https://${config.subdomain}.pushpress.com/`);
  const next = JSON.parse(html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)[1]).props.pageProps;
  const tz = config.tz || next.client.timezone || 'America/Toronto';

  const res = await getJson('https://api.pushpress.com/v2/graph/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${next.publicToken}` },
    body: JSON.stringify({
      query: QUERY,
      variables: { getCalendarItemsInput: { startDate: ymd(from), endDate: ymd(to), clientUuid: next.client.uuid, isPublicOnly: true } },
    }),
  });
  if (res.errors) throw new Error(`pushpress: ${res.errors.map(e => e.message).join('; ')}`);

  return res.data.getPublicCalendarItems
    .filter(c => c.type === 'Class' && !c.isAllDay)
    // startDatetime is the gym's wall-clock time with a misleading "Z" (the portal renders it with getUTCHours).
    .map(c => ({ c, start: wallToIso(c.startDatetime.slice(0, 19), tz) }))
    .filter(({ start }) => new Date(start) >= from && new Date(start) <= to)
    .map(({ c, start }) => ({
      start,
      end: wallToIso(c.endDatetime.slice(0, 19), tz),
      name: c.title || c.calendarItemType?.name,
      instructor: c.mainCoach ? `${c.mainCoach.firstName} ${c.mainCoach.lastName}`.trim() : null,
      spotsLeft: c.spotsAvailable ?? null,
      capacity: c.attendanceCap || null,
      waitlist: null,
      price: null,
      bookUrl,
      raw: c,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}
