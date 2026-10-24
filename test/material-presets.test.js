import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults } from '../src/defaults.js';
import { snapshotMaterial, validMaterialPreset } from '../src/material-presets.js';

test('material presets capture paint without affecting images, HDRI or camera', () => {
  const material = snapshotMaterial(defaults);
  assert.equal(material.color, defaults.color);
  assert.equal(material.normalStrength, defaults.normalStrength);
  assert.equal(material.coatRoughness, defaults.coatRoughness);
  assert.equal('light' in material, false);
  assert.equal('logoScale' in material, false);
  assert.equal('patternScale' in material, false);
  assert.equal(validMaterialPreset({ id: 'test', name: 'Мой материал', material }), true);
});

test('material presets reject invalid names, colors and numeric settings', () => {
  const preset = { id: 'test', name: 'Мой материал', material: snapshotMaterial(defaults) };
  assert.equal(validMaterialPreset({ ...preset, name: '  ' }), false);
  assert.equal(validMaterialPreset({ ...preset, material: { ...preset.material, color: 'invalid' } }), false);
  assert.equal(validMaterialPreset({ ...preset, material: { ...preset.material, roughness: -1 } }), false);
});
