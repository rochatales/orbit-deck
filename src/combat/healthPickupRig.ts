import { Box3, Group, Mesh, Vector3, type MeshStandardMaterial, type Object3D } from 'three';
import { createSupplyBeacon, SUPPLY_LIGHTING } from '../game/props/supplyLighting';
import type { Pickup } from './simulation';
export const MEDKIT_VISUAL = { width: .6 } as const;
/** Kit no solo: nenhuma flutuação, giro ou circunferência. */
export function createMedkitRig(source: Object3D, pickup: Pickup, floor: number, index: number) {
  source.updateWorldMatrix(true, true);
  const box = new Box3().setFromObject(source), center = box.getCenter(new Vector3());
  const scale = MEDKIT_VISUAL.width / (box.max.x - box.min.x), visual = source.clone(true), root = new Group(), item = new Group();
  const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>();
  const own = (original: MeshStandardMaterial) => {
    let material = materials.get(original);
    if (!material) {
      material = original.clone(); material.emissive.set('#ffffff'); material.emissiveMap = original.map;
      material.emissiveIntensity = SUPPLY_LIGHTING.kitEmission; materials.set(original, material);
    }
    return material;
  };
  visual.scale.setScalar(scale); visual.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  visual.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) {
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(m => own(m as MeshStandardMaterial)) : own(mesh.material as MeshStandardMaterial);
  } });
  const beacon = createSupplyBeacon('kit');
  item.add(visual, beacon.mesh); root.add(item); root.position.set(pickup.x, floor, pickup.z); root.name = `HealthMedkit-${index}`;
  return { root, item, materials, update(_time = 0) { root.visible = pickup.active; }, dispose() { materials.forEach(m => m.dispose()); beacon.dispose(); } };
}
