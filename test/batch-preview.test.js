import test from 'node:test';
import assert from 'node:assert/strict';
import { IconScene } from '../src/scene.js';

const texture = name => ({ name, disposed: false, dispose() { this.disposed = true; } });
function fixture(original = texture('active-editor-logo')) {
  return {
    images: original ? { logo: original } : {}, loadVersions: { logo: 0 }, settings: {},
    controls: { enabled: true }, renderer: { render() {} }, update() {},
    async setImage(slot, url) { this.images[slot]?.dispose(); this.images[slot] = texture(url); },
    async renderPNGBlob() { return new Blob(['png'], { type: 'image/png' }); },
  };
}

test('batch renders its files and restores the current editor logo, not a placeholder', async () => {
  const engine = fixture(), active = engine.images.logo, rendered = [];
  await IconScene.prototype.renderBatch.call(engine, [{ url: 'first' }, { url: 'second' }], 512, true, async () => {
    rendered.push(engine.images.logo);
  });
  assert.deepEqual(rendered.map(t => t.name), ['first', 'second']);
  assert.ok(rendered.every(t => t.disposed));
  assert.equal(engine.images.logo, active); assert.equal(active.disposed, false);
  assert.equal(engine.controls.enabled, true); assert.equal(engine.batchProcessing, false);
});

test('batch error preserves the active editor logo', async () => {
  const engine = fixture(), active = engine.images.logo;
  engine.renderPNGBlob = async () => { throw new Error('render failed'); };
  await assert.rejects(IconScene.prototype.renderBatch.call(engine, [{ url: 'first', name: 'first' }], 512, true, async () => {}), /render failed/);
  assert.equal(engine.images.logo, active); assert.equal(active.disposed, false);
  assert.equal(engine.controls.enabled, true); assert.equal(engine.batchProcessing, false);
});

test('batch preserves an explicitly cleared editor logo', async () => {
  const engine = fixture(null);
  await IconScene.prototype.renderBatch.call(engine, [{ url: 'first' }], 512, true, async () => {});
  assert.equal(engine.images.logo, undefined);
});

test('batch forwards background and image format to every render', async () => {
  const engine = fixture(), calls = [];
  const options = { backgroundColor: '#fc7703', format: 'jpg' };
  engine.renderPNGBlob = async (...args) => { calls.push(args); return new Blob(['jpg'], { type: 'image/jpeg' }); };
  await IconScene.prototype.renderBatch.call(engine, [{ url: 'first' }, { url: 'second' }], 1024, false, async blob => {
    assert.equal(blob.type, 'image/jpeg');
  }, options);
  assert.deepEqual(calls, [[1024, false, options], [1024, false, options]]);
});
