import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry
} from "three";
import type { CharacterSilhouette } from "./characterConfig";

export interface CharacterMaterialSet {
  accent: MeshStandardMaterial;
  accentGlow: MeshStandardMaterial;
  fabric: MeshStandardMaterial;
  fabricAlt: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  skin: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  metal: MeshStandardMaterial;
  screen: MeshStandardMaterial;
  white: MeshStandardMaterial;
}

export interface CharacterAnchors {
  head: Group;
  face: Object3D;
  chest: Object3D;
  back: Object3D;
  leftHand: Object3D;
  rightHand: Object3D;
  overhead: Object3D;
  waist: Object3D;
}

export interface CharacterBaseRig {
  root: Group;
  bodyRoot: Group;
  torso: Mesh;
  head: Mesh;
  headAnchor: Group;
  leftArm: Group;
  rightArm: Group;
  labelAnchor: Object3D;
  anchors: CharacterAnchors;
  accentMaterials: MeshStandardMaterial[];
  glowMaterials: MeshStandardMaterial[];
  glassMaterials: MeshStandardMaterial[];
}

const SHOULDER_POSE: Record<CharacterSilhouette, { left: number; right: number }> = {
  scientist: { left: 0.38, right: -0.18 },
  social: { left: 0.18, right: -0.62 },
  editorial: { left: 0.42, right: -0.38 },
  narration: { left: 0.28, right: -0.46 },
  designer: { left: 0.16, right: -0.42 }
};

export function createCharacterMaterials(accentColor: string): CharacterMaterialSet {
  const accent = new Color(accentColor);

  return {
    accent: new MeshStandardMaterial({
      color: accent,
      emissive: accent.clone().multiplyScalar(0.08),
      roughness: 0.72,
      metalness: 0.12,
      flatShading: true
    }),
    accentGlow: new MeshStandardMaterial({
      color: accent.clone().lerp(new Color("#ffffff"), 0.18),
      emissive: accent.clone().multiplyScalar(0.28),
      roughness: 0.55,
      metalness: 0.18,
      flatShading: true
    }),
    fabric: new MeshStandardMaterial({
      color: "#f8fbff",
      roughness: 0.86,
      metalness: 0.04,
      flatShading: true
    }),
    fabricAlt: new MeshStandardMaterial({
      color: "#dde9f4",
      roughness: 0.84,
      metalness: 0.05,
      flatShading: true
    }),
    dark: new MeshStandardMaterial({
      color: "#26384e",
      roughness: 0.72,
      metalness: 0.16,
      flatShading: true
    }),
    skin: new MeshStandardMaterial({
      color: "#f3dcd7",
      roughness: 0.88,
      metalness: 0.02,
      flatShading: true
    }),
    glass: new MeshStandardMaterial({
      color: "#dff7ff",
      emissive: "#9feeff",
      emissiveIntensity: 0.14,
      roughness: 0.08,
      metalness: 0.22,
      transparent: true,
      opacity: 0.44,
      flatShading: true
    }),
    metal: new MeshStandardMaterial({
      color: "#d8e6f2",
      roughness: 0.38,
      metalness: 0.52,
      flatShading: true
    }),
    screen: new MeshStandardMaterial({
      color: "#b8f5ff",
      emissive: "#9feeff",
      emissiveIntensity: 0.4,
      roughness: 0.28,
      metalness: 0.18,
      flatShading: true
    }),
    white: new MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.82,
      metalness: 0.04,
      flatShading: true
    })
  };
}

