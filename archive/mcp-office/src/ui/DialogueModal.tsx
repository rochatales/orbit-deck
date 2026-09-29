import { Html } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Building2,
  Check,
  ChevronRight,
  Circle,
  Copy,
  Cpu,
  Download,
  FileText,
  Gamepad2,
  LoaderCircle,
  MessageSquare,
  Monitor,
  Pause,
  Play,
  Plus,
  Power,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { postSmartLabChat } from "../api/mcpClient";
import {
  buildRulesSnapshot,
  buildSmartLabDiagnostics,
  buildSmartLabOverviewMetrics,
  getOverviewSubtitle,
  getUsagePercentage,
  type SmartLabDiagnosticLine
} from "../domain/smartLabMetrics";
import {
  DECK_REGISTRY,
  getAgentHomeDeckId,
  type DeckDefinition
} from "../domain/decks";
import type { GeneratedBrief } from "../domain/editorialBrief";
import { getActionLabel, type NpcId } from "../domain/mcpActions";
import { getDeckIcon } from "../journey/deckIcons";
import { MCP_NPCS } from "../npcs/mcpData";
import type { AgentRuntimeInfo } from "../state/useAgentStatus";
import {
  isMcpActivatedFor,
  mcpKeyForNpc,
  MISSION_ORDER,
  missionStageIndex,
  recordToClientProfile,
  useClientSetupStore,
  type CustomClientRecord,
  type MissionStage,
  type SmartLabMessage
} from "../state/useClientSetupStore";
import { useClientSessionStore } from "../state/useClientSessionStore";
import { useDialogueStore } from "../state/useDialogueStore";
import { useGameStore } from "../state/useGameStore";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { useWorkflowStore } from "../state/useWorkflowStore";
import { ActionButton } from "./ActionButton";
import { getActionMeta } from "./actionMeta";

/**
 * Etapas da missão em forma de pílulas — cada uma com NPC responsável,
 * rótulo curto e accent vindo do deck daquele NPC. A ordem é fixa e
 * espelha `MISSION_ORDER` no client setup store.
 */
interface MissionStepMeta {
  stage: MissionStage;
  label: string;
  responsibleNpcId: NpcId;
  responsibleNpcLabel: string;
}

type SmartLabAgentNpcId =
  | "brand-brain"
  | "editorial"
  | "design"
  | "narration"
  | "output-review";

const MISSION_STEPS: MissionStepMeta[] = [
  {
    stage: "briefing",
    label: "Briefing",
    responsibleNpcId: "editorial",
    responsibleNpcLabel: "MISTER"
  },
  {
    stage: "designing",
    label: "Design",
    responsibleNpcId: "design",
    responsibleNpcLabel: "MAX"
  },
  {
    stage: "reviewing",
    label: "Revisão",
    responsibleNpcId: "output-review",
    responsibleNpcLabel: "ASTRA"
  },
  {
    stage: "published",
    label: "Publicado",
    responsibleNpcId: "output-review",
    responsibleNpcLabel: "ASTRA"
  }
];

