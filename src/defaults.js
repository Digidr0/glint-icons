export const defaults = { color: '#d1d5de', roughness: .20, metalness: .90, clearcoat: 1, coatRoughness: .10, flakes: .85, iridescence: .50, patternStrength: .35, patternScale: 1, patternRotation: 0, patternX: 0, patternY: 0, patternMode: 'color', patternUV: 0, logoScale: .65, logoX: 0, logoY: 0, exposure: 1.0, light: 1.5, lightRotation: 138, normalStrength: .05, logoUV: 1 };

export const defaultCamera = { azimuth: 26.6, elevation: -19.4, distance: 5.04 };
// A new built-in view starts a new preference version; old saved views remain
// untouched, but no longer override the newly requested defaults.
export const cameraStorageKey = 'icon-studio.default-camera.v2';
