import { useEffect } from "react";
import { GameCanvas } from "./GameCanvas";
import { HUD } from "../ui/HUD";
import { NotificationStack } from "../ui/NotificationStack";
import { TaskPanel } from "../ui/TaskPanel";
import { WorkflowStatusLog } from "../ui/WorkflowStatusLog";
import { SmartLabOverlay } from "../ui/SmartLabOverlay";
import { ClientSetupWizard } from "../onboarding/ClientSetupWizard";
import { useWorkflowStore } from "../state/useWorkflowStore";
import { useClientSessionStore } from "../state/useClientSessionStore";
import { JourneyRouter } from "../journey/JourneyRouter";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { useDialogueStore } from "../state/useDialogueStore";
import { useClientSetupStore } from "../state/useClientSetupStore";
import { OrbitalMapOverlay } from "../journey/OrbitalMapOverlay";
import { BrandBrainInteractionScene } from "../interactions/brandBrain/BrandBrainInteractionScene";

/**
 * Office runtime — preservado integralmente da versão anterior do App.
 *
 * Só monta durante o estágio `workspace` da jornada. Toda a cena 3D,
 * HUD e painéis continuam aqui, intactos.
 */
function WorkspaceRuntime() {
  const bootstrap = useWorkflowStore((state) => state.bootstrap);
  const loadClientsFromApi = useClientSessionStore((state) => state.loadClientsFromApi);
  const selectedClientSlug = useClientSessionStore((state) => state.selectedClientSlug);
  const clearSelectedClient = useClientSessionStore((state) => state.clearSelectedClient);
  const isOrbitalMapOpen = usePlayerJourneyStore((state) => state.isOrbitalMapOpen);
  const openOrbitalMap = usePlayerJourneyStore((state) => state.openOrbitalMap);
  const closeOrbitalMap = usePlayerJourneyStore((state) => state.closeOrbitalMap);
  const isDialogueOpen = useDialogueStore((state) => state.isOpen);
  const activeNpcId = useDialogueStore((state) => state.activeNpcId);
  const isWizardOpen = useClientSetupStore((state) => state.isWizardOpen);
  const customClients = useClientSetupStore((state) => state.customClients);
  const isSmartLabConsoleOpen = isDialogueOpen && activeNpcId === "smart-lab";

  useEffect(() => {
    bootstrap();
    loadClientsFromApi();
  }, [bootstrap, loadClientsFromApi]);

  useEffect(() => {
    if (!selectedClientSlug) return;
    const selectedStillExists = customClients.some(
      (client) => client.slug === selectedClientSlug
    );
    if (!selectedStillExists) {
      clearSelectedClient();
    }
  }, [clearSelectedClient, customClients, selectedClientSlug]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "m" || event.key === "M") {
        if (isWizardOpen || isDialogueOpen) {
          return;
        }
        event.preventDefault();
        if (isOrbitalMapOpen) {
          closeOrbitalMap();
        } else {
          openOrbitalMap();
        }
      } else if (event.key === "Escape" && isOrbitalMapOpen && !isDialogueOpen) {
        event.preventDefault();
        closeOrbitalMap();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    closeOrbitalMap,
    activeNpcId,
    isDialogueOpen,
    isOrbitalMapOpen,
    isWizardOpen,
    openOrbitalMap
  ]);

  // Etapa 1 do plano do Console: a HUD do mapa (HUD/NotificationStack/TaskPanel/
  // WorkflowStatusLog) deve permanecer montada quando o Console do Smart Lab
  // abre, para que Estacao, Execução atual e Log de status continuem nas
  // mesmas posições do mapa, sem o overlay precisar duplicá-los. O efeito
  // visual de "ao fundo sombreado" e a inércia (pointer-events: none) entram
  // na Etapa 6 — aqui só restauramos a montagem.
  void isSmartLabConsoleOpen;

  return (
    <div className="app-shell">
      <GameCanvas />
      <SmartLabOverlay />
      <HUD />
      <NotificationStack />
      <TaskPanel />
      <WorkflowStatusLog />
      <BrandBrainInteractionScene />
      <ClientSetupWizard />
      <OrbitalMapOverlay />
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
