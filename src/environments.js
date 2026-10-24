// Eagerly import only asset URLs. The HDR data is fetched when selected, not
// when the gallery opens. Studio 01 reuses the user's original HDRI file.
const assets = import.meta.glob('../3D/hdri/*/*.{hdr,webp}', { eager: true, query: '?url', import: 'default' });

export const studioEnvironments = Array.from({ length: 9 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  const asset = `studio_small_${number}`;
  return {
    id: index === 0 ? 'studio' : asset,
    name: `Studio Small ${number}`,
    detail: 'Poly Haven · 1K · HDR',
    type: 'hdr',
    url: index === 0 ? new URL('../3D/studio_small_01_1k.hdr', import.meta.url).href : assets[`../3D/hdri/${asset}/${asset}_1k.hdr`],
    thumbnail: assets[`../3D/hdri/${asset}/thumbnail.webp`],
    source: `https://polyhaven.com/a/${asset}`,
  };
});