export function createBaseBody(
  silhouette: CharacterSilhouette,
  materials: CharacterMaterialSet,
  headScale: number,
  bodyWidth: number
): CharacterBaseRig {
  const root = new Group();
  root.position.y = 0.12;

  const bodyRoot = new Group();
  root.add(bodyRoot);

  const accentMaterials = [materials.accent, materials.accentGlow];
  const glowMaterials = [materials.accentGlow, materials.screen];
  const glassMaterials = [materials.glass];

  const hips = new Mesh(new BoxGeometry(0.42 * bodyWidth, 0.24, 0.26), materials.fabricAlt);
  hips.position.y = 0.55;
  hips.castShadow = true;
  bodyRoot.add(hips);

  const torso = new Mesh(new CylinderGeometry(0.23 * bodyWidth, 0.28 * bodyWidth, 0.54, 7), materials.fabric);
  torso.position.y = 0.88;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyRoot.add(torso);

  const chestPlate = new Mesh(new BoxGeometry(0.2 * bodyWidth, 0.18, 0.08), materials.accentGlow);
  chestPlate.position.set(0, 0.92, 0.22);
  chestPlate.castShadow = true;
  bodyRoot.add(chestPlate);

  const leftLeg = new Mesh(new BoxGeometry(0.15, 0.44, 0.16), materials.dark);
  leftLeg.position.set(-0.12, 0.26, 0);
  leftLeg.castShadow = true;
  bodyRoot.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.12;
  bodyRoot.add(rightLeg);

  const leftShoe = new Mesh(new BoxGeometry(0.22, 0.08, 0.3), materials.white);
  leftShoe.position.set(-0.12, 0.03, 0.05);
  leftShoe.castShadow = true;
  bodyRoot.add(leftShoe);

  const rightShoe = leftShoe.clone();
  rightShoe.position.x = 0.12;
  bodyRoot.add(rightShoe);

  const leftArm = createArm(materials, bodyWidth);
  leftArm.position.set(-0.29 * bodyWidth, 1.02, 0.03);
  leftArm.rotation.z = SHOULDER_POSE[silhouette].left;
  bodyRoot.add(leftArm);

  const rightArm = createArm(materials, bodyWidth);
  rightArm.position.set(0.29 * bodyWidth, 1.02, 0.03);
  rightArm.rotation.z = SHOULDER_POSE[silhouette].right;
  bodyRoot.add(rightArm);

  const headAnchor = new Group();
  headAnchor.position.y = 1.23;
  bodyRoot.add(headAnchor);

  const head = createBigHead(materials, headScale);
  head.castShadow = true;
  headAnchor.add(head);

  const neck = new Mesh(new CylinderGeometry(0.08, 0.09, 0.11, 6), materials.skin);
  neck.position.y = -0.06;
  neck.castShadow = true;
  headAnchor.add(neck);

  const faceAnchor = new Object3D();
  faceAnchor.position.set(0, 0.03, 0.34 * headScale);
  headAnchor.add(faceAnchor);

  const chest = new Object3D();
  chest.position.set(0, 0.98, 0.16);
  bodyRoot.add(chest);

  const back = new Object3D();
  back.position.set(0, 0.92, -0.22);
  bodyRoot.add(back);

  const leftHand = new Object3D();
  leftHand.position.set(0, -0.28, 0);
  leftArm.add(leftHand);

  const rightHand = new Object3D();
  rightHand.position.set(0, -0.28, 0);
  rightArm.add(rightHand);

  const overhead = new Object3D();
  overhead.position.set(0, 1.82, 0);
  bodyRoot.add(overhead);

  const waist = new Object3D();
  waist.position.set(0, 0.74, 0.12);
  bodyRoot.add(waist);

  const labelAnchor = new Object3D();
  labelAnchor.position.set(0, 2.12, 0);
  bodyRoot.add(labelAnchor);

  return {
    root,
    bodyRoot,
    torso,
    head,
    headAnchor,
    leftArm,
    rightArm,
    labelAnchor,
    anchors: {
      head: headAnchor,
      face: faceAnchor,
      chest,
      back,
      leftHand,
      rightHand,
      overhead,
      waist
    },
    accentMaterials,
    glowMaterials,
    glassMaterials
  };
}

function createArm(materials: CharacterMaterialSet, bodyWidth: number) {
  const group = new Group();

  const upper = new Mesh(new BoxGeometry(0.15, 0.28, 0.16), materials.fabric);
  upper.position.y = -0.1;
  upper.castShadow = true;
  group.add(upper);

  const forearm = new Mesh(new BoxGeometry(0.13, 0.26, 0.14), materials.fabricAlt);
  forearm.position.y = -0.31;
  forearm.rotation.z = 0.08 * bodyWidth;
  forearm.castShadow = true;
  group.add(forearm);

  const hand = new Mesh(new BoxGeometry(0.12, 0.12, 0.12), materials.skin);
  hand.position.y = -0.46;
  hand.castShadow = true;
  group.add(hand);

  return group;
}

export function createBigHead(materials: CharacterMaterialSet, scale = 1) {
  const head = new Mesh(new IcosahedronGeometry(0.33 * scale, 1), materials.skin);
  head.castShadow = true;
  head.receiveShadow = true;
  return head;
}

