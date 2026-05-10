import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3
} from "three";

export interface FloorTileEntry {
  x: number;
  z: number;
  y?: number;
  rotationY?: number;
}

export interface LinearInstanceEntry {
  x: number;
  z: number;
  y?: number;
  rotationY?: number;
  length?: number;
}

export interface ChairEntry {
  x: number;
  z: number;
  y?: number;
  rotationY?: number;
}

export interface PointEntry {
  x: number;
  z: number;
  y?: number;
}

export interface SmallScreenEntry {
  x: number;
  z: number;
  y?: number;
  rotationY?: number;
}

export interface DecorNodeEntry {
  x: number;
  z: number;
  y?: number;
  rotationY?: number;
  scale?: number;
}

const matrix = new Matrix4();
const position = new Vector3();
const quaternion = new Quaternion();
const scale = new Vector3();
const euler = new Euler();
const offset = new Vector3();

function createMaterial(color: string, roughness: number, metalness: number, opacity = 1, emissive?: Color) {
  return new MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent: opacity < 1,
    opacity,
    ...(emissive ? { emissive } : {}),
    flatShading: true
  });
}

function updateMesh(mesh: InstancedMesh, count: number) {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
}

function applyPart(
  mesh: InstancedMesh,
  index: number,
  entry: { x: number; z: number; y?: number; rotationY?: number; scale?: number },
  partOffset: [number, number, number],
  partScale: [number, number, number]
) {
  euler.set(0, entry.rotationY ?? 0, 0);
  quaternion.setFromEuler(euler);
  offset.set(partOffset[0], partOffset[1], partOffset[2]).applyQuaternion(quaternion);
  position.set(entry.x + offset.x, (entry.y ?? 0) + offset.y, entry.z + offset.z);

  const entryScale = entry.scale ?? 1;
  scale.set(partScale[0] * entryScale, partScale[1] * entryScale, partScale[2] * entryScale);
  matrix.compose(position, quaternion, scale);
  mesh.setMatrixAt(index, matrix);
}

