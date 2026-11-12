import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import type { CharacterInteriorLight } from '../../scene/marsColony/colonyPower';
import type { Object3D } from 'three';
import backpackAsset from '../../assets/characters/player/backpack.glb';
import { attachBackpack, detachBackpack, createBackpackVisual } from './backpackAttachment';

interface PlayerBackpackProps {
  scene: Object3D;
  illuminated?: boolean;
  interiorLight?: CharacterInteriorLight | null;
}

function Backpack({ scene, illuminated = true, interiorLight }: PlayerBackpackProps) {
  const gltf = useGLTF(backpackAsset);
  // Malha rígida: só o material das listras é privado; os demais recursos vêm do cache.
  const prepared = useMemo(() => createBackpackVisual(gltf.scene, illuminated), [gltf.scene, illuminated]);
  const backpack = prepared.scene;
  useEffect(() => interiorLight?.bind(backpack, true), [interiorLight, backpack]);
  useEffect(() => () => { prepared.materials.forEach(material => material.dispose()); }, [prepared]);
  useEffect(() => {
    attachBackpack(scene, backpack);
    return () => detachBackpack(backpack);
  }, [scene, backpack]);
  return null;
}

class BackpackBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export function PlayerBackpack(props: PlayerBackpackProps) {
  return <BackpackBoundary><Suspense fallback={null}><Backpack {...props} /></Suspense></BackpackBoundary>;
}