export function createHairOrHelmet(
  materials: CharacterMaterialSet,
  variant: "brain" | "cap" | "visor" | "hood"
) {
  const group = new Group();

  if (variant === "brain") {
    const crown = new Mesh(new IcosahedronGeometry(0.38, 1), materials.fabricAlt);
    crown.position.set(0, 0.18, -0.01);
    crown.scale.set(1.06, 0.96, 1.08);
    crown.castShadow = true;
    group.add(crown);

    const lobeLeft = new Mesh(new IcosahedronGeometry(0.19, 0), materials.fabricAlt);
    lobeLeft.position.set(-0.18, 0.22, -0.02);
    lobeLeft.castShadow = true;
    group.add(lobeLeft);

    const lobeRight = lobeLeft.clone();
    lobeRight.position.x = 0.18;
    group.add(lobeRight);
  }

  if (variant === "cap") {
    const cap = new Mesh(new IcosahedronGeometry(0.34, 0), materials.fabricAlt);
    cap.position.set(0, 0.12, 0);
    cap.scale.set(1.05, 0.82, 1.02);
    cap.castShadow = true;
    group.add(cap);

    const bill = new Mesh(new BoxGeometry(0.18, 0.05, 0.22), materials.accent);
    bill.position.set(0, 0.02, 0.3);
    bill.rotation.x = -0.2;
    bill.castShadow = true;
    group.add(bill);
  }

  if (variant === "visor") {
    const visor = new Mesh(new BoxGeometry(0.56, 0.16, 0.14), materials.glass);
    visor.position.set(0, 0.02, 0.26);
    group.add(visor);
  }

  if (variant === "hood") {
    const hood = new Mesh(new IcosahedronGeometry(0.39, 0), materials.fabricAlt);
    hood.position.set(0, 0.08, -0.04);
    hood.scale.set(1.08, 0.95, 1.08);
    hood.castShadow = true;
    group.add(hood);

    const collar = new Mesh(new TorusGeometry(0.22, 0.05, 6, 16), materials.fabric);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -0.2, 0.02);
    collar.castShadow = true;
    group.add(collar);
  }

  return group;
}

export function createGlasses(materials: CharacterMaterialSet) {
  const group = new Group();

  const leftLens = new Mesh(new BoxGeometry(0.24, 0.18, 0.04), materials.glass);
  leftLens.position.set(-0.14, 0, 0);
  group.add(leftLens);

  const rightLens = leftLens.clone();
  rightLens.position.x = 0.14;
  group.add(rightLens);

  const bridge = new Mesh(new BoxGeometry(0.08, 0.03, 0.03), materials.dark);
  group.add(bridge);

  return group;
}

export function createSunglasses(materials: CharacterMaterialSet) {
  const group = createGlasses(materials);
  group.children.forEach((child) => {
    if (child instanceof Mesh) {
      child.material = child.geometry instanceof BoxGeometry ? materials.dark : materials.dark;
    }
  });
  return group;
}

export function createHeadphones(materials: CharacterMaterialSet, aroundNeck = false) {
  const group = new Group();

  const band = new Mesh(new TorusGeometry(0.25, 0.05, 7, 20, Math.PI), materials.metal);
  band.rotation.z = Math.PI;
  band.position.y = aroundNeck ? -0.08 : 0.12;
  if (aroundNeck) {
    band.rotation.x = Math.PI / 2;
  }
  group.add(band);

  const leftPad = new Mesh(new CylinderGeometry(0.08, 0.08, 0.07, 10), materials.accentGlow);
  leftPad.rotation.z = Math.PI / 2;
  leftPad.position.set(-0.24, aroundNeck ? -0.07 : 0.04, 0);
  leftPad.castShadow = true;
  group.add(leftPad);

  const rightPad = leftPad.clone();
  rightPad.position.x = 0.24;
  group.add(rightPad);

  return group;
}

export function createBackpack(materials: CharacterMaterialSet, withAntenna = false) {
  const group = new Group();

  const pack = new Mesh(new BoxGeometry(0.26, 0.36, 0.18), materials.fabricAlt);
  pack.castShadow = true;
  group.add(pack);

  const pocket = new Mesh(new BoxGeometry(0.18, 0.14, 0.08), materials.accent);
  pocket.position.set(0, -0.06, 0.13);
  pocket.castShadow = true;
  group.add(pocket);

  if (withAntenna) {
    const antenna = new Mesh(new CylinderGeometry(0.012, 0.012, 0.42, 5), materials.metal);
    antenna.position.set(0.08, 0.33, 0);
    antenna.rotation.z = -0.18;
    antenna.castShadow = true;
    antenna.name = "antenna";
    group.add(antenna);
  }

  return group;
}

