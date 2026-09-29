import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  LoaderCircle,
  ShieldCheck,
  Unplug
} from "lucide-react";
import { useMemo } from "react";
import { getDeckSafe, type DeckTool, type ToolId } from "../domain/decks";
import {
  usePlayerJourneyStore,
  type ToolConnectionStatus
} from "../state/usePlayerJourneyStore";
import { getDeckIcon } from "./deckIcons";
import { getToolIcon } from "./toolIcons";

const STATUS_LABEL: Record<ToolConnectionStatus, string> = {
  disconnected: "Desconectado",
  pending: "Conectando…",
  connected: "Conectado",
  denied: "Autorização negada",
  error: "Erro de conexão"
};

const STATUS_HELPER: Record<ToolConnectionStatus, string> = {
  disconnected: "Aguardando autorização do player.",
  pending: "Solicitando acesso à ferramenta.",
  connected: "Pronto. O agente pode usar esta fonte.",
  denied: "O acesso foi recusado. Tente novamente para autorizar.",
  error: "Falha de comunicação. Tente novamente em instantes."
};

function StatusIcon({ status }: { status: ToolConnectionStatus }) {
  switch (status) {
    case "connected":
      return <Check size={14} />;
    case "pending":
      return <LoaderCircle size={14} className="spin" />;
    case "denied":
      return <Ban size={14} />;
    case "error":
      return <AlertTriangle size={14} />;
    default:
      return null;
  }
}

interface ToolRowProps {
  tool: DeckTool;
  status: ToolConnectionStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}

