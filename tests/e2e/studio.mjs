// Tier 2: disposable private browser contexts, authored files and storage only.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { PUBLIC_FILES } from '../../scripts/public-files.mjs';
import { defaultProject, LIBRARY_KEY, projectBackup } from '../../core.mjs';
import { posterSvg } from '../../art.mjs';

const base = process.env.PLIEGO_BASE_URL, out = process.env.PLIEGO_OUTPUT, modulePath = process.env.PLIEGO_PLAYWRIGHT;
if (!base || new URL(base).protocol !== 'https:' || !new URL(base).hostname.endsWith('.vercel.app') || !out || !modulePath) throw new Error('Exact hosted target and owned paths required');
const { chromium } = await import(pathToFileURL(modulePath));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const observations = [], rows = [], contexts = [], errors = [];
await mkdir(join(out, 'downloads'), { recursive: true }); await mkdir(join(out, 'http'), { recursive: true });
async function bindHttp(phase) {
  for (const name of PUBLIC_FILES) {
    const response = await fetch(new URL(name === 'index.html' ? '/' : `/${name}`, base), { headers: { 'Cache-Control': 'no-cache' } });
    const bytes = Buffer.from(await response.arrayBuffer()), source = await readFile(new URL(`../../${name}`, import.meta.url));
    observations.push({ phase, name, status: response.status, bytes: bytes.length, sha256: sha(bytes), sourceSha256: sha(source), contentType: response.headers.get('content-type') });
    await writeFile(join(out, 'http', `${phase}-${name}`), bytes, { flag: 'wx' });
    assert.equal(response.status, 200); assert.ok(bytes.equals(source), `hosted source bytes: ${name}`);
  }
}
async function waitFor(check, label) { const deadline = Date.now() + 12000; while (Date.now() < deadline) { if (await check()) return; await new Promise(r => setTimeout(r, 70)); } throw new Error(`Timed out: ${label}`); }
async function start(context) { const page = await context.newPage(); page.on('pageerror', error => errors.push({ message: error.message, url: page.url() })); await page.goto(base, { waitUntil: 'networkidle' }); await page.locator('#preview > svg').waitFor(); return page; }
async function value(page, id) { return page.locator(`#${id}`).inputValue(); }
async function entries(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"version":1,"entries":[]}').entries, LIBRARY_KEY); }
async function saved(page, n) { await waitFor(async () => (await entries(page)).length === n, `${n} saved versions`); }
async function getDownload(page, trigger, label) {
  const waiting = page.waitForEvent('download'); await trigger(); const item = await waiting;
  const file = join(out, 'downloads', `${label}-${item.suggestedFilename()}`); await item.saveAs(file);
  const bytes = await readFile(file); observations.push({ download: label, filename: item.suggestedFilename(), bytes: bytes.length, sha256: sha(bytes) }); return bytes;
}
async function title(page, text) { await page.locator('#project-title').fill(text); await page.locator('#project-title').press('Tab'); }
async function more(page) { await page.getByRole('button', { name: 'Más opciones de descarga' }).click(); }
async function screenshot(page, id) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: join(out, `${id}.png`), fullPage: true }); }
async function noOverflow(page) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal overflow'); }

