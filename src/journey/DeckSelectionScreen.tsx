import { useEffect, useRef, useState } from "react";
import { DECK_REGISTRY, type DeckId } from "../domain/decks";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { OrbitDeckSelector } from "./orbital/OrbitDeckSelector";
import { OrbitStarfield } from "./orbital/OrbitStarfield";
import { SelectedDeckPanel } from "./orbital/SelectedDeckPanel";
import { ORBITAL_CYCLE_ORDER, cycleSelectedDeck } from "./orbital/orbitalLayout";

const DEFAULT_PREVIEW_DECK: DeckId = ORBITAL_CYCLE_ORDER[0];

interface DeckSelectionScreenProps {
  mode?: "stage" | "overlay";
  onRequestClose?: () => void;
}

/**
 * Etapa 2 — mapa orbital de referência.
 *
 * A tela não ativa mais decks diretamente: ela apresenta as estações,
 * mostra o status de cada uma e leva o player para o escritório, onde
 * a ativação acontece ao interagir com o agente principal.
 */
export function DeckSelectionScreen({
  mode = "stage",
  onRequestClose
}: DeckSelectionScreenProps) {
  const profile = usePlayerJourneyStore((state) => state.profile);
  const activatedDeckIds = usePlayerJourneyStore((state) => state.activatedDeckIds);
  const enterWorkspace = usePlayerJourneyStore((state) => state.enterWorkspace);
  const signOut = usePlayerJourneyStore((state) => state.signOut);
  const selectedDeckId = usePlayerJourneyStore((state) => state.selectedDeckId);
  const focusDeck = usePlayerJourneyStore((state) => state.focusDeck);
  const firstTimeOrbitalShown = usePlayerJourneyStore((state) => state.firstTimeOrbitalShown);
  const markOrbitalIntroSeen = usePlayerJourneyStore((state) => state.markOrbitalIntroSeen);

  const focusedDeckId = selectedDeckId ?? activatedDeckIds[0] ?? DEFAULT_PREVIEW_DECK;
  const isOverlay = mode === "overlay";
  const greetingName = profile?.displayName ?? "Operator";
  const stationName = profile?.displayName?.trim() || "Sua Estacao";
  const focusedDeck = DECK_REGISTRY[focusedDeckId];
  const focusedActivated = activatedDeckIds.includes(focusedDeckId);
  const [isEntering, setIsEntering] = useState(false);
  const enterTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedDeckId) {
      focusDeck(focusedDeckId);
    }
  }, [focusDeck, focusedDeckId, selectedDeckId]);

  useEffect(() => {
    return () => {
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current);
      }
    };
  }, []);

  const handlePrimaryAction = () => {
    if (isEntering) {
      return;
    }

    setIsEntering(true);

    if (!firstTimeOrbitalShown && !isOverlay) {
      markOrbitalIntroSeen();
    }
    enterTimerRef.current = window.setTimeout(() => {
      if (isOverlay) {
        onRequestClose?.();
        return;
      }
      enterWorkspace();
    }, 850);
  };

  const handleEscape = () => {
    if (isOverlay) {
      onRequestClose?.();
      return;
    }
    signOut();
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        focusDeck(cycleSelectedDeck(focusedDeckId, 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        focusDeck(cycleSelectedDeck(focusedDeckId, -1));
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleEscape();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusDeck, focusedDeckId, isOverlay, onRequestClose, signOut]);

  const kicker = isOverlay
    ? "MAPA ORBITAL · REFERÊNCIA"
    : "ETAPA 2 · MAPA ORBITAL";
  const title = isOverlay
    ? "Mapa orbital."
    : !firstTimeOrbitalShown
    ? "Bem-vindo ao mapa orbital."
    : `Olá, ${greetingName}.`;
  const subtitle = isOverlay
    ? "Consulte as estações e acompanhe o progresso ao vivo."
    : !firstTimeOrbitalShown
    ? "Cinco estações esperam — ative cada uma no escritório."
    : "As estações ganham vida quando você encontra seus agentes no escritório.";
  const helper = isOverlay
    ? "As estações ativas aparecem com a cor de cada deck. As inativas seguem como descoberta até você chegar ao agente correspondente."
    : "Este mapa apresenta as estações disponíveis. Nenhum deck é ativado aqui: a ligação acontece dentro do escritório, ao se aproximar de cada agente.";
  const footerHint = "Os decks são ativados no escritório, ao se aproximar do agente responsável.";
  const primaryLabel = "ENTRAR";

  return (
    <div
      className={`journey-stage journey-stage-decks orbit-stage${isOverlay ? " orbit-stage-overlay-panel" : ""}${isEntering ? " orbit-stage-entering" : ""}`}
    >
      <OrbitStarfield />
      {!isOverlay && isEntering ? (
        <div className="orbit-enter-transition" aria-hidden="true">
          <span className="orbit-enter-vignette" />
          <span className="orbit-enter-bloom" />
        </div>
      ) : null}

      <header className="orbit-header">
        <div>
          <p className="orbit-kicker">{kicker}</p>
          <h1 className="orbit-title">{title}</h1>
          <p className="orbit-subtitle">{subtitle}</p>
          <p className="orbit-helper">{helper}</p>
        </div>
        <button
          type="button"
          className="orbit-ghost-button"
          onClick={isOverlay ? onRequestClose : signOut}
        >
          {isOverlay ? "Fechar" : "Sair"}
        </button>
      </header>

      <div className="orbit-layout">
        <OrbitDeckSelector
          focusedDeckId={focusedDeckId}
          activatedDeckIds={activatedDeckIds}
          stationName={stationName}
          primaryLabel={primaryLabel}
          onPrimaryAction={handlePrimaryAction}
          entering={isEntering}
          onFocus={focusDeck}
        />
        <SelectedDeckPanel
          deck={focusedDeck}
          activated={focusedActivated}
        />
      </div>

      <footer className="orbit-footer">
        <p className="orbit-hint">{footerHint}</p>
      </footer>
    </div>
  );
}
