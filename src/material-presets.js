import { defaults } from './defaults.js';

export const materialPresetsKey = 'icon-studio.material-presets.v1';
const ranges = {
  metalness: [0, 1], roughness: [.04, 1], flakes: [0, 1], normalStrength: [0, 1],
  clearcoat: [0, 1], coatRoughness: [.01, 1], iridescence: [0, 1],
};
export const builtInMaterialPresets = [
  { name: 'Metal', ...snapshotMaterial(defaults) },
  { name: 'Aluminium', color: '#a8a8a8', metalness: .87, roughness: .21, flakes: .53, normalStrength: 0, clearcoat: 0, coatRoughness: .01, iridescence: .5 },
  { name: 'Crome', color: '#ffffff', metalness: 1, roughness: .04, flakes: .1, normalStrength: 0, clearcoat: 0, coatRoughness: .01, iridescence: 0 },
  { name: 'Plastic', color: '#fc5e03', metalness: 0, roughness: .09, flakes: .16, normalStrength: 0, clearcoat: 0, coatRoughness: .01, iridescence: 0 },
  { name: 'Rubber', color: '#fc0320', metalness: 0, roughness: .75, flakes: .16, normalStrength: 0, clearcoat: 0, coatRoughness: .01, iridescence: 0 },
  { name: 'Car paint', color: '#ff2f06', metalness: 1, roughness: .44, flakes: 0, normalStrength: .14, clearcoat: 1, coatRoughness: .01, iridescence: 1 },
];
export function snapshotMaterial(settings) {
  return Object.fromEntries(['color', ...Object.keys(ranges)].map(key => [key, settings[key]]));
}
export function validMaterialPreset(preset) {
  if (!preset || typeof preset.id !== 'string' || typeof preset.name !== 'string' || !preset.name.trim() || preset.name.length > 60) return false;
  const material = preset.material;
  return !!material && /^#[a-f\d]{6}$/i.test(material.color)
    && Object.entries(ranges).every(([key, [min, max]]) => Number.isFinite(material[key]) && material[key] >= min && material[key] <= max);
}
export function loadMaterialPresets() {
  try {
    const saved = JSON.parse(localStorage.getItem(materialPresetsKey));
    if (Array.isArray(saved)) return saved.filter(validMaterialPreset).map(p => ({ id: p.id, name: p.name, material: snapshotMaterial(p.material) }));
  } catch { /* Invalid or unavailable storage must not prevent editing. */ }
  return [];
}
