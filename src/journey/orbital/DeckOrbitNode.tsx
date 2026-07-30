import type { CSSProperties } from "react";
import type { DeckDefinition } from "../../domain/decks";
import { getDeckIcon } from "../deckIcons";

interface DeckOrbitNodeProps {
  deck: DeckDefinition;
  position: { left: string; top: string };
  /** Está em foco no painel direito (preview). */
  focused: boolean;
  /** Foi adicionado à estação do player (acende o ícone). */
  activated: boolean;
  onFocus: () => void;
}

/**
 * Estação orbital de um deck.
 *
 * - Click → coloca o deck em foco (atualiza o painel da direita).
 * - Enter (com foco) → toggle de ativação.
 * - Hover → também coloca em foco, sem persistir nada.
 *
 * O estado "ativado" mantém a estação acesa mesmo quando outro deck
 * está em foco; ícones desativados ficam dimmados.
 */
export function DeckOrbitNode({
  deck,
  position,
  focused,
  activated,
  onFocus
}: DeckOrbitNodeProps) {
  const Icon = getDeckIcon(deck.iconId);

  const className = [
    "orbit-node",
    focused ? "orbit-node-selected" : "",
    activated ? "orbit-node-activated" : "orbit-node-discovered"
  ]
    .filter(Boolean)
    .join(" ");

  const style: CSSProperties = {
    left: position.left,
    top: position.top,
    // @ts-expect-error CSS custom property
    "--deck-accent": deck.accentColor
  };

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onFocus}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      aria-label={`Estação ${deck.name}${activated ? " ativa" : " inativa"}`}
      aria-pressed={focused}
    >
      <span className="orbit-node-base" aria-hidden="true" />
      <span className="orbit-node-glow" aria-hidden="true" />
      <span className="orbit-node-platform" aria-hidden="true">
        <Icon size={22} aria-hidden="true" />
      </span>
      <span className="orbit-node-label">
        <span className="orbit-node-name">{deck.name}</span>
        <span className={`orbit-node-state${activated ? " orbit-node-state-active" : ""}`}>
          {activated ? "ATIVA" : "INATIVA"}
        </span>
      </span>
    </button>
  );
}
