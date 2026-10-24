import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { IconScene } from '../src/scene.js';
import { defaults } from '../src/defaults.js';

function fixture() {
  const material = IconScene.prototype.makeMaterial.call({ empty: null, flakes: null, normal: null });
  const engine = { renderer: {}, scene: new Scene(), materials: [material], images: {} };
  const update = settings => IconScene.prototype.update.call(engine, { ...defaults, ...settings });
  return { material, engine, update };
}

test('pattern offsets start at zero and reset without moving the logo', () => {
  const { material, update } = fixture();
  const uniforms = material.userData.uniforms;
  update({});
  assert.equal(uniforms.studioPatternOffset.value.x, 0);
  assert.equal(Math.abs(uniforms.studioPatternOffset.value.y), 0);
  update({ patternX: .25, patternY: -.4, logoX: .12, logoY: .2 });
  assert.deepEqual(uniforms.studioPatternOffset.value.toArray(), [.25, .4]);
  assert.deepEqual(uniforms.studioLogoOffset.value.toArray(), [.12, -.2]);
  update({ ...defaults, logoX: .12, logoY: .2 });
  assert.equal(uniforms.studioPatternOffset.value.length(), 0);
  assert.deepEqual(uniforms.studioLogoOffset.value.toArray(), [.12, -.2]);
  material.dispose();
});

test('one paint color, no surface texture uniforms, same offsets in both pattern modes', () => {
  const { material, update } = fixture();
  for (const patternMode of ['color', 'roughness']) {
    update({ color: '#abcdef', patternMode, patternX: -.3, patternY: .2 });
    assert.equal(material.color.getHexString(), 'abcdef');
    assert.deepEqual(material.userData.uniforms.studioPatternOffset.value.toArray(), [-.3, -.2]);
    assert.equal(material.userData.uniforms.studioPatternRoughness.value, patternMode === 'roughness' ? 1 : 0);
  }
  assert.equal('studioSurface' in material.userData.uniforms, false);
  assert.equal('studioHasSurface' in material.userData.uniforms, false);
  material.dispose();
});

test('pattern UV selection is independent of logo UV in both pattern modes', () => {
  const { material, update } = fixture();
  const uniforms = material.userData.uniforms;
  assert.equal(defaults.patternUV, 0);
  for (const patternMode of ['color', 'roughness']) {
    for (const patternUV of [0, 1, 2]) {
      const logoUV = (patternUV + 1) % 3;
      update({ patternMode, patternUV, logoUV });
      assert.equal(uniforms.studioPatternUV.value, patternUV);
      assert.equal(uniforms.studioLogoUV.value, logoUV);
    }
  }
  update({});
  assert.equal(uniforms.studioPatternUV.value, 0);
  material.dispose();
});

test('third UV uses its own geometry attribute and masks the pattern to the front', () => {
  const { material } = fixture();
  const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>', fragmentShader: '#include <map_fragment>\n#include <roughnessmap_fragment>' };
  material.onBeforeCompile(shader);
  assert.match(shader.vertexShader, /vStudioFrontUV=studioFrontUV/);
  assert.match(shader.fragmentShader, /if \(channel > 1\.5\) return vStudioFrontUV/);
  assert.match(shader.fragmentShader, /if \(studioPatternUV > 1\.5\) pattern\.a \*= frontMask\(\)/);
  material.dispose();
});
