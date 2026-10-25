import test from 'node:test';
import assert from 'node:assert/strict';
import { estimatePNGBytes, formatFileSize } from '../src/export-size.js';
import { batchFileNames } from '../src/batch.js';

test('PNG estimates match the supplied weights for every resolution', () => {
  for (const [size, kb] of [[512, 256], [1024, 1024], [2048, 4096], [4096, 16384]]) {
    assert.equal(estimatePNGBytes(size), kb * 1024);
    assert.equal(estimatePNGBytes(size, 5), kb * 1024 * 5);
    assert.equal(estimatePNGBytes(size, 0), 0);
    assert.equal(batchFileNames([{ name: 'logo.png' }], size)[0], `logo_x${size}.png`);
  }
});

test('file sizes use readable Russian units for single PNG and batch totals', () => {
  assert.equal(formatFileSize(estimatePNGBytes(512)), '256 КБ');
  assert.equal(formatFileSize(estimatePNGBytes(1024)), '1 МБ');
  assert.equal(formatFileSize(estimatePNGBytes(2048, 5)), '20 МБ');
  assert.equal(formatFileSize(estimatePNGBytes(512, 5)), '1,25 МБ');
  assert.equal(formatFileSize(0), '0 КБ');
});

test('JPG batch names include resolution and remain collision-safe', () => {
  assert.deepEqual(batchFileNames([{ name: 'logo.png' }, { name: 'logo.webp' }], 1024, 'jpg'), ['logo_x1024.jpg', 'logo-2_x1024.jpg']);
});
