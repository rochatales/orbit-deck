import { useEffect } from "react";
import { GameCanvas } from "./GameCanvas";
import { HUD } from "../ui/HUD";
import { NotificationStack } from "../ui/NotificationStack";
import { TaskPanel } from "../ui/TaskPanel";
import { WorkflowStatusLog } from "../ui/WorkflowStatusLog";
import { useWorkflowStore } from "../state/useWorkflowStore";
import { useClientSessionStore } from "../state/useClientSessionStore";
import { JourneyRouter } from "../journey/JourneyRouter";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";

/**
 * Office runtime — preservado integralmente da versão anterior do App.
 *
 * Só monta durante o estágio `workspace` da jornada. Toda a cena 3D,
 * HUD e painéis continuam aqui, intactos.
 */
function WorkspaceRuntime() {
  const bootstrap = useWorkflowStore((state) => state.bootstrap);
  const loadClientsFromApi = useClientSessionStore((state) => state.loadClientsFromApi);

  useEffect(() => {
    bootstrap();
    loadClientsFromApi();
  }, [bootstrap, loadClientsFromApi]);

  return (
    <div className="app-shell">
      <GameCanvas />
      <HUD />
      <NotificationStack />
      <TaskPanel />
      <WorkflowStatusLog />
    </div>
  );
}

export function App() {
  const stage = usePlayerJourneyStore((state) => state.stage);

  // Camada de produto. O escritório 3D só entra em cena quando o player
  // chega ao estágio `workspace`. Antes disso ele passa por login,
  // seleção de deck e conexão.
  return (
    <div className={`journey-shell journey-shell-${stage}`}>
      <JourneyRouter workspace={<WorkspaceRuntime />} />
    </div>
  );
}
