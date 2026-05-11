import {
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Vector3
} from "three";
import type { RectBounds } from "../utils/math";
import type { MCPConfig } from "../npcs/mcpData";
import { damp } from "../utils/math";
import {
  createHologramPanel,
  createDesk,
  createDoorFrame,
  createAutomaticDoor,
  createRoomLabel,
  createScreen
} from "./assets/createModularAssets";
import {
  createInstancedChairs,
  createInstancedDecorNodes,
  createInstancedFloorTiles,
  createInstancedGlassPanels,
  createInstancedPlants,
  createInstancedWallPanels,
  type ChairEntry,
  type DecorNodeEntry,
  type FloorTileEntry,
  type LinearInstanceEntry,
  type PointEntry
} from "./createInstancedDecor";
import {
  MAP_CORRIDORS,
  MAP_ROOMS,
  MEETING_BEACON_HALF_SIZE,
  MEETING_BEACON_POSITION,
  OFFICE_MAP_BOUNDS,
  type CorridorConfig,
  type DoorSide,
  type MapRoomConfig
} from "./mapConfig";

export interface OfficeWorld {
  group: Group;
  bounds: RectBounds;
  obstacles: RectBounds[];
  walkableAreas: RectBounds[];
  update: (playerPosition: Vector3, delta: number) => void;
}

interface AutomaticDoorInstance {
  root: Group;
  leftPanel: Mesh;
  rightPanel: Mesh;
  lightBar: Mesh;
  anchor: Object3D;
  width: number;
  side: DoorSide;
  openAmount: number;
}

interface InstancedWorldAssets {
  floorTiles: Map<string, FloorTileEntry[]>;
  // Tracks which (x,z) tile cells already have a floor tile so we don't emit a
  // second coplanar tile from an overlapping corridor/room and Z-fight at the
  // doorway threshold.
  tileOccupied: Set<string>;
  // Sequential counter — each floor patch gets a sub-millimeter unique Y offset
  // so that even when grids are misaligned (e.g. corridor tiles fall on
  // half-integer offsets vs room tiles on integer offsets) no two coplanar tile
  // bodies share a depth plane and the GPU has nothing to fight over.
  patchCount: number;
  wallPanels: LinearInstanceEntry[];
  glassPanels: LinearInstanceEntry[];
  chairs: ChairEntry[];
  ceilingLights: PointEntry[];
  plants: PointEntry[];
  decorNodes: Map<string, DecorNodeEntry[]>;
}

const ROOM_WALL_HEIGHT = 2.7;
const ROOM_WALL_THICKNESS = 0.28;
const GLASS_HEIGHT = 2.16;
const TILE_SIZE = 1;
const INDOOR_WALKING_TILE_COLOR = "#e7e0d6";
const INDOOR_WALKING_TILE_INSET_COLOR = "#f4eee4";
const OUTDOOR_WALKING_TILE_COLOR = "#9a6950";
const OUTDOOR_WALKING_TILE_INSET_COLOR = "#c48d6f";
const GARDEN_WALKING_TILE_COLOR = "#6d7f68";
const GARDEN_WALKING_TILE_INSET_COLOR = "#c6d5c0";
const OUTDOOR_PATH_IDS = new Set([
  "lab-patio",
  "exterior-south-path",
  "garden-connector-path",
  "lower-central-walkway",
  "right-mcp-connector",
  "right-outer-walkway",
  "exterior-west-path",
  "orbit-garden"
]);

export function createOfficeMap(mcpConfigs: MCPConfig[]): OfficeWorld {
  const group = new Group();
  const obstacles: RectBounds[] = [];
  const walkableAreas: RectBounds[] = [];
  const doors: AutomaticDoorInstance[] = [];
  const instancedAssets = createInstancedAssetBuckets();

  group.add(createDioramaBase());

  MAP_ROOMS.forEach((room) => {
    const roomGroup =
      room.type === "hub"
        ? createCentralHub(room, obstacles, doors, instancedAssets)
        : room.type === "lab"
        ? createLabRoom(room, obstacles, doors, instancedAssets)
        : createMCPRoom(room, mcpConfigs, obstacles, doors, instancedAssets);
    group.add(roomGroup);
    walkableAreas.push(createFloorPatchBounds(room.position.x, room.position.z, room.size.width, room.size.depth));
  });

  MAP_CORRIDORS.forEach((corridor) => {
    group.add(createCorridor(corridor, obstacles, instancedAssets));
    walkableAreas.push(createFloorPatchBounds(corridor.position.x, corridor.position.z, corridor.size.width, corridor.size.depth));
  });

  addSharedLighting(group);
  addSharedDecor(instancedAssets);
  group.add(createExteriorLandmarks(instancedAssets, obstacles, doors));
  addInstancedAssetsToGroup(group, instancedAssets);

  addObstacleRect(
    obstacles,
    MEETING_BEACON_POSITION.x,
    MEETING_BEACON_POSITION.z,
    MEETING_BEACON_HALF_SIZE,
    MEETING_BEACON_HALF_SIZE
  );

  // Make instanced assets solid by adding them to the obstacles array
  instancedAssets.chairs.forEach((chair) => {
    addObstacleRect(obstacles, chair.x, chair.z, 0.22, 0.22);
  });
  instancedAssets.plants.forEach((plant) => {
    addObstacleRect(obstacles, plant.x, plant.z, 0.2, 0.2);
  });
  instancedAssets.decorNodes.forEach((entries) => {
    entries.forEach((node) => {
      addObstacleRect(obstacles, node.x, node.z, 0.15, 0.15);
    });
  });

  return {
    group,
    bounds: OFFICE_MAP_BOUNDS,
    obstacles,
    walkableAreas,
    update: (playerPosition: Vector3, delta: number) => {
      updateAutomaticDoors(doors, playerPosition, delta);
    }
  };
}

export function createCentralHub(
  room: MapRoomConfig,
  obstacles: RectBounds[],
  doors: AutomaticDoorInstance[],
  instancedAssets: InstancedWorldAssets
) {
  const group = new Group();

  group.add(createRoomShell(room, obstacles, doors, instancedAssets));

  const islandDesk = createDesk("#8bd9ef", { screens: 2, wide: true });
  islandDesk.position.copy(room.desk.position);
  islandDesk.rotation.y = room.desk.rotationY;
  group.add(islandDesk);
  addObstacleRect(obstacles, room.desk.position.x, room.desk.position.z, 1.8, 0.95);

  const hubLight = new PointLight("#91e4ff", 7, 8, 2);
  hubLight.position.set(0, 2.4, 0);
  group.add(hubLight);

  instancedAssets.chairs.push(
    { x: -1.05, z: 0.95, rotationY: Math.PI * 0.12 },
    { x: 1.05, z: 0.95, rotationY: -Math.PI * 0.12 },
    { x: -2.1, z: 1.15, rotationY: Math.PI / 2 },
    { x: 2.1, z: 1.15, rotationY: -Math.PI / 2 }
  );

  pushColorEntry(instancedAssets.decorNodes, "#8bd9ef", { x: -2.7, z: -2.5, scale: 0.92 });
  pushColorEntry(instancedAssets.decorNodes, "#8bd9ef", { x: 2.7, z: -2.5, scale: 0.92 });
  instancedAssets.plants.push({ x: -3.05, z: 3.05 }, { x: 3.05, z: 2.95 });

  return group;
}

