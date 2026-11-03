import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import type { Object3D } from 'three';
import backpackAsset from '../../assets/characters/player/backpack.glb';
import { attachBackpack, detachBackpack, createBackpackVisual } from './backpackAttachment';

function Backpack({ scene, illuminated }: { scene: Object3D; illuminated: boolean }) {
  const gltf = useGLTF(backpackAsset);
  // Malha rígida: só o material das listras é privado; os demais recursos vêm do cache.
  const prepared = useMemo(() => createBackpackVisual(gltf.scene, illuminated), [gltf.scene, illuminated]);
  const backpack = prepared.scene;
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

export function PlayerBackpack({ scene, illuminated = true }: { scene: Object3D; illuminated?: boolean }) {
  return <BackpackBoundary><Suspense fallback={null}><Backpack scene={scene} illuminated={illuminated} /></Suspense></BackpackBoundary>;
}
