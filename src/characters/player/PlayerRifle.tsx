import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react';
import { Mesh, type Object3D } from 'three';
import rifleAsset from '../../assets/weapons/rifle-laser-v001.glb';
import { attachRifle, detachRifle } from './rifleAttachment';

interface PlayerRifleProps {
  scene: Object3D;
  onAttached: (attached: boolean) => void;
}

function HandRifle({ scene, onAttached }: PlayerRifleProps) {
  const gltf = useGLTF(rifleAsset);
  const rifle = useMemo(() => {
    const copy = gltf.scene.clone(true);
    copy.traverse(node => { if (node instanceof Mesh) { node.castShadow = true; node.receiveShadow = true; } });
    return copy;
  }, [gltf.scene]);
  useEffect(() => {
    onAttached(attachRifle(scene, rifle));
    return () => { detachRifle(rifle); onAttached(false); };
  }, [scene, rifle, onAttached]);
  return null;
}

/** Falha ou carregamento do rifle conserva a arma provisória do PlayerModel. */
class RifleBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export function PlayerRifle(props: PlayerRifleProps) {
  return <RifleBoundary><Suspense fallback={null}><HandRifle {...props} /></Suspense></RifleBoundary>;
}
