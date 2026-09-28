import { fetchSchedule } from './arketa.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// TJ Bloc Pilates, 598 Danforth Ave, Toronto.
const classes = await fetchSchedule({ slug: 'tjblocpilates', partnerId: '9MJm53S6O7V3bwCtGn75hhz2qv13' }, nextWeek());
printClasses('arketa tjblocpilates', classes);