const cases = [
  ['B01', async context => {
    const page = await start(context); await page.evaluate(() => localStorage.setItem('pliego-authored-sentinel', 'keep-b01'));
    await page.getByRole('button', { name: 'Equilibrio', exact: true }).click(); await page.getByRole('button', { name: 'Paleta Cobalto' }).click();
    await page.locator('#art-size').selectOption('30x40'); await page.getByRole('button', { name: 'Otra versión', exact: false }).click(); await title(page, 'Estudio B01');
    await page.getByRole('button', { name: 'Solo lámina' }).click();
    const svg = await getDownload(page, () => page.locator('#export-svg').click(), 'B01-poster');
    assert.match(svg.toString(), /width="300mm" height="400mm"/); assert.ok(!svg.includes(Buffer.from('data-lamp=')));
    const png = await getDownload(page, () => page.locator('#export-png').click(), 'B01-preview');
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); assert.equal(png.readUInt32BE(16), 1800); assert.equal(png.readUInt32BE(20), 2400);
    const decoded = await page.evaluate(async data => {
      const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0)), bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(30, 40), ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0, 30, 40); const pixels = ctx.getImageData(0, 0, 30, 40).data;
      const colors = new Set(); for (let i = 0; i < pixels.length; i += 4) colors.add([...pixels.slice(i, i + 4)].join(',')); const result = { width: bitmap.width, height: bitmap.height, colors: colors.size }; bitmap.close(); return result;
    }, png.toString('base64'));
    assert.equal(decoded.width, 1800); assert.equal(decoded.height, 2400); assert.ok(decoded.colors >= 3); observations.push({ pngDecoded: decoded });
    await page.locator('#save-version').click(); await saved(page, 1); const stored = (await entries(page))[0].project;
    assert.equal(stored.title, 'Estudio B01'); assert.equal(stored.art.style, 'equilibrio'); assert.equal(stored.art.palette, 'cobalto'); assert.equal(stored.art.variant, 8);
    assert.equal(svg.toString(), posterSvg(stored)); await more(page);
    const backup = await getDownload(page, () => page.locator('#export-json').click(), 'B01-project'); assert.equal(backup.toString(), projectBackup(stored));
    await page.getByRole('button', { name: 'Cerrar descargas' }).click(); await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#open-library').click(); await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Estudio B01' }) }).getByRole('button', { name: 'Abrir', exact: true }).click();
    assert.equal(await value(page, 'project-title'), 'Estudio B01'); assert.equal(await value(page, 'art-size'), '30x40'); assert.equal(await page.evaluate(() => localStorage.getItem('pliego-authored-sentinel')), 'keep-b01');
    await noOverflow(page); await screenshot(page, 'B01');
  }],
  ['B02', async context => {
    const page = await start(context);
    await page.getByRole('button', { name: 'Ondas', exact: true }).tap(); await page.getByRole('button', { name: 'Paleta Bosque' }).tap();
    await page.locator('#art-size').selectOption('70x100'); await page.locator('#art-margin').selectOption('12');
    await page.locator('summary').tap(); await page.locator('#room-width').fill('400'); await page.locator('#room-width').press('Tab');
    await page.locator('#room-height').fill('280'); await page.locator('#room-height').press('Tab'); await page.locator('#room-frame').selectOption('black');
    await page.locator('#view-print').tap(); assert.equal(await page.locator('#preview > svg').getAttribute('width'), '700mm'); await page.locator('#view-room').tap();
    await page.getByRole('tab', { name: '02 Lámparas' }).tap(); await page.locator('#lamp-kind').selectOption('table');
    await page.locator('#lamp-height').focus(); await page.keyboard.press('End'); await page.locator('#lamp-diameter').focus(); await page.keyboard.press('End');
    await page.locator('#lamp-warmth').selectOption('neutral'); await page.locator('#lamp-side').selectOption('left');
    assert.equal(await page.locator('#preview [data-lamp]').getAttribute('data-height-cm'), '75'); assert.equal(await page.locator('#preview [data-lamp]').getAttribute('data-diameter-cm'), '70');
    const size = await page.locator('#preview > svg > svg').evaluate(svg => ({ width: Number(svg.getAttribute('width')), height: Number(svg.getAttribute('height')) }));
    assert.equal(size.width, 70 * 900 / 400); assert.equal(size.height, 100 * 900 / 400);
    await more(page); const room = await getDownload(page, () => page.locator('#export-room').click(), 'B02-room'); assert.match(room.toString(), /data-room-width-cm="400"/); assert.match(room.toString(), /data-lamp="table" data-height-cm="75" data-diameter-cm="70"/);
    await page.getByRole('button', { name: 'Cerrar descargas' }).tap(); await page.locator('#lamp-visible').tap(); assert.equal(await page.locator('#preview [data-lamp]').count(), 0);
    await noOverflow(page); await page.setViewportSize({ width: 320, height: 740 }); await noOverflow(page); await page.setViewportSize({ width: 390, height: 844 }); await screenshot(page, 'B02');
  }],
  ['B03', async context => {
    const a = await start(context), b = await start(context);
    await title(a, 'Versión A B03'); await title(b, 'Versión B B03'); await b.getByRole('button', { name: 'Paleta Bosque' }).click();
    await Promise.all([a.locator('#save-version').click(), b.locator('#save-version').click()]); await saved(a, 2); await saved(b, 2);
    const initial = await entries(a); assert.deepEqual(initial.map(e => e.project.title).sort(), ['Versión A B03', 'Versión B B03']); assert.equal(await value(b, 'project-title'), 'Versión B B03');
    await title(a, 'Boceto sin guardar B03'); const imported = initial.find(e => e.project.title === 'Versión B B03').project;
    await more(a); const upload = { name: 'authored-import.json', mimeType: 'application/json', buffer: Buffer.from(projectBackup(imported)) };
    await a.locator('#import-file').setInputFiles(upload); await a.getByRole('button', { name: 'Conservar mi boceto' }).click(); assert.equal(await value(a, 'project-title'), 'Boceto sin guardar B03'); assert.equal((await entries(a)).length, 2);
    await a.locator('#import-file').setInputFiles(upload); await a.getByRole('button', { name: 'Abrir la otra idea', exact: true }).click(); assert.equal(await value(a, 'project-title'), 'Versión B B03'); assert.equal((await entries(a)).length, 2);
    await a.locator('#open-library').click(); const row = a.getByRole('article').filter({ has: a.getByRole('heading', { name: 'Versión A B03' }) });
    await row.getByRole('button', { name: 'Eliminar', exact: true }).click(); await row.getByRole('button', { name: 'Confirmar eliminación' }).click(); await saved(a, 1);
    assert.equal((await entries(a))[0].project.title, 'Versión B B03'); assert.equal(await value(a, 'project-title'), 'Versión B B03'); await a.getByRole('button', { name: 'Cerrar biblioteca' }).click();
    await screenshot(a, 'B03');
  }],
  ['B04', async context => {
    const raw = '{"version":1,"entries":["authored-corrupt"';
    await context.addInitScript(({ key, raw }) => { localStorage.setItem(key, raw); localStorage.setItem('pliego-authored-sentinel', 'keep-b04'); }, { key: LIBRARY_KEY, raw });
    const page = await start(context); await page.locator('#open-library').click();
    const recovery = await getDownload(page, () => page.locator('#recover-library').click(), 'B04-recovery'); assert.equal(recovery.toString(), raw);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), LIBRARY_KEY), raw); await page.getByRole('button', { name: 'Cerrar biblioteca' }).click();
    await more(page); const before = await value(page, 'project-title');
    await page.locator('#import-file').setInputFiles({ name: 'unknown.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schema: 'pliego.project', version: 2, project: defaultProject() })) });
    await waitFor(async () => (await page.locator('#import-status').textContent()).includes('no reconoce'), 'unknown import refusal'); assert.equal(await value(page, 'project-title'), before);
    await page.locator('#import-file').setInputFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.alloc(65537, 32) });
    await waitFor(async () => (await page.locator('#import-status').textContent()).includes('64 KB'), 'size refusal'); assert.equal(await value(page, 'project-title'), before);
    const literal = defaultProject(); literal.title = '<img src=x onerror=window.__authoredExecuted=true>';
    await page.locator('#import-file').setInputFiles({ name: 'literal.json', mimeType: 'application/json', buffer: Buffer.from(projectBackup(literal)) });
    await waitFor(async () => await value(page, 'project-title') === literal.title, 'literal import');
    assert.equal(await page.locator('img').count(), 0); assert.equal(await page.evaluate(() => globalThis.__authoredExecuted), undefined);
    await page.evaluate(key => { localStorage.setItem(key, '{"version":1,"entries":[]}'); const original = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k === key) throw new DOMException('Authored quota refusal', 'QuotaExceededError'); return original.call(this, k, v); }; }, LIBRARY_KEY);
    await page.locator('#save-version').click(); await waitFor(async () => (await page.locator('#status').textContent()).includes('Tu boceto sigue abierto'), 'storage refusal');
    assert.equal(await value(page, 'project-title'), literal.title); assert.deepEqual(await entries(page), []); assert.equal(await page.evaluate(() => localStorage.getItem('pliego-authored-sentinel')), 'keep-b04');
    await more(page); const backup = await getDownload(page, () => page.locator('#export-json').click(), 'B04-preserved'); assert.equal(backup.toString(), projectBackup(literal)); await page.getByRole('button', { name: 'Cerrar descargas' }).click(); await screenshot(page, 'B04');
  }],
];
const selected = (process.env.PLIEGO_CASES || 'B01,B02,B03,B04').split(',');
if (selected.some(id => !cases.some(([known]) => known === id)) || new Set(selected).size !== selected.length) throw new Error('Invalid reviewed case selection');
let browser;
try {
  await bindHttp('before'); browser = await chromium.launch({ headless: true });
  observations.push({ browserVersion: browser.version(), base, cases: selected });
  for (const [id, body] of cases.filter(([id]) => selected.includes(id))) {
    const context = await browser.newContext(id === 'B02' ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, acceptDownloads: true } : { viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    contexts.push(context); const started = Date.now();
    try { await body(context); rows.push({ id, passed: true, durationMs: Date.now() - started }); }
    catch (error) { rows.push({ id, passed: false, error: error.stack, durationMs: Date.now() - started }); for (const [i, page] of context.pages().entries()) await page.screenshot({ path: join(out, `${id}-failure-${i}.png`), fullPage: true }).catch(() => {}); }
    finally { await context.close(); observations.push({ case: id, closed: context.pages().length === 0 }); }
  }
  assert.equal(browser.contexts().length, 0); await bindHttp('after');
} finally {
  for (const context of contexts) await context.close().catch(() => {}); await browser?.close();
  await writeFile(join(out, 'browser-result.json'), JSON.stringify({ rows, errors, observations, passed: rows.length === selected.length && rows.every(r => r.passed) && errors.length === 0 }, null, 2), { flag: 'wx' });
}
assert.equal(errors.length, 0, 'no uncaught application errors'); assert.equal(rows.length, selected.length); assert.ok(rows.every(row => row.passed), 'selected native browser journeys pass');
