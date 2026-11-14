export const STYLES = Object.freeze({ sol: 'Sol de tarde', equilibrio: 'Equilibrio', ondas: 'Ondas' });
export const PALETTES = Object.freeze({
  arcilla: { name: 'Arcilla', paper: '#f8efdf', ink: '#a9462e', accent: '#d3a660', dark: '#3b372e' },
  bosque: { name: 'Bosque', paper: '#f0eee2', ink: '#4b6252', accent: '#a8b497', dark: '#293c37' },
  cobalto: { name: 'Cobalto', paper: '#eee9df', ink: '#3558a0', accent: '#dfa65d', dark: '#24334f' },
});
export const SIZES = Object.freeze({ '20x30': [20, 30], '30x40': [30, 40], '40x50': [40, 50], '50x70': [50, 70], '70x100': [70, 100] });
export const LAMPS = Object.freeze({ floor: { name: 'De pie', min: 110, max: 190, height: 160 }, pendant: { name: 'Colgante', min: 40, max: 130, height: 80 }, table: { name: 'De sobremesa', min: 25, max: 75, height: 45 } });
export const MAX_BACKUP_BYTES = 65536;
export const MAX_LIBRARY_BYTES = 200000;
export const LIBRARY_KEY = 'pliego.library.v1';
export const clone = value => JSON.parse(JSON.stringify(value));

export function defaultProject() {
  return { title: 'Un rincón en calma', art: { style: 'sol', palette: 'arcilla', variant: 7, size: '50x70', margin: 8 },
    room: { width: 320, height: 250, wall: '#e8e2d7', frame: 'oak' },
    lamp: { kind: 'floor', visible: true, diameter: 40, height: 160, warmth: 'warm', side: 'right' } };
}

function keys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('|') !== [...expected].sort().join('|')) throw new Error('El archivo tiene campos que no corresponden a este formato.');
}
function choice(value, values) { if (!values.includes(value)) throw new Error('Una opción del diseño no es válida.'); }
function integer(value, min, max) { if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error('Una medida del diseño está fuera de rango.'); }

export function validateProject(project) {
  keys(project, ['title', 'art', 'room', 'lamp']);
  if (typeof project.title !== 'string' || !project.title.trim() || project.title.length > 80 || /[\u0000-\u001f]/.test(project.title) || [...project.title].some(c => c.codePointAt(0) >= 0xd800 && c.codePointAt(0) <= 0xdfff)) throw new Error('Pon un nombre de 1 a 80 caracteres, en una sola línea.');
  keys(project.art, ['style', 'palette', 'variant', 'size', 'margin']);
  choice(project.art.style, Object.keys(STYLES)); choice(project.art.palette, Object.keys(PALETTES)); choice(project.art.size, Object.keys(SIZES));
  integer(project.art.variant, 0, 9999); choice(project.art.margin, [0, 8, 12]);
  keys(project.room, ['width', 'height', 'wall', 'frame']); integer(project.room.width, 180, 500); integer(project.room.height, 220, 320);
  if (typeof project.room.wall !== 'string' || !/^#[0-9a-f]{6}$/i.test(project.room.wall)) throw new Error('El color de pared no es válido.');
  choice(project.room.frame, ['oak', 'black', 'none']);
  keys(project.lamp, ['kind', 'visible', 'diameter', 'height', 'warmth', 'side']); choice(project.lamp.kind, Object.keys(LAMPS));
  if (typeof project.lamp.visible !== 'boolean') throw new Error('La visibilidad de la lámpara no es válida.');
  integer(project.lamp.diameter, 20, 70); integer(project.lamp.height, LAMPS[project.lamp.kind].min, LAMPS[project.lamp.kind].max);
  choice(project.lamp.warmth, ['warm', 'neutral']); choice(project.lamp.side, ['left', 'right']);
  return clone(project);
}

export function projectBackup(project) {
  return JSON.stringify({ schema: 'pliego.project', version: 1, project: validateProject(project) }, null, 2) + '\n';
}
export function parseBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('El archivo supera los 64 KB.');
  let data; try { data = JSON.parse(text); } catch { throw new Error('El archivo no es JSON válido.'); }
  keys(data, ['schema', 'version', 'project']);
  if (data.schema !== 'pliego.project' || data.version !== 1) throw new Error('Este archivo usa un formato o una versión que Pliego no reconoce.');
  return validateProject(data.project);
}
export function parseLibrary(raw) {
  if (raw === null) return [];
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_LIBRARY_BYTES) throw new Error('La biblioteca no se puede leer. Descarga su copia para conservarla.');
  let data; try { data = JSON.parse(raw); } catch { throw new Error('La biblioteca contiene datos que no se pueden leer. Tu copia sigue intacta.'); }
  keys(data, ['version', 'entries']);
  if (data.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 20) throw new Error('La biblioteca usa un formato no compatible.');
  const ids = new Set();
  return data.entries.map(entry => {
    keys(entry, ['id', 'createdAt', 'project']);
    if (typeof entry.id !== 'string' || !/^[a-z0-9-]{1,60}$/i.test(entry.id) || ids.has(entry.id)) throw new Error('La biblioteca contiene identificadores no válidos.');
    if (typeof entry.createdAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(entry.createdAt) || !Number.isFinite(Date.parse(entry.createdAt)) || new Date(entry.createdAt).toISOString() !== entry.createdAt) throw new Error('La fecha de una versión no es válida.');
    ids.add(entry.id); return { id: entry.id, createdAt: entry.createdAt, project: validateProject(entry.project) };
  });
}
export function libraryText(entries) {
  const text = JSON.stringify({ version: 1, entries }); parseLibrary(text); return text;
}
export function dimensions(project) { return [...SIZES[validateProject(project).art.size]]; }
export function pngDimensions(project) { const [width, height] = dimensions(project); return [Math.round(2400 * width / height), 2400]; }
export function escapeXml(text) { return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]); }
export function filename(project) { validateProject(project); return `pliego-${project.art.style}-${project.art.size}-${project.art.variant}`; }