export function createMCPRoom(
  room: MapRoomConfig,
  mcpConfigs: MCPConfig[],
  obstacles: RectBounds[],
  doors: AutomaticDoorInstance[],
  instancedAssets: InstancedWorldAssets
) {
  const group = new Group();
  const npc = mcpConfigs.find((entry) => entry.id === room.npcId);
  const accentColor = npc?.color ?? room.accentColor;

  group.add(createRoomShell(room, obstacles, doors, instancedAssets));

  const roomLabel = createRoomLabel(room.name, accentColor);
  roomLabel.position.copy(room.anchors.roomLabel);
  group.add(roomLabel);

  const desk = createDesk(accentColor, {
    wide: room.id === "output-review",
    screens: room.id === "editorial" ? 2 : room.id === "output-review" ? 2 : 1
  });
  desk.position.copy(room.desk.position);
  desk.rotation.y = room.desk.rotationY;
  group.add(desk);
  addDeskObstacle(obstacles, room.desk.position, room.desk.rotationY, room.desk.wide ?? false);

  if (room.id === "meeting-suite") {
    instancedAssets.chairs.push(
      { x: room.desk.position.x - 1.8, z: room.desk.position.z, rotationY: Math.PI / 2 },
      { x: room.desk.position.x + 1.8, z: room.desk.position.z, rotationY: -Math.PI / 2 },
      { x: room.desk.position.x - 0.9, z: room.desk.position.z + 1.35, rotationY: Math.PI },
      { x: room.desk.position.x + 0.9, z: room.desk.position.z + 1.35, rotationY: Math.PI }
    );
  } else if (room.id !== "output-review") {
    const chairOffset = new Vector3(0, 0, 1.05).applyAxisAngle(new Vector3(0, 1, 0), room.desk.rotationY);
    instancedAssets.chairs.push({
      x: room.desk.position.x + chairOffset.x,
      z: room.desk.position.z + chairOffset.z,
      rotationY: room.desk.rotationY + Math.PI
    });
  } else {
    // Keep the review station open so the player silhouette reads cleanly from the main camera angle.
  }

  decorateRoom(room, group, accentColor, obstacles, instancedAssets);

  const accentLight = new PointLight(accentColor, room.id === "output-review" ? 5 : 6.5, 7.5, 2);
  accentLight.position.set(room.position.x, 2.2, room.position.z);
  group.add(accentLight);

  return group;
}

export function createLabRoom(
  room: MapRoomConfig,
  obstacles: RectBounds[],
  doors: AutomaticDoorInstance[],
  instancedAssets: InstancedWorldAssets
) {
  const group = new Group();
  const accentColor = room.accentColor;

  group.add(createRoomShell(room, obstacles, doors, instancedAssets));

  const roomLabel = createRoomLabel(room.name, accentColor);
  roomLabel.position.copy(room.anchors.roomLabel);
  group.add(roomLabel);

  const desk = createDesk(accentColor, {
    wide: false,
    screens: 2
  });
  desk.position.copy(room.desk.position);
  desk.rotation.y = room.desk.rotationY;
  group.add(desk);
  addDeskObstacle(obstacles, room.desk.position, room.desk.rotationY, false);

  const accentLight = new PointLight(accentColor, 6, 7.5, 2);
  accentLight.position.set(room.position.x, 2.2, room.position.z);
  group.add(accentLight);

  const labConsole = createSideConsole(accentColor);
  labConsole.position.set(room.position.x + 1.5, 0, room.position.z - 1.5);
  group.add(labConsole);
  addObstacleRect(obstacles, room.position.x + 1.5, room.position.z - 1.5, 0.55, 0.25);

  const styleMatrix = createScreen(1.98, 1.16, accentColor);
  styleMatrix.rotation.y = 0;
  styleMatrix.position.set(room.position.x, 1.88, room.position.z - room.size.depth / 2 + 0.22);
  group.add(styleMatrix);

  return group;
}

export function createCorridor(corridor: CorridorConfig, obstacles: RectBounds[], instancedAssets: InstancedWorldAssets) {
  const group = new Group();
  const floorColor = getCorridorFloorColor(corridor.id);

  addFloorPatch(
    instancedAssets,
    corridor.position.x,
    corridor.position.z,
    corridor.size.width,
    corridor.size.depth,
    floorColor
  );
  if (corridor.railings ?? true) {
    if (corridor.size.width > corridor.size.depth) {
      instancedAssets.glassPanels.push(
        {
          x: corridor.position.x,
          z: corridor.position.z - corridor.size.depth / 2 + 0.08,
          rotationY: 0,
          length: corridor.size.width - 0.24
        },
        {
          x: corridor.position.x,
          z: corridor.position.z + corridor.size.depth / 2 - 0.08,
          rotationY: 0,
          length: corridor.size.width - 0.24
        }
      );
      addObstacleRect(obstacles, corridor.position.x, corridor.position.z - corridor.size.depth / 2 + 0.08, corridor.size.width / 2, 0.08);
      addObstacleRect(obstacles, corridor.position.x, corridor.position.z + corridor.size.depth / 2 - 0.08, corridor.size.width / 2, 0.08);
    } else {
      instancedAssets.glassPanels.push(
        {
          x: corridor.position.x - corridor.size.width / 2 + 0.08,
          z: corridor.position.z,
          rotationY: Math.PI / 2,
          length: corridor.size.depth - 0.24
        },
        {
          x: corridor.position.x + corridor.size.width / 2 - 0.08,
          z: corridor.position.z,
          rotationY: Math.PI / 2,
          length: corridor.size.depth - 0.24
        }
      );
      addObstacleRect(obstacles, corridor.position.x - corridor.size.width / 2 + 0.08, corridor.position.z, 0.08, corridor.size.depth / 2);
      addObstacleRect(obstacles, corridor.position.x + corridor.size.width / 2 - 0.08, corridor.position.z, 0.08, corridor.size.depth / 2);
    }
  }

  return group;
}

