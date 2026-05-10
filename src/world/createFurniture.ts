import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry
} from "three";

function createMaterial(color: string, roughness = 0.72, metalness = 0.08) {
  return new MeshStandardMaterial({ color, roughness, metalness });
}

export function createDesk(accentColor: string, wide = false) {
  const group = new Group();
  const wood = createMaterial("#d7b98f", 0.88, 0.04);
  const frame = createMaterial("#2d425d", 0.45, 0.25);
  const accent = createMaterial(accentColor, 0.62, 0.12);

  const top = new Mesh(new BoxGeometry(wide ? 3.4 : 2.4, 0.18, 1.25), wood);
  top.position.y = 0.84;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const sideModule = new Mesh(new BoxGeometry(0.62, 0.88, 1.1), accent);
  sideModule.position.set(wide ? 1.1 : 0.7, 0.43, 0);
  sideModule.castShadow = true;
  sideModule.receiveShadow = true;
  group.add(sideModule);

  const frameBar = new Mesh(new BoxGeometry(wide ? 3.2 : 2.2, 0.12, 0.14), frame);
  frameBar.position.set(0, 0.32, -0.46);
  frameBar.castShadow = true;
  group.add(frameBar);

  const legs = [
    [-1, 0.4, -0.38],
    [-1, 0.4, 0.38],
    [0.25, 0.4, -0.38],
    [0.25, 0.4, 0.38]
  ];

  legs.forEach(([x, y, z]) => {
    const leg = new Mesh(new BoxGeometry(0.12, 0.84, 0.12), frame);
    leg.position.set(x * (wide ? 1.25 : 1), y, z);
    leg.castShadow = true;
    group.add(leg);
  });

  const monitorBase = new Mesh(new CylinderGeometry(0.11, 0.11, 0.08, 10), frame);
  monitorBase.position.set(-0.32, 0.93, -0.12);
  monitorBase.castShadow = true;
  group.add(monitorBase);

  const monitorStand = new Mesh(new BoxGeometry(0.08, 0.28, 0.08), frame);
  monitorStand.position.set(-0.32, 1.07, -0.12);
  monitorStand.castShadow = true;
  group.add(monitorStand);

  const monitor = new Mesh(new BoxGeometry(0.88, 0.56, 0.08), createMaterial("#f2f8fb", 0.3, 0.18));
  monitor.position.set(-0.32, 1.32, -0.12);
  monitor.castShadow = true;
  group.add(monitor);

  const keyboard = new Mesh(new BoxGeometry(0.52, 0.04, 0.22), frame);
  keyboard.position.set(-0.32, 0.94, 0.28);
  keyboard.castShadow = true;
  group.add(keyboard);

  const nameplate = new Mesh(new BoxGeometry(0.62, 0.14, 0.08), accent);
  nameplate.position.set(0.78, 1.04, 0.42);
  nameplate.castShadow = true;
  group.add(nameplate);

  return group;
}

export function createMoodBoard(accentColor: string) {
  const group = new Group();
  const board = new Mesh(new BoxGeometry(1.8, 1.2, 0.12), createMaterial("#f7f1e4", 0.92));
  board.castShadow = true;
  group.add(board);

  const stripe = new Mesh(new BoxGeometry(1.8, 0.14, 0.13), createMaterial(accentColor, 0.66));
  stripe.position.set(0, 0.53, 0.01);
  stripe.castShadow = true;
  group.add(stripe);

  const notes = [
    [-0.46, 0.1],
    [0.12, 0.24],
    [0.42, -0.16],
    [-0.16, -0.24]
  ];
  notes.forEach(([x, y]) => {
    const note = new Mesh(new BoxGeometry(0.28, 0.2, 0.04), createMaterial("#ffffff", 0.96));
    note.position.set(x, y, 0.08);
    note.rotation.z = x * 0.3;
    group.add(note);
  });

  return group;
}

export function createMicrophoneStation(accentColor: string) {
  const group = new Group();
  const stand = new Mesh(new CylinderGeometry(0.04, 0.04, 1.2, 8), createMaterial("#c9d0dc", 0.42, 0.38));
  stand.position.y = 0.6;
  stand.castShadow = true;
  group.add(stand);

  const micHead = new Mesh(new CylinderGeometry(0.14, 0.12, 0.28, 12), createMaterial(accentColor, 0.6));
  micHead.rotation.z = Math.PI / 4;
  micHead.position.set(0.14, 1.12, 0);
  micHead.castShadow = true;
  group.add(micHead);

  const ring = new Mesh(new TorusGeometry(0.32, 0.03, 10, 24), createMaterial("#f5ecff", 0.45, 0.2));
  ring.position.set(0.1, 1.02, 0);
  ring.rotation.y = Math.PI / 2;
  group.add(ring);

  return group;
}

export function createWavePanel(accentColor: string) {
  const group = new Group();
  const panel = new Mesh(new BoxGeometry(1.4, 0.9, 0.08), createMaterial("#1e2838", 0.52, 0.18));
  panel.castShadow = true;
  group.add(panel);

  for (let i = 0; i < 6; i += 1) {
    const bar = new Mesh(new BoxGeometry(0.12, 0.12 + (i % 3) * 0.16, 0.04), createMaterial(accentColor, 0.5));
    bar.position.set(-0.45 + i * 0.18, -0.06 + (i % 2) * 0.08, 0.08);
    group.add(bar);
  }

  return group;
}

export function createShelf(accentColor: string) {
  const group = new Group();
  const frame = createMaterial("#30435a", 0.5, 0.2);
  const accent = createMaterial(accentColor, 0.64);
  const sideLeft = new Mesh(new BoxGeometry(0.12, 1.8, 0.46), frame);
  sideLeft.position.set(-0.62, 0.9, 0);
  sideLeft.castShadow = true;
  group.add(sideLeft);

  const sideRight = sideLeft.clone();
  sideRight.position.x = 0.62;
  group.add(sideRight);

  [0.22, 0.88, 1.54].forEach((y, index) => {
    const shelf = new Mesh(new BoxGeometry(1.34, 0.1, 0.46), frame);
    shelf.position.set(0, y, 0);
    shelf.castShadow = true;
    group.add(shelf);

    const book = new Mesh(new BoxGeometry(0.18, 0.38, 0.22), accent);
    book.position.set(-0.26 + index * 0.22, y + 0.24, 0.02);
    group.add(book);
  });

  return group;
}

export function createWindowStrip() {
  const window = new Mesh(
    new PlaneGeometry(4.8, 1.6),
    new MeshStandardMaterial({
      color: new Color("#dff5ff"),
      roughness: 0.18,
      metalness: 0.18,
      transparent: true,
      opacity: 0.62
    })
  );
  return window;
}
