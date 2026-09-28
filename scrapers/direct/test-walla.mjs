import { fetchSchedule } from './walla.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// No Toronto Walla studio found; fallback: Common Ground Yoga, Framingham MA (Walla uuid from its site's widget embed; same Eastern tz)
const classes = await fetchSchedule({ uuid: 'bb56300e-63d2-4992-b5a6-5fe2a6ed6f99', tz: 'America/New_York' }, nextWeek());
printClasses('walla Common Ground Yoga (Framingham, MA)', classes);
