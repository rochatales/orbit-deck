import { PointLight, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';
import { BACKPACK_LIGHT } from '../../scene/lightingConfig';

/** Encaixe rígido no Spine2. Recentrado no Breathing_Idle do astronauta v009:
 * +7,10 cm à esquerda do personagem e +4 cm em altura, sem mudar a profundidade. */
export const BACKPACK_TRANSFORM = {
  position: [0.00951255261126631, -0.03571622669753994, -0.05930778580974025],
  quaternion: [-0.16821674154672414, 0.1683221972742959, -0.02122256794554227, 0.9710408680447891],
  scale: [0.6091301360096101, 0.6091299448734547, 0.6091299905071628]
} as const;

/** Uma luz por instância; acompanha o osso pela hierarquia, sem trabalho por quadro. */
export function createBackpackVisual(source: Object3D) {
  const backpack = source.clone(true);
  const materials: MeshStandardMaterial[] = [];
  backpack.traverse(node => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const soften = (material: MeshStandardMaterial) => {
      if (material.name !== 'Glow_Cyan') return material;
      const own = material.clone();
      own.emissiveIntensity = BACKPACK_LIGHT.stripeEmission;
      materials.push(own);
      return own;
    };
    mesh.material = Array.isArray(mesh.material)
      ? (mesh.material as MeshStandardMaterial[]).map(soften)
      : soften(mesh.material as MeshStandardMaterial);
  });
  const light = new PointLight(BACKPACK_LIGHT.color, BACKPACK_LIGHT.intensity, BACKPACK_LIGHT.reach, BACKPACK_LIGHT.decay);
  light.name = 'BackpackNeonLight';
  light.position.fromArray(BACKPACK_LIGHT.position);
  light.castShadow = false;
  backpack.add(light);
  return { scene: backpack, materials };
}

/** Apenas na montagem: o osso transporta a mochila rígida durante as animações. */
export function attachBackpack(character: Object3D, backpack: Object3D): boolean {
  const spine = character.getObjectByName('mixamorig:Spine2') ?? character.getObjectByName('mixamorigSpine2');
  if (!spine) return false;
  backpack.name = 'PlayerBackpack';
  backpack.position.fromArray(BACKPACK_TRANSFORM.position);
  backpack.quaternion.fromArray(BACKPACK_TRANSFORM.quaternion).normalize();
  backpack.scale.fromArray(BACKPACK_TRANSFORM.scale);
  backpack.traverse(node => {
    const mesh = node as Mesh;
    if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; }
  });
  spine.add(backpack);
  return true;
}

export function detachBackpack(backpack: Object3D) {
  backpack.removeFromParent();
}
