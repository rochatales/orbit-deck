import { DECK_LIST, DECK_REGISTRY, type DeckId } from "../../domain/decks";
import { DeckOrbitNode } from "./DeckOrbitNode";
import { OrbitCore } from "./OrbitCore";
import { OrbitRing } from "./OrbitRing";
import {
  ORBITAL_LAYOUT,
  ORBITAL_RING_RADII,
  getNodePosition
} from "./orbitalLayout";

interface OrbitDeckSelectorProps {
  focusedDeckId: DeckId;
  activatedDeckIds: DeckId[];
  onFocus: (id: DeckId) => void;
  onToggle: (id: DeckId) => void;
}

/**
 * Orquestra o "mapa orbital": cinco anéis, núcleo e cinco estações.
 * O foco é o deck que aparece no painel da direita; ativação é
 * adição/remoção da estação do player.
 */
export function OrbitDeckSelector({
  focusedDeckId,
  activatedDeckIds,
  onFocus,
  onToggle
}: OrbitDeckSelectorProps) {
  const focusedLayout = ORBITAL_LAYOUT[focusedDeckId];
  const focusedAccent = DECK_REGISTRY[focusedDeckId].accentColor;

  return (
    <div
      className="orbit-stage-canvas"
      role="radiogroup"
      aria-label="Estações orbitais de deck"
    >
      {([1, 2, 3, 4, 5] as const).map((ringIndex) => (
        <OrbitRing
          key={ringIndex}
          sizePercent={ORBITAL_RING_RADII[ringIndex] * 200}
          active={ringIndex === focusedLayout.ringIndex}
          accentColor={focusedAccent}
        />
      ))}

      <OrbitCore />

      {DECK_LIST.map((deck) => (
        <DeckOrbitNode
          key={deck.id}
          deck={deck}
          position={getNodePosition(deck.id)}
          focused={deck.id === focusedDeckId}
          activated={activatedDeckIds.includes(deck.id)}
          onFocus={() => onFocus(deck.id)}
          onToggle={() => onToggle(deck.id)}
        />
      ))}
    </div>
  );
}
