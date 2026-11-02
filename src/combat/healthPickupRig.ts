import { Box3, Group, Mesh, Vector3, type Object3D } from 'three';
import { RESOURCE_VISUAL, resourceHeight, resourceRingRadius } from './resourceVisual';
import type { Pickup } from './simulation';
export const MEDKIT_VISUAL = { width: .6, ringColor: '#ff6977' } as const;
/** Fontes estáticas: base/medida calculadas só na montagem. */
export function createMedkitRig(source: Object3D, pickup: Pickup, floor: number, index: number) {
  source.updateWorldMatrix(true, true);
  const box = new Box3().setFromObject(source), center = box.getCenter(new Vector3());
  const scale = MEDKIT_VISUAL.width / (box.max.x - box.min.x), visual = source.clone(true), root = new Group(), item = new Group();
  visual.scale.setScalar(scale); visual.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  visual.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
  item.add(visual); root.add(item); root.position.set(pickup.x, floor, pickup.z); root.name = `HealthMedkit-${index}`;
  const phase = index * 2.399963229728653;
  return { root, item, update(time: number) { root.visible = pickup.active; item.position.y = resourceHeight(time, phase); }, radius(time: number) { return resourceRingRadius(time, phase); }, ringY: RESOURCE_VISUAL.ringY };
}
