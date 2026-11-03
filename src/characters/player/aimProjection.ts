import type { Camera, Plane, Raycaster, Vector2, Vector3 } from 'three';

/** Cursor livre inclusive no centro do jogador. A zona mínima só estabiliza o
 * rumo do corpo; não limita a projeção nem retém o cursor anterior. Sem alocação. */
export function projectAimPoint(ray: Raycaster, pointer: Vector2, camera: Camera,
  plane: Plane, point: Vector3, height: number, out: { x: number; z: number }): boolean {
  plane.constant = -height;
  ray.setFromCamera(pointer, camera);
  if (!ray.ray.intersectPlane(plane, point) || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return false;
  out.x = point.x; out.z = point.z;
  return true;
}
