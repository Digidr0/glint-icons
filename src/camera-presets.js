import { defaultCamera } from './defaults.js';

export const cameraPresetsKey = 'icon-studio.camera-presets.v1';
export const initialCameraPresets = [{ id: 'default', name: 'Дефолт', ...defaultCamera, fov: 32 }];
export function validCameraPreset(preset) {
  return preset && typeof preset.id === 'string' && typeof preset.name === 'string'
    && [preset.azimuth, preset.elevation, preset.distance, preset.fov].every(Number.isFinite)
    && Math.abs(preset.azimuth) <= 360 && Math.abs(preset.elevation) < 90
    && (preset.projection === undefined || ['perspective', 'orthographic'].includes(preset.projection))
    && (preset.zoom === undefined || (Number.isFinite(preset.zoom) && preset.zoom >= .25 && preset.zoom <= 4))
    && preset.distance >= 3.4 && preset.distance <= 11 && preset.fov >= 15 && preset.fov <= 75;
}
export function loadCameraPresets() {
  try {
    const saved = JSON.parse(localStorage.getItem(cameraPresetsKey));
    if (Array.isArray(saved)) return saved.filter(validCameraPreset);
  } catch { /* Keep built-in preset when storage is unavailable or damaged. */ }
  return initialCameraPresets;
}
