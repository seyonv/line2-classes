import { fetchSchedule } from './mindbody.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// Studio Fitology, 3220 Dufferin St, Toronto (Mindbody site 5737909)
const classes = await fetchSchedule({ locationSlug: 'studio-fitology' }, nextWeek());
printClasses('mindbody studio-fitology', classes);