function createRoomShell(
  room: MapRoomConfig,
  obstacles: RectBounds[],
  doors: AutomaticDoorInstance[],
  instancedAssets: InstancedWorldAssets
) {
  const group = new Group();

  addFloorPatch(
    instancedAssets,
    room.position.x,
    room.position.z,
    room.size.width,
    room.size.depth,
    INDOOR_WALKING_TILE_COLOR
  );
  const walls = buildRoomWalls(room);
  walls.forEach(({ kind, entry, obstacle }) => {
    if (kind === "glass") {
      instancedAssets.glassPanels.push(entry);
    } else {
      instancedAssets.wallPanels.push(entry);
    }
    if (obstacle) {
      obstacles.push(obstacle);
    }
  });

  room.doorSides.forEach((doorSide) => {
    // Prevent duplicate door meshes between brand-brain and smart-lab
    if (room.id === "brand-brain" && doorSide === "east") {
      return;
    }

    const width = doorSide === "east" || doorSide === "west" ? 1.5 : 1.8;
    const doorFrame = createDoorFrame(width);
    const doorPosition = getDoorFramePosition(room, doorSide);
    doorFrame.position.copy(doorPosition);
    doorFrame.rotation.y = doorSide === "east" || doorSide === "west" ? Math.PI / 2 : 0;
    group.add(doorFrame);

    const autoDoor = createAutomaticDoor(width, 2.18, room.accentColor, {
      hasWindow: false
    });
    autoDoor.group.position.copy(doorPosition);
    autoDoor.group.rotation.y = doorSide === "east" || doorSide === "west" ? Math.PI / 2 : 0;
    group.add(autoDoor.group);

    const anchor = new Object3D();
    anchor.position.copy(doorPosition);
    group.add(anchor);

    doors.push({
      root: autoDoor.group,
      leftPanel: autoDoor.leftPanel,
      rightPanel: autoDoor.rightPanel,
      lightBar: autoDoor.lightBar,
      anchor,
      width,
      side: doorSide,
      openAmount: room.type === "hub" ? 1 : 0
    });
  });

  const rug = new Mesh(
    new PlaneGeometry(room.size.width * 0.48, room.size.depth * 0.3),
    new MeshStandardMaterial({
      color: room.type === "hub" ? "#f8f1e7" : "#f4ebdf",
      emissive: new Color(room.accentColor).multiplyScalar(room.type === "hub" ? 0.04 : 0.06),
      transparent: true,
      opacity: 0.74,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true
    })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(room.position.x, 0.051, room.position.z + 0.35);
  group.add(rug);

  return group;
}

function decorateRoom(
  room: MapRoomConfig,
  group: Group,
  accentColor: string,
  obstacles: RectBounds[],
  instancedAssets: InstancedWorldAssets
) {
  if (room.id === "brand-brain") {
    const wallScreen = createScreen(2.18, 1.08, accentColor);
    wallScreen.rotation.y = Math.PI / 2;
    wallScreen.position.set(room.position.x - room.size.width / 2 + 0.22, 1.94, room.position.z - 0.2);
    group.add(wallScreen);

    const brain = createHologramPanel(accentColor, 1.14, 1.16);
    brain.position.set(room.position.x + 1.74, 1.86, room.position.z - room.size.depth / 2 + 0.22);
    group.add(brain);

    const strategyTable = createSideConsole(accentColor);
    strategyTable.position.set(room.position.x - 1.95, 0, room.position.z + 1.05);
    strategyTable.rotation.y = Math.PI / 2;
    group.add(strategyTable);
    addObstacleRect(obstacles, room.position.x - 1.95, room.position.z + 1.05, 0.55, 0.25);

    pushColorEntry(instancedAssets.decorNodes, accentColor, { x: room.position.x - 2.4, z: room.position.z - 1.4, scale: 0.95 });
    pushColorEntry(instancedAssets.decorNodes, accentColor, { x: room.position.x + 2.25, z: room.position.z - 1.2, scale: 1.05 });
  }

  if (room.id === "editorial") {
    const calendar = createScreen(1.78, 1.04, accentColor);
    calendar.rotation.y = Math.PI / 2;
    calendar.position.set(room.position.x - room.size.width / 2 + 0.22, 1.86, room.position.z - 0.45);
    group.add(calendar);

    const contentCards = createFloatingCards(accentColor);
    contentCards.position.set(room.position.x + 1.2, 1.54, room.position.z - 1.42);
    group.add(contentCards);

    const notesConsole = createSideConsole(accentColor);
    notesConsole.position.set(room.position.x + 1.8, 0, room.position.z + 1.25);
    group.add(notesConsole);
    addObstacleRect(obstacles, room.position.x + 1.8, room.position.z + 1.25, 0.55, 0.25);

    pushColorEntry(instancedAssets.decorNodes, accentColor, { x: room.position.x - 2.3, z: room.position.z + 1.2, scale: 0.92 });
    pushColorEntry(instancedAssets.decorNodes, accentColor, { x: room.position.x + 2.25, z: room.position.z - 1.25, scale: 1 });
  }

  if (room.id === "design") {
    const designWall = createScreen(1.98, 1.16, accentColor);
    designWall.rotation.y = -Math.PI / 2;
    designWall.position.set(room.position.x + room.size.width / 2 - 0.22, 1.88, room.position.z - 1.1);
    group.add(designWall);

    const frames = createDesignFrames(accentColor);
    frames.position.set(room.position.x - 1.75, 1.56, room.position.z - 1.08);
    group.add(frames);

    const paletteStand = createPaletteStand(accentColor);
    paletteStand.position.set(room.position.x - 1.7, 0, room.position.z + 1.4);
    group.add(paletteStand);
    addObstacleRect(obstacles, room.position.x - 1.7, room.position.z + 1.4, 0.55, 0.25);
  }

  if (room.id === "narration") {
    const wavePanel = createScreen(1.82, 0.98, accentColor);
    wavePanel.rotation.y = Math.PI / 2;
    wavePanel.position.set(room.position.x - room.size.width / 2 + 0.2, 1.82, room.position.z);
    group.add(wavePanel);

    const micBooth = createMicBooth(accentColor);
    micBooth.position.set(room.position.x + 1.45, 0, room.position.z + 0.65);
    group.add(micBooth);
    addObstacleRect(obstacles, room.position.x + 1.45, room.position.z + 0.65, 0.45, 0.45);

    const acoustic = createAcousticPanels(accentColor);
    acoustic.position.set(room.position.x - 2.5, 1.42, room.position.z);
    group.add(acoustic);

    pushColorEntry(instancedAssets.decorNodes, accentColor, { x: room.position.x - 2.05, z: room.position.z - 1.05, scale: 0.9 });
    pushColorEntry(instancedAssets.decorNodes, accentColor, { x: room.position.x + 2.1, z: room.position.z - 0.95, scale: 1.04 });
  }

  if (room.id === "output-review") {
    const reviewWall = createScreen(2.18, 1.14, "#c8f0ff");
    reviewWall.rotation.y = Math.PI / 2;
    reviewWall.position.set(room.position.x - room.size.width / 2 + 0.2, 1.92, room.position.z);
    group.add(reviewWall);

    const checklistConsole = createChecklistConsole();
    checklistConsole.position.set(room.position.x - 1.75, 0, room.position.z + 0.95);
    group.add(checklistConsole);
    addObstacleRect(obstacles, room.position.x - 1.75, room.position.z + 0.95, 0.65, 0.35);

    const packageTerminal = createSideConsole("#daf4ff");
    packageTerminal.position.set(room.position.x + 1.8, 0, room.position.z + 1.1);
    group.add(packageTerminal);
    addObstacleRect(obstacles, room.position.x + 1.8, room.position.z + 1.1, 0.6, 0.25);

    pushColorEntry(instancedAssets.decorNodes, "#c8f0ff", { x: room.position.x - 2.05, z: room.position.z - 0.95, scale: 0.95 });
    pushColorEntry(instancedAssets.decorNodes, "#c8f0ff", { x: room.position.x + 2.05, z: room.position.z - 0.95, scale: 0.95 });
  }

  if (room.id === "meeting-suite") {
    const presentationScreen = createScreen(2.4, 1.18, accentColor);
    presentationScreen.rotation.y = Math.PI / 2;
    presentationScreen.position.set(room.position.x - room.size.width / 2 + 0.22, 1.94, room.position.z);
    group.add(presentationScreen);

    // Left decor slot (-2.8, -1.75) is occupied by MeetingBeacon (mounted in
    // OfficeScene). Only emit the right-hand decor here.
    pushColorEntry(instancedAssets.decorNodes, accentColor, { x: room.position.x + 2.8, z: room.position.z - 1.75, scale: 1.04 });
  }

  if (room.id === "coffee-nook") {
    // New clean desk attached to the North (top-right) wall
    const deskGroup = new Group();

    const body = new Mesh(
      new BoxGeometry(3.2, 0.86, 0.6),
      new MeshStandardMaterial({ color: "#f0e7db", roughness: 0.72, metalness: 0.04, flatShading: true })
    );
    body.position.y = 0.43;
    body.castShadow = true;
    body.receiveShadow = true;
    deskGroup.add(body);

    const top = new Mesh(
      new BoxGeometry(3.24, 0.04, 0.64),
      new MeshStandardMaterial({ color: "#d8dde5", roughness: 0.5, metalness: 0.1, flatShading: true })
    );
    top.position.y = 0.88;
    top.castShadow = true;
    top.receiveShadow = true;
    deskGroup.add(top);

    const accent = new Mesh(
      new BoxGeometry(3.2, 0.06, 0.04),
      new MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.3, flatShading: true })
    );
    accent.position.set(0, 0.8, 0.3);
    deskGroup.add(accent);

    deskGroup.position.set(room.position.x, 0, room.position.z - 1.56);
    group.add(deskGroup);

    addObstacleRect(obstacles, room.position.x, room.position.z - 1.56, 1.6, 0.3);
  }

  if (room.id === "coffee-nook") {
    instancedAssets.plants.push({
      x: room.position.x + room.size.width / 2 - 0.82,
      z: room.position.z + room.size.depth / 2 - 0.82
    });
  } else {
    instancedAssets.plants.push(
      { x: room.position.x - room.size.width / 2 + 0.82, z: room.position.z + room.size.depth / 2 - 0.82 },
      { x: room.position.x + room.size.width / 2 - 0.82, z: room.position.z - room.size.depth / 2 + 0.92 }
    );
  }
}

