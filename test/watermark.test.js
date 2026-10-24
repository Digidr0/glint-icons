import test from 'node:test';
import assert from 'node:assert/strict';
import { watermarkLayout, drawWatermark } from '../src/watermark.js';

const context = () => ({
  measureText: text => ({ actualBoundingBoxAscent: 70, actualBoundingBoxDescent: 10,
    actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 60 }),
});

test('watermark scales proportionally across all PNG export sizes', () => {
  const reference = watermarkLayout(context(), 2048, 2048);
  for (const size of [512, 1024, 2048, 4096]) {
    const layout = watermarkLayout(context(), size, size), ratio = size / 2048;
    assert.equal(layout.fontSize, reference.fontSize * ratio);
    assert.equal(layout.lines.length, 1);
    for (let i = 0; i < layout.lines.length; i++) {
      assert.equal(layout.lines[i].x, reference.lines[i].x * ratio);
      assert.equal(layout.lines[i].y, reference.lines[i].y * ratio);
    }
    const top = layout.lines[0].y - 70 * layout.fontSize / 100;
    const bottom = layout.lines[0].y + 10 * layout.fontSize / 100;
    assert.ok(Math.abs(bottom - top - size * .025) < 1e-8);
    assert.ok(Math.abs(size - bottom - size * .02) < 1e-8);
    assert.ok(layout.lines.every(line => line.x >= size * .02));
  }
});

test('watermark draws exact text in white at 30% opacity and restores context', () => {
  const ctx = context(), calls = [];
  ctx.save = () => calls.push('save'); ctx.restore = () => calls.push('restore');
  ctx.fillText = text => calls.push({ text, color: ctx.fillStyle, alpha: ctx.globalAlpha });
  drawWatermark(ctx, 2048, 2048);
  assert.deepEqual(calls, ['save',
    { text: 'Make by Digidro on Glint', color: '#ffffff', alpha: .3 }, 'restore']);
});
