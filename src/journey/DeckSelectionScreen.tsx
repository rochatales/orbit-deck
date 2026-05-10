import { ArrowRight, Sparkles } from "lucide-react";
import { NPC_CHARACTER_ASSET_CONFIG } from "../characters/characterAssetConfig";
import {
  DECK_LIST,
  getDeckAgentIds,
  type DeckDefinition
} from "../domain/decks";
import type { NpcId } from "../domain/mcpActions";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { getDeckIcon } from "./deckIcons";

interface DeckAgent {
  npcId: NpcId;
  name: string;
  zoneName: string;
  isPrimary: boolean;
}

function resolveAgents(deck: DeckDefinition): DeckAgent[] {
  return getDeckAgentIds(deck).map((npcId) => {
    // Os NpcId são os mesmos chaves do registro de assets dos NPCs do escritório.
    const config = NPC_CHARACTER_ASSET_CONFIG[npcId as keyof typeof NPC_CHARACTER_ASSET_CONFIG];
    return {
      npcId,
      name: config?.name ?? npcId,
      zoneName: config?.zoneName ?? "",
      isPrimary: npcId === deck.primaryNpcId
    };
  });
}

export function DeckSelectionScreen() {
  const profile = usePlayerJourneyStore((state) => state.profile);
  const selectDeck = usePlayerJourneyStore((state) => state.selectDeck);
  const signOut = usePlayerJourneyStore((state) => state.signOut);

  const greetingName = profile?.displayName ?? "Operator";

  return (
    <div className="journey-stage journey-stage-decks">
      <header className="journey-decks-header">
        <div>
          <p className="journey-kicker">Etapa 2 · Modo operacional</p>
          <h1 className="journey-title">Olá, {greetingName}.</h1>
          <p className="journey-subtitle">Escolha um deck para começar.</p>
          <p className="journey-helper">
            Cada deck é um <strong>modo operacional</strong> com seus próprios agentes e ferramentas.
            Você escolhe o modo aqui — só depois entra no escritório com tudo já preparado.
          </p>
        </div>
        <button type="button" className="journey-ghost-button" onClick={signOut}>
          Sair
        </button>
      </header>

      <ul className="deck-grid" role="list">
        {DECK_LIST.map((deck) => {
          const Icon = getDeckIcon(deck.iconId);
          const agents = resolveAgents(deck);
          return (
            <li key={deck.id} className="deck-card-wrapper">
              <button
                type="button"
                className="deck-card"
                onClick={() => selectDeck(deck.id)}
                style={{
                  // @ts-expect-error CSS custom property
                  "--deck-accent": deck.accentColor
                }}
                aria-label={`Abrir ${deck.name}`}
              >
                <span className="deck-card-accent" aria-hidden="true" />

                <header className="deck-card-header">
                  <span className="deck-card-icon" aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <div className="deck-card-heading">
                    <span className="deck-card-mode">
                      <Sparkles size={11} /> Modo operacional
                    </span>
                    <h2 className="deck-card-title">{deck.name}</h2>
                    <p className="deck-card-tagline">{deck.tagline}</p>
                  </div>
                </header>

                <p className="deck-card-description">{deck.description}</p>

                <section className="deck-card-section">
                  <h3 className="deck-card-section-title">Agentes</h3>
                  <ul className="deck-agents">
                    {agents.map((agent) => (
                      <li
                        key={agent.npcId}
                        className={`deck-agent${agent.isPrimary ? " deck-agent-primary" : ""}`}
                      >
                        <span className="deck-agent-bullet" aria-hidden="true" />
                        <span className="deck-agent-name">{agent.name}</span>
                        <span className="deck-agent-role">{agent.zoneName}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="deck-card-section">
                  <h3 className="deck-card-section-title">Ferramentas necessárias</h3>
                  <ul className="deck-card-tools">
                    {deck.tools.map((toolItem) => (
                      <li key={toolItem.id} className="deck-card-tool">
                        {toolItem.label}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="deck-card-section">
                  <h3 className="deck-card-section-title">Entregas</h3>
                  <ul className="deck-outcomes">
                    {deck.outcomes.map((outcome) => (
                      <li key={outcome} className="deck-outcome">
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </section>

                <footer className="deck-card-footer">
                  <span className="deck-card-cta">
                    Abrir deck <ArrowRight size={14} />
                  </span>
                </footer>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
