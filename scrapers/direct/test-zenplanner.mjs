import { fetchSchedule } from './zenplanner.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// Tidal CrossFit / Tidal Fitness, Danforth, Toronto (tidalfitness.ca embeds tidalcrossfit.zenplanner.com/zenplanner/portal/calendar.cfm)
const classes = await fetchSchedule({ subdomain: 'tidalcrossfit' }, nextWeek());
printClasses('Zen Planner Tidal CrossFit', classes);
