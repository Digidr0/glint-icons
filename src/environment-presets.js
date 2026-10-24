import { defaults } from './defaults.js';

export const initialEnvironmentPresets = [{
  id: 'default', name: 'Дефолт',
  environment: { id: 'studio', name: 'Studio Small 01', type: 'hdr' },
  light: defaults.light, lightRotation: defaults.lightRotation, exposure: defaults.exposure,
}];

export function validEnvironmentPreset(preset) {
  if (!preset || typeof preset.id !== 'string' || typeof preset.name !== 'string') return false;
  const env = preset.environment;
  if (!env || typeof env.id !== 'string' || typeof env.name !== 'string' || !['hdr', 'exr'].includes(env.type)) return false;
  const builtIn = env.id === 'studio' || /^studio_small_0[2-9]$/.test(env.id);
  if (!builtIn && !(env.file instanceof Blob && env.file.size > 0 && env.file.size <= 64 * 1024 * 1024)) return false;
  return Number.isFinite(preset.light) && preset.light >= 0 && preset.light <= 4
    && Number.isFinite(preset.lightRotation) && preset.lightRotation >= 0 && preset.lightRotation <= 360
    && Number.isFinite(preset.exposure) && preset.exposure >= .2 && preset.exposure <= 2.5;
}

let database;
function openDatabase() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('icon-studio.environments', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Закройте другие вкладки Glint и повторите попытку.'));
  }).catch(error => { database = undefined; throw error; });
  return database;
}

export async function loadEnvironmentPresets() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('state', 'readonly');
    const request = transaction.objectStore('state').get('presets');
    transaction.oncomplete = () => resolve(Array.isArray(request.result) ? request.result.filter(validEnvironmentPreset) : initialEnvironmentPresets);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function saveEnvironmentPresets(presets) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('state', 'readwrite');
    // Structured cloning stores Blob/File bytes, never temporary blob: URLs.
    transaction.objectStore('state').put(presets, 'presets');
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
