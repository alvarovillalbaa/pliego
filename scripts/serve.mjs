import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_FILES, CSP } from './public-files.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
export function startServer({ port = Number(process.env.PORT || 4173), directory = root } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid loopback port');
  const server = http.createServer(async (request, response) => {
    response.setHeader('Content-Security-Policy', CSP); response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname); }
    catch { response.writeHead(400).end(); return; }
    const name = pathname === '/' ? 'index.html' : pathname.slice(1), admitted = PUBLIC_FILES.includes(name);
    const file = admitted ? name : '404.html';
    try { const body = await readFile(join(directory, file)); response.writeHead(admitted ? 200 : 404, { 'Content-Type': mime[file.slice(file.lastIndexOf('.'))], 'Cache-Control': 'no-store' }); response.end(request.method === 'HEAD' ? undefined : body); }
    catch { response.writeHead(500).end(); }
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve(server)); });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startServer(); console.log(JSON.stringify({ url: `http://127.0.0.1:${server.address().port}` }));
}
