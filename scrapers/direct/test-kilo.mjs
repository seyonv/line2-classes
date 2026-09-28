import { fetchSchedule } from './kilo.mjs';
const list = await fetchSchedule({ gymIdBase64: 'OGIzZWQwZTYtYWE5MS00NDNlLWIxZWEtMWI4MGEwODBmMTY0' }, { from: new Date(), to: new Date(Date.now() + 7 * 864e5) });
console.log(list.length, 'classes'); console.log(list.slice(0, 10).map(({ raw, ...c }) => c));
if (!list.length) process.exit(1);
