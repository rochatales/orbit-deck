import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Vector3 } from "three";
import { GameControl } from "../controls/keyboardControls";
import type { MCPConfig } from "../npcs/mcpData";
import { useDialogueStore } from "../state/useDialogueStore";
import { useGameStore } from "../state/useGameStore";
import { useMeetingStore } from "../state/useMeetingStore";
import { useWorkflowStore } from "../state/useWorkflowStore";

interface InteractionManagerProps {
  npcs: MCPConfig[];
}

const SPACE_NAME = "Roki Media";
const INTERACTION_DISTANCE = 2;

export function InteractionManager({ npcs }: InteractionManagerProps) {
  const playerPosition = useGameStore((state) => state.playerPosition);
  const setNearbyNpcId = useGameStore((state) => state.setNearbyNpcId);
  const nearbyNpcId = useGameStore((state) => state.nearbyNpcId);
  const isPaused = useGameStore((state) => state.isPaused);
  const isOpen = useDialogueStore((state) => state.isOpen);
  const activeNpcId = useDialogueStore((state) => state.activeNpcId);
  const openConsole = useDialogueStore((state) => state.openConsole);
  const closeDialog = useDialogueStore((state) => state.closeDialog);
  const setHint = useWorkflowStore((state) => state.setInteractionHint);
  const setLocation = useWorkflowStore((state) => state.setLocation);
  const pushSystemNotification = useWorkflowStore((state) => state.pushSystemNotification);
  const completeTask = useWorkflowStore((state) => state.completeTask);
  const isPlayerNearBeacon = useMeetingStore((state) => state.isPlayerNearBeacon);
  const [subscribeKeys] = useKeyboardControls<GameControl>();
  const playerVector = useMemo(() => new Vector3(), []);
  const npcVector = useMemo(() => new Vector3(), []);

  useFrame(() => {
    playerVector.set(playerPosition.x, 0, playerPosition.z);

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
      setHint(`Pressione E para interagir com ${nearestNpc.name}`);
      setLocation(`${SPACE_NAME} · ${nearestNpc.zoneName}`);
    } else if (!isOpen) {
      setHint("Caminhe até uma mesa MCP para inspecionar o fluxo.");
      setLocation(SPACE_NAME);
    }
  });

  useEffect(() => {
    const unsubscribeInteract = subscribeKeys(
      (state) => state[GameControl.Interact],
      (pressed) => {
        if (!pressed || isPaused || isOpen) {
          return;
        }

        const npc = npcs.find((entry) => entry.id === nearbyNpcId);
        if (!npc) {
          // The MeetingBeaconInteraction handles its own E press; stay silent
          // when the player is using E for the beacon instead of for an MCP.
          if (!isPlayerNearBeacon) {
            pushSystemNotification("Nenhum MCP por perto", "Caminhe até uma mesa MCP para abrir o console.", "error");
          }
          return;
        }

        openConsole(npc.id);
        setHint("ESC para fechar o console MCP");
        setLocation(`${SPACE_NAME} · ${npc.zoneName}`);

        if (npc.id === "brand-brain") {
          completeTask("talk-brand-brain");
        }
      }
    );

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isPaused) {
        return;
      }

      if (event.code === "Escape" && isOpen) {
        closeDialog();
        return;
      }

    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      unsubscribeInteract();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDialog, completeTask, isOpen, isPaused, isPlayerNearBeacon, nearbyNpcId, npcs, openConsole, pushSystemNotification, setHint, setLocation, subscribeKeys]);

  return null;
}