function buildRoomWalls(room: MapRoomConfig) {
  const pieces: Array<{ kind: "wall" | "glass"; entry: LinearInstanceEntry; obstacle?: RectBounds }> = [];
  const halfWidth = room.size.width / 2;
  const halfDepth = room.size.depth / 2;
  const hasDoor = (side: DoorSide) => room.doorSides.includes(side);

  const addWall = (centerX: number, centerZ: number, length: number, axis: "x" | "z", glass = false) => {
    if (length <= 0.04) {
      return;
    }

    const entry: LinearInstanceEntry = {
      x: centerX,
      z: centerZ,
      rotationY: axis === "z" ? Math.PI / 2 : 0,
      length
    };

    const obstacle =
      axis === "x"
        ? {
            minX: centerX - length / 2,
            maxX: centerX + length / 2,
            minZ: centerZ - ROOM_WALL_THICKNESS / 2,
            maxZ: centerZ + ROOM_WALL_THICKNESS / 2
          }
        : {
            minX: centerX - ROOM_WALL_THICKNESS / 2,
            maxX: centerX + ROOM_WALL_THICKNESS / 2,
            minZ: centerZ - length / 2,
            maxZ: centerZ + length / 2
          };

    pieces.push({ kind: glass ? "glass" : "wall", entry, obstacle });
  };

  buildWallSide(room.position.x, room.position.z - halfDepth, room.size.width, "x", hasDoor("north"), 1.8, false, addWall);
  buildWallSide(room.position.x, room.position.z + halfDepth, room.size.width, "x", hasDoor("south"), 1.8, true, addWall);
  buildWallSide(room.position.x - halfWidth, room.position.z, room.size.depth, "z", hasDoor("west"), 1.5, false, addWall);
  buildWallSide(room.position.x + halfWidth, room.position.z, room.size.depth, "z", hasDoor("east"), 1.5, true, addWall);

  return pieces;
}

function buildWallSide(
  centerX: number,
  centerZ: number,
  span: number,
  axis: "x" | "z",
  hasDoor: boolean,
  doorWidth: number,
  glass: boolean,
  addWall: (centerX: number, centerZ: number, length: number, axis: "x" | "z", glass?: boolean) => void
) {
  if (!hasDoor) {
    addWall(centerX, centerZ, span, axis, glass);
    return;
  }

  const segment = (span - doorWidth) / 2;
  if (axis === "x") {
    addWall(centerX - doorWidth / 2 - segment / 2, centerZ, segment, axis, glass);
    addWall(centerX + doorWidth / 2 + segment / 2, centerZ, segment, axis, glass);
  } else {
    addWall(centerX, centerZ - doorWidth / 2 - segment / 2, segment, axis, glass);
    addWall(centerX, centerZ + doorWidth / 2 + segment / 2, segment, axis, glass);
  }
}

