import { Vector3 } from "three";
import type { RectBounds } from "../utils/math";

export type MapRoomType = "hub" | "mcp" | "review" | "social" | "lab" | "outdoor";
export type DoorSide = "north" | "south" | "east" | "west";

export interface RoomAnchors {
  roomLabel: Vector3;
  deskLabel: Vector3;
  panel: Vector3;
  npcNameplate: Vector3;
}

export interface RoomDeskConfig {
  position: Vector3;
  rotationY: number;
  wide?: boolean;
}

export interface MapRoomConfig {
  id: string;
  name: string;
  position: { x: number; z: number };
  size: { width: number; depth: number };
  accentColor: string;
  secondaryAccentColor?: string;
  strategicAccentColor?: string;
  subtitle?: string;
  connectedTo?: string[];
  interactionPoint?: boolean;
  type: MapRoomType;
  npcId?: string;
  doorSides: DoorSide[];
  desk: RoomDeskConfig;
  anchors: RoomAnchors;
}

export interface CorridorConfig {
  id: string;
  position: { x: number; z: number };
  size: { width: number; depth: number };
  openSide?: DoorSide;
  railings?: boolean;
}

export const PLAYER_SPAWN = new Vector3(0, 0, 0.8);

export const OFFICE_MAP_BOUNDS: RectBounds = {
  minX: -22,
  maxX: 22,
  minZ: -15,
  maxZ: 27
};

// Meeting beacon — interactive lamp inside the meeting suite that toggles the
// MCP gathering. Shared between createOfficeMap (collider) and OfficeScene
// (visual + interaction). Half-size of 0.18 matches the cylinder base radius.
export const MEETING_BEACON_POSITION = { x: -2.8, z: 12.75 };
export const MEETING_BEACON_HALF_SIZE = 0.22;

export const WORKFLOW_SCREEN_POSITION = new Vector3(0, 2.35, 1.9);

