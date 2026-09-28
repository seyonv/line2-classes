import { fetchSchedule } from './glofox.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// No Toronto Glofox branch found yet; stand-in is Dedicated Motivated Fitness (Middletown, NY, America/New_York, same offset as Toronto).
const classes = await fetchSchedule({ branchId: '648b82f219dcf8a12504f3c9' }, nextWeek());
printClasses('glofox dedicated-motivated-fitness (non-Toronto stand-in)', classes);
