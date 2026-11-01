import type { Object3D } from 'three';

/** Transform glTF Y-up → glTF Y-up medido em Aim_Rifle q1 (não o quaternion Blender). */
export const RIFLE_HAND_TRANSFORM = {
  position: [0, 0.07612, -0.00278],
  quaternion: [-0.37602, -0.54122, -0.48260, 0.57688],
  scale: [0.60913, 0.60913, 0.60913]
} as const;

/** Executado só ao carregar/trocar a cena. Geometria e materiais do cache permanecem compartilhados. */
export function attachRifle(character: Object3D, rifle: Object3D): boolean {
  const hand = character.getObjectByName('mixamorig:RightHand') ?? character.getObjectByName('mixamorigRightHand');
  if (!hand) return false;
  rifle.name = 'RifleLaser';
  rifle.position.fromArray(RIFLE_HAND_TRANSFORM.position);
  rifle.quaternion.fromArray(RIFLE_HAND_TRANSFORM.quaternion).normalize();
  rifle.scale.fromArray(RIFLE_HAND_TRANSFORM.scale);
  hand.add(rifle);
  return true;
}

export function detachRifle(rifle: Object3D) {
  rifle.removeFromParent();
}
