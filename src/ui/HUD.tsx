import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Gamepad2,
  LogOut,
  MapPinned,
  Orbit,
  Pause,
  Play,
  Settings2,
  Sparkles
} from "lucide-react";
import { useClientSessionStore } from "../state/useClientSessionStore";
import { useClientSetupStore } from "../state/useClientSetupStore";
import { ActionButton } from "./ActionButton";
import { useDialogueStore } from "../state/useDialogueStore";
import { useGameStore } from "../state/useGameStore";
import { useWorkflowStore } from "../state/useWorkflowStore";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { PlayerConfigPanel } from "./PlayerConfigPanel";

export function HUD() {
  const location = useWorkflowStore((state) => state.location);
  const selectedClientSlug = useClientSessionStore((state) => state.selectedClientSlug);
  // Etapa 6 do plano do Console: quando o Smart Lab abre, a HUD do mapa
  // continua montada (Etapa 1) mas precisa ficar inerte e levemente
  // sombreada. O class modifier `hud-root--console-open` aplica essas
  // regras no CSS sem desmontar nada.
  const isDialogueOpen = useDialogueStore((state) => state.isOpen);
  const activeNpcId = useDialogueStore((state) => state.activeNpcId);
  const isSmartLabConsoleOpen = isDialogueOpen && activeNpcId === "smart-lab";
  const isPaused = useGameStore((state) => state.isPaused);
  const controlsOpen = useGameStore((state) => state.controlsOpen);
  const configOpen = useGameStore((state) => state.configOpen);
  const togglePaused = useGameStore((state) => state.togglePaused);
  const toggleControls = useGameStore((state) => state.toggleControls);
  const toggleConfig = useGameStore((state) => state.toggleConfig);
  const closeAllPanels = useGameStore((state) => state.closeAllPanels);
  const profile = usePlayerJourneyStore((state) => state.profile);
  const signOut = usePlayerJourneyStore((state) => state.signOut);
  const isOrbitalMapOpen = usePlayerJourneyStore((state) => state.isOrbitalMapOpen);
  const openOrbitalMap = usePlayerJourneyStore((state) => state.openOrbitalMap);
  const closeOrbitalMap = usePlayerJourneyStore((state) => state.closeOrbitalMap);
  const customClients = useClientSetupStore((state) => state.customClients);
  const selectedClient =
    customClients.find((client) => client.slug === selectedClientSlug) ?? null;
  const stationName = profile?.displayName?.trim() || "Sua Estação";

  const handleLogout = () => {
    closeAllPanels();
    signOut();
  };

  const toggleOrbitalMap = () => {
    if (isOrbitalMapOpen) {
      closeOrbitalMap();
      return;
    }
    closeAllPanels();
    openOrbitalMap();
  };

  return (
    <div
      className={`hud-root${isSmartLabConsoleOpen ? " hud-root--console-open" : ""}`}
      aria-hidden={isSmartLabConsoleOpen ? "true" : undefined}
    >
      <div className="hud-top-left">
        <div className="hud-bar hud-bar-left">
          <span className="hud-label">
            <Building2 size={14} />
            Estação
          </span>
          <span className="hud-value">{stationName}</span>
          <span className="hud-meta">Local: {location}</span>
          {selectedClient ? <span className="hud-meta">Cliente ativo: {selectedClient.displayName}</span> : null}
        </div>

        <div className="settings-actions">
          {/* Ordem: controle, mapa, pause, configuração, log out. */}
          <ActionButton
            onClick={toggleControls}
            aria-label={controlsOpen ? "Fechar controles" : "Abrir controles"}
            aria-pressed={controlsOpen}
            className={controlsOpen ? "action-button-active" : undefined}
          >
            <Gamepad2 size={16} />
          </ActionButton>
          <ActionButton
            onClick={toggleOrbitalMap}
            aria-label={isOrbitalMapOpen ? "Fechar mapa orbital" : "Abrir mapa orbital"}
            aria-pressed={isOrbitalMapOpen}
            className={isOrbitalMapOpen ? "action-button-active" : undefined}
          >
            <Orbit size={16} />
          </ActionButton>
          <ActionButton onClick={togglePaused} aria-label={isPaused ? "Retomar experiência" : "Pausar experiência"}>
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </ActionButton>
          <ActionButton
            onClick={toggleConfig}
            aria-label={configOpen ? "Fechar configuração" : "Abrir configuração"}
            aria-pressed={configOpen}
            className={configOpen ? "action-button-active" : undefined}
          >
            <Settings2 size={16} />
          </ActionButton>
          <ActionButton
            onClick={handleLogout}
            aria-label="Sair da estação"
            className="action-button-danger"
          >
            <LogOut size={16} />
          </ActionButton>
        </div>
      </div>

      <AnimatePresence>
        {controlsOpen && (
          <motion.section
            key="controls-panel"
            className="controls-panel"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="panel-heading">
              <Sparkles size={16} />
              <span className="panel-title">Controles</span>
            </div>
            <div className="controls-item">
              <MapPinned size={14} />
              Zoom: roda do mouse ou <strong>+</strong> / <strong>-</strong>
            </div>
            <div className="controls-item">
              <MapPinned size={14} />
              Rotação: <strong>Q</strong> / <strong>R</strong>
            </div>
            <div className="controls-item">
              <MapPinned size={14} />
              Correr: <strong>SHIFT</strong>
            </div>
            <div className="controls-item">
              <MapPinned size={14} />
              Interagir: <strong>E</strong> | Fechar: <strong>ESC</strong>
            </div>
            <div className="controls-item">
              <MapPinned size={14} />
              Mapa orbital: <strong>M</strong>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>{configOpen && <PlayerConfigPanel key="config-panel" />}</AnimatePresence>
    </div>
  );
}
