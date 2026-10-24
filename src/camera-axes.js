import { Quaternion, Vector3 } from 'three';

// Convert world-axis directions into camera space, independent of projection.
export function projectCameraAxes(orientation = [0, 0, 0, 1]) {
  const inverse = new Quaternion(...orientation).invert();
  return [
    { label: 'X', direction: [1, 0, 0], color: '#e68f78' },
    { label: 'Y', direction: [0, 1, 0], color: '#83b992' },
    { label: 'Z', direction: [0, 0, 1], color: '#7ea6d9' },
  ].map(axis => {
    const v = new Vector3(...axis.direction).applyQuaternion(inverse);
    return { label: axis.label, color: axis.color, x: v.x, y: -v.y, depth: v.z };
  }).sort((a, b) => a.depth - b.depth);
}
