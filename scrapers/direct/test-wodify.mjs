import { fetchSchedule } from './wodify.mjs';
import { nextWeek, printClasses } from './_util.mjs';

// AuxFit Toronto West (auxfit.com embeds auxfit.wodify.com/OnlineSalesPage/WebIntegration?LocationId=10063)
const classes = await fetchSchedule({ subdomain: 'auxfit', locationId: 10063 }, nextWeek());
printClasses('Wodify AuxFit Toronto West', classes);
