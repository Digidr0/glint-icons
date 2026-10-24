import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BoxGeometry, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { autoSmoothIcon } from '../src/smooth-normals.js';

test('keeps 90-degree box edges sharp', () => {
  const source = new BoxGeometry();
  const expected = source.toNonIndexed();
  const result = autoSmoothIcon(source);
  assert.deepEqual(result.getAttribute('normal').array, expected.getAttribute('normal').array);
  assert.ok(source.index, 'source geometry is not modified');
});

test('real GLB retains both UV channels and positions; caps are flat', async () => {
  const file = await readFile(new URL('../3D/Icon.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
  let source;
  gltf.scene.traverse(o => { if(o.isMesh) source = o.geometry; });
  source.addGroup(0, source.index.count, 0);
  const expected = source.toNonIndexed(), result = autoSmoothIcon(source);
  for (const name of ['position', 'uv', 'uv1']) assert.deepEqual(result.getAttribute(name).array, expected.getAttribute(name).array, name);
  assert.deepEqual(result.groups, expected.groups);
  const pos = result.getAttribute('position'), normal = result.getAttribute('normal');
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), n = new Vector3();
  let flatCorners = 0, corrected = 0;
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i+1); c.fromBufferAttribute(pos, i+2);
    n.crossVectors(b.sub(a), c.sub(a)).normalize();
    for (let k = i; k < i+3; k++) {
      const actual = new Vector3().fromBufferAttribute(normal, k);
      assert.ok(Number.isFinite(actual.length()) && Math.abs(actual.length()-1) < 1e-5);
      if (Math.abs(n.y) > 1-1e-6) {
        assert.equal(actual.x, 0); assert.equal(actual.z, 0); assert.equal(actual.y, Math.sign(n.y)); flatCorners++;
        if (Math.abs(expected.getAttribute('normal').getY(k)-actual.y) > 1e-5) corrected++;
      }
    }
  }
  assert.ok(flatCorners > 0); assert.ok(corrected > 0, 'fixes the imported bulging cap normals');
});
