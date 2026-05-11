import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry
} from "three";
import { TroikaLabel3D } from "../../ui3d/troikaLabel";

function createMaterial(color: string, roughness = 0.64, metalness = 0.08, opacity = 1) {
  return new MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent: opacity < 1,
    opacity,
    flatShading: true
  });
}

export function createFloorTile(color = "#EAF7FF") {
  const group = new Group();

  const base = new Mesh(new BoxGeometry(0.98, 0.08, 0.98), createMaterial(color, 0.84, 0.03));
  base.receiveShadow = true;
  group.add(base);

  const inset = new Mesh(new PlaneGeometry(0.84, 0.84), createMaterial("#f8fcff", 0.26, 0.06, 0.95));
  inset.rotation.x = -Math.PI / 2;
  inset.position.y = 0.045;
  group.add(inset);

  return group;
}

export function createWallSegment(length: number, height = 2.6, thickness = 0.3) {
  const group = new Group();
  const wall = new Mesh(new BoxGeometry(length, height, thickness), createMaterial("#FBFEFF", 0.72, 0.04));
  wall.position.y = height / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  const cap = new Mesh(new BoxGeometry(length * 0.96, 0.08, thickness * 1.18), createMaterial("#EAF6FF", 0.36, 0.1));
  cap.position.y = height + 0.03;
  cap.castShadow = true;
  group.add(cap);

  return group;
}

export function createGlassWall(length: number, height = 2.2, thickness = 0.08) {
  const group = new Group();

  const glass = new Mesh(
    new BoxGeometry(length, height, thickness),
    new MeshStandardMaterial({
      color: "#C9F1FF",
      transparent: true,
      opacity: 0.28,
      roughness: 0.14,
      metalness: 0.14,
      flatShading: true
    })
  );
  glass.position.y = height / 2;
  glass.castShadow = true;
  group.add(glass);

  const topFrame = new Mesh(new BoxGeometry(length, 0.08, thickness * 1.4), createMaterial("#F9FCFF", 0.42, 0.08));
  topFrame.position.y = height + 0.02;
  group.add(topFrame);

  const bottomFrame = topFrame.clone();
  bottomFrame.position.y = 0.04;
  group.add(bottomFrame);

  return group;
}

export function createScreen(width = 1.2, height = 0.72, color = "#9DEBFF") {
  const group = new Group();

  const frame = new Mesh(new BoxGeometry(width + 0.12, height + 0.12, 0.08), createMaterial("#E9F4FB", 0.36, 0.24));
  frame.castShadow = true;
  group.add(frame);

  const screen = new Mesh(
    new PlaneGeometry(width, height),
    new MeshStandardMaterial({
      color: "#B8F4FF",
      emissive: new Color(color).multiplyScalar(0.42),
      transparent: true,
      opacity: 0.9,
      roughness: 0.14,
      metalness: 0.1,
      flatShading: true
    })
  );
  screen.position.z = 0.05;
  group.add(screen);

  return group;
}

export function createHologramPanel(accentColor: string, width = 1.2, height = 0.8) {
  const group = new Group();

  const panel = new Mesh(
    new PlaneGeometry(width, height),
    new MeshStandardMaterial({
      color: "#dff8ff",
      emissive: new Color(accentColor).multiplyScalar(0.48),
      transparent: true,
      opacity: 0.42,
      roughness: 0.12,
      metalness: 0.06,
      flatShading: true
    })
  );
  group.add(panel);

  const ring = new Mesh(
    new TorusGeometry(Math.min(width, height) * 0.22, 0.015, 8, 32),
    createMaterial(accentColor, 0.32, 0.08, 0.88)
  );
  ring.position.z = 0.02;
  group.add(ring);

  return group;
}

export function createDesk(accentColor: string, options?: { wide?: boolean; screens?: number }) {
  const group = new Group();
  const wide = options?.wide ?? false;
  const deskWidth = wide ? 3.8 : 2.6;

  const body = new Mesh(new BoxGeometry(deskWidth, 0.18, 1.25), createMaterial("#F9FCFF", 0.72, 0.04));
  body.position.y = 0.85;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const accentStrip = new Mesh(new BoxGeometry(deskWidth * 0.96, 0.08, 0.12), createMaterial(accentColor, 0.28, 0.14));
  accentStrip.position.set(0, 0.96, -0.48);
  accentStrip.castShadow = true;
  group.add(accentStrip);

  const cabinet = new Mesh(new BoxGeometry(0.78, 0.82, 1.08), createMaterial("#E4F0F8", 0.62, 0.06));
  cabinet.position.set(deskWidth * 0.28, 0.42, 0);
  group.add(cabinet);

  const legOffsets = wide ? [-1.45, -0.32, 0.72] : [-0.92, 0.08];
  legOffsets.forEach((offset) => {
    const legA = new Mesh(new BoxGeometry(0.12, 0.84, 0.12), createMaterial("#D8E8F2", 0.44, 0.2));
    legA.position.set(offset, 0.42, -0.42);
    const legB = legA.clone();
    legB.position.z = 0.42;
    group.add(legA, legB);
  });

  const screenCount = options?.screens ?? (wide ? 2 : 1);
  for (let i = 0; i < screenCount; i += 1) {
    const monitor = createScreen(wide ? 0.82 : 0.94, 0.52, accentColor);
    monitor.position.set(-deskWidth * 0.18 + i * 0.94, 1.24, -0.12);
    group.add(monitor);
  }

  const keyboard = new Mesh(new BoxGeometry(0.54, 0.04, 0.2), createMaterial("#CFE4F2", 0.32, 0.18));
  keyboard.position.set(-0.34, 0.95, 0.24);
  group.add(keyboard);

  return group;
}

