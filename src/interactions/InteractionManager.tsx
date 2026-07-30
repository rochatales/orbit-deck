import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Vector3 } from "three";
import { getAgentHomeDeckId } from "../domain/decks";
import type { MCPConfig } from "../npcs/mcpData";
import { useClientSetupStore } from "../state/useClientSetupStore";
import { useDialogueStore } from "../state/useDialogueStore";
import { usePlayerJourneyStore } from "../state/usePlayerJourneyStore";
import { useGameStore } from "../state/useGameStore";
import { useMeetingStore } from "../state/useMeetingStore";
import { useWorkflowStore } from "../state/useWorkflowStore";
import { getLocationLabelByPosition } from "../world/mapConfig";

interface InteractionManagerProps {
  npcs: MCPConfig[];
}

const INTERACTION_DISTANCE = 2;

function isTextEntryTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function InteractionManager({ npcs }: InteractionManagerProps) {
  const playerPosition = useGameStore((state) => state.playerPosition);
  const setNearbyNpcId = useGameStore((state) => state.setNearbyNpcId);
  const nearbyNpcId = useGameStore((state) => state.nearbyNpcId);
  const isPaused = useGameStore((state) => state.isPaused);
  const isOpen = useDialogueStore((state) => state.isOpen);
  const dialogueMode = useDialogueStore((state) => state.mode);
  const openConsole = useDialogueStore((state) => state.openConsole);
  const openInteractionScreen = useDialogueStore((state) => state.openInteractionScreen);
  const openActivationPrompt = useDialogueStore((state) => state.openActivationPrompt);
  const closeDialog = useDialogueStore((state) => state.closeDialog);
  const isWizardOpen = useClientSetupStore((state) => state.isWizardOpen);
  const activatedDeckIds = usePlayerJourneyStore((state) => state.activatedDeckIds);
  const isOrbitalMapOpen = usePlayerJourneyStore((state) => state.isOrbitalMapOpen);
  const setHint = useWorkflowStore((state) => state.setInteractionHint);
  const setLocation = useWorkflowStore((state) => state.setLocation);
  const pushSystemNotification = useWorkflowStore((state) => state.pushSystemNotification);
  const isPlayerNearBeacon = useMeetingStore((state) => state.isPlayerNearBeacon);
  const playerVector = useMemo(() => new Vector3(), []);
  const npcVector = useMemo(() => new Vector3(), []);

  useFrame(() => {
    playerVector.set(playerPosition.x, 0, playerPosition.z);
    const currentLocation = getLocationLabelByPosition(playerPosition.x, playerPosition.z);

    let nearestNpc: MCPConfig | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const npc of npcs) {
      npcVector.set(npc.position.x, 0, npc.position.z);
      const distance = npcVector.distanceTo(playerVector);
      if (distance < Math.min(npc.interactionRadius, INTERACTION_DISTANCE) && distance < nearestDistance) {
        nearestNpc = npc;
        nearestDistance = distance;
      }
    }

    setNearbyNpcId(nearestNpc?.id ?? null);

    if (!isOpen && nearestNpc) {
      const homeDeckId = getAgentHomeDeckId(nearestNpc.id);
      const needsActivation =
        homeDeckId !== null && !activatedDeckIds.includes(homeDeckId);
      // Hint diferente quando o player chega num NPC com deck ainda inativo:
      // deixa claro que o E vai ativar a estação, não abrir o console.
      setHint(
        needsActivation
          ? `Pressione E para ativar ${nearestNpc.name}`
          : `Pressione E para interagir com ${nearestNpc.name}`
      );
      setLocation(currentLocation);
    } else if (!isOpen) {
      setHint("Caminhe até uma mesa MCP para inspecionar o fluxo.");
      setLocation(currentLocation);
    }
  });

  useEffect(() => {
    const handleInteractKey = (event: KeyboardEvent) => {
      if (event.repeat || event.code !== "KeyE") {
        return;
      }
      if (isTextEntryTarget(event.target)) {
        return;
      }
      if (isPaused || isOpen || isWizardOpen || isOrbitalMapOpen) {
        return;
      }

      const npc = npcs.find((entry) => entry.id === nearbyNpcId);
      if (!npc) {
        // The MeetingBeaconInteraction handles its own E press; stay silent
        // when the player is using E for the beacon instead of for an MCP.
        if (!isPlayerNearBeacon) {
          pushSystemNotification(
            "Nenhum MCP por perto",
            "Caminhe até uma mesa MCP para abrir o console.",
            "error"
          );
        }
        return;
      }

      event.preventDefault();
      const homeDeckId = getAgentHomeDeckId(npc.id);
      const needsActivation =
        homeDeckId !== null && !activatedDeckIds.includes(homeDeckId);

      if (needsActivation) {
        openActivationPrompt(npc.id);
        setHint("ESC para cancelar a ativação");
        setLocation(getLocationLabelByPosition(playerPosition.x, playerPosition.z));
        return;
      }

      if (npc.id === "brand-brain") {
        // A missão "talk-brand-brain" só é concluída quando o player de fato
        // termina o cadastro na cena (BrandBrainRegistrationPanel.submit, na
        // etapa de review). Marcar aqui faria a missão completar só por
        // pressionar E na frente de EDEN.
        openInteractionScreen(npc.id, "brand-brain");
        setHint("ESC para fechar a cena com EDEN");
        setLocation(getLocationLabelByPosition(playerPosition.x, playerPosition.z));
        return;
      }

      openConsole(npc.id);
      setHint("ESC para fechar o console MCP");
      setLocation(getLocationLabelByPosition(playerPosition.x, playerPosition.z));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isPaused) {
        return;
      }

      if (event.code === "Escape" && isOpen) {
        // Quando uma cena de interação dedicada está montada (ex.: a cena
        // pixel-art do Brand Brain), ela tem seu próprio handler de ESC que
        // também limpa estado local (stepIndex, draft). Deixamos a cena
        // ser dona do fechamento e evitamos disparar closeDialog duas vezes.
        if (dialogueMode === "interaction-screen") {
          return;
        }
        closeDialog();
        return;
      }
    };

    window.addEventListener("keydown", handleInteractKey);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", handleInteractKey);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    activatedDeckIds,
    closeDialog,
    dialogueMode,
    isOpen,
    isOrbitalMapOpen,
    isPaused,
    isPlayerNearBeacon,
    isWizardOpen,
    nearbyNpcId,
    npcs,
    openActivationPrompt,
    openConsole,
    openInteractionScreen,
    pushSystemNotification,
    playerPosition.x,
    playerPosition.z,
    setHint,
    setLocation
  ]);

  return null;
}
