import { Float32BufferAttribute, Vector3 } from 'three';

/** Angle-weighted auto smooth for the icon's XZ faces and rounded perimeter.
 * Position-based adjacency joins UV seams without welding or changing UVs.
 * Flat +/-Y caps also anchor the adjoining bevel's boundary normals.
 */
export function autoSmoothIcon(source, creaseAngle = Math.PI / 3) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute('position');
  if (!position || position.count % 3 !== 0) throw new Error('Auto smooth requires triangle geometry.');
  geometry.computeBoundingBox();
  const tolerance = Math.max(geometry.boundingBox.getSize(new Vector3()).length() * 1e-6, 1e-8);
  const keyAt = i => [position.getX(i), position.getY(i), position.getZ(i)].map(v => Math.round(v / tolerance)).join(',');
  const adjacency = new Map(), faces = [], keys = [];
  const points = [new Vector3(), new Vector3(), new Vector3()];
  const edgeA = new Vector3(), edgeB = new Vector3(), cross = new Vector3();
  for (let start = 0; start < position.count; start += 3) {
    points.forEach((p, corner) => p.fromBufferAttribute(position, start + corner));
    edgeA.subVectors(points[1], points[0]); edgeB.subVectors(points[2], points[0]);
    const normal = new Vector3().crossVectors(edgeA, edgeB).normalize();
    const cap = Math.abs(normal.y) > 1 - 1e-6;
    const face = { normal, cap }; faces.push(face);
    for (let corner = 0; corner < 3; corner++) {
      const key = keyAt(start + corner); keys.push(key);
      edgeA.subVectors(points[(corner + 1) % 3], points[corner]);
      edgeB.subVectors(points[(corner + 2) % 3], points[corner]);
      const angle = Math.atan2(cross.crossVectors(edgeA, edgeB).length(), edgeA.dot(edgeB));
      if (!adjacency.has(key)) adjacency.set(key, []);
      adjacency.get(key).push({ face, angle });
    }
  }
  const normals = new Float32Array(position.count * 3), sum = new Vector3();
  const threshold = Math.cos(creaseAngle);
  for (let i = 0; i < position.count; i++) {
    const face = faces[Math.floor(i / 3)];
    sum.set(0, 0, 0);
    if (face.cap) sum.set(0, Math.sign(face.normal.y), 0);
    else {
      let capNormal = null;
      for (const neighbor of adjacency.get(keys[i])) {
        if (face.normal.dot(neighbor.face.normal) < threshold) continue;
        sum.addScaledVector(neighbor.face.normal, neighbor.angle);
        if (neighbor.face.cap) capNormal = neighbor.face.normal;
      }
      if (capNormal) sum.set(0, Math.sign(capNormal.y), 0);
      else if (sum.lengthSq() > 0) sum.normalize();
      else sum.copy(face.normal);
    }
    sum.toArray(normals, i * 3);
  }
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  // Imported tangents no longer match. The PBR shader derives its tangent
  // frame from the unchanged positions and UVs instead.
  geometry.deleteAttribute('tangent');
  return geometry;
}
