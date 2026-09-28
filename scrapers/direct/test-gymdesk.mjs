import { fetchSchedule } from './gymdesk.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// Toronto Jiu-Jitsu Club (2073 Danforth Ave), Gymdesk academy 5640 on a custom domain.
const classes = await fetchSchedule({ baseUrl: 'https://torontojiujitsuclub.ca' }, nextWeek());
printClasses('gymdesk torontojiujitsuclub', classes);
