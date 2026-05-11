import type { NpcAction, NpcId } from "../domain/mcpActions";
import { NPC_CHARACTER_ASSET_CONFIG } from "../characters/characterAssetConfig";

export interface MCPConfig {
  id: NpcId;
  name: string;
  zoneName: string;
  role: string;
  color: string;
  position: { x: number; y: number; z: number };
  interactionRadius: number;
  dialogue: string;
  actions: NpcAction[];
  isEnvironmentNode?: boolean;
}

export const MCP_NPCS: MCPConfig[] = Object.values(NPC_CHARACTER_ASSET_CONFIG).map((config) => ({
  id: config.id as NpcId,
  name: config.name,
  zoneName: config.zoneName ?? "Roki Media",
  role: config.role,
  color: config.accentColor,
  position: config.position ?? { x: 0, y: 0, z: 0 },
  interactionRadius: config.interactionRadius,
  dialogue: config.dialogue ?? "",
  actions: config.actions ?? [],
  isEnvironmentNode: config.isEnvironmentNode ?? false
}));
