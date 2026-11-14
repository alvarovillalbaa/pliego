import { LIBRARY_KEY, parseLibrary, libraryText, validateProject } from './core.mjs';

export function readVersions() { return parseLibrary(localStorage.getItem(LIBRARY_KEY)); }
export function rawLibrary() { return localStorage.getItem(LIBRARY_KEY); }

async function write(change) {
  if (!navigator.locks) throw new Error('Este navegador no permite guardar versiones con seguridad entre pestañas. Descarga el proyecto JSON.');
  return navigator.locks.request('pliego-library-write-v1', async () => {
    const before = localStorage.getItem(LIBRARY_KEY);
    const entries = parseLibrary(before);
    const updated = change(entries);
    const next = libraryText(updated);
    if (localStorage.getItem(LIBRARY_KEY) !== before) throw new Error('La biblioteca cambió durante el guardado. Tu boceto sigue abierto; vuelve a intentarlo.');
    localStorage.setItem(LIBRARY_KEY, next);
    return updated;
  });
}

export function saveVersion(project) {
  const snapshot = validateProject(project);
  return write(entries => {
    if (entries.length >= 20) throw new Error('Ya tienes 20 versiones. Descarga una copia o elimina una versión que no necesites.');
    return [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), project: snapshot }, ...entries];
  });
}

export function deleteVersion(expected) {
  return write(entries => {
    const current = entries.find(entry => entry.id === expected.id);
    if (!current || JSON.stringify(current) !== JSON.stringify(expected)) throw new Error('La versión cambió en otra pestaña. Actualiza la biblioteca antes de eliminarla.');
    return entries.filter(entry => entry.id !== expected.id);
  });
}
