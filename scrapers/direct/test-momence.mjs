import { fetchSchedule } from './momence.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// Breathe Yoga Studio, 18 Hook Ave, Toronto (breatheyogastudio.com/schedule embeds host_id=8672)
const classes = await fetchSchedule({ hostId: 8672 }, nextWeek());
printClasses('momence / Breathe Yoga Studio', classes);
