import test from 'node:test';
import assert from 'node:assert/strict';
import { initialEnvironmentPresets, validEnvironmentPreset } from '../src/environment-presets.js';

test('default HDRI preset includes environment and lighting settings', () => {
  const preset = initialEnvironmentPresets[0];
  assert.equal(validEnvironmentPreset(preset), true);
  assert.equal(preset.environment.id, 'studio');
  assert.equal(preset.lightRotation, 138);
});

test('custom HDRI presets require actual file bytes rather than a temporary URL', () => {
  const preset = { ...initialEnvironmentPresets[0], environment: { id: 'custom:1', name: 'Custom.exr', type: 'exr' } };
  assert.equal(validEnvironmentPreset(preset), false);
  assert.equal(validEnvironmentPreset({ ...preset, environment: { ...preset.environment, url: 'blob:old-url' } }), false);
  assert.equal(validEnvironmentPreset({ ...preset, environment: { ...preset.environment, file: new Blob(['test']) } }), true);
});

test('HDRI presets reject invalid lighting and file formats', () => {
  for (const change of [{ light: -1 }, { lightRotation: NaN }, { exposure: 9 }, { environment: { id: 'studio', name: 'Invalid', type: 'png' } }]) {
    assert.equal(validEnvironmentPreset({ ...initialEnvironmentPresets[0], ...change }), false);
  }
});
