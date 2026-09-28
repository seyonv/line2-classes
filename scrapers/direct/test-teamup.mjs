import { fetchSchedule } from './teamup.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// Pivot Dancer, 2288 Bloor St W, Toronto (goteamup.com/p/4493058-pivot-dancer)
const classes = await fetchSchedule({ providerId: 4493058 }, nextWeek());
printClasses('teamup Pivot Dancer', classes);