export const MAP_ROOMS: MapRoomConfig[] = [
  {
    id: "central-hub",
    name: "Hub Central",
    position: { x: 0, z: 0 },
    size: { width: 8, depth: 8 },
    accentColor: "#EAF7FF",
    type: "hub",
    doorSides: ["north", "south", "east", "west"],
    desk: {
      position: new Vector3(0, 0, -0.6),
      rotationY: Math.PI
    },
    anchors: {
      roomLabel: new Vector3(0, 2.95, -3.1),
      deskLabel: new Vector3(0, 1.15, -0.2),
      panel: new Vector3(2.1, 2.25, -0.2),
      npcNameplate: new Vector3(0, 2.55, 0)
    }
  },
  {
    id: "brand-brain",
    name: "Mente das Marcas",
    position: { x: 0, z: -10 },
    size: { width: 7, depth: 6 },
    accentColor: "#F2C94C",
    type: "mcp",
    npcId: "brand-brain",
    doorSides: ["south", "east"],
    desk: {
      position: new Vector3(0, 0, -11.15),
      rotationY: Math.PI
    },
    anchors: {
      roomLabel: new Vector3(0, 2.92, -12.5),
      deskLabel: new Vector3(0, 1.15, -10.55),
      panel: new Vector3(-1.95, 2.05, -10.15),
      npcNameplate: new Vector3(0, 2.45, -10)
    }
  },
  {
    id: "editorial",
    name: "Direção Editorial",
    position: { x: -10, z: 0 },
    size: { width: 7, depth: 6 },
    accentColor: "#2F80ED",
    type: "mcp",
    npcId: "editorial",
    doorSides: ["east"],
    desk: {
      position: new Vector3(-11.3, 0, 0.15),
      rotationY: Math.PI / 2
    },
    anchors: {
      roomLabel: new Vector3(-10.2, 2.9, -2.35),
      deskLabel: new Vector3(-10.45, 1.15, 1.65),
      panel: new Vector3(-8.2, 2.02, 1.15),
      npcNameplate: new Vector3(-10, 2.45, 0)
    }
  },
  {
    id: "design",
    name: "Estúdio de Design",
    position: { x: 10, z: 0 },
    size: { width: 7, depth: 6 },
    accentColor: "#27AE60",
    type: "mcp",
    npcId: "design",
    doorSides: ["west"],
    desk: {
      position: new Vector3(11.3, 0, 0.15),
      rotationY: -Math.PI / 2
    },
    anchors: {
      roomLabel: new Vector3(9.8, 2.9, -2.35),
      deskLabel: new Vector3(10.45, 1.15, 1.65),
      panel: new Vector3(8.2, 2.02, 1.15),
      npcNameplate: new Vector3(10, 2.45, 0)
    }
  },
  {
    id: "smart-lab",
    name: "Smart Lab",
    subtitle: "Brand × Design Intelligence",
    type: "lab",
    position: { x: 6.5, z: -10 },
    size: { width: 6, depth: 4 },
    accentColor: "#66E6FF",
    secondaryAccentColor: "#27AE60",
    strategicAccentColor: "#F2C94C",
    connectedTo: ["brand-brain", "design"],
    interactionPoint: true,
    doorSides: ["west", "east"],
    desk: {
      position: new Vector3(6.5, 0, -10),
      rotationY: 0
    },
    anchors: {
      roomLabel: new Vector3(6.5, 2.9, -11.8),
      deskLabel: new Vector3(6.5, 1.15, -10),
      panel: new Vector3(5.5, 2.05, -10),
      npcNameplate: new Vector3(6.5, 2.45, -10)
    }
  },
  {
    id: "narration",
    name: "Cabine de Narração",
    position: { x: -8, z: 9 },
    size: { width: 6, depth: 5 },
    accentColor: "#9B51E0",
    type: "mcp",
    npcId: "narration",
    doorSides: ["north"],
    desk: {
      position: new Vector3(-9.35, 0, 9.35),
      rotationY: Math.PI / 2
    },
    anchors: {
      roomLabel: new Vector3(-8.05, 2.82, 6.95),
      deskLabel: new Vector3(-7.55, 1.12, 10.55),
      panel: new Vector3(-6.35, 1.98, 10.1),
      npcNameplate: new Vector3(-8, 2.38, 9)
    }
  },
  {
    id: "output-review",
    name: "Console de Revisão",
    position: { x: 8, z: 9 },
    size: { width: 6, depth: 5 },
    accentColor: "#F5F5F5",
    type: "review",
    npcId: "output-review",
    doorSides: ["north"],
    desk: {
      position: new Vector3(8, 0, 10.2),
      rotationY: Math.PI,
      wide: true
    },
    anchors: {
      roomLabel: new Vector3(8, 2.82, 6.95),
      deskLabel: new Vector3(8, 1.12, 10.95),
      panel: new Vector3(6.05, 2.02, 10.15),
      npcNameplate: new Vector3(8, 2.38, 9)
    }
  },
  {
    id: "meeting-suite",
    name: "Sala de Reuniao",
    position: { x: 0, z: 14.5 },
    size: { width: 8, depth: 6 },
    accentColor: "#7FD8FF",
    type: "social",
    doorSides: ["north", "south", "east"],
    desk: {
      position: new Vector3(0, 0, 14.75),
      rotationY: 0,
      wide: true
    },
    anchors: {
      roomLabel: new Vector3(0, 2.95, 11.95),
      deskLabel: new Vector3(0, 1.15, 16),
      panel: new Vector3(-2.25, 2.12, 12.1),
      npcNameplate: new Vector3(0, 2.45, 14.5)
    }
  },
  {
    id: "coffee-nook",
    name: "Cantinho do Cafe",
    position: { x: 7.5, z: 14.5 },
    size: { width: 4, depth: 4 },
    accentColor: "#FFB870",
    type: "social",
    doorSides: ["west"],
    desk: {
      position: new Vector3(8.1, 0, 14.5),
      rotationY: -Math.PI / 2
    },
    anchors: {
      roomLabel: new Vector3(7.5, 2.7, 12.95),
      deskLabel: new Vector3(6.85, 1.15, 15.45),
      panel: new Vector3(6.2, 2.05, 14.45),
      npcNameplate: new Vector3(7.5, 2.3, 14.5)
    }
  }
];