function getDoorFramePosition(room: MapRoomConfig, doorSide: DoorSide) {
  const halfWidth = room.size.width / 2;
  const halfDepth = room.size.depth / 2;
  switch (doorSide) {
    case "north":
      return new Vector3(room.position.x, 0, room.position.z - halfDepth);
    case "south":
      return new Vector3(room.position.x, 0, room.position.z + halfDepth);
    case "east":
      return new Vector3(room.position.x + halfWidth, 0, room.position.z);
    case "west":
      return new Vector3(room.position.x - halfWidth, 0, room.position.z);
  }
}

function updateAutomaticDoors(doors: AutomaticDoorInstance[], playerPosition: Vector3, delta: number) {
  const worldDoorPosition = new Vector3();

  doors.forEach((door) => {
    worldDoorPosition.setFromMatrixPosition(door.anchor.matrixWorld);
    worldDoorPosition.y = playerPosition.y;

    const dx = playerPosition.x - worldDoorPosition.x;
    const dz = playerPosition.z - worldDoorPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const targetOpen = distance < 2.35 ? 1 : 0;
    door.openAmount = damp(door.openAmount, targetOpen, 7, delta);

    const slide = door.width * 0.19 * door.openAmount;
    const tuckScale = 1 - door.openAmount * 0.18;
    const panelOpacity = 0.82 - door.openAmount * 0.68;
    door.leftPanel.position.x = -door.width * 0.24 - slide;
    door.rightPanel.position.x = door.width * 0.24 + slide;
    door.leftPanel.scale.x = tuckScale;
    door.rightPanel.scale.x = tuckScale;

    const leftMaterial = door.leftPanel.material as MeshStandardMaterial;
    const rightMaterial = door.rightPanel.material as MeshStandardMaterial;
    leftMaterial.opacity = panelOpacity;
    rightMaterial.opacity = panelOpacity;

    const panelsVisible = panelOpacity > 0.08;
    door.leftPanel.visible = panelsVisible;
    door.rightPanel.visible = panelsVisible;

    const lightMaterial = door.lightBar.material as MeshStandardMaterial;
    lightMaterial.emissiveIntensity = 0.45 + door.openAmount * 0.5;
  });
}

function addSharedLighting(group: Group) {
  const ambient = new AmbientLight("#f1ede6", 0.22);
  group.add(ambient);

  const hubAccent = new PointLight("#9de9ff", 8, 14, 2);
  hubAccent.position.set(0, 3.8, 0);
  group.add(hubAccent);
}

function addSharedDecor(instancedAssets: InstancedWorldAssets) {
  instancedAssets.plants.push(
    { x: -14, z: -12.5 },
    { x: 14, z: -12.5 },
    { x: -13.5, z: 12.6 },
    { x: 13.5, z: 12.6 },
    { x: -18.2, z: 24.2 },
    { x: -13.2, z: 22.4 },
    { x: 8.8, z: 24.1 },
    { x: -5.8, z: 24.4 }
  );
  pushColorEntry(instancedAssets.decorNodes, "#9de9ff", { x: -12.4, z: 0.2, scale: 0.94 });
  pushColorEntry(instancedAssets.decorNodes, "#9de9ff", { x: 12.4, z: 0.2, scale: 0.94 });
  pushColorEntry(instancedAssets.decorNodes, "#89f1d0", { x: -16.5, z: 24.6, scale: 1.18 });
  pushColorEntry(instancedAssets.decorNodes, "#89f1d0", { x: -14.1, z: 22.6, scale: 0.98 });
  pushColorEntry(instancedAssets.decorNodes, "#ffd9a8", { x: 7.8, z: 16.8, scale: 0.84 });
}

function addInstancedAssetsToGroup(group: Group, instancedAssets: InstancedWorldAssets) {
  instancedAssets.floorTiles.forEach((entries, color) => {
    group.add(createInstancedFloorTiles(entries, color, getFloorInsetColor(color)));
  });

  if (instancedAssets.wallPanels.length > 0) {
    group.add(
      createInstancedWallPanels(instancedAssets.wallPanels, {
        height: ROOM_WALL_HEIGHT,
        thickness: ROOM_WALL_THICKNESS,
        bodyColor: "#f1e8dc",
        capColor: "#d7e1ea",
        trimColor: "#e9ddcd"
      })
    );
  }

  if (instancedAssets.glassPanels.length > 0) {
    group.add(
      createInstancedGlassPanels(instancedAssets.glassPanels, {
        height: GLASS_HEIGHT,
        thickness: 0.08,
        glassColor: "#c6effc",
        frameColor: "#f6f1e9"
      })
    );
  }

  if (instancedAssets.chairs.length > 0) {
    group.add(createInstancedChairs(instancedAssets.chairs, "#d7e4f2"));
  }

  if (instancedAssets.plants.length > 0) {
    group.add(createInstancedPlants(instancedAssets.plants));
  }

  instancedAssets.decorNodes.forEach((entries, accentColor) => {
    group.add(createInstancedDecorNodes(entries, accentColor));
  });
}

function createInstancedAssetBuckets(): InstancedWorldAssets {
  return {
    floorTiles: new Map(),
    tileOccupied: new Set<string>(),
    patchCount: 0,
    wallPanels: [],
    glassPanels: [],
    chairs: [],
    ceilingLights: [],
    plants: [],
    decorNodes: new Map()
  };
}

function getCorridorFloorColor(corridorId: string) {
  if (corridorId === "futuristic-garden-pad") {
    return GARDEN_WALKING_TILE_COLOR;
  }

  if (OUTDOOR_PATH_IDS.has(corridorId)) {
    return OUTDOOR_WALKING_TILE_COLOR;
  }

  return INDOOR_WALKING_TILE_COLOR;
}

function getFloorInsetColor(color: string) {
  if (color === GARDEN_WALKING_TILE_COLOR) {
    return GARDEN_WALKING_TILE_INSET_COLOR;
  }

  if (color === OUTDOOR_WALKING_TILE_COLOR) {
    return OUTDOOR_WALKING_TILE_INSET_COLOR;
  }

  return INDOOR_WALKING_TILE_INSET_COLOR;
}

// 0.5mm per patch — invisible at game scale (~1cm worst case across all
// patches), but enough to land on distinct depth-buffer values so misaligned
// tile grids can't Z-fight.
const PATCH_Y_OFFSET_STEP = 0.0005;

function addFloorPatch(
  instancedAssets: InstancedWorldAssets,
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
  color: string
) {
  const entries = getOrCreateEntries(instancedAssets.floorTiles, color);
  const { tileCountX, tileCountZ, originX, originZ } = getFloorPatchGrid(centerX, centerZ, width, depth);
  const yOffset = -instancedAssets.patchCount * PATCH_Y_OFFSET_STEP;
  instancedAssets.patchCount += 1;

  for (let x = 0; x < tileCountX; x += 1) {
    for (let z = 0; z < tileCountZ; z += 1) {
      const tx = originX + x * TILE_SIZE;
      const tz = originZ + z * TILE_SIZE;
      // Quantize to centimeter precision so float drift can't slip a duplicate
      // through the dedup check.
      const key = `${Math.round(tx * 100)},${Math.round(tz * 100)}`;
      if (instancedAssets.tileOccupied.has(key)) {
        continue;
      }
      instancedAssets.tileOccupied.add(key);
      entries.push({ x: tx, z: tz, y: yOffset });
    }
  }
}

