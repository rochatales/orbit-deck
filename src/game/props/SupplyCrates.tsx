import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Color, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, PointLight } from 'three';
import type { SupplyCrate } from '../../combat/simulation';
import { SUPPLY_CRATE, revealIntensity } from './supplyCrate';
import { createLockerRig } from './lockerRig';
import crateUrl from '../../assets/props/shanghai/emergency-locker.glb';
import { crateSeat, impactChunks, impactScarGeometry, chunkGeometry, stripCratePlate } from './crateImpact';
import { createImpactTexture } from './crateImpactTexture';

const SIDEWALK = new Color('#8d887b'), ASPHALT = new Color('#35383b');
/** Uma malha para as sete cicatrizes e uma instanciada para as placas: 2 draw calls no total. */
function createImpactVisual(crates: SupplyCrate[], height: (x: number, z: number) => number) {
  const texture = createImpactTexture();
  const scarMaterial = new MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const scar = new Mesh(impactScarGeometry(crates, height), scarMaterial);
  scar.name = 'SupplyCrateImpactScars'; scar.receiveShadow = true; scar.renderOrder = 1;
  const chunks = crates.flatMap(c => impactChunks(c, height));
  const chunkMaterial = new MeshStandardMaterial({ roughness: .95, flatShading: true });
  const pieces = new InstancedMesh(chunkGeometry(), chunkMaterial, chunks.length);
  pieces.name = 'SupplyCrateImpactChunks'; pieces.castShadow = true; pieces.receiveShadow = true;
  const dummy = new Object3D(), tint = new Color();
  chunks.forEach((c, i) => {
    dummy.position.set(c.x, c.y, c.z); dummy.rotation.set(c.tilt, c.yaw, c.roll, 'YXZ'); dummy.scale.set(c.w, c.h, c.d);
    dummy.updateMatrix(); pieces.setMatrixAt(i, dummy.matrix);
    pieces.setColorAt(i, tint.copy(c.sidewalk ? SIDEWALK : ASPHALT).multiplyScalar(.88 + ((i * 37) % 10) / 40));
  });
  return { scar, pieces, dispose() { scar.geometry.dispose(); scarMaterial.dispose(); texture.dispose(); pieces.geometry.dispose(); chunkMaterial.dispose(); pieces.dispose(); } };
}

/** Geometria/texturas compartilhadas; porta por instância, um único foco de revelação. */
export function SupplyCrates({ crates, surfaceHeight }: { crates: SupplyCrate[]; surfaceHeight?: (x: number, z: number) => number }) {
  const asset = useGLTF(crateUrl);
  const rigs = useMemo(() => crates.map(crate => {
    // Caiu do alto: sem a chapa, a cabine entra no piso mais baixo e pende para fora do meio-fio.
    const seat = crateSeat(crate, surfaceHeight ?? (() => 0)), rig = createLockerRig(asset.scene, asset.animations, crate, seat.y);
    rig.root.rotation.set(seat.tiltX, crate.angle ?? 0, seat.tiltZ, 'XZY');
    stripCratePlate(rig.root.children[0]);
    return rig;
  }), [asset, crates, surfaceHeight]);
  const impact = useMemo(() => createImpactVisual(crates, surfaceHeight ?? (() => 0)), [crates, surfaceHeight]);
  useEffect(() => () => impact.dispose(), [impact]);
  const light = useMemo(() => { const value = new PointLight(SUPPLY_CRATE.neon, 0, 5, 2); value.castShadow = false; return value; }, []);
  useEffect(() => () => { rigs.forEach(rig => rig.dispose()); light.dispose(); }, [rigs, light]);
  useFrame(() => {
    let brightest = 0;
    for (let i = 0; i < rigs.length; i++) {
      rigs[i].update();
      const value = crates[i].phase === 'opening' ? revealIntensity(crates[i]) * .15 : 0;
      if (value > brightest) { brightest = value; light.position.set(rigs[i].root.position.x, rigs[i].root.position.y + 1.1, rigs[i].root.position.z); }
    }
    light.intensity = brightest; light.visible = brightest > 0;
  });
  return <><primitive object={light} dispose={null}/><primitive object={impact.scar} dispose={null}/><primitive object={impact.pieces} dispose={null}/>{rigs.map(rig => <primitive key={rig.root.name} object={rig.root} dispose={null}/>)}</>;
}
