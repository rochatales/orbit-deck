import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { GameControl } from "../controls/keyboardControls";
import { useDialogueStore } from "../state/useDialogueStore";
import { useGameStore } from "../state/useGameStore";
import { useMeetingStore } from "../state/useMeetingStore";
import { useWorkflowStore } from "../state/useWorkflowStore";

interface MeetingBeaconInteractionProps {
  position: { x: number; z: number };
  triggerRadius?: number;
}

/**
 * Mirror of InteractionManager but for the meeting beacon. Tracks player
 * proximity, exposes that to useMeetingStore (so InteractionManager can
 * suppress its 'no MCP nearby' notification when E is pressed for the
 * beacon), and intercepts E to flip the meeting state.
 *
 * Mount this AFTER InteractionManager in OfficeScene so its hint write
 * wins when the player is near both an NPC and the beacon.
 */
export function MeetingBeaconInteraction({
  position,
  // 2.6m: room walls + the beacon's own collider keep the player roughly 2.5m
  // away even on closest approach. Anything tighter and the hint never fires.
  triggerRadius = 2.6
}: MeetingBeaconInteractionProps) {
  const playerPosition = useGameStore((state) => state.playerPosition);
  const isPaused = useGameStore((state) => state.isPaused);
  const nearbyNpcId = useGameStore((state) => state.nearbyNpcId);
  const isDialogOpen = useDialogueStore((state) => state.isOpen);
  const setHint = useWorkflowStore((state) => state.setInteractionHint);
  const isMeetingActive = useMeetingStore((state) => state.isMeetingActive);
  const setPlayerNearBeacon = useMeetingStore((state) => state.setPlayerNearBeacon);
  const toggleMeeting = useMeetingStore((state) => state.toggleMeeting);

  const [subscribeKeys] = useKeyboardControls<GameControl>();
  const inRangeRef = useRef(false);

  useFrame(() => {
    const dx = playerPosition.x - position.x;
    const dz = playerPosition.z - position.z;
    const distSq = dx * dx + dz * dz;
    const inRange = distSq < triggerRadius * triggerRadius;

    if (inRange !== inRangeRef.current) {
      inRangeRef.current = inRange;
      setPlayerNearBeacon(inRange);
    }

    if (inRange && !isDialogOpen && !nearbyNpcId) {
      setHint(
        isMeetingActive
          ? "Pressione E para encerrar a reunião"
          : "Pressione E para iniciar a reunião dos MCPs"
      );
    }
  });

  useEffect(() => {
    const unsubscribe = subscribeKeys(
      (state) => state[GameControl.Interact],
      (pressed) => {
        if (!pressed || isPaused || isDialogOpen) {
          return;
        }
        if (!inRangeRef.current) {
          return;
        }
        // Defer to NPC dialogue if the player is near both.
        if (nearbyNpcId) {
          return;
        }
        toggleMeeting();
      }
    );
    return () => unsubscribe();
  }, [isDialogOpen, isPaused, nearbyNpcId, subscribeKeys, toggleMeeting]);

  // Clear the proximity flag when this component unmounts.
  useEffect(() => {
    return () => {
      setPlayerNearBeacon(false);
    };
  }, [setPlayerNearBeacon]);

  return null;
}
