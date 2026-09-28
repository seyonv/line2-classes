// Dev: serve site/ and screenshot it. Usage: node tools/shot.mjs <out.png> [width] [query to type]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const ROOT = new URL('../docs/', import.meta.url).pathname;
const srv = createServer((q, r) => { try { const f = q.url === '/' ? 'index.html' : q.url.slice(1).split('?')[0]; r.writeHead(200, { 'content-type': f.endsWith('.json') ? 'application/json' : 'text/html' }); r.end(readFileSync(ROOT + f)); } catch { r.writeHead(404); r.end(); } }).listen(0);
const [out, width = 420, query, scheme = 'light'] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +width, height: 900 }, colorScheme: scheme });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(`http://localhost:${srv.address().port}/`); await p.waitForTimeout(800);
if (query) { await p.fill('#q', query); await p.press('#q', 'Enter'); await p.waitForTimeout(300); }
console.log(await p.textContent('#summary'));
await p.screenshot({ path: out, fullPage: !!process.env.FULL });
console.log('errors:', errs.length ? errs : 'none');
await b.close(); srv.close();
