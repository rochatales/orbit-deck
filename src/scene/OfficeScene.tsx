import { useMemo } from "react";
import { MCPCharacter } from "../characters/MCPCharacter";
import { Player } from "../characters/Player";
import { InteractionManager } from "../interactions/InteractionManager";
import { MeetingBeaconInteraction } from "../interactions/MeetingBeaconInteraction";
import { MCP_NPCS } from "../npcs/mcpData";
import { CameraRig } from "./CameraRig";
import { Lighting } from "./Lighting";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { DialogueModal } from "../ui/DialogueModal";
import { MeetingBeacon } from "../world/MeetingBeacon";
import { OfficeMap } from "../world/OfficeMap";
import { createOfficeMap } from "../world/createOfficeMap";
import { MEETING_BEACON_POSITION } from "../world/mapConfig";

const BEACON_VISUAL_POSITION: [number, number, number] = [
  MEETING_BEACON_POSITION.x,
  0,
  MEETING_BEACON_POSITION.z
];

export function OfficeScene() {
  const officeWorld = useMemo(() => createOfficeMap(MCP_NPCS), []);

  return (
    <>
      <color attach="background" args={["#ebe2d5"]} />
      <fog attach="fog" args={["#efe6da", 26, 54]} />
      <Lighting />
      <CameraRig />
      <PhysicsWorld officeWorld={officeWorld} npcs={MCP_NPCS}>
        <OfficeMap officeWorld={officeWorld} />
        <Player officeWorld={officeWorld} />
      </PhysicsWorld>
      {MCP_NPCS.map((npc, index) => (
        <MCPCharacter key={npc.id} npc={npc} index={index} />
      ))}
      <MeetingBeacon position={BEACON_VISUAL_POSITION} />
      <DialogueModal />
      <InteractionManager npcs={MCP_NPCS} />
      <MeetingBeaconInteraction position={MEETING_BEACON_POSITION} />
    </>
  );
}