export const MAP_CORRIDORS: CorridorConfig[] = [
  {
    id: "hub-ring-north",
    position: { x: 0, z: -5.5 },
    size: { width: 12.2, depth: 2.6 },
    railings: false
  },
  {
    id: "hub-ring-west",
    position: { x: -5.5, z: 0 },
    size: { width: 2.6, depth: 11.4 },
    railings: false
  },
  {
    id: "hub-ring-east",
    position: { x: 5.5, z: 0 },
    size: { width: 2.6, depth: 11.4 },
    railings: false
  },
  {
    id: "hub-ring-south",
    position: { x: 0, z: 5.5 },
    size: { width: 18.4, depth: 2.6 },
    railings: false
  },
  {
    id: "north-connector-brand",
    position: { x: 0, z: -8.5 },
    size: { width: 2.8, depth: 2.8 },
    railings: false
  },
  {
    id: "west-connector-editorial",
    position: { x: -8, z: 0 },
    size: { width: 2.8, depth: 2.8 },
    railings: false
  },
  {
    id: "east-connector-design",
    position: { x: 8, z: 0 },
    size: { width: 2.8, depth: 2.8 },
    railings: false
  },
  {
    id: "lab-connector",
    position: { x: 7, z: -5.5 },
    size: { width: 7, depth: 5 },
    railings: false
  },
  {
    id: "lab-patio",
    position: { x: 12, z: -7.5 },
    size: { width: 5, depth: 9 },
    railings: false
  },
  {
    id: "southwest-connector-narration",
    position: { x: -7.2, z: 7.5 },
    size: { width: 2.8, depth: 1.9 },
    railings: false
  },
  {
    id: "southeast-connector-output",
    position: { x: 7.2, z: 7.5 },
    size: { width: 2.8, depth: 1.9 },
    railings: false
  },
  {
    id: "south-connector-meeting",
    position: { x: 0, z: 9.5 },
    size: { width: 4, depth: 5.5 },
    railings: false
  },
  {
    id: "meeting-east-connector",
    position: { x: 4.75, z: 14.5 },
    size: { width: 2.5, depth: 3 },
    railings: false
  },
  {
    id: "meeting-exterior-airlock",
    position: { x: 0, z: 19.0 },
    size: { width: 4, depth: 3 },
    railings: false
  },
  {
    id: "exterior-south-path",
    position: { x: 0, z: 23.5 },
    size: { width: 14, depth: 8 },
    railings: false
  },
  {
    id: "garden-connector-path",
    position: { x: 7.25, z: 21.0 },
    size: { width: 4.5, depth: 9 },
    railings: false
  },
  {
    id: "lower-central-walkway",
    position: { x: 11.5, z: 15.75 },
    size: { width: 4, depth: 8.5 },
    railings: false
  },
  {
    id: "right-mcp-connector",
    position: { x: 13.0, z: 7.25 },
    size: { width: 4, depth: 8.5 },
    railings: false
  },
  {
    id: "right-outer-walkway",
    position: { x: 15.5, z: -1.0 },
    size: { width: 5, depth: 8.0 },
    railings: false
  },
  {
    id: "exterior-west-path",
    position: { x: -8.5, z: 21.5 },
    size: { width: 13, depth: 4 },
    railings: false
  },
  {
    id: "futuristic-garden-pad",
    position: { x: -15.5, z: 23.5 },
    size: { width: 9, depth: 6 },
    railings: false
  },
  {
    id: "orbit-garden",
    position: { x: 12.5, z: 23.5 },
    size: { width: 11, depth: 7 },
    railings: false
  }
];

export function getRoomByNpcId(npcId: string) {
  return MAP_ROOMS.find((room) => room.npcId === npcId);
}

const EXTERIOR_CORRIDOR_IDS = new Set([
  "lab-patio",
  "meeting-exterior-airlock",
  "exterior-south-path",
  "garden-connector-path",
  "lower-central-walkway",
  "right-mcp-connector",
  "right-outer-walkway",
  "exterior-west-path",
  "futuristic-garden-pad",
  "orbit-garden"
]);

function isPositionInsideRoom(x: number, z: number, room: MapRoomConfig) {
  const halfWidth = room.size.width / 2;
  const halfDepth = room.size.depth / 2;
  return (
    x >= room.position.x - halfWidth &&
    x <= room.position.x + halfWidth &&
    z >= room.position.z - halfDepth &&
    z <= room.position.z + halfDepth
  );
}

function isPositionInsideCorridor(x: number, z: number, corridor: CorridorConfig) {
  const halfWidth = corridor.size.width / 2;
  const halfDepth = corridor.size.depth / 2;
  return (
    x >= corridor.position.x - halfWidth &&
    x <= corridor.position.x + halfWidth &&
    z >= corridor.position.z - halfDepth &&
    z <= corridor.position.z + halfDepth
  );
}

function getRoomHudLabel(room: MapRoomConfig): string {
  if (room.id === "central-hub") return "Sala Principal";
  if (room.id === "meeting-suite") return "Sala de Reuniao";
  return room.name;
}

export function getLocationLabelByPosition(x: number, z: number): string {
  const room = MAP_ROOMS.find((entry) => isPositionInsideRoom(x, z, entry));
  if (room) return getRoomHudLabel(room);

  const corridor = MAP_CORRIDORS.find((entry) => isPositionInsideCorridor(x, z, entry));
  if (corridor) {
    if (corridor.id === "orbit-garden") {
      return "Jardim Espacial";
    }
    return EXTERIOR_CORRIDOR_IDS.has(corridor.id) ? "Area externa" : "Corredor";
  }

  return "Sala Principal";
}
