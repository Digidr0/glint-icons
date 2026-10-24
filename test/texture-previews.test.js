import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { generatePreview } from '../scripts/texture-previews.js';

test('preview is small, cached, refreshed on edits and leaves the source intact', async t => {
  const cache = join(process.cwd(), 'node_modules', '.cache');
  await mkdir(cache, { recursive: true });
  const root = await mkdtemp(join(cache, 'glint-preview-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'текстура.png'), output = join(root, 'previews');
  await sharp({ create: { width: 2000, height: 1000, channels: 4, background: '#fc7703' } }).png().toFile(source);
  const original = await readFile(source);
  assert.equal(await generatePreview(source, output), true);
  const thumbnail = join(output, 'текстура.png.webp');
  const metadata = await sharp(await readFile(thumbnail)).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 192); assert.equal(metadata.height, 96);
  assert.deepEqual(await readFile(source), original);
  const before = await stat(thumbnail);
  assert.equal(await generatePreview(source, output), false);
  assert.equal((await stat(thumbnail)).mtimeMs, before.mtimeMs);
  await sharp({ create: { width: 100, height: 100, channels: 4, background: '#ff00ff' } }).png().toFile(source);
  assert.equal(await generatePreview(source, output), true);
  assert.equal((await sharp(await readFile(thumbnail)).metadata()).width, 100);
});
