/**
 * Movimento pela mira (S2.12, contrato do autor de 07/10/2026; regra 4 do AGENTS.md):
 * - W corre na direção do cursor; S recua com o corpo voltado ao cursor; A/D não deslocam;
 * - W + S juntos (ou nenhum) = parado;
 * - a mesma direção horizontal orienta o corpo e o deslocamento.
 * Funções puras, sem alocação no caminho do passo de física (recebem e devolvem números
 * ou escrevem num objeto de saída reaproveitado).
 * O personagem olha ao longo de +Z local: ângulo a → frente (sin a, cos a).
 */

/** +1 avança (W), −1 recua (S), 0 parado (nenhum ou os dois). A/D não entram. */
export function aimInput(forward: boolean, backward: boolean): -1 | 0 | 1 {
    if (forward === backward) return 0;
    return forward ? 1 : -1;
}

/**
 * Direção de mira estável. Atualiza o ângulo só quando o cursor está a pelo menos
 * `minDistance` do player; mais perto (ou sem mira válida) mantém a última direção válida,
 * sem tremor quando o cursor passa sobre o personagem.
 */
export function updateAimAngle(lastAngle: number, playerX: number, playerZ: number, aimX: number, aimZ: number, aimValid: boolean, minDistance: number): number {
    if (!aimValid) return lastAngle;
    const dx = aimX - playerX, dz = aimZ - playerZ;
    if (dx * dx + dz * dz < minDistance * minDistance) return lastAngle;
    return Math.atan2(dx, dz);
}

/** Vetor de deslocamento unitário (ou nulo) ao longo da direção de mira. */
export function aimMotion(angle: number, input: -1 | 0 | 1, out: { x: number; z: number }) {
    out.x = Math.sin(angle) * input;
    out.z = Math.cos(angle) * input;
    return out;
}

export type LocomotionKind = 'idle' | 'run' | 'backward';

/**
 * Estado de locomoção pela velocidade real (depois das colisões), não pela tecla:
 * contra uma parede a velocidade real cai e o estado volta a Idle. Histerese entre
 * `startSpeed` e `stopSpeed` evita alternância perto do limite. O sentido vem da projeção
 * da velocidade na direção do corpo: para trás = Backward, sem girar o corpo.
 */
export function locomotionKind(previous: LocomotionKind, alongFacing: number, planarSpeed: number, startSpeed: number, stopSpeed: number): LocomotionKind {
    const moving = previous === 'idle' ? planarSpeed >= startSpeed : planarSpeed >= stopSpeed;
    if (!moving) return 'idle';
    return alongFacing >= 0 ? 'run' : 'backward';
}

/** Taxa de reprodução do ciclo in-place para a velocidade real (pé de apoio sem deslizar). */
export function playbackRate(planarSpeed: number, referenceSpeed: number, limits: readonly [number, number]): number {
    return Math.min(limits[1], Math.max(limits[0], planarSpeed / referenceSpeed));
}
