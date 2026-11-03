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
/** A carcaça vem fundida numa placa de entulho que destoava do piso: remove, uma vez por
 * fonte, as faces dos 10% mais baixos e as faces planas viradas para cima no primeiro quarto
 * da altura. Rodas e lataria ficam; o encaixe no chão usa a nova caixa da fonte. */
export const CAR_PLATE = { cut: .1, flatBand: .25, flatNormal: .8 } as const;
export function stripCarPlate(source: Object3D) {
  if (source.userData.carPlateStripped) return source.userData.carPlateStripped as number;
  let removed = 0;
  source.traverse(node => {
    const mesh = node as Mesh;
    if (!mesh.isMesh || !mesh.geometry.index) return;
    const geometry = mesh.geometry.clone(), index = geometry.index!, p = geometry.attributes.position;
    geometry.computeBoundingBox();
    const lo = geometry.boundingBox!.min.y, span = geometry.boundingBox!.max.y - lo, keep: number[] = [];
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), d = new Vector3(), n = new Vector3();
    for (let i = 0; i < index.count; i += 3) {
      a.fromBufferAttribute(p, index.getX(i)); b.fromBufferAttribute(p, index.getX(i + 1)); c.fromBufferAttribute(p, index.getX(i + 2));
      n.subVectors(c, b).cross(d.subVectors(b, a)).normalize();
      const top = Math.max(a.y, b.y, c.y), mid = (a.y + b.y + c.y) / 3;
      if (top < lo + CAR_PLATE.cut * span || (mid < lo + CAR_PLATE.flatBand * span && Math.abs(n.y) > CAR_PLATE.flatNormal)) { removed++; continue; }
      keep.push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    }
    geometry.setIndex(keep);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    mesh.geometry.dispose(); mesh.geometry = geometry;
  });
  source.userData.carPlateStripped = removed;
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
