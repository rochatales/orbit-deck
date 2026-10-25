import { EDEN, MAPS, near, type Point } from '../game/config';
import type { MapId } from '../game/session';
import { useGameStore } from './useGameStore';

/** Distância para o aviso e a interação de embarque (antes repetida em App e na store). */
export const SHIP_INTERACTION_RADIUS = 2.7;

/**
 * Posição frequente do player, fora do React. Um único objeto mutado no lugar:
 * escrito pelo controller a cada frame e lido por câmera, mira, combate e mapa
 * dentro de `useFrame`. Nunca é substituído, então leitores podem guardar a referência
 * só para leitura; quem precisar de um instante fixo copia os campos.
 */
export const playerPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0.8 };

/** Rumo real suavizado do corpo, fora do React; resetado junto da posição. */
export const playerFacing = { angle: 0 };

export function writePlayerPosition(x: number, y: number, z: number) {
    playerPosition.x = x;
    playerPosition.y = y;
    playerPosition.z = z;
}

/** Reposição explícita (spawn, viagem, retry): vale já para o próximo leitor. */
export function placePlayer(spawn: Point) {
    writePlayerPosition(spawn.x, spawn.y, spawn.z);
    playerFacing.angle = 0;
}

export function isNearEden(map: MapId, p: Point = playerPosition) {
    return map === 'mars' && near(p, EDEN.position, EDEN.interactionRadius);
}

export function isNearShip(map: MapId, p: Point = playerPosition) {
    return near(p, MAPS[map].exit, SHIP_INTERACTION_RADIUS);
}

/**
 * Passo por frame do controller: grava a posição e publica a proximidade.
 * Sem alocação; a store só notifica quando a condição de interação muda.
 */
export function publishPlayerFrame(x: number, y: number, z: number, map: MapId, facingAngle = 0) {
    playerFacing.angle = facingAngle;
    writePlayerPosition(x, y, z);
    useGameStore.getState().setProximity(isNearEden(map), isNearShip(map));
}
