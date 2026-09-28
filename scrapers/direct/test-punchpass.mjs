import { fetchSchedule } from './punchpass.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// iFreeStyle.ca, 693 Bloor St W, Toronto (Punchpass org 1281)
const classes = await fetchSchedule({ url: 'https://app.punchpass.com/org/1281' }, nextWeek());
printClasses('punchpass iFreeStyle.ca', classes);
