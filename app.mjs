import { defaultProject, validateProject, clone, STYLES, PALETTES, SIZES, LAMPS, parseBackup, MAX_BACKUP_BYTES, LIBRARY_KEY } from './core.mjs';
import { posterSvg, roomSvg } from './art.mjs';
import { readVersions, saveVersion, deleteVersion, rawLibrary } from './storage.mjs';
import { download, exportSvg, exportPng, exportProject, exportRoom } from './downloads.mjs';

const $ = id => document.getElementById(id);
let project = defaultProject(), savedFingerprint = null, hasUserChanges = false, view = 'room', pendingReplacement = null, importGeneration = 0;
const library = $('library-dialog'), exportsDialog = $('export-dialog'), replaceDialog = $('replace-dialog');
function message(text, error = false, target = $('status')) { target.textContent = text; target.classList.toggle('error', error); }
function dirty() { return JSON.stringify(project) !== savedFingerprint; }

for (const [id, name] of Object.entries(STYLES)) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.style = id;
  button.setAttribute('aria-label', name); button.addEventListener('click', () => update(p => { p.art.style = id; }));
  $('style-options').append(button);
}
for (const [id, palette] of Object.entries(PALETTES)) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.palette = id;
  button.setAttribute('aria-label', `Paleta ${palette.name}`);
  for (const color of [palette.ink, palette.accent]) { const swatch = document.createElement('span'); swatch.style.backgroundColor = color; button.append(swatch); }
  button.addEventListener('click', () => update(p => { p.art.palette = id; })); $('palette-options').append(button);
}
function render() {
  $('project-title').value = project.title;
  for (const [id, value] of Object.entries({ 'art-size': project.art.size, 'art-margin': project.art.margin, 'room-width': project.room.width, 'room-height': project.room.height, 'room-wall': project.room.wall, 'room-frame': project.room.frame,
    'lamp-kind': project.lamp.kind, 'lamp-height': project.lamp.height, 'lamp-diameter': project.lamp.diameter, 'lamp-warmth': project.lamp.warmth, 'lamp-side': project.lamp.side })) $(id).value = value;
  const bounds = LAMPS[project.lamp.kind]; $('lamp-height').min = bounds.min; $('lamp-height').max = bounds.max; $('lamp-height').value = project.lamp.height;
  $('lamp-height-label').textContent = project.lamp.kind === 'pendant' ? 'Caída desde el techo' : 'Altura';
  $('lamp-height-value').textContent = `${project.lamp.height} cm`; $('lamp-diameter-value').textContent = `${project.lamp.diameter} cm`; $('lamp-visible').checked = project.lamp.visible;
  for (const button of $('style-options').children) {
    const id = button.dataset.style, sample = clone(project); sample.art.style = id;
    button.innerHTML = posterSvg(sample, `thumb-${id}`); const label = document.createElement('span'); label.textContent = STYLES[id]; button.append(label);
    button.setAttribute('aria-pressed', String(id === project.art.style));
  }
  for (const button of $('palette-options').children) button.setAttribute('aria-pressed', String(button.dataset.palette === project.art.palette));
  $('palette-name').textContent = PALETTES[project.art.palette].name;
  $('preview').className = `preview ${view === 'room' ? 'room-view' : 'print-view'}`;
  $('preview').innerHTML = view === 'room' ? roomSvg(project) : posterSvg(project, 'preview-art');
  $('view-room').setAttribute('aria-pressed', String(view === 'room')); $('view-print').setAttribute('aria-pressed', String(view === 'print'));
  $('composition-caption').textContent = `${STYLES[project.art.style]} / ${PALETTES[project.art.palette].name}`;
  const [w, h] = SIZES[project.art.size]; $('size-caption').textContent = `Lámina ${w} × ${h} cm${view === 'room' ? ` · pared ${project.room.width} cm` : ''}`;
  $('dirty-label').textContent = dirty() ? 'SIN GUARDAR' : 'VERSIÓN GUARDADA';
}
function update(change) {
  const next = clone(project);
  try { change(next); project = validateProject(next); hasUserChanges = true; render(); message(''); }
  catch (error) { message(error.message, true); }
}
function bind(id, change, event = 'change') { $(id).addEventListener(event, () => update(change)); }
bind('project-title', p => { p.title = $('project-title').value; }, 'change');
bind('art-size', p => { p.art.size = $('art-size').value; }); bind('art-margin', p => { p.art.margin = Number($('art-margin').value); });
bind('room-width', p => { p.room.width = Number($('room-width').value); }); bind('room-height', p => { p.room.height = Number($('room-height').value); });
bind('room-wall', p => { p.room.wall = $('room-wall').value; }, 'input'); bind('room-frame', p => { p.room.frame = $('room-frame').value; });
bind('lamp-kind', p => { p.lamp.kind = $('lamp-kind').value; p.lamp.height = LAMPS[p.lamp.kind].height; });
bind('lamp-height', p => { p.lamp.height = Number($('lamp-height').value); }, 'input'); bind('lamp-diameter', p => { p.lamp.diameter = Number($('lamp-diameter').value); }, 'input');
bind('lamp-warmth', p => { p.lamp.warmth = $('lamp-warmth').value; }); bind('lamp-side', p => { p.lamp.side = $('lamp-side').value; });
bind('lamp-visible', p => { p.lamp.visible = $('lamp-visible').checked; });
$('project-form').addEventListener('submit', event => event.preventDefault());
$('new-variation').addEventListener('click', () => update(p => { p.art.variant = (p.art.variant + 1) % 10000; }));

