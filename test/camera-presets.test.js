import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCameraPresets, validCameraPreset } from '../src/camera-presets.js';

test('built-in camera preset includes original pose and FOV', () => {
  assert.equal(initialCameraPresets.length, 1);
  assert.equal(validCameraPreset(initialCameraPresets[0]), true);
  assert.equal(initialCameraPresets[0].fov, 32);
  assert.equal(initialCameraPresets[0].distance, 5.04);
});

test('rejects malformed and out-of-range saved camera presets', () => {
  for (const change of [{ fov: 0 }, { distance: 100 }, { azimuth: NaN }, { elevation: 90 }, { name: null }, { projection: 'front' }, { zoom: 0 }]) {
    assert.equal(validCameraPreset({ ...initialCameraPresets[0], ...change }), false);
  }
  assert.ok(!validCameraPreset(null));
});

test('camera presets support projection and zoom while accepting older presets', () => {
  assert.equal(validCameraPreset({ ...initialCameraPresets[0], projection: 'orthographic', zoom: 2 }), true);
  assert.equal(validCameraPreset(initialCameraPresets[0]), true);
});