function ToolRow({ tool, status, onConnect, onDisconnect }: ToolRowProps) {
  const Icon = getToolIcon(tool.id);
  const isConnected = status === "connected";
  const isPending = status === "pending";

  // Botão primário muda de acordo com o estado.
  let primaryLabel = "Conectar";
  if (isPending) primaryLabel = "Conectando…";
  else if (status === "denied" || status === "error") primaryLabel = "Tentar novamente";
  else if (isConnected) primaryLabel = "Conectado";

  return (
    <li className={`connection-item connection-item-${status}`}>
      <span className="connection-item-icon" aria-hidden="true">
        <Icon size={20} />
      </span>

      <div className="connection-item-info">
        <div className="connection-item-name-row">
          <p className="connection-item-name">{tool.label}</p>
          {tool.required ? (
            <span className="connection-required-pill">Obrigatória</span>
          ) : (
            <span className="connection-optional-pill">Opcional</span>
          )}
        </div>
        <p className="connection-item-purpose">{tool.purpose}</p>
        <p className={`connection-status-line connection-status-line-${status}`}>
          <StatusIcon status={status} />
          <span className="connection-status-label">{STATUS_LABEL[status]}</span>
          <span className="connection-status-helper">{STATUS_HELPER[status]}</span>
        </p>
      </div>

      <div className="connection-item-controls">
        <button
          type="button"
          className="journey-secondary-button"
          onClick={onConnect}
          disabled={isPending || isConnected}
        >
          {primaryLabel}
        </button>
        {isConnected ? (
          <button
            type="button"
            className="journey-tertiary-button"
            onClick={onDisconnect}
            aria-label={`Desconectar ${tool.label}`}
          >
            <Unplug size={14} />
            Desconectar
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function DeckConnectionScreen() {
  const selectedDeckId = usePlayerJourneyStore((state) => state.selectedDeckId);
  const connections = usePlayerJourneyStore((state) => state.connections);
  const setToolStatus = usePlayerJourneyStore((state) => state.setToolStatus);
  const disconnectTool = usePlayerJourneyStore((state) => state.disconnectTool);
  const enterWorkspace = usePlayerJourneyStore((state) => state.enterWorkspace);
  const resetJourney = usePlayerJourneyStore((state) => state.resetJourney);
  const isDeckReady = usePlayerJourneyStore((state) => state.isDeckReady);
  const getDeckConnectionProgress = usePlayerJourneyStore(
    (state) => state.getDeckConnectionProgress
  );

  const deck = getDeckSafe(selectedDeckId);

  const ready = useMemo(
    () => (deck ? isDeckReady(deck.id) : false),
    // `connections` é dependência intencional: o seletor depende dele.
    [deck, isDeckReady, connections]
  );

  const progress = useMemo(
    () => (deck ? getDeckConnectionProgress(deck.id) : { required: 0, connected: 0 }),
    [deck, getDeckConnectionProgress, connections]
  );

  if (!deck || !selectedDeckId) {
    // Salvaguarda — sem deck selecionado a tela não tem o que mostrar.
    return (
      <div className="journey-stage journey-stage-connection">
        <div className="journey-card">
          <p className="journey-kicker">Conexão</p>
          <h1 className="journey-title">Nenhum deck selecionado.</h1>
          <button type="button" className="journey-primary-button" onClick={resetJourney}>
            Voltar para a seleção
          </button>
        </div>
      </div>
    );
  }

  const deckConnections = connections[selectedDeckId] ?? {};
  const DeckIcon = getDeckIcon(deck.iconId);

  const handleConnect = (toolId: ToolId) => {
    setToolStatus(selectedDeckId, toolId, "pending");
    // Mock local — Fase 3 substitui por OAuth real.
    // O store já modela `denied` e `error`; o adapter real vai escolher
    // entre eles com base no fluxo OAuth.
    window.setTimeout(() => {
      setToolStatus(selectedDeckId, toolId, "connected");
    }, 700);
  };

  const handleDisconnect = (toolId: ToolId) => {
    disconnectTool(selectedDeckId, toolId);
  };

  const requiredCount = progress.required;
  const connectedCount = progress.connected;
  const progressPercent = requiredCount === 0 ? 0 : (connectedCount / requiredCount) * 100;
  const allRequiredConnected = ready;

  return (
    <div className="journey-stage journey-stage-connection">
      <div
        className="journey-card journey-card-connection"
        style={{
          // @ts-expect-error CSS custom property
          "--deck-accent": deck.accentColor
        }}
      >
        <header className="journey-connection-header">
          <button type="button" className="journey-ghost-button" onClick={resetJourney}>
            ← Trocar deck
          </button>
        </header>

        <div className="connection-deck-identity">
          <span className="connection-deck-icon" aria-hidden="true">
            <DeckIcon size={22} />
          </span>
          <div className="connection-deck-headline">
            <p className="journey-kicker">Etapa 3 · Conexão MCP · {deck.name}</p>
            <h1 className="connection-title">Autorize as ferramentas que este deck precisa.</h1>
            <p className="journey-subtitle">{deck.welcomeMessage}</p>
          </div>
        </div>

        <section
          className={`connection-progress${allRequiredConnected ? " connection-progress-complete" : ""}`}
          aria-live="polite"
        >
          <div className="connection-progress-row">
            <span className="connection-progress-label">
              <ShieldCheck size={14} />
              <strong>{connectedCount}</strong> de <strong>{requiredCount}</strong> ferramentas
              obrigatórias conectadas
            </span>
            <span className="connection-progress-helper">
              {allRequiredConnected
                ? "Tudo pronto. Os agentes deste deck podem ser ativados."
                : "Os agentes deste deck só são ativados depois que tudo estiver conectado."}
            </span>
          </div>
          <div className="connection-progress-track" role="progressbar" aria-valuenow={connectedCount} aria-valuemin={0} aria-valuemax={requiredCount}>
            <div
              className="connection-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        <ul className="connection-list">
          {deck.tools.map((toolItem) => {
            const status: ToolConnectionStatus = deckConnections[toolItem.id] ?? "disconnected";
            return (
              <ToolRow
                key={toolItem.id}
                tool={toolItem}
                status={status}
                onConnect={() => handleConnect(toolItem.id)}
                onDisconnect={() => handleDisconnect(toolItem.id)}
              />
            );
          })}
        </ul>

        <p className="connection-persistence-note">
          Sua autorização fica salva neste dispositivo. Os agentes só ficam ativos quando as ferramentas obrigatórias estiverem conectadas.
        </p>

        <footer className="journey-connection-footer">
          <button
            type="button"
            className="journey-ghost-button"
            onClick={enterWorkspace}
          >
            Pular por enquanto
          </button>
          <button
            type="button"
            className="journey-primary-button"
            onClick={enterWorkspace}
            disabled={!allRequiredConnected}
            title={
              allRequiredConnected
                ? "Entrar no escritório com os agentes ativos"
                : "Conecte as ferramentas obrigatórias para liberar o deck"
            }
          >
            {allRequiredConnected ? (
              <>
                Entrar no escritório <ArrowRight size={14} />
              </>
            ) : (
              "Conecte as ferramentas obrigatórias"
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
