import type { Object3D } from 'three';

/** Confere o GLB do jogador selecionado e a figura carregada da EDEN atual. */
export function perfCharactersReady(scene: Object3D, map: string, playerName: string): boolean {
  return scene.getObjectByName(playerName) !== undefined
    && (map !== 'mars' || scene.getObjectByName('EdenFigura') !== undefined);
}
