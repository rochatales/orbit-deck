import { useEffect } from 'react';
import type { Object3D } from 'three';
import { createColonyVisor } from './colonyVisorAttachment';

export function ColonyPlayerVisor({ scene }: { scene: Object3D }) {
  useEffect(() => {
    const visor = createColonyVisor(scene);
    if (!visor) return;
    visor.head.add(visor.group);
    return visor.dispose;
  }, [scene]);
  return null;
}
