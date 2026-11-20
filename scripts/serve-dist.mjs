// Zero-dependency static server for the built web game (used by the Release web bundle).
//   node scripts/serve-dist.mjs [dir=dist] [port=8080]  → http://localhost:8080
// Browsers block ES modules from file://, so the web build needs any static HTTP server; this one needs only Node.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist'), port = Number(process.argv[3] ?? 8080);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const file = normalize(join(root, url.endsWith('/') ? url + 'index.html' : url));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try { const body = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end('not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Đảo Đèn Lồng → http://localhost:${port}  (serving ${root})`));
