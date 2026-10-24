import { snapshotMaterial } from './material-presets.js';
import { defaults } from './defaults.js';

export function materialOptions(builtIn, custom) {
  return [
    ...builtIn.map(p => ({ id: `builtin:${p.name}`, name: p.name, material: snapshotMaterial({ ...defaults, ...p }) })),
    ...custom,
  ];
}
export function sameMaterial(a, b) {
  return Object.entries(snapshotMaterial(a)).every(([key, value]) => typeof value === 'string'
    ? value.toLowerCase() === b[key]?.toLowerCase()
    : Math.abs(value - b[key]) < 1e-6);
}
export function sameCamera(a, b) {
  return !!a && !!b && Math.abs(a.azimuth - b.azimuth) < .11 && Math.abs(a.elevation - b.elevation) < .11
    && Math.abs(a.distance - b.distance) < .015 && Math.abs(a.fov - b.fov) < 1e-6
    && (a.projection || 'perspective') === (b.projection || 'perspective') && Math.abs((a.zoom ?? 1) - (b.zoom ?? 1)) < .0001;
}
export function sameEnvironment(preset, environmentId, settings) {
  return preset.environment.id === environmentId && ['light', 'lightRotation', 'exposure'].every(key => Math.abs(preset[key] - settings[key]) < 1e-6);
}
export function batchFileNames(files) {
  const used = new Set();
  return files.map(file => {
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 120) || 'icon';
    let name = `${base}.png`, suffix = 2;
    while (used.has(name.toLowerCase())) name = `${base}-${suffix++}.png`;
    used.add(name.toLowerCase()); return name;
  });
}
