import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { postSmartLabChat } from "../api/mcpClient";
import type { AgentRuntimeInfo } from "../domain/agentStatus";
import { MCP_NPCS } from "../npcs/mcpData";
import {
  useClientSetupStore,
  type CustomClientRecord,
  type SmartLabMessage
} from "../state/useClientSetupStore";
import { useClientSessionStore } from "../state/useClientSessionStore";
import { useDialogueStore } from "../state/useDialogueStore";
import { deriveAgentStatus } from "../state/useAgentStatus";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { useWorkflowStore } from "../state/useWorkflowStore";
import { SmartLabConsole } from "./DialogueModal";

type SmartLabAgentNpcId =
  | "brand-brain"
  | "editorial"
  | "design"
  | "narration"
  | "output-review";

export function SmartLabOverlay() {
  const isOpen = useDialogueStore((state) => state.isOpen);
  const activeNpcId = useDialogueStore((state) => state.activeNpcId);
  const mode = useDialogueStore((state) => state.mode);
  const closeDialog = useDialogueStore((state) => state.closeDialog);
  const customClients = useClientSetupStore((state) => state.customClients);
  const appendSmartLabMessages = useClientSetupStore(
    (state) => state.appendSmartLabMessages
  );
  const selectedClientSlug = useClientSessionStore((state) => state.selectedClientSlug);
  const selectClient = useClientSessionStore((state) => state.selectClient);
  const profile = usePlayerJourneyStore((state) => state.profile);
  const activatedDeckIds = usePlayerJourneyStore((state) => state.activatedDeckIds);
  const connections = usePlayerJourneyStore((state) => state.connections);
  // Etapas 2-4 do plano: as informações da HUD (Estacao/Execucao/Log), os
  // controles globais (Gamepad/Pause/Config) e o interactionHint
  // ("Pressione E para interagir com Console") saíram do Console — a HUD do
  // mapa cuida disso por baixo do overlay. Aqui só resta o workflowStatus
  // que alimenta o diagnóstico do monitor central.
  const workflowStatus = useWorkflowStore((state) => state.workflowStatus);
  const activeActionKeys = useWorkflowStore((state) => state.activeActionKeys);
  const notifications = useWorkflowStore((state) => state.notifications);
  const [selectingClient, setSelectingClient] = useState(true);
  const [smartLabInput, setSmartLabInput] = useState("");
  const [smartLabError, setSmartLabError] = useState<string | null>(null);
  const [smartLabPending, setSmartLabPending] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);

  const npc = useMemo(
    () => MCP_NPCS.find((entry) => entry.id === activeNpcId) ?? null,
    [activeNpcId]
  );
  const isSmartLabOpen = isOpen && mode === "console" && npc?.id === "smart-lab";
  const visibleClients = useMemo(
    () => customClients.filter((client) => client.mcpActivation.brandBrain),
    [customClients]
  );
  const selectedClientRecord = useMemo(
    () => visibleClients.find((client) => client.slug === selectedClientSlug) ?? null,
    [visibleClients, selectedClientSlug]
  );
  const smartLabMessages = selectedClientRecord?.smartLab?.messages ?? [];
  const agentStatuses = useMemo<
    Array<{ npcId: SmartLabAgentNpcId; label: string; info: AgentRuntimeInfo }>
  >(
    () =>
      ([
        { npcId: "brand-brain", label: "EDEN" },
        { npcId: "editorial", label: "MISTER" },
        { npcId: "design", label: "MAX" },
        { npcId: "narration", label: "NARA" },
        { npcId: "output-review", label: "ASTRA" }
      ] as const).map((agent) => ({
        ...agent,
        info: deriveAgentStatus({
          npcId: agent.npcId,
          profile,
          activatedDeckIds,
          connections,
          activeActionKeys,
          notifications
        })
      })),
    [profile, activatedDeckIds, connections, activeActionKeys, notifications]
  );

  useEffect(() => {
    if (!isSmartLabOpen) {
      return;
    }
    setSelectingClient(selectedClientRecord == null);
    setSmartLabInput("");
    setSmartLabError(null);
    setSmartLabPending(false);
    setPendingUserMessage(null);
  }, [isSmartLabOpen, selectedClientRecord]);

  const handleClientSelect = (record: CustomClientRecord) => {
    selectClient(record.slug);
    setSelectingClient(false);
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
        response.updatedRulesMd ?? selectedClientRecord.rulesMd
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

  if (!isSmartLabOpen || !npc) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="smartlab-overlay"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
      >
        <SmartLabConsole
          npcName={npc.name}
          visibleClients={visibleClients}
          selectingClient={selectingClient}
          selectedClientRecord={selectedClientRecord}
          smartLabMessages={smartLabMessages}
          pendingUserMessage={pendingUserMessage}
          smartLabPending={smartLabPending}
          smartLabError={smartLabError}
          smartLabInput={smartLabInput}
          workflowStatus={workflowStatus}
          agentStatuses={agentStatuses}
          emptyStateMessage="Nenhum cliente cadastrado ainda. Cadastre um cliente no EDEN para abrir o chat e revisar as regras da marca."
          onSelectClient={handleClientSelect}
          onSwitchClient={() => setSelectingClient(true)}
          onClose={closeDialog}
          onInputChange={setSmartLabInput}
          onSubmit={handleSmartLabSubmit}
        />
      </motion.div>
    </AnimatePresence>
  );
}
