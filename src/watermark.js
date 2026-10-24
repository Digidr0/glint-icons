export const watermarkLines = ['Make by Digidro on Glint'];
const family = 'Glint Bitcount';
let fontPromise;

export function loadWatermarkFont() {
  if (!fontPromise) {
    const url = `${import.meta.env?.BASE_URL ?? '/'}fonts/bitcount/Bitcount-Light.ttf`;
    fontPromise = new FontFace(family, `url("${url}")`, { weight: '300' }).load().then(font => {
      document.fonts.add(font);
    }).catch(() => {
      fontPromise = null;
      throw new Error('Не удалось загрузить шрифт вотермарки. Повторите экспорт.');
    });
  }
  return fontPromise;
}

// Measure actual ink so the single-line inscription is 2.5% of image height.
export function watermarkLayout(ctx, width, height) {
  ctx.font = `300 100px "${family}"`;
  const metrics = watermarkLines.map(line => ctx.measureText(line));
  const ascent = Math.max(...metrics.map(m => m.actualBoundingBoxAscent));
  const descent = Math.max(...metrics.map(m => m.actualBoundingBoxDescent));
  const inkHeight = ascent + descent;
  const margin = Math.min(width, height) * .02;
  const scale = Math.min(height * .025 / inkHeight,
    (width - 2 * margin) / Math.max(...metrics.map(m => m.actualBoundingBoxLeft + m.actualBoundingBoxRight)));
  const top = height - margin - inkHeight * scale;
  return {
    fontSize: 100 * scale,
    lines: watermarkLines.map((text, i) => ({
      text,
      x: width - margin - metrics[i].actualBoundingBoxRight * scale,
      y: top + ascent * scale,
    })),
  };
}

export function drawWatermark(ctx, width, height) {
  ctx.save();
  try {
    const layout = watermarkLayout(ctx, width, height);
    ctx.font = `300 ${layout.fontSize}px "${family}"`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = .3;
    for (const line of layout.lines) ctx.fillText(line.text, line.x, line.y);
  } finally { ctx.restore(); }
}
