import type { ReactNode } from "react";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { LoginScreen } from "./LoginScreen";
import { DeckSelectionScreen } from "./DeckSelectionScreen";
import { DeckConnectionScreen } from "./DeckConnectionScreen";

interface JourneyRouterProps {
  /** Conteúdo renderizado durante o estágio `workspace` (cena 3D + HUDs). */
  workspace: ReactNode;
}

/**
 * Roteador da jornada do player.
 *
 * Escolhe a superfície a renderizar com base em `usePlayerJourneyStore.stage`.
 * O office runtime (GameCanvas, HUD, TaskPanel, WorkflowStatusLog) só monta
 * quando o estágio é `workspace`, evitando que o player caia direto no mundo.
 */
export function JourneyRouter({ workspace }: JourneyRouterProps) {
  const stage = usePlayerJourneyStore((state) => state.stage);

  switch (stage) {
    case "login":
      return <LoginScreen />;
    case "deck-selection":
      return <DeckSelectionScreen />;
    case "deck-connection":
      return <DeckConnectionScreen />;
    case "workspace":
      return <>{workspace}</>;
    default:
      return <LoginScreen />;
  }
}
