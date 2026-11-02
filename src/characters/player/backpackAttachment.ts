import { PointLight, type Mesh, type Object3D } from 'three';
import { BACKPACK_LIGHT } from '../../scene/lightingConfig';

/** Encaixe no Spine2, medido no Idle do astronauta v007. Compensa a escala do rig.
 * No espaço do personagem: centro (0; 0,80; -0,134), frente da mochila em -0,112 m. */
export const BACKPACK_TRANSFORM = {
  position: [-0.033206232505322786, -0.060893083979673024, -0.05718074044161536],
  quaternion: [-0.16821674154672414, 0.1683221972742959, -0.02122256794554227, 0.9710408680447891],
  scale: [0.6091301360096101, 0.6091299448734547, 0.6091299905071628]
} as const;

/** Uma luz por instância; acompanha o osso pela hierarquia, sem trabalho por quadro. */
export function createBackpackVisual(source: Object3D): Object3D {
  const backpack = source.clone(true);
  const light = new PointLight(BACKPACK_LIGHT.color, BACKPACK_LIGHT.intensity, BACKPACK_LIGHT.reach, BACKPACK_LIGHT.decay);
  light.name = 'BackpackNeonLight';
  light.position.fromArray(BACKPACK_LIGHT.position);
  light.castShadow = false;
  backpack.add(light);
  return backpack;
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
