import { pngDimensions, filename, projectBackup, validateProject } from './core.mjs';
import { posterSvg, roomSvg } from './art.mjs';

export function download(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; document.body.append(link);
  try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
export function exportSvg(project) {
  const p = validateProject(project);
  download(new Blob([posterSvg(p)], { type: 'image/svg+xml;charset=utf-8' }), `${filename(p)}.svg`);
}
export function exportRoom(project) {
  const p = validateProject(project);
  download(new Blob([roomSvg(p)], { type: 'image/svg+xml;charset=utf-8' }), `${filename(p)}-espacio.svg`);
}
export function exportProject(project) {
  download(new Blob([projectBackup(project)], { type: 'application/json' }), `${filename(project)}.json`);
}
export async function exportPng(project) {
  const p = validateProject(project), [width, height] = pngDimensions(p);
  const source = URL.createObjectURL(new Blob([posterSvg(p)], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image(), canvas = document.createElement('canvas');
  let timer;
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('La imagen tardó demasiado en prepararse. Prueba a descargar el SVG.')), 15000);
      image.onload = () => resolve(); image.onerror = () => reject(new Error('No se ha podido preparar la imagen. Puedes descargar el SVG.'));
      image.src = source;
    });
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se ha podido crear el PNG. Puedes descargar el SVG.');
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('El navegador no ha podido crear el PNG. Puedes descargar el SVG.');
    download(blob, `${filename(p)}.png`);
    return { width, height };
  } finally {
    clearTimeout(timer); image.onload = null; image.onerror = null; image.src = ''; URL.revokeObjectURL(source); canvas.width = 0; canvas.height = 0;
  }
}
