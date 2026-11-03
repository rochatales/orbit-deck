import legacyCars from '../../assets/props/shanghai/legacy-cars.json';
import { Box3, Group, Mesh, Vector3, type Object3D } from 'three';
import { DESTROYED_CAR, SHANGHAI_CARS } from './propPlacements';

/** Carros são caixas já fundidas nos lotes por setor/material. Remove somente
 * triângulos com três cantos exatos de uma das 36 peças, sem cortar prédios/piso. */
const vertexKey = (x: number, y: number, z: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
export function removeLegacyCars(scene: Object3D) {
  let removed = 0;
  const batches = new Map<string, Set<string>[]>();
  for (const part of legacyCars) {
    const corners = new Set<string>(), c = Math.cos(part.angle), s = Math.sin(part.angle);
    for (const x of [-part.w / 2, part.w / 2]) for (const y of [-part.h / 2, part.h / 2]) for (const z of [-part.d / 2, part.d / 2])
      corners.add(vertexKey(part.x + x * c + z * s, part.y + y, part.z - x * s + z * c));
    const id = `SETOR_${part.sector}_${part.material}`, entries = batches.get(id) ?? [];
    entries.push(corners); batches.set(id, entries);
  }
  scene.traverse(node => {
    const mesh = node as Mesh, entries = batches.get(node.userData.id_estavel ?? node.name);
    if (!mesh.isMesh || !entries || !mesh.geometry.index) return;
    const index = mesh.geometry.index, points = mesh.geometry.attributes.position, keep: number[] = [];
    let count = 0;
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
      const ka = vertexKey(points.getX(a), points.getY(a), points.getZ(a)), kb = vertexKey(points.getX(b), points.getY(b), points.getZ(b)), kc = vertexKey(points.getX(c), points.getY(c), points.getZ(c));
      if (entries.some(corners => corners.has(ka) && corners.has(kb) && corners.has(kc))) count++;
      else keep.push(a, b, c);
    }
    if (count) { mesh.geometry = mesh.geometry.clone(); mesh.geometry.setIndex(keep); removed += count; }
  });
  if (removed !== 432) throw new Error(`Carros antigos incompatíveis: ${removed}/432 triângulos`);
  return removed;
}
/** Clona o carro enferrujado na escala aprovada, apoiado em `y` pelo fundo da caixa. */
export function placeCarWreck(source: Object3D, id: string, x: number, y: number, z: number, angle: number) {
  source.updateWorldMatrix(true, true);
  const box = new Box3().setFromObject(source), center = box.getCenter(new Vector3());
  const root = new Group(), visual = source.clone(true), scale = DESTROYED_CAR.scale;
  visual.scale.setScalar(scale);
  visual.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  root.name = id; root.position.set(x, y, z); root.rotation.y = angle;
  root.add(visual);
  visual.traverse(node => { const mesh = node as Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
  return root;
}
export function createDestroyedCars(source: Object3D, height: (x: number, z: number) => number) {
  const group = new Group(); group.name = 'ShanghaiDestroyedCars';
  for (const car of SHANGHAI_CARS) group.add(placeCarWreck(source, car.id, car.x, height(car.x, car.z), car.z, car.angle));
  return group;
}
