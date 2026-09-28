import { fetchSchedule } from './marianatek.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// Sweat and Tonic, Toronto: Yonge & Shuter (48717) and The Well (48750) fitness locations
const classes = await fetchSchedule({
  tenant: 'sweatandtonic',
  locationIds: ['48717', '48750'],
  bookingPage: 'https://www.sweatandtonic.com/pages/reserve',
}, nextWeek());
printClasses('marianatek / Sweat and Tonic', classes);
