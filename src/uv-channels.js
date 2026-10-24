// UI numbering starts at one; GLB/Three.js channels are zero-based.
export const uvChannels = [
  { value: 0, label: 'UV 1 — Растянуть' },
  { value: 1, label: 'UV 2 — Заполнить' },
  { value: 2, label: 'UV 3 — только Фронт' },
];
export const normalizeUVChannel = (value, fallback = 0) => uvChannels.some(channel => channel.value === value) ? value : fallback;
