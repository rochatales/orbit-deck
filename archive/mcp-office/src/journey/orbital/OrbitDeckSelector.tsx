import { DECK_LIST, DECK_REGISTRY, type DeckId } from "../../domain/decks";
import { ArrowRight, X } from "lucide-react";
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
  stationName: string;
  primaryLabel: string;
  onPrimaryAction: () => void;
  entering?: boolean;
  onFocus: (id: DeckId) => void;
}

/**
 * Orquestra o "mapa orbital": cinco anéis, núcleo e cinco estações.
 * O foco é o deck que aparece no painel da direita; ativação é
 * adição/remoção da estação do player.
 */
export function OrbitDeckSelector({
  focusedDeckId,
  activatedDeckIds,
  stationName,
  primaryLabel,
  onPrimaryAction,
  entering = false,
  onFocus
}: OrbitDeckSelectorProps) {
  const focusedLayout = ORBITAL_LAYOUT[focusedDeckId];
  const focusedAccent = DECK_REGISTRY[focusedDeckId].accentColor;
  const focusedDeckActivated = activatedDeckIds.includes(focusedDeckId);

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
          active={focusedDeckActivated && ringIndex === focusedLayout.ringIndex}
          accentColor={focusedAccent}
        />
      ))}

      <OrbitCore stationName={stationName} />
      <button
        type="button"
        className={`orbit-core-action${entering ? " orbit-core-action-entering" : ""}`}
        onClick={onPrimaryAction}
        disabled={entering}
      >
        {primaryLabel}
        {primaryLabel === "Fechar mapa" ? <X size={14} /> : <ArrowRight size={14} />}
      </button>

      {DECK_LIST.map((deck) => (
        <DeckOrbitNode
          key={deck.id}
          deck={deck}
          position={getNodePosition(deck.id)}
          focused={deck.id === focusedDeckId}
          activated={activatedDeckIds.includes(deck.id)}
          onFocus={() => onFocus(deck.id)}
        />
      ))}
    </div>
  );
}