export function createChair(color = "#D7EBF8") {
  const group = new Group();

  const seat = new Mesh(new BoxGeometry(0.68, 0.14, 0.68), createMaterial(color, 0.68, 0.04));
  seat.position.y = 0.52;
  seat.castShadow = true;
  group.add(seat);

  const back = new Mesh(new BoxGeometry(0.68, 0.58, 0.12), createMaterial(color, 0.68, 0.04));
  back.position.set(0, 0.82, -0.28);
  group.add(back);

  const stem = new Mesh(new CylinderGeometry(0.06, 0.06, 0.48, 8), createMaterial("#BFD3E3", 0.42, 0.28));
  stem.position.y = 0.24;
  group.add(stem);

  const base = new Mesh(new CylinderGeometry(0.26, 0.08, 0.06, 10), createMaterial("#D8E6F0", 0.34, 0.26));
  base.position.y = 0.02;
  group.add(base);

  return group;
}

export function createDoorFrame(width = 1.8, height = 2.45) {
  const group = new Group();
  const pillarMaterial = createMaterial("#FBFEFF", 0.66, 0.04);

  const left = new Mesh(new BoxGeometry(0.24, height, 0.32), pillarMaterial);
  left.position.set(-width / 2, height / 2, 0);
  const right = left.clone();
  right.position.x = width / 2;
  const top = new Mesh(new BoxGeometry(width + 0.24, 0.26, 0.32), pillarMaterial);
  top.position.set(0, height + 0.02, 0);

  group.add(left, right, top);
  return group;
}

export function createAutomaticDoor(
  width = 1.8,
  height = 2.28,
  accentColor = "#9DEBFF",
  options?: { hasWindow?: boolean }
) {
  const group = new Group();
  const panelWidth = width * 0.46;
  const hasWindow = options?.hasWindow ?? true;
  const panelMaterial = new MeshStandardMaterial({
    color: "#F7FCFF",
    roughness: 0.24,
    metalness: 0.12,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    flatShading: true
  });

  const leftPanel = new Mesh(new BoxGeometry(panelWidth, height, 0.08), panelMaterial.clone());
  leftPanel.position.set(-panelWidth * 0.52, height / 2, 0);
  leftPanel.renderOrder = 2;
  group.add(leftPanel);

  const rightPanel = new Mesh(new BoxGeometry(panelWidth, height, 0.08), panelMaterial.clone());
  rightPanel.position.set(panelWidth * 0.52, height / 2, 0);
  rightPanel.renderOrder = 2;
  group.add(rightPanel);

  if (hasWindow) {
    const leftGlass = new Mesh(
      new BoxGeometry(panelWidth * 0.78, height * 0.68, 0.03),
      new MeshStandardMaterial({
        color: "#CFF5FF",
        emissive: new Color(accentColor).multiplyScalar(0.18),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        roughness: 0.1,
        metalness: 0.1,
        flatShading: true
      })
    );
    leftGlass.position.set(0, 0.08, 0.03);
    leftGlass.renderOrder = 3;
    leftPanel.add(leftGlass);

    const rightGlass = leftGlass.clone();
    rightPanel.add(rightGlass);
  }

  const lightBar = new Mesh(
    new BoxGeometry(width + 0.12, 0.06, 0.1),
    new MeshStandardMaterial({
      color: "#E9FBFF",
      emissive: new Color(accentColor).multiplyScalar(0.5),
      roughness: 0.14,
      metalness: 0.1,
      flatShading: true
    })
  );
  lightBar.position.set(0, height + 0.12, 0);
  group.add(lightBar);

  return { group, leftPanel, rightPanel, lightBar };
}

export function createPlant() {
  const group = new Group();
  const pot = new Mesh(new CylinderGeometry(0.22, 0.28, 0.36, 6), createMaterial("#C0D5E2", 0.78, 0.04));
  pot.position.y = 0.18;
  group.add(pot);

  const leafColor = createMaterial("#A9F2D7", 0.62, 0.02);
  const leaves = [
    [-0.12, 0.58, 0],
    [0.14, 0.76, 0.04],
    [0.06, 0.62, -0.1]
  ];
  leaves.forEach(([x, y, z], index) => {
    const leaf = new Mesh(new SphereGeometry(index === 1 ? 0.24 : 0.2, 8, 8), leafColor);
    leaf.position.set(x, y, z);
    group.add(leaf);
  });

  return group;
}

export function createRoomLabel(text: string, accentColor: string) {
  const group = new Group();

  const plate = new Mesh(
    new PlaneGeometry(2.8, 0.6),
    new MeshStandardMaterial({
      color: "#0E1823",
      transparent: true,
      opacity: 0.58,
      roughness: 0.18,
      metalness: 0.04,
      flatShading: true
    })
  );
  group.add(plate);

  const accent = new Mesh(new PlaneGeometry(2.0, 0.025), createMaterial(accentColor, 0.2, 0.12, 0.9));
  accent.position.set(0, -0.2, 0.01);
  group.add(accent);

  const label = new TroikaLabel3D({
    text: text.toUpperCase(),
    fontSize: 0.2,
    color: "#ffffff",
    maxWidth: 2.5,
    anchorY: "middle",
    letterSpacing: 0.06,
    outlineWidth: 0,
    outlineOpacity: 0
  });
  label.position.set(0, 0.02, 0.02);
  group.add(label);

  return group;
}