function tab(name, focus = false) {
  for (const key of ['art', 'lamp']) { const selected = name === key; $(`${key}-tab`).setAttribute('aria-selected', String(selected)); $(`${key}-tab`).tabIndex = selected ? 0 : -1; $(`${key}-panel`).hidden = !selected; }
  $('view-print').disabled = name === 'lamp'; if (name === 'lamp') view = 'room'; render(); if (focus) $(`${name}-tab`).focus();
}
for (const name of ['art', 'lamp']) {
  $(`${name}-tab`).addEventListener('click', () => tab(name));
  $(`${name}-tab`).addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); tab(event.key === 'Home' ? 'art' : event.key === 'End' ? 'lamp' : name === 'art' ? 'lamp' : 'art', true); }
  });
}
$('view-room').addEventListener('click', () => { view = 'room'; render(); }); $('view-print').addEventListener('click', () => { view = 'print'; render(); });

function openDialog(dialog) { if (!dialog.open) dialog.showModal(); }
for (const dialog of [library, exportsDialog, replaceDialog]) {
  dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
}
function applyReplacement(next, isSaved) {
  project = validateProject(next); savedFingerprint = isSaved ? JSON.stringify(project) : null; hasUserChanges = false; pendingReplacement = null;
  library.close(); exportsDialog.close(); render(); message(isSaved ? 'Versión abierta. Puedes seguir jugando sin modificar la que guardaste.' : 'Proyecto abierto. Guárdalo como una versión cuando quieras.');
}
function requestReplacement(next, isSaved) {
  if (hasUserChanges && dirty()) { pendingReplacement = { project: clone(next), isSaved }; openDialog(replaceDialog); }
  else applyReplacement(next, isSaved);
}
$('confirm-replace').addEventListener('click', () => { const pending = pendingReplacement; replaceDialog.close(); if (pending) applyReplacement(pending.project, pending.isSaved); });
$('cancel-replace').addEventListener('click', () => replaceDialog.close()); replaceDialog.addEventListener('close', () => { if (!replaceDialog.open) pendingReplacement = null; });

