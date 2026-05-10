import { Vector3 } from "three";
import { CharacterAnimator } from "../characters/CharacterAnimator";
import { resolveCharacterState } from "../characters/CharacterInteractionState";
import { createNPC, type NPCInstance } from "./createNPC";
import { MCP_NPCS, type MCPConfig } from "./mcpData";

export class NPCManager {
  readonly npcs: NPCInstance[];
  private readonly temp = new Vector3();
  private readonly playerPosition = new Vector3();
  private readonly animators = new Map<string, CharacterAnimator>();
  private readonly actionPulseIds = new Set<string>();
  private readonly completedIds = new Set<string>();
  private activeNpcId: string | null = null;

  constructor() {
    this.npcs = MCP_NPCS.map((config) => createNPC(config));
    this.npcs.forEach((npc, index) => {
      this.animators.set(npc.data.id, new CharacterAnimator(npc, index * 0.75));
    });
  }

  addToScene(scene: { add: (object: NPCInstance["group"]) => void }) {
    this.npcs.forEach((npc) => scene.add(npc.group));
  }

  update(delta: number, playerPosition: Vector3, nearbyNpcId: string | null, dialogNpcId: string | null) {
    this.activeNpcId = dialogNpcId ?? nearbyNpcId;
    this.playerPosition.copy(playerPosition);
    const elapsedTime = performance.now() * 0.001;

    this.npcs.forEach((npc) => {
      const animator = this.animators.get(npc.data.id);
      if (!animator) {
        return;
      }

      const state = resolveCharacterState({
        highlighted: npc.data.id === nearbyNpcId || npc.data.id === dialogNpcId,
        interacting: npc.data.id === dialogNpcId,
        actionTriggered: this.actionPulseIds.has(npc.data.id),
        completed: this.completedIds.has(npc.data.id)
      });

      animator.update(delta, elapsedTime, state, this.playerPosition);
    });

    this.actionPulseIds.clear();
  }

  getNearestNPC(playerPosition: Vector3, maxDistance: number) {
    let nearest: NPCInstance | null = null;
    let nearestDistance = maxDistance;

    for (const npc of this.npcs) {
      this.temp.copy(npc.group.position);
      this.temp.y = playerPosition.y;
      const distance = this.temp.distanceTo(playerPosition);
      if (distance < nearestDistance) {
        nearest = npc;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  findById(id: string | null): NPCInstance | null {
    if (!id) {
      return null;
    }
    return this.npcs.find((npc) => npc.data.id === id) ?? null;
  }

  getLabels() {
    return this.npcs.map((npc) => ({
      id: npc.data.id,
      name: npc.data.name,
      color: npc.data.color,
      zoneName: npc.data.zoneName,
      anchor: npc.labelAnchor
    }));
  }

  getNpcData(): MCPConfig[] {
    return MCP_NPCS;
  }

  triggerAction(id: string) {
    this.actionPulseIds.add(id);
    this.animators.get(id)?.pulseAction();
  }

  markCompleted(id: string) {
    this.completedIds.add(id);
  }
}