export function createTablet(materials: CharacterMaterialSet) {
  const group = new Group();

  const frame = new Mesh(new BoxGeometry(0.24, 0.3, 0.03), materials.dark);
  frame.castShadow = true;
  group.add(frame);

  const screen = new Mesh(new PlaneGeometry(0.18, 0.24), materials.screen);
  screen.position.z = 0.017;
  group.add(screen);

  return group;
}

export function createPhone(materials: CharacterMaterialSet) {
  const group = new Group();

  const frame = new Mesh(new BoxGeometry(0.14, 0.22, 0.028), materials.dark);
  frame.castShadow = true;
  group.add(frame);

  const screen = new Mesh(new PlaneGeometry(0.1, 0.17), materials.screen);
  screen.position.z = 0.015;
  group.add(screen);

  return group;
}

export function createFloatingCards(materials: CharacterMaterialSet, accentColor: string) {
  const group = new Group();
  const stripeMaterial = new MeshStandardMaterial({
    color: accentColor,
    emissive: new Color(accentColor).multiplyScalar(0.18),
    roughness: 0.58,
    metalness: 0.08,
    flatShading: true
  });

  for (let index = 0; index < 3; index += 1) {
    const card = new Mesh(new BoxGeometry(0.18, 0.12, 0.02), materials.white);
    card.position.set(Math.cos(index * 2.1) * 0.2, index * 0.05, Math.sin(index * 2.1) * 0.2);
    card.rotation.y = index * 0.6;
    card.castShadow = true;
    group.add(card);

    const stripe = new Mesh(new BoxGeometry(0.12, 0.02, 0.025), stripeMaterial);
    stripe.position.copy(card.position).add(new Object3D().position.set(0, 0.03, 0.005));
    group.add(stripe);
  }

  return group;
}

export function createHalo(materials: CharacterMaterialSet) {
  const group = new Group();

  const ring = new Mesh(new TorusGeometry(0.34, 0.03, 8, 22), materials.accentGlow);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  for (let index = 0; index < 4; index += 1) {
    const node = new Mesh(new SphereGeometry(0.04, 8, 8), materials.accentGlow);
    const angle = (index / 4) * Math.PI * 2;
    node.position.set(Math.cos(angle) * 0.34, 0, Math.sin(angle) * 0.34);
    node.castShadow = true;
    group.add(node);
  }

  return group;
}

export function createWaveform(materials: CharacterMaterialSet) {
  const group = new Group();

  for (let index = 0; index < 5; index += 1) {
    const bar = new Mesh(new BoxGeometry(0.05, 0.08 + index * 0.03, 0.03), materials.accentGlow);
    bar.position.set(index * 0.08 - 0.16, 0, 0);
    bar.castShadow = true;
    group.add(bar);
  }

  return group;
}

export function createLayerPanels(materials: CharacterMaterialSet) {
  const group = new Group();

  for (let index = 0; index < 3; index += 1) {
    const panel = new Mesh(new BoxGeometry(0.22, 0.14, 0.02), index === 1 ? materials.accentGlow : materials.glass);
    panel.position.set(index * 0.06, index * 0.05, -index * 0.03);
    panel.rotation.y = 0.28;
    panel.castShadow = true;
    group.add(panel);
  }

  return group;
}

export function createLabCoat(materials: CharacterMaterialSet) {
  const group = new Group();

  const back = new Mesh(new BoxGeometry(0.58, 0.66, 0.22), materials.white);
  back.position.set(0, -0.04, -0.02);
  back.castShadow = true;
  group.add(back);

  const leftFlap = new Mesh(new BoxGeometry(0.18, 0.58, 0.08), materials.white);
  leftFlap.position.set(-0.16, -0.02, 0.16);
  leftFlap.rotation.y = 0.28;
  leftFlap.castShadow = true;
  group.add(leftFlap);

  const rightFlap = leftFlap.clone();
  rightFlap.position.x = 0.16;
  rightFlap.rotation.y = -0.28;
  group.add(rightFlap);

  const tie = new Mesh(new BoxGeometry(0.06, 0.32, 0.03), materials.dark);
  tie.position.set(0, 0.04, 0.18);
  tie.castShadow = true;
  group.add(tie);

  return group;
}

export function createHood(materials: CharacterMaterialSet) {
  return createHairOrHelmet(materials, "hood");
}