function updateCount() { try { $('library-count').textContent = String(readVersions().length); } catch { $('library-count').textContent = '!'; } }
function renderLibrary() {
  $('library-list').replaceChildren(); $('recover-library').hidden = true; message('', false, $('library-status'));
  try {
    const entries = readVersions(); $('library-count').textContent = String(entries.length);
    if (!entries.length) { const empty = document.createElement('p'); empty.className = 'empty-library'; empty.textContent = 'Tu próxima idea empieza aquí.'; $('library-list').append(empty); }
    for (const entry of entries) {
      const row = document.createElement('article'); row.className = 'library-item'; const text = document.createElement('div'), title = document.createElement('h3'), detail = document.createElement('p');
      title.textContent = entry.project.title; detail.textContent = `${STYLES[entry.project.art.style]} · ${entry.project.art.size.replace('x', ' × ')} cm · ${new Date(entry.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`;
      text.append(title, detail); const open = document.createElement('button'); open.className = 'button subtle'; open.textContent = 'Abrir'; open.addEventListener('click', () => requestReplacement(entry.project, true));
      const remove = document.createElement('button'); remove.className = 'delete-button'; remove.textContent = 'Eliminar'; let confirmed = false;
      remove.addEventListener('click', async () => {
        if (!confirmed) { confirmed = true; remove.textContent = 'Confirmar eliminación'; return; }
        remove.disabled = true;
        try { await deleteVersion(entry); renderLibrary(); message('Versión eliminada. El boceto abierto no cambia.', false, $('library-status')); }
        catch (error) { message(error.message, true, $('library-status')); remove.disabled = false; }
      });
      row.append(text, open, remove); $('library-list').append(row);
    }
  } catch (error) { $('recover-library').hidden = false; message(error.message, true, $('library-status')); }
}
$('open-library').addEventListener('click', () => { renderLibrary(); openDialog(library); }); $('refresh-library').addEventListener('click', renderLibrary);
$('recover-library').addEventListener('click', () => {
  try { const raw = rawLibrary(); if (raw === null) throw new Error('No hay datos guardados que recuperar.'); download(new Blob([raw], { type: 'text/plain;charset=utf-8' }), 'pliego-biblioteca-original.txt'); message('Copia original preparada. Los datos guardados siguen intactos.', false, $('library-status')); }
  catch (error) { message(error.message, true, $('library-status')); }
});
$('save-version').addEventListener('click', async () => {
  if (!$('project-form').reportValidity()) return;
  const snapshot = clone(project); $('save-version').disabled = true;
  try { const entries = await saveVersion(snapshot); savedFingerprint = JSON.stringify(snapshot); $('library-count').textContent = String(entries.length); render(); message(`Versión guardada: ${snapshot.title}.`); }
  catch (error) { message(`${error.message} Tu boceto sigue abierto.`, true); }
  finally { $('save-version').disabled = false; }
});
window.addEventListener('storage', event => { if (event.key === LIBRARY_KEY || event.key === null) { updateCount(); if (library.open) renderLibrary(); } });

function validExport(action) { if (!$('project-form').reportValidity()) return; try { action(clone(project)); } catch (error) { message(error.message, true); } }
$('export-svg').addEventListener('click', () => validExport(p => { exportSvg(p); message(`SVG preparado: lámina ${p.art.size.replace('x', ' × ')} cm, sin marco ni habitación.`); }));
$('export-png').addEventListener('click', async () => {
  if (!$('project-form').reportValidity()) return;
  const snapshot = clone(project); $('export-png').disabled = true; message('Preparando tu imagen…');
  try { const size = await exportPng(snapshot); message(`PNG preparado: ${size.width} × ${size.height} píxeles. Para imprimir a otra escala, utiliza el SVG.`); }
  catch (error) { message(error.message, true); }
  finally { $('export-png').disabled = false; }
});
$('open-export').addEventListener('click', () => { importGeneration += 1; message('', false, $('import-status')); openDialog(exportsDialog); });
$('export-json').addEventListener('click', () => validExport(p => { exportProject(p); message('Copia editable preparada. Puedes abrirla en Pliego.', false, $('import-status')); }));
$('export-room').addEventListener('click', () => validExport(p => { exportRoom(p); message('Esquema del espacio preparado.', false, $('import-status')); }));
exportsDialog.addEventListener('close', () => { if (!exportsDialog.open) importGeneration += 1; });
$('import-file').addEventListener('change', async event => {
  const file = event.target.files?.[0], generation = ++importGeneration;
  if (!file) return;
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('El archivo supera los 64 KB.');
    const next = parseBackup(await file.text());
    if (generation !== importGeneration || !exportsDialog.open) return;
    requestReplacement(next, false);
  } catch (error) { if (generation === importGeneration && exportsDialog.open) message(`${error.message} El boceto no cambia.`, true, $('import-status')); }
  finally { if (generation === importGeneration) event.target.value = ''; }
});
render(); updateCount();
