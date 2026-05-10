import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Gamepad2,
  LogOut,
  MapPinned,
  Pause,
  Play,
  Settings2,
  Sparkles
} from "lucide-react";
import { getClientProfile } from "../domain/clientProfiles";
import { useClientSessionStore } from "../state/useClientSessionStore";
import { ActionButton } from "./ActionButton";
import { useGameStore } from "../state/useGameStore";
import { useWorkflowStore } from "../state/useWorkflowStore";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { PlayerConfigPanel } from "./PlayerConfigPanel";

export function HUD() {
  const location = useWorkflowStore((state) => state.location);
  const selectedClientSlug = useClientSessionStore((state) => state.selectedClientSlug);
  const isPaused = useGameStore((state) => state.isPaused);
  const controlsOpen = useGameStore((state) => state.controlsOpen);
  const configOpen = useGameStore((state) => state.configOpen);
  const togglePaused = useGameStore((state) => state.togglePaused);
  const toggleControls = useGameStore((state) => state.toggleControls);
  const toggleConfig = useGameStore((state) => state.toggleConfig);
  const closeAllPanels = useGameStore((state) => state.closeAllPanels);
  const signOut = usePlayerJourneyStore((state) => state.signOut);
  const selectedClient = getClientProfile(selectedClientSlug);

  const handleLogout = () => {
    closeAllPanels();
    signOut();
  };

  return (
    <div className="hud-root">
      <div className="hud-top-left">
        <div className="hud-bar hud-bar-left">
          <span className="hud-label">
            <Building2 size={14} />
            Espaço
          </span>
          <span className="hud-value">{location}</span>
          {selectedClient ? <span className="hud-meta">Cliente ativo: {selectedClient.displayName}</span> : null}
        </div>

        <div className="settings-actions">
          {/* Ordem: controle, pause, configuração, log out. */}
          <ActionButton
            onClick={toggleControls}
            aria-label={controlsOpen ? "Fechar controles" : "Abrir controles"}
            aria-pressed={controlsOpen}
            className={controlsOpen ? "action-button-active" : undefined}
          >
            <Gamepad2 size={16} />
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
              Interagir: <strong>E</strong> | Fechar: <strong>ESC</strong>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>{configOpen && <PlayerConfigPanel key="config-panel" />}</AnimatePresence>
    </div>
  );
}
