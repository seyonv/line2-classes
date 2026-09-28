import { fetchSchedule } from './bsport.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// No Toronto bsport studio found; Canadian fallback: Idolem Le Plateau, 435 Av. Laurier E, Montreal (bsport company 1143, same Eastern tz)
const classes = await fetchSchedule({ companyId: 1143 }, nextWeek());
printClasses('bsport Idolem Le Plateau (Montreal)', classes);
