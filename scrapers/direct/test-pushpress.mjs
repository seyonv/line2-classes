import { fetchSchedule } from './pushpress.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// CrossFit AIO / All in One Strength & Conditioning, 1214 Caledonia Rd, North York (Toronto)
const classes = await fetchSchedule({ subdomain: 'crossfitaio' }, nextWeek());
printClasses('PushPress CrossFit AIO', classes);
