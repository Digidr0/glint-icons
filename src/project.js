export const githubURL = 'https://github.com/Digidr0/glint-icons';
export const watermarkDisabledKey = 'glint-icons.watermark-disabled.v1';

export function isWatermarkEnabled(storage) {
  try { return (storage ?? globalThis.localStorage).getItem(watermarkDisabledKey) !== '1'; }
  catch { return true; }
}

export function rememberWatermarkDisabled() {
  try { localStorage.setItem(watermarkDisabledKey, '1'); return true; }
  catch { return false; }
}
