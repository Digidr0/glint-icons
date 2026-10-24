import test from 'node:test';
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from 'three';
import { projectCameraAxes } from '../src/camera-axes.js';

test('camera axes are projected into camera space and SVG Y points downward', () => {
  const axes = projectCameraAxes();
  const x = axes.find(axis => axis.label === 'X'), y = axes.find(axis => axis.label === 'Y');
  assert.equal(x.x, 1);
  assert.equal(y.y, -1);
});

test('rotating the camera changes projected axes and orders them by depth', () => {
  const orientation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2).toArray();
  const axes = projectCameraAxes(orientation);
  assert.ok(Math.abs(axes.find(axis => axis.label === 'X').x) < 1e-10);
  assert.ok(Math.abs(axes.find(axis => axis.label === 'Z').x + 1) < 1e-10);
  assert.ok(axes.every((axis, index) => index === 0 || axis.depth >= axes[index - 1].depth));
});
