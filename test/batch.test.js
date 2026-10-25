import test from 'node:test';
import assert from 'node:assert/strict';
import { batchFileNames, sameCamera, sameMaterial, sameEnvironment, materialOptions, resolveBatchLogo } from '../src/batch.js';
import { defaults, defaultCamera } from '../src/defaults.js';
import { builtInMaterialPresets } from '../src/material-presets.js';

test('batch PNG names preserve Unicode, prevent paths and disambiguate duplicates', () => {
  assert.deepEqual(batchFileNames([{ name: 'Лого.png' }, { name: 'Лого.jpg' }, { name: 'лого-2.webp' }, { name: '../logo.png' }], 2048), ['Лого_x2048.png', 'Лого-2_x2048.png', 'лого-2-2_x2048.png', '.._logo_x2048.png']);
});
test('batch detects saved settings without treating different settings as a match', () => {
  const camera = { ...defaultCamera, fov: 32 };
  assert.equal(sameCamera(camera, { ...camera, projection: 'perspective', zoom: 1 }), true);
  assert.equal(sameCamera(camera, { ...camera, projection: 'orthographic' }), false);
  assert.equal(sameMaterial(defaults, { ...defaults, light: 4 }), true);
  assert.equal(sameMaterial(defaults, { ...defaults, color: '#000000' }), false);
  assert.equal(sameEnvironment({ environment: { id: 'studio' }, ...defaults }, 'studio', defaults), true);
  assert.equal(sameEnvironment({ environment: { id: 'studio' }, ...defaults }, 'custom:1', defaults), false);
});
test('built-in batch material choices contain all paint properties', () => {
  const options = materialOptions(builtInMaterialPresets, []);
  assert.equal(options.length, 6);
  assert.deepEqual(options.map(preset => preset.name), ['Metal', 'Aluminium', 'Crome', 'Plastic', 'Rubber', 'Car paint']);
  assert.equal(options[1].material.clearcoat, 0);
  assert.equal(options[1].material.flakes, .53);
  assert.equal(options[5].material.normalStrength, .14);
  assert.equal(options[5].material.iridescence, 1);
  assert.equal(sameMaterial(options[0].material, defaults), true);
  assert.equal('light' in options[0].material, false);
});

test('batch initially selects the first logo and keeps an existing selection', () => {
  const first = { id: 'first' }, selected = { id: 'selected' }, added = { id: 'added' };
  assert.equal(resolveBatchLogo([first, selected], 0), first);
  assert.equal(resolveBatchLogo([first, selected, added], 2, selected.id), undefined);
  assert.equal(resolveBatchLogo([selected, added], 3, selected.id), undefined);
});

test('removing an active batch logo selects a remaining file or clears it', () => {
  const remaining = { id: 'remaining' };
  assert.equal(resolveBatchLogo([remaining], 2, 'removed'), remaining);
  assert.equal(resolveBatchLogo([], 1, 'removed'), null);
});

test('batch changes do not replace or clear a manually chosen logo', () => {
  assert.equal(resolveBatchLogo([{ id: 'first' }], 2, undefined), undefined);
  assert.equal(resolveBatchLogo([], 1, undefined), undefined);
});
