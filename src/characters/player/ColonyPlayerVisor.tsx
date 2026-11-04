import { useEffect } from 'react';
import type { Object3D } from 'three';
import { createColonyVisor } from './colonyVisorAttachment';

export function ColonyPlayerVisor({ scene, illuminated = true }: { scene: Object3D; illuminated?: boolean }) {
  useEffect(() => {
    const visor = createColonyVisor(scene, illuminated);
    if (!visor) return;
    visor.head.add(visor.group);
    return visor.dispose;
  }, [scene, illuminated]);
  return null;
}
