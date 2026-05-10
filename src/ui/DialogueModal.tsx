import { Html } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, ChevronRight, Cpu, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getClientProfile, npcSupportsClient } from "../domain/clientProfiles";
import { MCP_NPCS } from "../npcs/mcpData";
import { useClientSessionStore } from "../state/useClientSessionStore";
import { useDialogueStore } from "../state/useDialogueStore";
import { useGameStore } from "../state/useGameStore";
import { useWorkflowStore } from "../state/useWorkflowStore";
import { ActionButton } from "./ActionButton";
import { getActionMeta } from "./actionMeta";

export function DialogueModal() {
  const isOpen = useDialogueStore((state) => state.isOpen);
  const activeNpcId = useDialogueStore((state) => state.activeNpcId);
  const closeDialog = useDialogueStore((state) => state.closeDialog);
  const availableClients = useClientSessionStore((state) => state.availableClients);
  const selectedClientSlug = useClientSessionStore((state) => state.selectedClientSlug);
  const selectClient = useClientSessionStore((state) => state.selectClient);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const handleNpcAction = useWorkflowStore((state) => state.handleNpcAction);
  const isActionInFlight = useWorkflowStore((state) => state.isActionInFlight);
  const [selectingClient, setSelectingClient] = useState(true);

  const npc = MCP_NPCS.find((entry) => entry.id === activeNpcId) ?? null;
  const selectedClient = useMemo(() => getClientProfile(selectedClientSlug), [selectedClientSlug]);
  const clientSupportsActions = npc && selectedClient ? npcSupportsClient(npc.id, selectedClient) : false;
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

    setSelectingClient(selectedClient == null);
  }, [isOpen, selectedClient]);

  const handleClientSelect = (clientSlug: string) => {
    selectClient(clientSlug);
    setSelectingClient(false);
  };

  return (
    <AnimatePresence>
      {isOpen && npc && (
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

                <div className="dialog-client-block">
                  <div className="dialog-client-header">
                    <div className="dialog-client-label">
                      <Building2 size={13} />
                      Cliente
                    </div>
                    {selectedClient && !selectingClient ? (
                      <button className="dialog-client-switch" type="button" onClick={() => setSelectingClient(true)}>
                        <RefreshCw size={13} />
                        Trocar
                      </button>
                    ) : null}
                  </div>

                  {selectingClient ? (
                    <div className="dialog-client-grid">
                      {availableClients.map((client) => (
                        <button
                          key={client.slug}
                          className={`dialog-client-card${selectedClient?.slug === client.slug ? " dialog-client-card-active" : ""}`}
                          type="button"
                          onClick={() => handleClientSelect(client.slug)}
                        >
                          <div className="dialog-client-name-row">
                            <span className="dialog-client-name">{client.displayName}</span>
                            <ChevronRight size={15} />
                          </div>
                          <span className="dialog-client-summary">{client.summary}</span>
                        </button>
                      ))}
                    </div>
                  ) : selectedClient ? (
                    <div className="dialog-client-active">
                      <div className="dialog-client-badge">Cliente ativo</div>
                      <div className="dialog-client-name">{selectedClient.displayName}</div>
                      <div className="dialog-client-summary">{selectedClient.summary}</div>
                    </div>
                  ) : null}
                </div>

                {!selectingClient && selectedClient ? (
                  <>
                    <p className="dialog-text">{npc.dialogue}</p>
                    {!clientSupportsActions ? (
                      <div className="dialog-empty-state">
                        Esta etapa ainda não está habilitada para <strong>{selectedClient.displayName}</strong>.
                      </div>
                    ) : (
                      <div className="dialog-actions">
                        {npc.actions.map((action) => {
                          const meta = getActionMeta(action.id);
                          const busy = isActionInFlight(npc.id, action.id, selectedClient.slug);

                          return (
                            <ActionButton
                              key={`${selectedClient.slug}:${action.id}`}
                              className="dialog-action"
                              icon={meta.icon}
                              busy={busy}
                              disabled={busy}
                              onClick={() => handleNpcAction(npc.name, npc.id, action, selectedClient)}
                            >
                              {action.label}
                            </ActionButton>
                          );
                        })}
                      </div>
                    )}
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
