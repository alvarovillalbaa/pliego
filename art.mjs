import { validateProject, PALETTES, STYLES, SIZES, escapeXml } from './core.mjs';

function artwork(project, id) {
  const { art } = project, palette = PALETTES[art.palette];
  const [width, height] = SIZES[art.size], w = 600, h = w * height / width;
  const margin = w * art.margin / 100, iw = w - 2 * margin, ih = h - 2 * margin;
  const t = (Math.imul(art.variant + 1, 2654435761) >>> 0) / 4294967296;
  let shapes = '';
  if (art.style === 'sol') {
    const radius = iw * (0.24 + t * 0.07), cx = iw * (0.47 + t * 0.1), cy = ih * 0.34;
    shapes = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${palette.accent}"/><path d="M${iw * 0.13} ${ih}V${ih * 0.56}a${iw * 0.37} ${iw * 0.37} 0 0 1 ${iw * 0.74} 0V${ih}Z" fill="${palette.ink}"/><path d="M${iw * 0.34} ${ih}V${ih * 0.58}a${iw * 0.16} ${iw * 0.16} 0 0 1 ${iw * 0.32} 0V${ih}Z" fill="${palette.paper}"/><path d="M0 ${ih * 0.85}H${iw}" stroke="${palette.dark}" stroke-width="3"/>`;
  } else if (art.style === 'equilibrio') {
    shapes = `<rect x="${iw * 0.12}" y="${ih * 0.1}" width="${iw * 0.33}" height="${ih * 0.46}" rx="${iw * 0.165}" fill="${palette.ink}"/><circle cx="${iw * 0.68}" cy="${ih * (0.28 + 0.15 * t)}" r="${iw * 0.2}" fill="${palette.accent}"/><path d="M${iw * 0.12} ${ih * 0.69}L${iw * 0.88} ${ih * (0.60 + t * 0.06)}V${ih * 0.82}L${iw * 0.12} ${ih * 0.9}Z" fill="${palette.dark}"/><circle cx="${iw * 0.4}" cy="${ih * 0.91}" r="${iw * 0.035}" fill="${palette.ink}"/>`;
  } else {
    shapes = `<circle cx="${iw * 0.75}" cy="${ih * 0.2}" r="${iw * 0.18}" fill="${palette.accent}"/>`;
    for (let i = 0; i < 18; i++) {
      const y = ih * (0.18 + i * 0.043), bend = iw * (0.4 + t * 0.3);
      shapes += `<path d="M${-iw * 0.1} ${y}C${bend} ${y - ih * 0.22} ${iw * (1 - t * 0.25)} ${y + ih * 0.25} ${iw * 1.1} ${y}" fill="none" stroke="${i % 4 === 0 ? palette.dark : palette.ink}" stroke-width="${i % 4 === 0 ? 5 : 3}"/>`;
    }
  }
  return { w, h, body: `<rect width="${w}" height="${h}" fill="${palette.paper}"/><defs><clipPath id="${id}"><rect width="${iw}" height="${ih}"/></clipPath></defs><g transform="translate(${margin} ${margin})" clip-path="url(#${id})">${shapes}</g>` };
}

export function posterSvg(input, id = 'pliego-art') {
  const project = validateProject(input);
  if (!/^[a-z][a-z0-9-]{0,50}$/.test(id)) throw new Error('Identificador de dibujo no válido.');
  const [width, height] = SIZES[project.art.size], { w, h, body } = artwork(project, id);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 10}mm" height="${height * 10}mm" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title"><title id="${id}-title">${escapeXml(project.title)} · ${STYLES[project.art.style]} · ${width} × ${height} cm</title>${body}</svg>`;
}

export function roomSvg(input) {
  const p = validateProject(input), [pw, ph] = SIZES[p.art.size], s = 900 / p.room.width;
  const floor = 50 + p.room.height * s, totalHeight = floor + 100;
  const x = 500 - pw * s / 2, y = floor - (150 + ph / 2) * s;
  const frame = p.room.frame === 'oak' ? '#a87a4e' : '#282724', frameSize = p.room.frame === 'none' ? 0 : 2 * s;
  const paper = posterSvg(p, 'room-art').replace('<svg ', `<svg x="${x}" y="${y}" `).replace(/width="[^"]+" height="[^"]+"/, `width="${pw * s}" height="${ph * s}"`);
  const consoleWidth = Math.min(130, p.room.width * 0.48) * s, consoleX = 500 - consoleWidth / 2, consoleY = floor - 65 * s;
  let lamp = '';
  if (p.lamp.visible) {
    const lx = p.lamp.kind === 'table' ? 500 + (p.lamp.side === 'left' ? -1 : 1) * consoleWidth * 0.3 : 50 + (p.lamp.side === 'left' ? 48 : p.room.width - 48) * s, d = p.lamp.diameter * s;
    const base = p.lamp.kind === 'table' ? consoleY : floor;
    const top = p.lamp.kind === 'pendant' ? 50 + p.lamp.height * s : base - p.lamp.height * s;
    const tone = p.lamp.warmth === 'warm' ? '#efc779' : '#efeee5';
    lamp = `<g data-lamp="${p.lamp.kind}" data-height-cm="${p.lamp.height}" data-diameter-cm="${p.lamp.diameter}"><ellipse cx="${lx}" cy="${top + d * 0.7}" rx="${d * 0.9}" ry="${d}" fill="${tone}" opacity="0.22"/>`;
    if (p.lamp.kind === 'pendant') lamp += `<path d="M${lx} 50V${top}" stroke="#464239" stroke-width="${s * 0.8}"/>`;
    else lamp += `<path d="M${lx} ${top}V${base}" stroke="#5c554b" stroke-width="${s * 1.4}"/><ellipse cx="${lx}" cy="${base}" rx="${d * 0.3}" ry="${s * 1.8}" fill="#615b4d"/>`;
    lamp += `<path d="M${lx - d * 0.3} ${top}H${lx + d * 0.3}L${lx + d / 2} ${top + d * 0.48}Q${lx} ${top + d * 0.65} ${lx - d / 2} ${top + d * 0.48}Z" fill="${tone}" stroke="#c0ad8c" stroke-width="${s * 0.6}"/></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${totalHeight}" role="img" aria-labelledby="room-title" data-room-width-cm="${p.room.width}" data-poster-width-cm="${pw}" data-poster-height-cm="${ph}"><title id="room-title">Vista a escala de ${escapeXml(p.title)} con lámina ${pw} por ${ph} cm y lámpara${p.lamp.visible ? '' : ' oculta'}</title><rect width="1000" height="${totalHeight}" fill="${p.room.wall}"/><path d="M0 ${floor}H1000V${totalHeight}H0Z" fill="#c9b69c"/><path d="M0 ${floor}H1000" stroke="#aaa08d" stroke-width="2"/><rect x="${x - frameSize}" y="${y - frameSize}" width="${pw * s + 2 * frameSize}" height="${ph * s + 2 * frameSize}" fill="${frame}"/>${paper}<rect x="${consoleX}" y="${consoleY}" width="${consoleWidth}" height="${12 * s}" rx="${s}" fill="#80634a"/><path d="M${consoleX + 6 * s} ${consoleY}V${floor}M${consoleX + consoleWidth - 6 * s} ${consoleY}V${floor}" stroke="#69533e" stroke-width="${4 * s}"/>${lamp}<path d="M50 25H950M50 18V32M950 18V32" stroke="#766f62" fill="none"/><text x="500" y="18" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#575146">Pared ${p.room.width} cm</text></svg>`;
}
