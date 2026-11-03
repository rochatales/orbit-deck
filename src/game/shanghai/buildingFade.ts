import { Box3, BufferGeometry, Mesh, Ray, Vector3, type Camera, type Material, type Object3D } from 'three';
import { RUIN_FADED, RUIN_RETURN_AFTER } from './limits';

/** Prédios internos que escondem o explorador (2+ andares); térreos de 3,3 m não encobrem. */
export const BUILDING_FADE = { minHeight: 6.6, margin: .5, groundMaterials: ['asfalto', 'calcada', 'faixa', 'grama'] } as const;
const SPEED = 8;
const BODY_HEIGHTS = [0.3, 0.9, 1.25];

export interface FadeBuilding { id: string; x: number; z: number; w: number; d: number; height: number }
interface Entry { id: string; box: Box3; foot: Box3; opacity: number; clearFor: number; materials: { material: Material; opacity: number; depthWrite: boolean }[] }

/**
 * Os prédios da fase 01 vêm fundidos por setor/material (`SETOR_00_metal` = dois prédios +
 * postes). Na montagem, os triângulos dentro da pegada de cada prédio alto viram uma malha
 * própria (atributos compartilhados, só o índice muda) com materiais próprios. No quadro, cada
 * prédio esmaece sozinho quando fica entre a câmera e o corpo: mesma regra das ruínas da borda
 * (opacidade 0,12, volta 0,8 s depois, sem escrever profundidade translúcido, sem alocação).
 */
export class BuildingFade {
  readonly entries: Entry[] = [];
  private readonly ray = new Ray();
  private readonly hit = new Vector3();

  constructor(map: Object3D, buildings: readonly FadeBuilding[]) {
    map.updateMatrixWorld(true);
    for (const b of buildings) if (b.height >= BUILDING_FADE.minHeight) {
      const m = BUILDING_FADE.margin;
      this.entries.push({ id: b.id, opacity: 1, clearFor: RUIN_RETURN_AFTER, materials: [],
        foot: new Box3(new Vector3(b.x - b.w / 2 - m, .05, b.z - b.d / 2 - m), new Vector3(b.x + b.w / 2 + m, Infinity, b.z + b.d / 2 + m)),
        box: new Box3(new Vector3(b.x - b.w / 2, 0, b.z - b.d / 2), new Vector3(b.x + b.w / 2, b.height + .6, b.z + b.d / 2)) });
    }
    const meshes: Mesh[] = [];
    map.traverse(o => { const mesh = o as Mesh; if (mesh.isMesh && !Array.isArray(mesh.material) && mesh.geometry.index && !(BUILDING_FADE.groundMaterials as readonly string[]).includes(mesh.material.name)) meshes.push(mesh); });
    const a = new Vector3(), b = new Vector3(), c = new Vector3();
    for (const mesh of meshes) {
      const index = mesh.geometry.index!, position = mesh.geometry.attributes.position, buckets = this.entries.map(() => [] as number[]), rest: number[] = [];
      for (let i = 0; i < index.count; i += 3) {
        a.fromBufferAttribute(position, index.getX(i)).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(position, index.getX(i + 1)).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(position, index.getX(i + 2)).applyMatrix4(mesh.matrixWorld);
        a.add(b).add(c).divideScalar(3);
        const k = this.entries.findIndex(e => e.foot.containsPoint(a));
        (k >= 0 ? buckets[k] : rest).push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
      }
      if (rest.length === index.count) continue;
      const share = (ids: number[]) => {
        const g = new BufferGeometry();
        for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) g.setAttribute(name, attribute);
        g.setIndex(ids); g.computeBoundingBox(); g.computeBoundingSphere();
        return g;
      };
      buckets.forEach((ids, k) => {
        if (!ids.length) return;
        const entry = this.entries[k], material = (mesh.material as Material).clone();
        entry.materials.push({ material, opacity: material.opacity, depthWrite: material.depthWrite });
        material.transparent = true; // fixo desde a montagem: sem recompilar shader no quadro
        const part = new Mesh(share(ids), material);
        part.name = `${entry.id}_${material.name}`;
        part.position.copy(mesh.position); part.quaternion.copy(mesh.quaternion); part.scale.copy(mesh.scale);
        part.castShadow = mesh.castShadow; part.receiveShadow = mesh.receiveShadow;
        part.userData.predioFade = entry.id;
        mesh.parent!.add(part);
      });
      mesh.geometry = share(rest);
    }
  }

  /** Corpo sob pilotis (dentro da pegada) também está escondido. */
  blocked(entry: Entry, x: number, z: number, camera: Camera) {
    camera.getWorldDirection(this.ray.direction).negate();
    for (let i = 0; i < BODY_HEIGHTS.length; i++) {
      this.ray.origin.set(x, BODY_HEIGHTS[i], z);
      if (entry.box.containsPoint(this.ray.origin) || this.ray.intersectBox(entry.box, this.hit)) return true;
    }
    return false;
  }

  update(x: number, z: number, camera: Camera, dt: number) {
    for (const entry of this.entries) {
      entry.clearFor = this.blocked(entry, x, z, camera) ? 0 : entry.clearFor + dt;
      const target = entry.clearFor < RUIN_RETURN_AFTER ? RUIN_FADED : 1;
      if (entry.opacity === target) continue;
      entry.opacity += (target - entry.opacity) * (1 - Math.exp(-SPEED * dt));
      if (Math.abs(target - entry.opacity) < 1e-4) entry.opacity = target;
      for (const item of entry.materials) {
        item.material.opacity = item.opacity * entry.opacity;
        item.material.depthWrite = item.depthWrite && entry.opacity > .995;
      }
    }
  }

  dispose() {
    for (const entry of this.entries) for (const item of entry.materials) item.material.dispose();
  }
}