export function createInstancedFloorTiles(entries: FloorTileEntry[], color = "#e7ddd0", insetColor = "#f7fbff") {
  const group = new Group();
  const tileHeight = 0.12;
  const baseMesh = new InstancedMesh(
    new BoxGeometry(0.96, tileHeight, 0.96),
    createMaterial(color, 0.9, 0.02),
    entries.length
  );
  // The inset gets a polygonOffset bias plus a slightly larger geometric lift
  // so it can't Z-fight with the tile body underneath even at oblique camera
  // angles. Without this you see flicker where rooms meet corridors.
  const insetMaterial = new MeshStandardMaterial({
    color: insetColor,
    roughness: 0.22,
    metalness: 0.08,
    emissive: new Color(insetColor).multiplyScalar(0.03),
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  const insetMesh = new InstancedMesh(
    new PlaneGeometry(0.76, 0.76),
    insetMaterial,
    entries.length
  );

  baseMesh.receiveShadow = true;

  entries.forEach((entry, index) => {
    euler.set(-Math.PI / 2, entry.rotationY ?? 0, 0);
    quaternion.setFromEuler(euler);

    // Sink the tile body so its top surface sits flush with the gameplay floor.
    position.set(entry.x, (entry.y ?? 0) - tileHeight / 2, entry.z);
    scale.set(1, 1, 1);
    matrix.compose(position, new Quaternion(), scale);
    baseMesh.setMatrixAt(index, matrix);

    // 5mm above the tile body — coupled with polygonOffset on the inset
    // material this gives a comfortable depth margin at any zoom.
    position.set(entry.x, (entry.y ?? 0) + 0.005, entry.z);
    matrix.compose(position, quaternion, scale);
    insetMesh.setMatrixAt(index, matrix);
  });

  updateMesh(baseMesh, entries.length);
  updateMesh(insetMesh, entries.length);
  group.add(baseMesh, insetMesh);
  return group;
}

export function createInstancedWallPanels(
  entries: LinearInstanceEntry[],
  options?: {
    height?: number;
    thickness?: number;
    bodyColor?: string;
    capColor?: string;
    trimColor?: string;
  }
) {
  const group = new Group();
  const height = options?.height ?? 2.7;
  const thickness = options?.thickness ?? 0.24;
  const bodyMesh = new InstancedMesh(
    new BoxGeometry(1, height, thickness),
    createMaterial(options?.bodyColor ?? "#f4ede3", 0.84, 0.03),
    entries.length
  );
  const capMesh = new InstancedMesh(
    new BoxGeometry(1, 0.08, thickness * 1.18),
    createMaterial(options?.capColor ?? "#dbe7f3", 0.34, 0.12),
    entries.length
  );
  const trimMesh = new InstancedMesh(
    new BoxGeometry(1, 0.24, thickness * 1.1),
    createMaterial(options?.trimColor ?? "#efe5d5", 0.72, 0.04),
    entries.length
  );

  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  capMesh.castShadow = true;

  entries.forEach((entry, index) => {
    euler.set(0, entry.rotationY ?? 0, 0);
    quaternion.setFromEuler(euler);

    position.set(entry.x, (entry.y ?? 0) + height / 2, entry.z);
    scale.set(entry.length ?? 1, 1, 1);
    matrix.compose(position, quaternion, scale);
    bodyMesh.setMatrixAt(index, matrix);

    position.set(entry.x, (entry.y ?? 0) + height + 0.04, entry.z);
    scale.set((entry.length ?? 1) * 0.94, 1, 1);
    matrix.compose(position, quaternion, scale);
    capMesh.setMatrixAt(index, matrix);

    position.set(entry.x, (entry.y ?? 0) + 0.18, entry.z);
    scale.set((entry.length ?? 1) * 0.9, 1, 1);
    matrix.compose(position, quaternion, scale);
    trimMesh.setMatrixAt(index, matrix);
  });

  updateMesh(bodyMesh, entries.length);
  updateMesh(capMesh, entries.length);
  updateMesh(trimMesh, entries.length);
  group.add(bodyMesh, capMesh, trimMesh);
  return group;
}

export function createInstancedGlassPanels(
  entries: LinearInstanceEntry[],
  options?: {
    height?: number;
    thickness?: number;
    glassColor?: string;
    frameColor?: string;
  }
) {
  const group = new Group();
  const height = options?.height ?? 1.7;
  const thickness = options?.thickness ?? 0.08;
  const glassTint = options?.glassColor ?? "#ccefff";
  const frameColor = options?.frameColor ?? "#f7f4ee";

  const glassMesh = new InstancedMesh(
    new BoxGeometry(1, height, thickness),
    createMaterial(glassTint, 0.1, 0.12, 0.34, new Color("#7bd7ff").multiplyScalar(0.08)),
    entries.length
  );
  const topFrameMesh = new InstancedMesh(
    new BoxGeometry(1, 0.08, thickness * 1.4),
    createMaterial(frameColor, 0.42, 0.12),
    entries.length
  );
  const bottomFrameMesh = new InstancedMesh(
    new BoxGeometry(1, 0.08, thickness * 1.4),
    createMaterial(frameColor, 0.42, 0.12),
    entries.length
  );

  glassMesh.castShadow = true;

  entries.forEach((entry, index) => {
    euler.set(0, entry.rotationY ?? 0, 0);
    quaternion.setFromEuler(euler);

    position.set(entry.x, (entry.y ?? 0) + height / 2, entry.z);
    scale.set(entry.length ?? 1, 1, 1);
    matrix.compose(position, quaternion, scale);
    glassMesh.setMatrixAt(index, matrix);

    position.set(entry.x, (entry.y ?? 0) + height + 0.03, entry.z);
    scale.set(entry.length ?? 1, 1, 1);
    matrix.compose(position, quaternion, scale);
    topFrameMesh.setMatrixAt(index, matrix);

    position.set(entry.x, (entry.y ?? 0) + 0.04, entry.z);
    matrix.compose(position, quaternion, scale);
    bottomFrameMesh.setMatrixAt(index, matrix);
  });

  updateMesh(glassMesh, entries.length);
  updateMesh(topFrameMesh, entries.length);
  updateMesh(bottomFrameMesh, entries.length);
  group.add(glassMesh, topFrameMesh, bottomFrameMesh);
  return group;
}

export function createInstancedChairs(entries: ChairEntry[], color = "#dbe7f4") {
  const group = new Group();
  const seatMaterial = createMaterial(color, 0.72, 0.04);
  const frameMaterial = createMaterial("#c8d6e4", 0.4, 0.32);

  const seatMesh = new InstancedMesh(new BoxGeometry(0.72, 0.14, 0.72), seatMaterial, entries.length);
  const backMesh = new InstancedMesh(new BoxGeometry(0.72, 0.54, 0.14), seatMaterial, entries.length);
  const stemMesh = new InstancedMesh(new CylinderGeometry(0.06, 0.06, 0.44, 8), frameMaterial, entries.length);
  const baseMesh = new InstancedMesh(new CylinderGeometry(0.28, 0.1, 0.08, 10), frameMaterial, entries.length);

  seatMesh.castShadow = true;
  backMesh.castShadow = true;
  stemMesh.castShadow = true;

  entries.forEach((entry, index) => {
    applyPart(seatMesh, index, entry, [0, 0.52, 0], [1, 1, 1]);
    applyPart(backMesh, index, entry, [0, 0.8, -0.28], [1, 1, 1]);
    applyPart(stemMesh, index, entry, [0, 0.24, 0], [1, 1, 1]);
    applyPart(baseMesh, index, entry, [0, 0.04, 0], [1, 1, 1]);
  });

  updateMesh(seatMesh, entries.length);
  updateMesh(backMesh, entries.length);
  updateMesh(stemMesh, entries.length);
  updateMesh(baseMesh, entries.length);
  group.add(seatMesh, backMesh, stemMesh, baseMesh);
  return group;
}

export function createInstancedCeilingLights(entries: PointEntry[]) {
  const group = new Group();
  const shellMesh = new InstancedMesh(
    new CylinderGeometry(0.34, 0.34, 0.08, 10),
    createMaterial("#f5efe4", 0.42, 0.16),
    entries.length
  );
  const coreMesh = new InstancedMesh(
    new CylinderGeometry(0.22, 0.22, 0.03, 10),
    createMaterial("#eefbff", 0.2, 0.08, 1, new Color("#7bd7ff").multiplyScalar(0.28)),
    entries.length
  );

  entries.forEach((entry, index) => {
    position.set(entry.x, entry.y ?? 3.1, entry.z);
    scale.set(1, 1, 1);
    matrix.compose(position, quaternion.identity(), scale);
    shellMesh.setMatrixAt(index, matrix);

    position.set(entry.x, (entry.y ?? 3.1) + 0.035, entry.z);
    matrix.compose(position, quaternion, scale);
    coreMesh.setMatrixAt(index, matrix);
  });

  updateMesh(shellMesh, entries.length);
  updateMesh(coreMesh, entries.length);
  group.add(shellMesh, coreMesh);
  return group;
}

export function createInstancedPlants(entries: PointEntry[]) {
  const group = new Group();
  const potMesh = new InstancedMesh(
    new CylinderGeometry(0.24, 0.3, 0.38, 6),
    createMaterial("#baa18b", 0.86, 0.04),
    entries.length
  );
  const leafMesh = new InstancedMesh(
    new SphereGeometry(0.22, 8, 8),
    createMaterial("#9ed7c1", 0.72, 0.02),
    entries.length * 3
  );

  potMesh.castShadow = true;
  potMesh.receiveShadow = true;
  leafMesh.castShadow = true;

  entries.forEach((entry, index) => {
    position.set(entry.x, (entry.y ?? 0) + 0.19, entry.z);
    scale.set(1, 1, 1);
    matrix.compose(position, quaternion.identity(), scale);
    potMesh.setMatrixAt(index, matrix);

    const leaves: Array<[number, number, number, number]> = [
      [-0.14, 0.56, 0.02, 1],
      [0.12, 0.72, -0.08, 1.08],
      [0.04, 0.62, 0.12, 0.9]
    ];
    leaves.forEach(([x, y, z, leafScale], leafIndex) => {
      position.set(entry.x + x, (entry.y ?? 0) + y, entry.z + z);
      scale.set(leafScale, leafScale * 1.08, leafScale);
      matrix.compose(position, quaternion, scale);
      leafMesh.setMatrixAt(index * 3 + leafIndex, matrix);
    });
  });

  updateMesh(potMesh, entries.length);
  updateMesh(leafMesh, entries.length * 3);
  group.add(potMesh, leafMesh);
  return group;
}

export function createInstancedSmallScreens(entries: SmallScreenEntry[], accentColor: string) {
  const group = new Group();
  const frameMesh = new InstancedMesh(
    new BoxGeometry(0.68, 0.42, 0.08),
    createMaterial("#ebe4d8", 0.42, 0.16),
    entries.length
  );
  const screenMesh = new InstancedMesh(
    new PlaneGeometry(0.54, 0.28),
    createMaterial("#e8fbff", 0.16, 0.08, 0.92, new Color(accentColor).multiplyScalar(0.38)),
    entries.length
  );
  const stemMesh = new InstancedMesh(
    new BoxGeometry(0.08, 0.24, 0.08),
    createMaterial("#c9d6e5", 0.44, 0.24),
    entries.length
  );
  const baseMesh = new InstancedMesh(
    new BoxGeometry(0.38, 0.06, 0.2),
    createMaterial("#d7dfeb", 0.36, 0.22),
    entries.length
  );

  frameMesh.castShadow = true;
  stemMesh.castShadow = true;

  entries.forEach((entry, index) => {
    applyPart(frameMesh, index, entry, [0, 1.1, 0], [1, 1, 1]);
    applyPart(stemMesh, index, entry, [0, 0.82, 0], [1, 1, 1]);
    applyPart(baseMesh, index, entry, [0, 0.68, 0.02], [1, 1, 1]);

    euler.set(0, entry.rotationY ?? 0, 0);
    quaternion.setFromEuler(euler);
    offset.set(0, 1.1, 0.045).applyQuaternion(quaternion);
    position.set(entry.x + offset.x, (entry.y ?? 0) + offset.y, entry.z + offset.z);
    scale.set(1, 1, 1);
    matrix.compose(position, quaternion, scale);
    screenMesh.setMatrixAt(index, matrix);
  });

  updateMesh(frameMesh, entries.length);
  updateMesh(screenMesh, entries.length);
  updateMesh(stemMesh, entries.length);
  updateMesh(baseMesh, entries.length);
  group.add(frameMesh, screenMesh, stemMesh, baseMesh);
  return group;
}

export function createInstancedDecorNodes(entries: DecorNodeEntry[], accentColor: string) {
  const group = new Group();
  const baseMesh = new InstancedMesh(
    new CylinderGeometry(0.18, 0.22, 0.28, 8),
    createMaterial("#e6ddd0", 0.84, 0.04),
    entries.length
  );
  const columnMesh = new InstancedMesh(
    new BoxGeometry(0.18, 0.42, 0.18),
    createMaterial("#dbe4ef", 0.48, 0.22),
    entries.length
  );
  const headMesh = new InstancedMesh(
    new SphereGeometry(0.14, 8, 8),
    createMaterial("#f5fbff", 0.28, 0.14, 1, new Color(accentColor).multiplyScalar(0.3)),
    entries.length
  );

  baseMesh.castShadow = true;
  columnMesh.castShadow = true;
  headMesh.castShadow = true;

  entries.forEach((entry, index) => {
    applyPart(baseMesh, index, entry, [0, 0.14, 0], [1, 1, 1]);
    applyPart(columnMesh, index, entry, [0, 0.44, 0], [1, 1, 1]);
    applyPart(headMesh, index, entry, [0, 0.78, 0], [1, 1, 1]);
  });

  updateMesh(baseMesh, entries.length);
  updateMesh(columnMesh, entries.length);
  updateMesh(headMesh, entries.length);
  group.add(baseMesh, columnMesh, headMesh);
  return group;
}