function createFloorPatchBounds(centerX: number, centerZ: number, width: number, depth: number): RectBounds {
  const { tileCountX, tileCountZ, originX, originZ } = getFloorPatchGrid(centerX, centerZ, width, depth);

  return {
    minX: originX - TILE_SIZE / 2,
    maxX: originX + (tileCountX - 1) * TILE_SIZE + TILE_SIZE / 2,
    minZ: originZ - TILE_SIZE / 2,
    maxZ: originZ + (tileCountZ - 1) * TILE_SIZE + TILE_SIZE / 2
  };
}

function getFloorPatchGrid(centerX: number, centerZ: number, width: number, depth: number) {
  const tileCountX = Math.max(1, Math.round(width / TILE_SIZE));
  const tileCountZ = Math.max(1, Math.round(depth / TILE_SIZE));
  const totalWidth = tileCountX * TILE_SIZE;
  const totalDepth = tileCountZ * TILE_SIZE;

  return {
    tileCountX,
    tileCountZ,
    originX: centerX - totalWidth / 2 + TILE_SIZE / 2,
    originZ: centerZ - totalDepth / 2 + TILE_SIZE / 2
  };
}

function getOrCreateEntries<T>(map: Map<string, T[]>, key: string) {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }
  const created: T[] = [];
  map.set(key, created);
  return created;
}

function pushColorEntry<T>(map: Map<string, T[]>, color: string, entry: T) {
  getOrCreateEntries(map, color).push(entry);
}

function addObstacleRect(obstacles: RectBounds[], x: number, z: number, halfWidth: number, halfDepth: number) {
  obstacles.push({
    minX: x - halfWidth,
    maxX: x + halfWidth,
    minZ: z - halfDepth,
    maxZ: z + halfDepth
  });
}

function createWalkableRect(x: number, z: number, width: number, depth: number, padding = 0) {
  return {
    minX: x - width / 2 - padding,
    maxX: x + width / 2 + padding,
    minZ: z - depth / 2 - padding,
    maxZ: z + depth / 2 + padding
  };
}

function addDeskObstacle(obstacles: RectBounds[], deskPosition: Vector3, rotationY: number, wide: boolean) {
  const halfWidth = wide ? 1.7 : 1.1;
  const halfDepth = 0.55;
  const rotatedQuarterTurn = Math.abs(Math.sin(rotationY)) > 0.5;

  addObstacleRect(
    obstacles,
    deskPosition.x,
    deskPosition.z,
    rotatedQuarterTurn ? halfDepth : halfWidth,
    rotatedQuarterTurn ? halfWidth : halfDepth
  );
}

function createDioramaBase() {
  const group = new Group();

  const pedestal = new Mesh(
    new BoxGeometry(54, 1.32, 50),
    new MeshStandardMaterial({
      color: "#7d5a48",
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true
    })
  );
  pedestal.position.y = -0.74;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const stage = new Mesh(
    new BoxGeometry(50.4, 0.3, 46.4),
    new MeshStandardMaterial({
      color: "#9d6c52",
      roughness: 0.86,
      metalness: 0.02,
      flatShading: true
    })
  );
  // Keep the base stage below the tile surface so the tiles remain the visible floor reference.
  stage.position.y = -0.22;
  stage.receiveShadow = true;
  group.add(stage);

  const wash = new Mesh(
    new PlaneGeometry(56, 52),
    new MeshStandardMaterial({
      color: "#6c493b",
      transparent: true,
      opacity: 0.96,
      roughness: 1,
      metalness: 0,
      flatShading: true
    })
  );
  wash.rotation.x = -Math.PI / 2;
  wash.position.y = -1.36;
  group.add(wash);

  return group;
}

function createExteriorLandmarks(instancedAssets: InstancedWorldAssets, obstacles: RectBounds[], doors: AutomaticDoorInstance[]) {
  const group = new Group();

  const exteriorPad = new Mesh(
    new PlaneGeometry(17, 10),
    new MeshStandardMaterial({
      color: "#8f6049",
      roughness: 0.98,
      metalness: 0.01,
      flatShading: true
    })
  );
  exteriorPad.rotation.x = -Math.PI / 2;
  exteriorPad.position.set(-1.2, -0.04, 23.1);
  group.add(exteriorPad);

  const garden = createFuturisticGarden();
  garden.position.set(-15.2, 0, 23.4);
  group.add(garden);

  const orbitGarden = createOrbitGarden(instancedAssets, obstacles, doors);
  orbitGarden.position.set(12.5, 0, 23.5);
  group.add(orbitGarden);

  return group;
}

