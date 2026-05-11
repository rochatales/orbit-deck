import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { DECK_REGISTRY, type DeckId } from "../domain/decks";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { OrbitDeckSelector } from "./orbital/OrbitDeckSelector";
import { OrbitStarfield } from "./orbital/OrbitStarfield";
import { SelectedDeckPanel } from "./orbital/SelectedDeckPanel";
import { ORBITAL_CYCLE_ORDER, cycleSelectedDeck } from "./orbital/orbitalLayout";

const DEFAULT_PREVIEW_DECK: DeckId = ORBITAL_CYCLE_ORDER[0];

/**
 * Etapa 2 — seleção orbital de decks (multi-add).
 *
 * O player adiciona/remove decks à sua estação clicando em "Adicionar".
 * Quando ao menos um deck está ativo, o botão "Entrar na estação" libera
 * a entrada no escritório. Em gameplay, decks ainda inativos podem ser
 * ativados ao interagir com o agente correspondente.
 */
export function DeckSelectionScreen() {
  const profile = usePlayerJourneyStore((state) => state.profile);
  const activatedDeckIds = usePlayerJourneyStore((state) => state.activatedDeckIds);
  const toggleDeckActivation = usePlayerJourneyStore((state) => state.toggleDeckActivation);
  const enterWorkspace = usePlayerJourneyStore((state) => state.enterWorkspace);
  const signOut = usePlayerJourneyStore((state) => state.signOut);
  const persistedFocus = usePlayerJourneyStore((state) => state.selectedDeckId);

  const [focusedDeckId, setFocusedDeckId] = useState<DeckId>(
    persistedFocus ?? activatedDeckIds[0] ?? DEFAULT_PREVIEW_DECK
  );

  const greetingName = profile?.displayName ?? "Operator";
  const focusedDeck = DECK_REGISTRY[focusedDeckId];
  const focusedActivated = activatedDeckIds.includes(focusedDeckId);
  const activatedCount = activatedDeckIds.length;
  const canEnter = activatedCount >= 1;

  // Atalhos de teclado:
  // ←/→ ciclam o foco · Enter toggla ativação · Esc faz signOut
  // Espaço também toggla. Após ≥1 deck ativo, "G" entra direto.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedDeckId((current) => cycleSelectedDeck(current, 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedDeckId((current) => cycleSelectedDeck(current, -1));
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleDeckActivation(focusedDeckId);
      } else if (event.key === "Escape") {
        event.preventDefault();
        signOut();
      } else if ((event.key === "g" || event.key === "G") && canEnter) {
        event.preventDefault();
        enterWorkspace();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusedDeckId, toggleDeckActivation, signOut, enterWorkspace, canEnter]);

  return (
    <div className="journey-stage journey-stage-decks orbit-stage">
      <OrbitStarfield />

      <header className="orbit-header">
        <div>
          <p className="orbit-kicker">ETAPA 2 · MODO OPERACIONAL</p>
          <h1 className="orbit-title">Olá, {greetingName}.</h1>
          <p className="orbit-subtitle">Escolha uma órbita para iniciar.</p>
          <p className="orbit-helper">
            Cada deck é uma estação operacional com seus próprios agentes e ferramentas.
            Adicione um ou mais decks para começar — você pode ativar outros depois,
            interagindo com os agentes no gameplay.
          </p>
        </div>
        <button type="button" className="orbit-ghost-button" onClick={signOut}>
          Sair
        </button>
      </header>

      <div className="orbit-layout">
        <OrbitDeckSelector
          focusedDeckId={focusedDeckId}
          activatedDeckIds={activatedDeckIds}
          onFocus={setFocusedDeckId}
          onToggle={toggleDeckActivation}
        />
        <SelectedDeckPanel
          deck={focusedDeck}
          activated={focusedActivated}
          onToggle={() => toggleDeckActivation(focusedDeckId)}
        />
      </div>

      <footer className="orbit-footer">
        <p className="orbit-hint">
          {activatedCount === 0
            ? "Selecione uma estação orbital e clique em Adicionar para começar."
            : activatedCount === 1
            ? "1 deck na estação. Adicione mais ou entre quando quiser."
            : `${activatedCount} decks na estação. Pronto para entrar.`}
        </p>
        <button
          type="button"
          className="orbit-enter-button"
          onClick={enterWorkspace}
          disabled={!canEnter}
          title={
            canEnter
              ? "Entrar na estação com os decks selecionados"
              : "Adicione ao menos um deck para liberar a entrada"
          }
        >
          Entrar na estação <ArrowRight size={14} />
        </button>
      </footer>
    </div>
  );
}
