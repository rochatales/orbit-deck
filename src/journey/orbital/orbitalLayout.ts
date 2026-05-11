import type { DeckId } from "../../domain/decks";

/**
 * Layout polar dos nodes orbitais.
 *
 * `angleDeg` é medido em sentido horário a partir do norte (12 horas).
 * `ringIndex` 1..5 escolhe um dos cinco anéis concêntricos (1 = mais
 * interno, 5 = mais externo).
 */
export interface OrbitalNodePosition {
  angleDeg: number;
  ringIndex: 1 | 2 | 3 | 4 | 5;
}

export const ORBITAL_LAYOUT: Record<DeckId, OrbitalNodePosition> = {
  "brand-brain": { angleDeg: 315, ringIndex: 3 },   // upper-left
  editorial: { angleDeg: 225, ringIndex: 4 },       // lower-left
  design: { angleDeg: 45, ringIndex: 2 },           // upper-right
  narration: { angleDeg: 180, ringIndex: 1 },       // lower-center
  "social-media": { angleDeg: 135, ringIndex: 5 }   // lower-right
};

/**
 * Ordem de ciclo para navegação por teclado.
 * Definida no sentido horário começando pelo NW.
 */
export const ORBITAL_CYCLE_ORDER: DeckId[] = [
  "brand-brain",
  "design",
  "social-media",
  "narration",
  "editorial"
];

/** Raios de cada anel como fração do raio máximo do contêiner. */
export const ORBITAL_RING_RADII: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0.22,
  2: 0.30,
  3: 0.38,
  4: 0.45,
  5: 0.5
};

/**
 * Converte coordenadas polares (ângulo em graus, raio normalizado 0..1)
 * em posição CSS (left%, top%) dentro de um contêiner quadrado.
 */
export function polarToPercent(
  angleDeg: number,
  radius: number
): { left: string; top: string } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const x = 0.5 + Math.sin(angleRad) * radius;
  // y de tela cresce para baixo, e cos(0)=1 (norte). Subtraímos para inverter.
  const y = 0.5 - Math.cos(angleRad) * radius;
  return {
    left: `${(x * 100).toFixed(2)}%`,
    top: `${(y * 100).toFixed(2)}%`
  };
}

export function getNodePosition(deckId: DeckId): { left: string; top: string } {
  const layout = ORBITAL_LAYOUT[deckId];
  const radius = ORBITAL_RING_RADII[layout.ringIndex];
  return polarToPercent(layout.angleDeg, radius);
}

/** Navegação cíclica por teclado. `delta` = +1 (próximo) ou -1 (anterior). */
export function cycleSelectedDeck(currentId: DeckId, delta: 1 | -1): DeckId {
  const idx = ORBITAL_CYCLE_ORDER.indexOf(currentId);
  if (idx === -1) return ORBITAL_CYCLE_ORDER[0];
  const nextIdx = (idx + delta + ORBITAL_CYCLE_ORDER.length) % ORBITAL_CYCLE_ORDER.length;
  return ORBITAL_CYCLE_ORDER[nextIdx];
}