function createOrbitGarden(instancedAssets: InstancedWorldAssets, obstacles: RectBounds[], doors: AutomaticDoorInstance[]) {
  const group = new Group();

  const base = new Mesh(
    new PlaneGeometry(9.6, 6.6),
    new MeshStandardMaterial({
      color: "#6d7f68", // Green tile base
      roughness: 0.96,
      metalness: 0.02,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.01;
  group.add(base);

  // Glass walls
  // North Wall (Solid)
  instancedAssets.glassPanels.push({ x: 12.5, z: 20.08, rotationY: 0, length: 9.76 });
  addObstacleRect(obstacles, 12.5, 20.08, 4.88, 0.08);

  // South Wall (Solid)
  instancedAssets.glassPanels.push({ x: 12.5, z: 26.92, rotationY: 0, length: 9.76 });
  addObstacleRect(obstacles, 12.5, 26.92, 4.88, 0.08);

  // East Wall (Solid)
  instancedAssets.glassPanels.push({ x: 17.42, z: 23.5, rotationY: Math.PI / 2, length: 6.76 });
  addObstacleRect(obstacles, 17.42, 23.5, 0.08, 3.38);

  // West Wall (with Door at z=21 to 24)
  // Top segment: z=20.12 to 21 (length 0.88, center z=20.56)
  instancedAssets.glassPanels.push({ x: 7.58, z: 20.56, rotationY: Math.PI / 2, length: 0.88 });
  addObstacleRect(obstacles, 7.58, 20.56, 0.08, 0.44);
  // Bottom segment: z=24 to 26.88 (length 2.88, center z=25.44)
  instancedAssets.glassPanels.push({ x: 7.58, z: 25.44, rotationY: Math.PI / 2, length: 2.88 });
  addObstacleRect(obstacles, 7.58, 25.44, 0.08, 1.44);

  // Garden Node Double Doors (width 3.0)
  // Gap is world z=21 to 24 (local z=-2.5 to 0.5) => center local z=-1.0
  // West wall world x=7.58 (local x=-4.92)
  const doorWidth = 3.0;
  const doorFrame = createDoorFrame(doorWidth);
  const doorPosition = new Vector3(-4.92, 0, -1.0);
  doorFrame.position.copy(doorPosition);
  doorFrame.rotation.y = Math.PI / 2;
  group.add(doorFrame);

  const autoDoor = createAutomaticDoor(doorWidth, 2.18, "#6d7f68", {
    hasWindow: true
  });
  autoDoor.group.position.copy(doorPosition);
  autoDoor.group.rotation.y = Math.PI / 2;
  group.add(autoDoor.group);

  const anchor = new Object3D();
  // Ensure anchor world position aligns perfectly with orbitGarden position (offset applied manually for updateAutomaticDoors)
  anchor.position.copy(doorPosition);
  group.add(anchor);

  doors.push({
    root: autoDoor.group,
    leftPanel: autoDoor.leftPanel,
    rightPanel: autoDoor.rightPanel,
    lightBar: autoDoor.lightBar,
    anchor,
    width: doorWidth,
    side: "west",
    openAmount: 0
  });

  const table = new Mesh(
    new CylinderGeometry(0.8, 0.8, 0.72, 16),
    new MeshStandardMaterial({ color: "#f0f0f0", roughness: 0.8, metalness: 0.1, flatShading: true })
  );
  table.position.set(0, 0.36, 0);
  group.add(table);

  const benchA = new Mesh(
    new BoxGeometry(1.6, 0.45, 0.4),
    new MeshStandardMaterial({ color: "#e0e0e0", roughness: 0.9, metalness: 0.0, flatShading: true })
  );
  benchA.position.set(0, 0.225, 1.5);
  group.add(benchA);

  const benchB = benchA.clone();
  benchB.position.set(0, 0.225, -1.5);
  group.add(benchB);

  // Garden Lamps
  const lampMaterial = new MeshStandardMaterial({ color: "#bcefe2", emissive: new Color("#8cefd7").multiplyScalar(0.4), roughness: 0.34, metalness: 0.1 });
  const lampA = new Mesh(new CylinderGeometry(0.1, 0.1, 1.2, 8), lampMaterial);
  lampA.position.set(-3.5, 0.6, -2.5);
  group.add(lampA);

  const lampB = lampA.clone();
  lampB.position.set(3.5, 0.6, 2.5);
  group.add(lampB);

  const beaconLeft = new PointLight("#86ffd8", 2.0, 5, 2);
  beaconLeft.position.set(-3.5, 1.2, -2.5);
  const beaconRight = new PointLight("#86ffd8", 2.0, 5, 2);
  beaconRight.position.set(3.5, 1.2, 2.5);
  group.add(beaconLeft, beaconRight);

  return group;
}

function createMeetingCredenza(accentColor: string) {
  const group = new Group();

  const base = new Mesh(
    new BoxGeometry(1.7, 0.74, 0.56),
    new MeshStandardMaterial({
      color: "#efe7db",
      roughness: 0.7,
      metalness: 0.04,
      flatShading: true
    })
  );
  base.position.y = 0.37;
  group.add(base);

  const screen = createScreen(1.14, 0.54, accentColor);
  screen.position.set(0, 1.02, -0.1);
  group.add(screen);

  return group;
}

function createCoffeeBar(accentColor: string) {
  const group = new Group();

  const counter = new Mesh(
    new BoxGeometry(2.1, 0.86, 0.72),
    new MeshStandardMaterial({
      color: "#f0e7db",
      roughness: 0.72,
      metalness: 0.04,
      flatShading: true
    })
  );
  counter.position.y = 0.43;
  group.add(counter);

  const glowStrip = new Mesh(
    new BoxGeometry(1.74, 0.08, 0.08),
    new MeshStandardMaterial({
      color: accentColor,
      emissive: new Color(accentColor).multiplyScalar(0.14),
      roughness: 0.28,
      metalness: 0.12,
      flatShading: true
    })
  );
  glowStrip.position.set(0, 0.92, -0.26);
  group.add(glowStrip);

  const machine = new Mesh(
    new BoxGeometry(0.46, 0.54, 0.24),
    new MeshStandardMaterial({
      color: "#d8dde5",
      roughness: 0.46,
      metalness: 0.18,
      flatShading: true
    })
  );
  machine.position.set(0.55, 1.16, 0);
  group.add(machine);

  const cupA = new Mesh(
    new CylinderGeometry(0.08, 0.1, 0.14, 8),
    new MeshStandardMaterial({
      color: "#fff7ef",
      roughness: 0.8,
      metalness: 0.02,
      flatShading: true
    })
  );
  cupA.position.set(-0.35, 0.97, -0.04);
  const cupB = cupA.clone();
  cupB.position.x = -0.12;
  group.add(cupA, cupB);

  return group;
}

function createFuturisticGarden() {
  const group = new Group();

  const base = new Mesh(
    new PlaneGeometry(7.2, 5.2),
    new MeshStandardMaterial({
      color: "#6f846d",
      roughness: 0.96,
      metalness: 0.02,
      flatShading: true
    })
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = -0.03;
  group.add(base);

  const ringMaterial = new MeshStandardMaterial({
    color: "#bcefe2",
    emissive: new Color("#8cefd7").multiplyScalar(0.22),
    roughness: 0.34,
    metalness: 0.1,
    flatShading: true
  });

  const ringA = new Mesh(new CylinderGeometry(0.82, 0.96, 0.18, 12), ringMaterial);
  ringA.position.set(-1.45, 0.12, -0.45);
  group.add(ringA);

  const ringB = new Mesh(new CylinderGeometry(0.58, 0.72, 0.18, 12), ringMaterial);
  ringB.position.set(1.2, 0.12, 0.4);
  group.add(ringB);

  const stoneMaterial = new MeshStandardMaterial({
    color: "#d7d3cb",
    roughness: 0.72,
    metalness: 0.04,
    flatShading: true
  });

  const stoneA = new Mesh(new BoxGeometry(0.82, 0.24, 0.52), stoneMaterial);
  stoneA.position.set(0.15, 0.12, -1.1);
  stoneA.rotation.y = Math.PI * 0.18;
  const stoneB = stoneA.clone();
  stoneB.position.set(-0.9, 0.12, 1.15);
  stoneB.rotation.y = -Math.PI * 0.24;
  group.add(stoneA, stoneB);

  const beaconLeft = new PointLight("#86ffd8", 2.8, 4.8, 2);
  beaconLeft.position.set(-1.45, 1.15, -0.45);
  const beaconRight = new PointLight("#9defff", 2.4, 4.2, 2);
  beaconRight.position.set(1.2, 1.15, 0.4);
  group.add(beaconLeft, beaconRight);

  return group;
}

function createSideConsole(accentColor: string) {
  const group = new Group();
  const body = new Mesh(
    new BoxGeometry(1.28, 0.84, 0.62),
    new MeshStandardMaterial({
      color: "#f4efe7",
      roughness: 0.72,
      metalness: 0.04,
      flatShading: true
    })
  );
  body.position.y = 0.42;
  group.add(body);

  const accentBar = new Mesh(
    new BoxGeometry(1.02, 0.06, 0.08),
    new MeshStandardMaterial({
      color: accentColor,
      emissive: new Color(accentColor).multiplyScalar(0.12),
      roughness: 0.34,
      metalness: 0.14,
      flatShading: true
    })
  );
  accentBar.position.set(0, 0.92, -0.24);
  group.add(accentBar);

  const screen = createScreen(0.84, 0.42, accentColor);
  screen.position.set(0, 1.08, -0.12);
  group.add(screen);

  return group;
}

function createFloatingCards(accentColor: string) {
  const group = new Group();
  const colors = ["#f7f2ea", "#dff7ff", accentColor];
  colors.forEach((color, index) => {
    const card = new Mesh(
      new PlaneGeometry(0.42, 0.26),
      new MeshStandardMaterial({
        color,
        emissive: new Color(accentColor).multiplyScalar(index === 2 ? 0.22 : 0.06),
        transparent: true,
        opacity: 0.92,
        roughness: 0.42,
        metalness: 0.06,
        flatShading: true
      })
    );
    card.position.set(index * 0.2, index * 0.16, index * 0.02);
    card.rotation.z = index * 0.18;
    group.add(card);
  });
  return group;
}

function createDesignFrames(accentColor: string) {
  const group = new Group();
  const offsets = [-0.48, 0, 0.48];
  offsets.forEach((x, index) => {
    const frame = new Mesh(
      new PlaneGeometry(0.34, 0.46),
      new MeshStandardMaterial({
        color: index === 1 ? "#e8f7ee" : "#f7f2ea",
        emissive: new Color(accentColor).multiplyScalar(0.1),
        transparent: true,
        opacity: 0.95,
        roughness: 0.38,
        metalness: 0.04,
        flatShading: true
      })
    );
    frame.position.set(x, Math.sin(index) * 0.08, 0);
    group.add(frame);
  });
  return group;
}

function createPaletteStand(accentColor: string) {
  const group = new Group();
  const base = new Mesh(
    new CylinderGeometry(0.32, 0.4, 0.18, 8),
    new MeshStandardMaterial({ color: "#e5ddd1", roughness: 0.66, metalness: 0.02, flatShading: true })
  );
  base.position.y = 0.09;
  group.add(base);

  ["#2f80ed", "#27ae60", accentColor].forEach((color, index) => {
    const chip = new Mesh(
      new CylinderGeometry(0.14, 0.14, 0.08, 8),
      new MeshStandardMaterial({
        color,
        emissive: new Color(color).multiplyScalar(0.08),
        roughness: 0.44,
        metalness: 0.06,
        flatShading: true
      })
    );
    chip.position.set(-0.18 + index * 0.18, 0.28, 0);
    group.add(chip);
  });
  return group;
}

function createMicBooth(accentColor: string) {
  const group = new Group();
  const stand = new Mesh(
    new CylinderGeometry(0.05, 0.05, 1.1, 8),
    new MeshStandardMaterial({ color: "#d9dfeb", roughness: 0.42, metalness: 0.24, flatShading: true })
  );
  stand.position.y = 0.55;
  group.add(stand);

  const mic = new Mesh(
    new CylinderGeometry(0.12, 0.12, 0.3, 10),
    new MeshStandardMaterial({
      color: accentColor,
      emissive: new Color(accentColor).multiplyScalar(0.12),
      roughness: 0.52,
      metalness: 0.08,
      flatShading: true
    })
  );
  mic.rotation.z = Math.PI / 4;
  mic.position.set(0.14, 1.08, 0);
  group.add(mic);

  const pad = new Mesh(
    new BoxGeometry(0.88, 1.32, 0.12),
    new MeshStandardMaterial({ color: "#eee7dc", roughness: 0.84, metalness: 0.02, flatShading: true })
  );
  pad.position.set(0.62, 0.66, -0.22);
  group.add(pad);

  return group;
}

function createAcousticPanels(accentColor: string) {
  const group = new Group();
  for (let i = 0; i < 4; i += 1) {
    const panel = new Mesh(
      new BoxGeometry(0.18, 0.72, 0.08),
      new MeshStandardMaterial({
        color: i % 2 === 0 ? "#f5efe5" : accentColor,
        emissive: new Color(accentColor).multiplyScalar(i % 2 === 0 ? 0.02 : 0.1),
        roughness: 0.62,
        metalness: 0.04,
        flatShading: true
      })
    );
    panel.position.set(i * 0.24, (i % 2) * 0.12, 0);
    group.add(panel);
  }
  return group;
}

function createChecklistConsole() {
  const group = new Group();
  const base = new Mesh(
    new BoxGeometry(1.32, 0.84, 0.7),
    new MeshStandardMaterial({ color: "#f5efe5", roughness: 0.72, metalness: 0.04, flatShading: true })
  );
  base.position.y = 0.42;
  group.add(base);

  const checklist = new Mesh(
    new PlaneGeometry(0.86, 0.58),
    new MeshStandardMaterial({
      color: "#edfaff",
      emissive: new Color("#bfefff").multiplyScalar(0.18),
      transparent: true,
      opacity: 0.92,
      roughness: 0.24,
      metalness: 0.08,
      flatShading: true
    })
  );
  checklist.position.set(0, 1.06, 0.02);
  group.add(checklist);

  for (let i = 0; i < 3; i += 1) {
    const row = new Mesh(
      new PlaneGeometry(0.56, 0.02),
      new MeshStandardMaterial({
        color: "#b2d9ee",
        transparent: true,
        opacity: 0.92,
        roughness: 0.3,
        metalness: 0.08,
        flatShading: true
      })
    );
    row.position.set(0.08, 1.18 - i * 0.16, 0.03);
    group.add(row);

    const tick = new Mesh(
      new BoxGeometry(0.08, 0.08, 0.02),
      new MeshStandardMaterial({ color: "#4dd393", roughness: 0.42, metalness: 0.04, flatShading: true })
    );
    tick.position.set(-0.26, 1.18 - i * 0.16, 0.04);
    group.add(tick);
  }

  return group;
}
