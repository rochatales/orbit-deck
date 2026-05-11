import { Check, Plus, Sparkles, X } from "lucide-react";
import type { CSSProperties } from "react";
import { NPC_CHARACTER_ASSET_CONFIG } from "../../characters/characterAssetConfig";
import type { DeckDefinition } from "../../domain/decks";
import { getDeckIcon } from "../deckIcons";

interface SelectedDeckPanelProps {
  deck: DeckDefinition;
  activated: boolean;
  onToggle: () => void;
}

/**
 * Painel flutuante de detalhes do deck atualmente em foco.
 *
 * Mostra apenas o agente principal (responsável) do deck:
 *   Brand Brain → EDEN, Editorial → MISTER, Design → MAX,
 *   Narration → NARA, Social Media → ASTRA.
 *
 * O CTA principal é Adicionar/Remover (toggle de ativação).
 */
export function SelectedDeckPanel({ deck, activated, onToggle }: SelectedDeckPanelProps) {
  const Icon = getDeckIcon(deck.iconId);
  const primaryConfig =
    NPC_CHARACTER_ASSET_CONFIG[deck.primaryNpcId as keyof typeof NPC_CHARACTER_ASSET_CONFIG];

  const style: CSSProperties = {
    // @ts-expect-error CSS custom property
    "--deck-accent": deck.accentColor
  };

  return (
    <aside
      className={`orbit-panel${activated ? " orbit-panel-activated" : ""}`}
      style={style}
      aria-live="polite"
      aria-atomic="true"
    >
      <header className="orbit-panel-header">
        <span className="orbit-panel-icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <div className="orbit-panel-heading">
          <span className="orbit-panel-mode">
            <Sparkles size={11} aria-hidden="true" /> Estação operacional
          </span>
          <h2 className="orbit-panel-title">{deck.name}</h2>
          <p className="orbit-panel-tagline">{deck.tagline}</p>
        </div>
        {activated ? (
          <span className="orbit-panel-status-pill">
            <Check size={12} strokeWidth={3} /> Ativa
          </span>
        ) : null}
      </header>

      <p className="orbit-panel-description">{deck.description}</p>

      <section className="orbit-panel-section">
        <h3 className="orbit-panel-section-title">Agente</h3>
        <div className="orbit-panel-agent-card">
          <span className="orbit-panel-agent-dot" aria-hidden="true" />
          <div className="orbit-panel-agent-info">
            <p className="orbit-panel-agent-name">
              {primaryConfig?.name ?? deck.primaryNpcId}
            </p>
            <p className="orbit-panel-agent-zone">
              {primaryConfig?.zoneName ?? ""}
            </p>
          </div>
        </div>
      </section>

      <section className="orbit-panel-section">
        <h3 className="orbit-panel-section-title">Ferramentas necessárias</h3>
        <ul className="orbit-panel-tools">
          {deck.tools.map((toolItem) => (
            <li key={toolItem.id} className="orbit-panel-tool">
              {toolItem.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="orbit-panel-section">
        <h3 className="orbit-panel-section-title">Entregas</h3>
        <ul className="orbit-panel-outcomes">
          {deck.outcomes.map((outcome) => (
            <li key={outcome} className="orbit-panel-outcome">
              {outcome}
            </li>
          ))}
        </ul>
      </section>

      <footer className="orbit-panel-footer">
        <button
          type="button"
          className={`orbit-panel-cta${activated ? " orbit-panel-cta-secondary" : ""}`}
          onClick={onToggle}
        >
          {activated ? (
            <>
              <X size={14} /> Remover da estação
            </>
          ) : (
            <>
              <Plus size={14} strokeWidth={3} /> Adicionar à estação
            </>
          )}
        </button>
      </footer>
    </aside>
  );
}