export function DialogueModal() {
  const isOpen = useDialogueStore((state) => state.isOpen);
  const activeNpcId = useDialogueStore((state) => state.activeNpcId);
  const mode = useDialogueStore((state) => state.mode);
  const closeDialog = useDialogueStore((state) => state.closeDialog);
  const confirmActivation = useDialogueStore((state) => state.confirmActivation);
  const dismissActivation = useDialogueStore((state) => state.dismissActivation);
  const customClients = useClientSetupStore((state) => state.customClients);
  const openWizard = useClientSetupStore((state) => state.openWizard);
  const removeClient = useClientSetupStore((state) => state.removeClient);
  const activateMcpForClientBySlug = useClientSetupStore(
    (state) => state.activateMcpForClientBySlug
  );
  const appendSmartLabMessages = useClientSetupStore(
    (state) => state.appendSmartLabMessages
  );
  const selectedClientSlug = useClientSessionStore((state) => state.selectedClientSlug);
  const selectClient = useClientSessionStore((state) => state.selectClient);
  const clearSelectedClient = useClientSessionStore((state) => state.clearSelectedClient);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const controlsOpen = useGameStore((state) => state.controlsOpen);
  const configOpen = useGameStore((state) => state.configOpen);
  const isPaused = useGameStore((state) => state.isPaused);
  const togglePaused = useGameStore((state) => state.togglePaused);
  const toggleControls = useGameStore((state) => state.toggleControls);
  const toggleConfig = useGameStore((state) => state.toggleConfig);
  const handleNpcAction = useWorkflowStore((state) => state.handleNpcAction);
  const isActionInFlight = useWorkflowStore((state) => state.isActionInFlight);
  const pushSystemNotification = useWorkflowStore((state) => state.pushSystemNotification);
  const triggerNpcPulse = useWorkflowStore((state) => state.triggerNpcPulse);
  const location = useWorkflowStore((state) => state.location);
  const workflowStatus = useWorkflowStore((state) => state.workflowStatus);
  const interactionHint = useWorkflowStore((state) => state.interactionHint);
  const tasks = useWorkflowStore((state) => state.tasks);
  const logEntries = useWorkflowStore((state) => state.logEntries);
  const activateDeck = usePlayerJourneyStore((state) => state.activateDeck);
  const focusDeck = usePlayerJourneyStore((state) => state.focusDeck);
  const playerProfile = usePlayerJourneyStore((state) => state.profile);
  const [selectingClient, setSelectingClient] = useState(true);
  const [smartLabInput, setSmartLabInput] = useState("");
  const [smartLabError, setSmartLabError] = useState<string | null>(null);
  const [smartLabPending, setSmartLabPending] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);

  const npc = MCP_NPCS.find((entry) => entry.id === activeNpcId) ?? null;

  const npcMcpKey = npc ? mcpKeyForNpc(npc.id) : null;
  const isEden = npc?.id === "brand-brain";
  const isSmartLab = npc?.id === "smart-lab";

  // Clientes que esta NPC consegue listar:
  //   - Eden (Brand Brain) vê todos os cadastrados.
  //   - Os demais NPCs só veem clientes com Brand Brain MCP já ativo —
  //     é o pré-requisito do fluxo "ativar MCP por cliente".
  const visibleClients: CustomClientRecord[] = useMemo(() => {
    if (!npc) return [];
    if (isEden) return customClients;
    return customClients.filter((c) => c.mcpActivation.brandBrain);
  }, [npc, isEden, customClients]);

  const selectedClientRecord = useMemo(
    () => visibleClients.find((c) => c.slug === selectedClientSlug) ?? null,
    [visibleClients, selectedClientSlug]
  );
  const smartLabMessages = selectedClientRecord?.smartLab?.messages ?? [];

  // O cliente só "suporta ações" quando o MCP daquele NPC está ativo.
  const clientSupportsActions = useMemo(() => {
    if (!npc || !selectedClientRecord) return false;
    return isMcpActivatedFor(selectedClientRecord, npc.id);
  }, [npc, selectedClientRecord]);

  const bubblePosition = useMemo<[number, number, number]>(() => {
    if (!npc) {
      return [0, 0, 0];
    }

    return [
      (playerPosition.x + npc.position.x) / 2,
      Math.max(playerPosition.y, npc.position.y) + 3.1,
      (playerPosition.z + npc.position.z) / 2
    ];
  }, [npc, playerPosition.x, playerPosition.y, playerPosition.z]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (isSmartLab) {
      setSelectingClient(selectedClientRecord == null);
      setSmartLabInput("");
      setSmartLabError(null);
      setSmartLabPending(false);
      setPendingUserMessage(null);
      return;
    }
    // Sempre que reabre, força o picker se não há cliente eligível
    // já selecionado para este NPC.
    setSelectingClient(selectedClientRecord == null);
  }, [isOpen, isSmartLab, selectedClientRecord]);

  const handleClientSelect = (record: CustomClientRecord) => {
    if (!npc) return;

    // Se o MCP do NPC atual ainda não está ativo para este cliente,
    // a "seleção" vira a ativação — é o que materializa a etapa
    // "ativar MCP por cliente" descrita no plano da MVP.
    if (npcMcpKey && !isMcpActivatedFor(record, npc.id)) {
      activateMcpForClientBySlug(record.slug, npc.id);
      selectClient(record.slug);
      setSelectingClient(false);
      pushSystemNotification(
        `${npc.name}: MCP ativado`,
        `${npc.name} agora aceita missões para ${record.displayName}.`,
        "complete"
      );
      // Ativar o Editorial MCP é o ponto de partida formal da missão.
      // O store já avança `idle → briefing`; aqui só celebramos com
      // uma notificação dedicada para deixar claro que o jogo começou.
      if (npc.id === "editorial" && record.mission.stage === "idle") {
        pushSystemNotification(
          "Missão iniciada",
          `${record.displayName}: brief → design → revisão → publicação.`,
          "complete"
        );
      }
      return;
    }

    selectClient(record.slug);
    setSelectingClient(false);
  };

  const handleAddClient = () => {
    closeDialog();
    openWizard();
  };

  const handleRemoveClient = (record: CustomClientRecord) => {
    const confirmed = window.confirm(`Remover o cliente ${record.displayName}?`);
    if (!confirmed) return;
    removeClient(record.id);
    if (selectedClientSlug === record.slug) {
      clearSelectedClient();
    }
    pushSystemNotification(
      "Cliente removido",
      `${record.displayName} saiu do EDEN e do Smart Lab.`,
      "complete"
    );
  };

  const handleDownloadBrandRules = (record: CustomClientRecord) => {
    const blob = new Blob([record.rulesMd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.slug}-rules.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushSystemNotification(
      "Download iniciado",
      `${record.displayName}: rules.md enviado para download.`,
      "complete"
    );
  };

  const handleSmartLabSubmit = async () => {
    if (!selectedClientRecord) return;

    const userMessage = smartLabInput.trim();
    if (!userMessage) return;

    setSmartLabPending(true);
    setPendingUserMessage(userMessage);
    setSmartLabError(null);
    setSmartLabInput("");

    try {
      const response = await postSmartLabChat({
        clientSlug: selectedClientRecord.slug,
        clientDisplayName: selectedClientRecord.displayName,
        segment: selectedClientRecord.answers.segment,
        currentRulesMd: selectedClientRecord.rulesMd,
        userMessage,
        conversation: (selectedClientRecord.smartLab?.messages ?? []).map((message) => ({
          role: message.role,
          content: message.content
        }))
      });

      const baseId = `${selectedClientRecord.slug}-${Date.now()}`;
      const nextMessages: SmartLabMessage[] = [
        {
          id: `${baseId}-user`,
          role: "user",
          content: userMessage,
          createdAt: Date.now()
        },
        {
          id: `${baseId}-assistant`,
          role: "assistant",
          content: response.reply,
          createdAt: Date.now() + 1
        }
      ];

      appendSmartLabMessages(
        selectedClientRecord.slug,
        nextMessages,
        response.updatedRulesMd
      );
      pushSystemNotification(
        "Smart Lab atualizado",
        `${selectedClientRecord.displayName}: as regras da marca foram refinadas pela IA integrada.`,
        "complete"
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível conversar com a IA do Smart Lab.";
      setSmartLabError(message);
      setSmartLabInput(userMessage);
    } finally {
      setSmartLabPending(false);
      setPendingUserMessage(null);
    }
  };

  const emptyStateMessage = isEden
    ? "Você ainda não cadastrou nenhum cliente. Use o botão acima para começar com EDEN."
    : isSmartLab
    ? "Nenhum cliente cadastrado ainda. Crie um cliente com EDEN para abrir o chat e revisar as regras da marca."
    : "Nenhum cliente com Brand Brain MCP ativo. Volte para EDEN no Deck de Estratégia para cadastrar ou ativar um cliente.";

  // Balão dedicado de ativação: aparece antes do console quando o player
  // chega num NPC cujo deck ainda não foi ativado. Confirmar dispara a
  // ativação real (deck + pulse + notificação) e migra o diálogo para
  // o modo `console`.
  const homeDeckId = npc ? getAgentHomeDeckId(npc.id) : null;
  const homeDeck: DeckDefinition | null = homeDeckId ? DECK_REGISTRY[homeDeckId] : null;

  const handleConfirmActivation = () => {
    if (!npc || !homeDeck) {
      // Salvaguarda: sem deck home, apenas seguimos para o console.
      confirmActivation();
      return;
    }
    activateDeck(homeDeck.id);
    focusDeck(homeDeck.id);
    triggerNpcPulse(npc.id);
    pushSystemNotification(
      `Estação ${homeDeck.name} ativada`,
      `${npc.name} agora aceita missões.`,
      "complete"
    );
    confirmActivation();
  };

  if (isOpen && npc && mode === "activation" && homeDeck) {
    const DeckIcon = getDeckIcon(homeDeck.iconId);
    return (
      <AnimatePresence>
        <Html position={bubblePosition} center zIndexRange={[120, 0]}>
          <motion.div
            className="dialog-anchor"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
          >
            <div
              className="dialog-panel dialog-bubble activation-balloon"
              style={{
                // @ts-expect-error CSS custom property
                "--deck-accent": homeDeck.accentColor
              }}
            >
              <div className="dialog-bubble-header">
                <div className="dialog-kicker">
                  <Power size={13} />
                  Ativação MCP
                </div>
                <button
                  className="dialog-close"
                  type="button"
                  onClick={dismissActivation}
                  aria-label="Cancelar ativação"
                >
                  <X size={14} />
                  ESC
                </button>
              </div>

              <div className="activation-body">
                <div className="activation-deck-id">
                  <span className="activation-deck-icon" aria-hidden="true">
                    <DeckIcon size={22} />
                  </span>
                  <div className="activation-deck-text">
                    <p className="activation-npc-name">{npc.name}</p>
                    <p className="activation-deck-name">{homeDeck.name}</p>
                  </div>
                </div>

                <p className="activation-tagline">{homeDeck.tagline}</p>
                <p className="activation-welcome">{homeDeck.welcomeMessage}</p>

                <ul className="activation-outcomes" aria-label="Entregas deste deck">
                  {homeDeck.outcomes.map((outcome) => (
                    <li key={outcome} className="activation-outcome">
                      <ShieldCheck size={12} />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>

                <div className="activation-actions">
                  <button
                    type="button"
                    className="activation-secondary-button"
                    onClick={dismissActivation}
                  >
                    Agora não
                  </button>
                  <button
                    type="button"
                    className="activation-primary-button"
                    onClick={handleConfirmActivation}
                  >
                    <Power size={14} />
                    Ativar {homeDeck.name}
                  </button>
                </div>

                <p className="activation-footnote">
                  Uma vez ativado, o deck fica disponível em todas as próximas sessões.
                </p>
              </div>
            </div>
            <div className="dialog-tail" />
          </motion.div>
        </Html>
      </AnimatePresence>
    );
  }

  if (isOpen && npc && mode === "console" && isSmartLab) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && npc && mode === "console" && (
        <Html position={bubblePosition} center zIndexRange={[120, 0]}>
          <motion.div
            className="dialog-anchor"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
          >
            <div className="dialog-panel dialog-bubble">
              <div className="dialog-bubble-header">
                <div className="dialog-kicker">
                  <Cpu size={13} />
                  Conversa MCP
                </div>
                <button className="dialog-close" type="button" onClick={closeDialog} aria-label="Fechar">
                  <X size={14} />
                  ESC
                </button>
              </div>

              <div className="dialog-bubble-body">
                <div className="dialog-bubble-intro">
                  <h2 className="dialog-name">{npc.name}</h2>
                  <p className="dialog-role">{npc.role}</p>
                </div>

                {/* Eden tem um CTA dedicado para cadastrar cliente; aparece
                    sempre, tanto no estado vazio quanto com clientes já cadastrados. */}
                {isEden ? (
                  <button
                    type="button"
                    className="dialog-add-client-cta"
                    onClick={handleAddClient}
                  >
                    <span className="dialog-add-client-icon" aria-hidden="true">
                      <Plus size={16} />
                    </span>
                    <span className="dialog-add-client-text">
                      <strong>Cadastrar novo cliente</strong>
                      <span>EDEN conduz a entrevista: nome, segmento, cores, logo, tom…</span>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ) : null}

                <div className="dialog-client-block">
                  <div className="dialog-client-header">
                    <div className="dialog-client-label">
                      <Building2 size={13} />
                      Cliente
                    </div>
                    {selectedClientRecord && !selectingClient ? (
                      <button
                        className="dialog-client-switch"
                        type="button"
                        onClick={() => setSelectingClient(true)}
                      >
                        <RefreshCw size={13} />
                        Trocar
                      </button>
                    ) : null}
                  </div>

                  {selectingClient ? (
                    visibleClients.length === 0 ? (
                      <div className="dialog-empty-state">{emptyStateMessage}</div>
                    ) : (
                      <div className="dialog-client-grid">
                        {visibleClients.map((record) => {
                          const npcMcpActive = isMcpActivatedFor(record, npc.id);
                          const brandBrainActive = record.mcpActivation.brandBrain;
                          const isSelected =
                            selectedClientRecord?.slug === record.slug;
                          // Estado do card:
                          //   - active:        MCP do NPC já está on → seleciona direto.
                          //   - activatable:   MCP ainda off → clique liga + seleciona.
                          //   - blocked:       sem Brand Brain (só acontece em Eden, e nunca acontece já que Eden ativa no add).
                          const cardState = npcMcpActive
                            ? "active"
                            : brandBrainActive || isEden
                            ? "activatable"
                            : "blocked";

                          if (isEden) {
                            return (
                              <article
                                key={record.slug}
                                className={`dialog-client-shell${
                                  isSelected ? " dialog-client-shell-selected" : ""
                                }`}
                              >
                                <button
                                  className={`dialog-client-card dialog-client-card-eden dialog-client-card-${cardState}${
                                    isSelected ? " dialog-client-card-active-selected" : ""
                                  }`}
                                  type="button"
                                  onClick={() => handleClientSelect(record)}
                                  disabled={cardState === "blocked"}
                                >
                                  <div className="dialog-client-name-row">
                                    <span className="dialog-client-name">
                                      {record.displayName}
                                    </span>
                                    <ClientCardBadge state={cardState} npcName={npc.name} />
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  className="dialog-client-remove-button"
                                  onClick={() => handleRemoveClient(record)}
                                  aria-label={`Remover ${record.displayName}`}
                                >
                                  <Trash2 size={13} />
                                  Remover
                                </button>
                              </article>
                            );
                          }

                          return (
                            <button
                              key={record.slug}
                              className={`dialog-client-card dialog-client-card-${cardState}${
                                isSelected ? " dialog-client-card-active-selected" : ""
                              }`}
                              type="button"
                              onClick={() => handleClientSelect(record)}
                              disabled={cardState === "blocked"}
                            >
                              <div className="dialog-client-name-row">
                                <span className="dialog-client-name">
                                  {record.displayName}
                                </span>
                                <ClientCardBadge state={cardState} npcName={npc.name} />
                              </div>
                              <span className="dialog-client-summary">
                                {record.answers.goal || "Cliente cadastrado pelo player."}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : selectedClientRecord ? (
                    <div className={`dialog-client-active${isEden ? " dialog-client-active-eden" : ""}`}>
                      <div className="dialog-client-badge">
                        <ShieldCheck size={11} /> Cliente ativo
                      </div>
                      <div className="dialog-client-name">
                        {selectedClientRecord.displayName}
                      </div>
                      {!isEden ? (
                        <div className="dialog-client-summary">
                          {selectedClientRecord.answers.goal ||
                            "Sem objetivo declarado nas regras da marca."}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {!selectingClient && selectedClientRecord ? (
                  <>
                    {isEden ? (
                      <div className="dialog-actions dialog-actions-eden">
                        {npc.actions
                          .filter((action) => action.id === "view-brand-rules")
                          .map((action) => {
                            const meta = getActionMeta(action.id);
                            const busy = isActionInFlight(
                              npc.id,
                              action.id,
                              selectedClientRecord.slug
                            );

                            return (
                              <ActionButton
                                key={`${selectedClientRecord.slug}:${action.id}`}
                                className="dialog-action"
                                icon={meta.icon}
                                busy={busy}
                                disabled={busy}
                                onClick={() =>
                                  handleNpcAction(
                                    npc.name,
                                    npc.id,
                                    action,
                                    recordToClientProfile(selectedClientRecord)
                                  )
                                }
                              >
                                {action.label}
                              </ActionButton>
                            );
                          })}
                        <ActionButton
                          key={`${selectedClientRecord.slug}:download-brand-rules`}
                          className="dialog-action"
                          icon={Download}
                          onClick={() => handleDownloadBrandRules(selectedClientRecord)}
                        >
                          Baixar Regras da Marca
                        </ActionButton>
                      </div>
                    ) : null}

                    {!isEden && selectedClientRecord.mission.stage !== "idle" ? (
                      <MissionTracker
                        mission={selectedClientRecord.mission}
                        activeNpcId={npc.id}
                      />
                    ) : null}

                    {!isEden ? <p className="dialog-text">{npc.dialogue}</p> : null}

                    {npc.id === "editorial" && selectedClientRecord.latestBrief ? (
                      <BriefPreviewCard
                        brief={selectedClientRecord.latestBrief}
                        clientDisplayName={selectedClientRecord.displayName}
                        onSendToDesign={() => {
                          const sendAction = npc.actions.find(
                            (a) => a.id === "send-brief-to-design"
                          );
                          if (!sendAction) return;
                          handleNpcAction(
                            npc.name,
                            npc.id,
                            sendAction,
                            recordToClientProfile(selectedClientRecord)
                          );
                        }}
                      />
                    ) : null}

                    {!isEden && !clientSupportsActions ? (
                      <div className="dialog-empty-state">
                        Esta etapa ainda não está habilitada para{" "}
                        <strong>{selectedClientRecord.displayName}</strong>. Selecione o
                        cliente novamente para ativar o MCP de {npc.name}.
                      </div>
                    ) : !isEden ? (
                      <div className="dialog-actions">
                        {npc.actions.map((action) => {
                          const meta = getActionMeta(action.id);
                          const busy = isActionInFlight(
                            npc.id,
                            action.id,
                            selectedClientRecord.slug
                          );

                          return (
                            <ActionButton
                              key={`${selectedClientRecord.slug}:${action.id}`}
                              className="dialog-action"
                              icon={meta.icon}
                              busy={busy}
                              disabled={busy}
                              onClick={() =>
                                handleNpcAction(
                                  npc.name,
                                  npc.id,
                                  action,
                                  recordToClientProfile(selectedClientRecord)
                                )
                              }
                            >
                              {action.label}
                            </ActionButton>
                          );
                        })}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
            <div className="dialog-tail" />
          </motion.div>
        </Html>
      )}
    </AnimatePresence>
  );
}

export function SmartLabConsole({
  npcName,
  visibleClients,
  selectingClient,
  selectedClientRecord,
  smartLabMessages,
  pendingUserMessage,
  smartLabPending,
  smartLabError,
  smartLabInput,
  workflowStatus,
  agentStatuses,
  emptyStateMessage,
  onSelectClient,
  onSwitchClient,
  onClose,
  onInputChange,
  onSubmit
}: {
  npcName: string;
  visibleClients: CustomClientRecord[];
  selectingClient: boolean;
  selectedClientRecord: CustomClientRecord | null;
  smartLabMessages: SmartLabMessage[];
  pendingUserMessage: string | null;
  smartLabPending: boolean;
  smartLabError: string | null;
  smartLabInput: string;
  workflowStatus: string;
  agentStatuses: Array<{
    npcId: SmartLabAgentNpcId;
    label: string;
    info: AgentRuntimeInfo;
  }>;
  emptyStateMessage: string;
  onSelectClient: (record: CustomClientRecord) => void;
  onSwitchClient: () => void;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}) {
  // Etapa 2 do plano: as sidebars Estacao/Execucao/Log foram removidas do
  // overlay porque a HUD do mapa (montada por baixo) já cobre essa função.
  // location/tasks/logEntries/stationName saíram das props e o useMemo de
  // latestLogEntries foi descartado junto.
  const inputRef = useRef<HTMLInputElement | null>(null);
  const diagnostics = useMemo(
    () => buildSmartLabDiagnostics(agentStatuses),
    [agentStatuses]
  );
  const overviewMetrics = useMemo(
    () => buildSmartLabOverviewMetrics(visibleClients, selectedClientRecord),
    [visibleClients, selectedClientRecord]
  );
  const rulesSnapshot = useMemo(
    () => (selectedClientRecord ? buildRulesSnapshot(selectedClientRecord) : null),
    [selectedClientRecord]
  );
  const topUsageValue = overviewMetrics.usageRows[0]?.value ?? 0;
  const isChatEmpty = smartLabMessages.length === 0 && !pendingUserMessage;
  const consoleDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date()),
    []
  );

  useEffect(() => {
    if (selectingClient || smartLabPending || !selectedClientRecord) {
      return;
    }
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [selectedClientRecord, selectingClient, smartLabPending]);

  return (
    <section className="smartlab-shell" aria-label="Console do Smart Lab">
      <div className="smartlab-layout">
        <main className="smartlab-main">
          <section className="smartlab-monitor-stage" aria-label="Computador central do workplace">
            <div className="smartlab-monitor">
              {/*
                Refinamento final: mantemos apenas um controle azul no canto
                superior esquerdo do monitor, com "ESC" visível como affordance
                principal de saída.
              */}
              <div className="smartlab-monitor-topbar">
                <button
                  type="button"
                  className="smartlab-monitor-close"
                  onClick={onClose}
                  aria-label="Fechar console (ESC)"
                  title="ESC"
                >
                  <span className="smartlab-monitor-led smartlab-monitor-led-close" aria-hidden="true" />
                  <span className="smartlab-monitor-close-label">ESC</span>
                </button>
              </div>
              <div className="smartlab-monitor-screen">
                <div className="smartlab-monitor-title-row">
                  <p className="smartlab-monitor-title">
                    {selectingClient
                      ? ">> CHAT DO CONSOLE // SELECIONE UM CLIENTE CADASTRADO PARA INICIAR"
                      : ">> CORE // LAB_SYSTEM_DIAGNOSTICS"}
                  </p>
                  <span className="smartlab-date-badge smartlab-monitor-date">{consoleDateLabel}</span>
                </div>

                {selectingClient ? (
                  <div className="smartlab-client-picker smartlab-client-picker-screen">
                    {visibleClients.length === 0 ? (
                      <div className="smartlab-empty">
                        <div className="dialog-empty-state">{emptyStateMessage}</div>
                      </div>
                    ) : (
                      <>
                        <div className="smartlab-monitor-summary smartlab-monitor-summary-picker">
                          <TerminalLabel label="Clientes cadastrados" />
                          <span className="smartlab-monitor-summary-copy">
                            escolha um cliente para iniciar o chat do console
                          </span>
                        </div>
                        <div className="smartlab-picker-list">
                          {visibleClients.map((record) => (
                            <button
                              key={record.slug}
                              className="smartlab-picker-row"
                              type="button"
                              onClick={() => onSelectClient(record)}
                            >
                              <div className="smartlab-picker-row-main">
                                <span className="smartlab-picker-row-name">{record.displayName}</span>
                                <span className="smartlab-picker-row-action">
                                  <Bot size={11} />
                                  Carregar monitor
                                </span>
                              </div>
                              <span className="smartlab-picker-row-summary">
                                {record.answers.goal || "Cliente pronto para refinar as regras da marca."}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : selectedClientRecord ? (
                  <>
                    <div className="smartlab-monitor-summary">
                      <TerminalLabel label="Overview" />
                      <span className="smartlab-monitor-summary-copy">
                        {getOverviewSubtitle(overviewMetrics)}
                      </span>
                    </div>

                    <div className="smartlab-monitor-columns">
                      <div className="smartlab-monitor-left">
                        <div className="smartlab-diagnostic-lines">
                          {diagnostics.map((line) => (
                            <div key={line.label} className={`smartlab-diagnostic-line smartlab-diagnostic-line-${line.tone}`}>
                              <span className="smartlab-diagnostic-prefix">[{line.prefix}]</span>
                              <span className="smartlab-diagnostic-content">
                                {line.label}: {line.value}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="smartlab-monitor-widgets">
                          <div className="smartlab-memory-list">
                            {overviewMetrics.usageRows.map((row) => (
                              <MemoryBar
                                key={row.clientSlug}
                                label={row.label}
                                meta={`${row.messages} msgs`}
                                value={getUsagePercentage(row.value, topUsageValue)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="smartlab-rules-preview">
                        <div className="smartlab-rules-preview-header">
                          <TerminalLabel label="As regras da marca" />
                          <TerminalLabel label={selectedClientRecord.answers.segment} />
                        </div>
                        {rulesSnapshot ? (
                          <div className="smartlab-rules-meta">
                            <span>{rulesSnapshot.userMessages} prompts</span>
                            <span>{rulesSnapshot.assistantMessages} respostas</span>
                            <span>{rulesSnapshot.lastUpdatedLabel}</span>
                            <span>{workflowStatus}</span>
                          </div>
                        ) : null}
                        <pre className="smartlab-rules-md">{selectedClientRecord.rulesMd}</pre>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            <div className="smartlab-monitor-stand" aria-hidden="true" />
            <div className="smartlab-monitor-base" aria-hidden="true" />
          </section>

          {smartLabError ? <div className="smartlab-error">{smartLabError}</div> : null}

          <section className="smartlab-chat-panel smartlab-chat-dock" aria-label="Conversa com a IA">
            <header className="smartlab-panel-header">
              <div className="smartlab-panel-header-copy">
                <MessageSquare size={15} />
                <span>Conversa com a IA</span>
              </div>
              {selectedClientRecord ? (
                <button
                  className="dialog-client-switch smartlab-switch"
                  type="button"
                  onClick={onSwitchClient}
                >
                  <RefreshCw size={13} />
                  Trocar cliente
                </button>
              ) : null}
            </header>
            <div
              className={`smartlab-chat-scroll${isChatEmpty ? " smartlab-chat-scroll-empty" : ""}`}
            >
              {/*
                Etapa 4 do plano: o bloco .smartlab-chat-empty (que pintava o
                interactionHint "Pressione E para interagir com Console") foi
                removido daqui. O placeholder do <input> abaixo já comunica o
                primeiro passo e o hint segue exposto no mundo 3D pela HUD.
              */}
              {smartLabMessages.slice(-4).map((message) => (
                <SmartLabMessageBubble key={message.id} message={message} />
              ))}

              {pendingUserMessage ? (
                <>
                  <SmartLabMessageBubble
                    message={{
                      id: "smartlab-pending-user",
                      role: "user",
                      content: pendingUserMessage,
                      createdAt: Date.now()
                    }}
                  />
                  <div className="smartlab-message smartlab-message-assistant smartlab-message-pending">
                    <span className="smartlab-message-role">IA</span>
                    <div className="smartlab-message-body">
                      <LoaderCircle size={14} className="smartlab-spinner" />
                      Refinando <code>as regras da marca</code>...
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <form
              className="smartlab-input-form"
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
              }}
            >
              <input
                ref={inputRef}
                className="smartlab-input"
                type="text"
                value={smartLabInput}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder="Ex.: deixe o tom mais premium, reduza repetições e fortaleça as regras visuais."
                disabled={smartLabPending || selectingClient}
              />
              <button
                type="submit"
                className="smartlab-send"
                disabled={
                  selectingClient ||
                  smartLabPending ||
                  smartLabInput.trim().length === 0
                }
              >
                {smartLabPending ? (
                  <>
                    <LoaderCircle size={15} className="smartlab-spinner" />
                    Enviando
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Enviar
                  </>
                )}
              </button>
            </form>
          </section>
        </main>
      </div>
    </section>
  );
}

function SmartLabMessageBubble({ message }: { message: SmartLabMessage }) {
  const roleLabel = message.role === "user" ? "Player" : "IA";
  return (
    <article
      className={`smartlab-message smartlab-message-${message.role}`}
      aria-label={`${roleLabel}: ${message.content}`}
    >
      <span className="smartlab-message-role">{roleLabel}</span>
      <div className="smartlab-message-body">{message.content}</div>
    </article>
  );
}

function TerminalLabel({ label }: { label: string }) {
  return <span className="smartlab-terminal-label">{label}</span>;
}

function MemoryBar({
  label,
  meta,
  value
}: {
  label: string;
  meta?: string;
  value: number;
}) {
  return (
    <div className="smartlab-memory-row">
      <span className="smartlab-memory-label">
        <span>{label}</span>
        {meta ? <small>{meta}</small> : null}
      </span>
      <span className="smartlab-memory-track">
        <span
          className="smartlab-memory-fill"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </span>
    </div>
  );
}

function MissionTracker({
  mission,
  activeNpcId
}: {
  mission: CustomClientRecord["mission"];
  activeNpcId: NpcId;
}) {
  const currentIndex = missionStageIndex(mission.stage);
  const accent = useMemo(() => {
    const deckId = getAgentHomeDeckId(activeNpcId);
    return deckId ? DECK_REGISTRY[deckId].accentColor : "#66E6FF";
  }, [activeNpcId]);

  // Stage `published` é o último passo da pílula. Quando a missão chega lá,
  // a barra inteira fica completa.
  const isComplete = mission.stage === "published";

  return (
    <section
      className={`mission-tracker${isComplete ? " mission-tracker-complete" : ""}`}
      style={{
        // @ts-expect-error CSS custom property
        "--mission-accent": accent
      }}
      aria-label="Progresso da missão criativa"
    >
      <header className="mission-tracker-header">
        <span className="mission-tracker-title">
          <Sparkles size={12} />
          Missão criativa
        </span>
        <span className="mission-tracker-stage-label">
          {MISSION_STEPS.find((s) => s.stage === mission.stage)?.label ?? mission.stage}
        </span>
      </header>
      <ol className="mission-tracker-steps">
        {MISSION_STEPS.map((step, index) => {
          const stepIndex = MISSION_ORDER.indexOf(step.stage);
          const status =
            stepIndex < currentIndex
              ? "done"
              : stepIndex === currentIndex
              ? "active"
              : "pending";
          const isOwnedByActiveNpc = step.responsibleNpcId === activeNpcId;
          return (
            <li
              key={step.stage}
              className={`mission-tracker-step mission-tracker-step-${status}${
                isOwnedByActiveNpc ? " mission-tracker-step-here" : ""
              }`}
            >
              <span className="mission-tracker-step-dot" aria-hidden="true">
                {status === "done" ? <Check size={11} /> : <span>{index + 1}</span>}
              </span>
              <span className="mission-tracker-step-text">
                <span className="mission-tracker-step-label">{step.label}</span>
                <span className="mission-tracker-step-npc">{step.responsibleNpcLabel}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function BriefPreviewCard({
  brief,
  clientDisplayName,
  onSendToDesign
}: {
  brief: GeneratedBrief;
  clientDisplayName: string;
  onSendToDesign: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(brief.markdown);
      } else {
        // Fallback minimalista — cria um textarea temporário.
        const textarea = document.createElement("textarea");
        textarea.value = brief.markdown;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Silencioso — o player ainda pode selecionar manualmente.
    }
  };

  const sendLabel = getActionLabel("send-brief-to-design");

  return (
    <section className="brief-card" aria-label={`Briefing de ${clientDisplayName}`}>
      <header className="brief-card-header">
        <span className="brief-card-icon" aria-hidden="true">
          <FileText size={16} />
        </span>
        <div className="brief-card-headline">
          <p className="brief-card-kicker">Briefing gerado</p>
          <p className="brief-card-title">
            {clientDisplayName} · {brief.theme}
          </p>
          <p className="brief-card-meta">
            {new Date(brief.generatedAt).toLocaleString("pt-BR")} ·{" "}
            {brief.postsPerMonth} posts ·{" "}
            {brief.pillars.length} pilares
          </p>
        </div>
      </header>

      <div className="brief-card-pills">
        {brief.pillars.slice(0, 4).map((pillar) => (
          <span key={pillar} className="brief-card-pill">
            {pillar}
          </span>
        ))}
      </div>

      <pre className="brief-card-preview">{brief.markdown}</pre>

      <footer className="brief-card-actions">
        <button
          type="button"
          className="brief-card-secondary"
          onClick={handleCopy}
          aria-live="polite"
        >
          {copied ? (
            <>
              <Check size={14} /> Copiado
            </>
          ) : (
            <>
              <Copy size={14} /> Copiar markdown
            </>
          )}
        </button>
        <button
          type="button"
          className="brief-card-primary"
          onClick={onSendToDesign}
        >
          <Send size={14} /> {sendLabel}
        </button>
      </footer>
    </section>
  );
}

function ClientCardBadge({
  state,
  npcName
}: {
  state: "active" | "activatable" | "blocked";
  npcName: string;
}) {
  if (state === "active") {
    return (
      <span className="dialog-client-pill dialog-client-pill-active">
        <ShieldCheck size={11} />
        Ativo
      </span>
    );
  }
  if (state === "activatable") {
    return (
      <span className="dialog-client-pill dialog-client-pill-activatable">
        <Sparkles size={11} />
        Ativar {npcName} MCP
      </span>
    );
  }
  return (
    <span className="dialog-client-pill dialog-client-pill-blocked">
      Aguardando EDEN
    </span>
  );
}
