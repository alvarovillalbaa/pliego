import { LIBRARY_KEY, parseLibrary, libraryText, validateProject } from './core.mjs';

function storageError(error) {
  if (error?.name === 'QuotaExceededError') return new Error('No queda espacio para otra versión en este navegador. Descarga una copia del proyecto.');
  if (error?.name === 'SecurityError' || error instanceof DOMException) return new Error('El navegador no permite acceder a la biblioteca local. Puedes descargar el proyecto abierto.');
  return error;
}
export function rawLibrary() { try { return localStorage.getItem(LIBRARY_KEY); } catch (error) { throw storageError(error); } }
export function readVersions() { return parseLibrary(rawLibrary()); }

async function write(change) {
  if (!navigator.locks) throw new Error('Este navegador no permite guardar versiones con seguridad entre pestañas. Descarga el proyecto JSON.');
  try { return await navigator.locks.request('pliego-library-write-v1', async () => {
    const before = localStorage.getItem(LIBRARY_KEY);
    const entries = parseLibrary(before);
    const updated = change(entries);
    const next = libraryText(updated);
    if (localStorage.getItem(LIBRARY_KEY) !== before) throw new Error('La biblioteca cambió durante el guardado. Tu boceto sigue abierto; vuelve a intentarlo.');
    localStorage.setItem(LIBRARY_KEY, next);
    return updated;
  }); } catch (error) { throw storageError(error); }
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
