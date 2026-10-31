import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { Vector3, type Mesh, type Object3D } from "three";
import { RIFLE_POSE } from "../../combat/config";
import rifleUrl from "../../assets/weapons/rifle-laser-v001.glb";
import { PLAYER_COLLIDER_CENTER_Y } from "./playerConfig";

/** Ponta do cano usada pela simulação (writeRifleMuzzle), no espaço do corpo. */
const MUZZLE = {
  side: RIFLE_POSE.side,
  height: RIFLE_POSE.height - PLAYER_COLLIDER_CENTER_Y,
  forward: RIFLE_POSE.gripForward + RIFLE_POSE.barrelForward + RIFLE_POSE.barrelLength / 2
} as const;

/**
 * S6.2: rifle laser v001 (art-source/armas/rifle-laser). Só visual: o vazio `Muzzle` do GLB
 * é alinhado à ponta do cano da simulação, então tiro, clarão e traçador não mudam.
 */
function RifleModel() {
  const gltf = useGLTF(rifleUrl);
  const { scene, position } = useMemo(() => {
    const scene: Object3D = gltf.scene.clone(true);
    scene.traverse(node => {
      const mesh = node as Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
    const muzzle = scene.getObjectByName("Muzzle");
    if (!muzzle) throw new Error("Rifle sem o vazio Muzzle");
    scene.updateMatrixWorld(true);
    const m = muzzle.getWorldPosition(new Vector3());
    return { scene, position: [MUZZLE.side - m.x, MUZZLE.height - m.y, MUZZLE.forward - m.z] as const };
  }, [gltf.scene]);
  return <primitive object={scene} position={position} />;
}

/** Caixa provisória anterior: aparece enquanto o GLB carrega. */
function RiflePlaceholder() {
  return (
    <group position={[RIFLE_POSE.side, MUZZLE.height, RIFLE_POSE.gripForward]}>
      <mesh castShadow><boxGeometry args={[0.16, 0.18, 0.7]}/><meshStandardMaterial color="#243842"/></mesh>
      <mesh position={[0, 0, RIFLE_POSE.barrelForward]}><boxGeometry args={[0.08, 0.08, RIFLE_POSE.barrelLength]}/><meshStandardMaterial color="#78cddd"/></mesh>
    </group>
  );
}

export function PlayerRifle() {
  return (
    <group name="PlayerRifle">
      <Suspense fallback={<RiflePlaceholder/>}><RifleModel/></Suspense>
    </group>
  );
}
