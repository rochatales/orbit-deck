import { Check } from "lucide-react";
import type { CSSProperties, KeyboardEvent } from "react";
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
  onToggle?: () => void;
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
  onFocus,
  onToggle
}: DeckOrbitNodeProps) {
  const Icon = getDeckIcon(deck.iconId);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" && focused && onToggle) {
      event.preventDefault();
      onToggle();
    }
  };

  const className = [
    "orbit-node",
    focused ? "orbit-node-focused" : "",
    activated ? "orbit-node-activated" : "orbit-node-dimmed"
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
      onKeyDown={handleKeyDown}
      aria-label={`Estação ${deck.name}${activated ? " (ativa)" : ""}`}
      aria-pressed={focused}
    >
      <span className="orbit-node-base" aria-hidden="true" />
      <span className="orbit-node-glow" aria-hidden="true" />
      <span className="orbit-node-platform" aria-hidden="true">
        <Icon size={22} aria-hidden="true" />
      </span>
      {activated ? (
        <span className="orbit-node-check" aria-hidden="true">
          <Check size={11} strokeWidth={3} />
        </span>
      ) : null}
      <span className="orbit-node-label">{deck.name}</span>
    </button>
  );
}
