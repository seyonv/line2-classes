// config: { subdomain: 'auxfit' (<subdomain>.wodify.com), locationId: 10063 (from the OnlineSalesPage WebIntegration?LocationId= embed), tz?: 'America/Toronto' }
import { getJson, wallToIso, ymd } from './_util.mjs';

// Wodify's Online Sales Page is an OutSystems app; these apiVersion hashes come from its JS bundle
// (BundledScripts/OnlineSalesPage_*.min.js) and change only when Wodify changes an action's signature.
const API = {
  init: ['Main/Main/DataActionGet_InitialData_InMain', 'bVd8Me9EbXINvLrdn9t2GQ'],
  classesInit: ['Screens/Classes/DataActionGetInitialData_InClasses', 'VdaUD19wi_gEAGsJzMo2RQ'],
  schedule: ['Screens/Classes/DataActionGetClassSchedule_InClasses', 'vVJqqlXaMsQ9LN5H8lV5Kw'],
};

export async function fetchSchedule(config, { from, to }) {
  const { subdomain, locationId, tz = 'America/Toronto' } = config;
  const base = `https://${subdomain}.wodify.com/OnlineSalesPage`;
  const { versionToken } = await getJson(`${base}/moduleservices/moduleversioninfo`);

  const call = async ([path, apiVersion], variables, clientVariables = {}) => {
    const res = await getJson(`${base}/screenservices/OnlineSalesPage/${path}`, {
      method: 'POST',
      // Anonymous CSRF token is a public constant in OutSystems' client runtime.
      headers: { 'content-type': 'application/json; charset=UTF-8', 'x-csrftoken': 'T6C+9iB49TLra4jEsMeSckDMNhQ=' },
      body: JSON.stringify({ versionInfo: { moduleVersion: versionToken, apiVersion }, viewName: 'Main.Main', screenData: { variables }, clientVariables }),
    });
    if (res.exception) throw new Error(`wodify ${path}: ${res.exception.message}`);
    if (res.versionInfo?.hasApiVersionChanged) throw new Error(`wodify ${path}: apiVersion changed, re-read hashes from the JS bundle`);
    return res.data;
  };

  const init = await call(API.init, { q: '' });
  if (init.CustomerSubdomain_Error?.HasError) throw new Error(`wodify ${subdomain}: ${init.CustomerSubdomain_Error.ErrorMessage}`);
  const clientVariables = { CustomerId: init.CustomerId, Customer: init.Customer, LocationId: locationId };
  const screen = { LocationId: locationId, SelectedLocationId: locationId, OnlineMembershipId: '0', ProgramId: '', EmployeeId: '' };

  const ci = await call(API.classesInit, screen, clientVariables);
  const programs = [...new Set(ci.ProgramsWithProgramAccess.List.map(String))].map(Id => ({ Id }));

  const out = [];
  const bookUrl = `${base}/Main?q=Classes%7CLocationId%3D${locationId}`;
  for (let d = new Date(ymd(from) + 'T12:00:00Z'); ymd(d) <= ymd(to); d = new Date(d.getTime() + 86400e3)) {
    const day = ymd(d);
    const data = await call(API.schedule, { ...screen, SelectedDate: day, SelectedDate_WeekChange: day, SelectedProgramList: { List: programs } }, clientVariables);
    for (const r of data.ClassSchedule.List) {
      const c = r.Class;
      if (c.IsCancelled || c.IsDeleted) continue;
      // Times come back with a "Z" suffix but are the gym's wall-clock time.
      const start = wallToIso(c.StartDateTime.slice(0, 19), tz);
      if (new Date(start) < from || new Date(start) > to) continue;
      out.push({
        start,
        end: wallToIso(c.EndDateTime.slice(0, 19), tz),
        name: c.Name.replace(/:\s*\d{1,2}:\d\d\s*[AP]M$/i, ''),
        instructor: c.Coaches?.List?.map(x => x.CoachName).join(', ') || null,
        spotsLeft: c.ClassLimit ? c.Available : null,
        capacity: c.ClassLimit || null,
        waitlist: c.AllowWaitlist ? c.Waitlisted : null,
        price: null,
        bookUrl,
        raw: r,
      });
    }
  }
  return out;
}
