import { LABORATORIO } from '../game/laboratorioLayout';
import { QUARTEL, QUARTEL_CIRCULATION } from '../game/quartelLayout';
import masterplan from './marsMasterplan.json';
import { Vector3 } from "three";
import type { RectBounds } from "../utils/math";

export type MapRoomType = "hub" | "station" | "review" | "social" | "lab" | "outdoor";
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
  minZ: -19,
  maxZ: 39
};

// Masterplan v007: posições e dimensões exatas, sem arredondar para ladrilhos.
export const MAP_ROOMS: MapRoomConfig[] = masterplan.rooms.map(room => {
  // ID design preservado para consumidores e saves anteriores; nome/pegada atuais.
  const size = room.id === 'design' ? QUARTEL.dimensions : room.id === 'smart-lab' ? LABORATORIO.dimensions : room.size;
  const position = room.id === 'design' ? QUARTEL.placement : room.id === 'smart-lab' ? LABORATORIO.placement : room.position;
  return {
    id: room.id, name: room.id === 'design' ? 'Quartel' : room.name, position, size,
    type: room.id === 'central-hub' ? 'hub' : room.id === 'smart-lab' ? 'lab' : 'station',
    accentColor: room.id === 'brand-brain' ? '#F2C94C' : '#00E6FF',
    npcId: room.id === 'brand-brain' ? 'eden' : undefined,
    doorSides: room.doorSides as DoorSide[],
    desk: { position: new Vector3(position.x, 0, position.z - 0.6), rotationY: Math.PI },
    anchors: {
      roomLabel: new Vector3(position.x, 2.95, position.z - size.depth / 2 + 0.5),
      deskLabel: new Vector3(position.x, 1.15, position.z - 0.2),
      panel: new Vector3(position.x + 1, 2.05, position.z),
      npcNameplate: new Vector3(position.x, 2.45, position.z)
    }
  };
});
export const MAP_CORRIDORS: CorridorConfig[] = masterplan.corridors.map(corridor => {
  const current = LABORATORIO.connectors.find(c => c.id === corridor.id) ?? QUARTEL.connectors.find(c => c.id === corridor.id);
  return {
    id: corridor.id,
    position: current ? { x: (current.minX + current.maxX) / 2, z: (current.minZ + current.maxZ) / 2 } : corridor.position,
    size: current ? { width: current.maxX - current.minX, depth: current.maxZ - current.minZ } : corridor.size,
    railings: false
  };
}).concat(QUARTEL_CIRCULATION.areas.map(a => ({
  id: a.id, position: { x: (a.minX + a.maxX) / 2, z: (a.minZ + a.maxZ) / 2 },
  size: { width: a.maxX - a.minX, depth: a.maxZ - a.minZ }, railings: false
})));

export function getRoomByNpcId(npcId: string) {
  return MAP_ROOMS.find((room) => room.npcId === npcId);
}

const EXTERIOR_CORRIDOR_IDS = new Set([
  "central-plaza", "build-zone-a", "build-zone-b", "greenhouse-connector", "east-service-path", "east-greenhouse-path",
  "lab-patio",
  "meeting-exterior-airlock",
  "exterior-south-path",
  "garden-connector-path",
  "lower-central-walkway",
  "right-station-connector",
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
  if (room.id === "central-hub") return "Sala de reunião";
  if (room.id === "meeting-suite") return "Doca de carga";
  return room.name;
}

export function getLocationLabelByPosition(x: number, z: number): string {
  const room = MAP_ROOMS.find((entry) => isPositionInsideRoom(x, z, entry));
  if (room) return getRoomHudLabel(room);

  const corridor = MAP_CORRIDORS.find((entry) => isPositionInsideCorridor(x, z, entry));
  if (corridor) {
    if (corridor.id === "orbit-garden") {
      return "Estufa";
    }
    return masterplan.corridors.find(entry => entry.id === corridor.id)?.kind === "path" || EXTERIOR_CORRIDOR_IDS.has(corridor.id) ? "Área externa" : "Corredor";
  }

  return "Colônia de Marte";
}
