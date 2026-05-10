import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Scene,
  SphereGeometry,
  TorusGeometry
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

class NodeFileReader {
  constructor() {
    this.result = null;
    this.onloadend = null;
    this.onerror = null;
  }

  readAsArrayBuffer(blob) {
    blob
      .arrayBuffer()
      .then((buffer) => {
        this.result = buffer;
        this.onloadend?.({ target: this });
      })
      .catch((error) => this.onerror?.(error));
  }

  readAsDataURL(blob) {
    blob
      .arrayBuffer()
      .then((buffer) => {
        const bytes = Buffer.from(buffer);
        this.result = `data:${blob.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;
        this.onloadend?.({ target: this });
      })
      .catch((error) => this.onerror?.(error));
  }
}

global.FileReader = NodeFileReader;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetRoot = path.resolve(__dirname, "../src/assets/characters");

function createMaterial(name, color, extra = {}) {
  return new MeshStandardMaterial({
    name,
    color,
    flatShading: true,
    roughness: 0.7,
    metalness: 0.08,
    ...extra
  });
}

function addMesh(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], name = "") {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function createBackpack(parent, materials, offsetY = 0.76) {
  const backpack = new Group();
  backpack.position.set(0, offsetY, -0.22);
  addMesh(backpack, new BoxGeometry(0.28, 0.4, 0.16), materials.backpack, [0, 0, 0], [0, 0, 0], [1, 1, 1], "Backpack");
  addMesh(backpack, new BoxGeometry(0.22, 0.12, 0.1), materials.backpack, [0, 0.18, 0.02], [0, 0, 0], [1, 1, 1], "BackpackTop");
  addMesh(
    backpack,
    new CylinderGeometry(0.07, 0.07, 0.24, 8),
    materials.accessory,
    [0, 0.3, 0],
    [0, 0, Math.PI / 2],
    [1, 1, 1],
    "BackpackCanister"
  );
  addMesh(backpack, new BoxGeometry(0.09, 0.04, 0.01), materials.tech, [0, -0.12, 0.09], [0, 0, 0], [1, 1, 1], "BackpackScreen");
  parent.add(backpack);
  return backpack;
}

function createHumanoidCore({
  headColor,
  suitColor,
  visorColor,
  accentColor,
  gloveColor,
  bootColor,
  accessoryColor,
  backpackColor
}) {
  return {
    helmet: createMaterial("MAT_Helmet", headColor, { roughness: 0.52 }),
    suit: createMaterial("MAT_Suit", suitColor, { roughness: 0.84 }),
    visor: createMaterial("MAT_Visor", visorColor, {
      roughness: 0.08,
      metalness: 0.28,
      transparent: true,
      opacity: 0.96
    }),
    gloves: createMaterial("MAT_Gloves", gloveColor, { roughness: 0.82 }),
    boots: createMaterial("MAT_Boots", bootColor, { roughness: 0.76 }),
    backpack: createMaterial("MAT_Backpack", backpackColor, { roughness: 0.56, metalness: 0.14 }),
    tech: createMaterial("MAT_TechAccent", accentColor, {
      emissive: new Color(accentColor).multiplyScalar(0.18),
      roughness: 0.28,
      metalness: 0.14
    }),
    accessory: createMaterial("MAT_Accessory", accessoryColor, { roughness: 0.62, metalness: 0.14 })
  };
}

function createPlayerModel() {
  const scene = new Scene();
  const root = new Group();
  scene.add(root);

  const materials = createHumanoidCore({
    headColor: "#F3EEF0",
    suitColor: "#D98F7F",
    visorColor: "#071827",
    accentColor: "#66E6FF",
    gloveColor: "#EDEAE4",
    bootColor: "#D8D8D2",
    accessoryColor: "#B8B3B1",
    backpackColor: "#BFC8CC"
  });

  addMesh(root, new BoxGeometry(0.18, 0.3, 0.18), materials.suit, [-0.14, 0.32, 0], [0, 0, 0], [1, 1, 1], "LeftLeg");
  addMesh(root, new BoxGeometry(0.18, 0.3, 0.18), materials.suit, [0.14, 0.32, 0], [0, 0, 0], [1, 1, 1], "RightLeg");

  addMesh(root, new BoxGeometry(0.24, 0.16, 0.3), materials.boots, [-0.14, 0.09, 0.03], [0, 0, 0], [1, 1, 1], "LeftBoot");
  addMesh(root, new BoxGeometry(0.24, 0.16, 0.3), materials.boots, [0.14, 0.09, 0.03], [0, 0, 0], [1, 1, 1], "RightBoot");

  addMesh(root, new CylinderGeometry(0.23, 0.29, 0.54, 7), materials.suit, [0, 0.58, 0], [0, 0, 0], [1, 1, 1], "Torso");
  addMesh(root, new BoxGeometry(0.4, 0.14, 0.28), materials.suit, [0, 0.8, -0.03], [0, 0, 0], [1, 1, 1], "Shoulders");
  addMesh(root, new BoxGeometry(0.22, 0.16, 0.06), materials.accessory, [0, 0.67, 0.19], [0, 0, 0], [1, 1, 1], "ChestDevice");
  addMesh(root, new BoxGeometry(0.06, 0.05, 0.01), materials.tech, [-0.05, 0.69, 0.224], [0, 0, 0], [1, 1, 1], "ChestLightLeft");
  addMesh(root, new BoxGeometry(0.05, 0.05, 0.01), materials.tech, [0.05, 0.69, 0.224], [0, 0, 0], [1, 1, 1], "ChestLightRight");

  const leftArm = new Group();
  leftArm.position.set(-0.28, 0.73, 0.02);
  leftArm.rotation.z = 0.28;
  addMesh(leftArm, new BoxGeometry(0.13, 0.34, 0.14), materials.suit, [0, -0.16, 0], [0, 0, 0], [1, 1, 1], "LeftArm");
  addMesh(leftArm, new BoxGeometry(0.16, 0.12, 0.16), materials.gloves, [0.02, -0.39, 0], [0, 0, 0], [1, 1, 1], "LeftGlove");
  addMesh(leftArm, new BoxGeometry(0.16, 0.18, 0.1), materials.accessory, [0.1, -0.5, 0.14], [0, 0, 0], [1, 1, 1], "UtilityCase");
  root.add(leftArm);

  const rightArm = new Group();
  rightArm.position.set(0.28, 0.73, 0.02);
  rightArm.rotation.z = -0.28;
  addMesh(rightArm, new BoxGeometry(0.13, 0.34, 0.14), materials.suit, [0, -0.16, 0], [0, 0, 0], [1, 1, 1], "RightArm");
  addMesh(rightArm, new BoxGeometry(0.16, 0.12, 0.16), materials.gloves, [-0.02, -0.39, 0], [0, 0, 0], [1, 1, 1], "RightGlove");
  addMesh(rightArm, new BoxGeometry(0.08, 0.06, 0.012), materials.tech, [0.02, -0.26, 0.11], [0, 0, 0], [1, 1, 1], "WristTech");
  root.add(rightArm);

  createBackpack(root, materials, 0.76);

  const head = new Group();
  head.position.set(0, 1.04, 0.03);
  addMesh(head, new IcosahedronGeometry(0.42, 1), materials.helmet, [0, 0, 0], [0, 0, 0], [1.05, 0.98, 1.02], "Helmet");
  addMesh(head, new CylinderGeometry(0.34, 0.38, 0.12, 10), materials.helmet, [0, -0.03, 0.02], [0, 0, 0], [1.02, 0.38, 0.92], "HelmetBase");
  addMesh(head, new SphereGeometry(0.31, 10, 8, 0.58, 2, 0.48, 1.52), materials.visor, [0, -0.02, 0.18], [0, 0, 0], [1.02, 0.82, 0.62], "Visor");
  addMesh(head, new CylinderGeometry(0.05, 0.06, 0.1, 8), materials.accessory, [-0.37, 0, 0], [0, 0, 0], [1, 1, 1], "SidePortLeft");
  addMesh(head, new CylinderGeometry(0.05, 0.06, 0.1, 8), materials.accessory, [0.37, 0, 0], [0, 0, 0], [1, 1, 1], "SidePortRight");
  root.add(head);

  return scene;
}

function createNpcModel(roleKey, palette, propBuilder) {
  const scene = new Scene();
  const root = new Group();
  scene.add(root);

  const materials = createHumanoidCore(palette);

  addMesh(root, new BoxGeometry(0.17, 0.32, 0.18), materials.suit, [-0.12, 0.32, 0], [0, 0, 0], [1, 1, 1], `${roleKey}LeftLeg`);
  addMesh(root, new BoxGeometry(0.17, 0.32, 0.18), materials.suit, [0.12, 0.32, 0], [0, 0, 0], [1, 1, 1], `${roleKey}RightLeg`);
  addMesh(root, new BoxGeometry(0.24, 0.11, 0.28), materials.boots, [-0.12, 0.06, 0.04], [0, 0, 0], [1, 1, 1], `${roleKey}LeftBoot`);
  addMesh(root, new BoxGeometry(0.24, 0.11, 0.28), materials.boots, [0.12, 0.06, 0.04], [0, 0, 0], [1, 1, 1], `${roleKey}RightBoot`);

  addMesh(root, new CylinderGeometry(0.22, 0.28, 0.56, 7), materials.suit, [0, 0.62, 0], [0, 0, 0], [1, 1, 1], `${roleKey}Torso`);
  addMesh(root, new BoxGeometry(0.18, 0.18, 0.06), materials.tech, [0, 0.72, 0.2], [0, 0, 0], [1, 1, 1], `${roleKey}ChestLight`);
  addMesh(root, new BoxGeometry(0.42, 0.14, 0.28), materials.suit, [0, 0.86, -0.02], [0, 0, 0], [1, 1, 1], `${roleKey}Shoulders`);

  const leftArm = new Group();
  leftArm.position.set(-0.28, 0.72, 0.02);
  leftArm.rotation.z = 0.24;
  addMesh(leftArm, new BoxGeometry(0.13, 0.34, 0.14), materials.suit, [0, -0.16, 0], [0, 0, 0], [1, 1, 1], `${roleKey}LeftArm`);
  addMesh(leftArm, new BoxGeometry(0.14, 0.12, 0.14), materials.gloves, [0.02, -0.38, 0], [0, 0, 0], [1, 1, 1], `${roleKey}LeftGlove`);
  root.add(leftArm);

  const rightArm = new Group();
  rightArm.position.set(0.28, 0.72, 0.02);
  rightArm.rotation.z = -0.2;
  addMesh(rightArm, new BoxGeometry(0.13, 0.34, 0.14), materials.suit, [0, -0.16, 0], [0, 0, 0], [1, 1, 1], `${roleKey}RightArm`);
  addMesh(rightArm, new BoxGeometry(0.14, 0.12, 0.14), materials.gloves, [-0.02, -0.38, 0], [0, 0, 0], [1, 1, 1], `${roleKey}RightGlove`);
  root.add(rightArm);

  const head = new Group();
  head.position.set(0, 1.08, 0.02);
  addMesh(head, new IcosahedronGeometry(0.36, 1), materials.helmet, [0, 0, 0], [0, 0, 0], [1.02, 0.98, 1.04], `${roleKey}Head`);
  root.add(head);

  createBackpack(root, materials, 0.78);
  propBuilder({ root, head, leftArm, rightArm, materials });

  return scene;
}

function createBrandBrainModel() {
  return createNpcModel(
    "brand-brain",
    {
      headColor: "#F1F5FF",
      suitColor: "#E8EEF7",
      visorColor: "#20324B",
      accentColor: "#F2C94C",
      gloveColor: "#F5F5F2",
      bootColor: "#DCE2E8",
      accessoryColor: "#7B8796",
      backpackColor: "#CDD8E2"
    },
    ({ root, head, leftArm, materials }) => {
      addMesh(head, new IcosahedronGeometry(0.39, 1), materials.accessory, [0, 0.18, -0.02], [0, 0, 0], [1.08, 0.88, 1.04], "BrainHaloShell");
      addMesh(head, new TorusGeometry(0.5, 0.04, 10, 24), materials.tech, [0, 0.34, 0], [Math.PI / 2, 0, 0], [1, 1, 1], "BrainHaloRing");
      addMesh(root, new BoxGeometry(0.22, 0.3, 0.06), materials.accessory, [-0.34, 0.38, 0.16], [0, 0.24, 0.12], [1, 1, 1], "BrandBook");
      addMesh(root, new IcosahedronGeometry(0.06, 0), materials.tech, [0.32, 1.12, 0.16], [0, 0, 0], [1, 1, 1], "NodeA");
      addMesh(root, new IcosahedronGeometry(0.05, 0), materials.tech, [0.4, 1.26, -0.04], [0, 0, 0], [1, 1, 1], "NodeB");
      addMesh(root, new IcosahedronGeometry(0.04, 0), materials.tech, [0.26, 1.34, 0.08], [0, 0, 0], [1, 1, 1], "NodeC");
      leftArm.rotation.z = 0.32;
    }
  );
}

function createEditorialModel() {
  return createNpcModel(
    "editorial",
    {
      headColor: "#F6F1EB",
      suitColor: "#D5B0A4",
      visorColor: "#263349",
      accentColor: "#2F80ED",
      gloveColor: "#F2EEE8",
      bootColor: "#DDD8D0",
      accessoryColor: "#7D6A6A",
      backpackColor: "#C9C6D1"
    },
    ({ root, head, leftArm, rightArm, materials }) => {
      addMesh(head, new CylinderGeometry(0.38, 0.28, 0.2, 7), materials.accessory, [0, 0.08, -0.02], [0, 0, 0], [1.02, 0.74, 1.08], "EditorialHood");
      addMesh(root, new BoxGeometry(0.22, 0.3, 0.03), materials.tech, [0.28, 0.56, 0.2], [0.08, -0.28, 0.06], [1, 1, 1], "Tablet");
      addMesh(root, new BoxGeometry(0.16, 0.1, 0.02), materials.accessory, [-0.4, 1.14, 0.02], [0, -0.36, 0.12], [1, 1, 1], "CardA");
      addMesh(root, new BoxGeometry(0.12, 0.08, 0.02), materials.tech, [-0.32, 1.28, -0.04], [0, 0.28, -0.08], [1, 1, 1], "CardB");
      leftArm.rotation.z = 0.38;
      rightArm.rotation.z = -0.34;
    }
  );
}

function createNarrationModel() {
  return createNpcModel(
    "narration",
    {
      headColor: "#EFEAF4",
      suitColor: "#C8B3DA",
      visorColor: "#1F223A",
      accentColor: "#9B51E0",
      gloveColor: "#F1EEF5",
      bootColor: "#D8D2DE",
      accessoryColor: "#665A78",
      backpackColor: "#BBB4C7"
    },
    ({ root, head, materials }) => {
      addMesh(head, new TorusGeometry(0.3, 0.03, 8, 20), materials.accessory, [0, 0.06, 0], [Math.PI / 2, 0, 0], [1, 1, 1], "Headphones");
      addMesh(root, new CylinderGeometry(0.03, 0.03, 0.34, 8), materials.tech, [0.34, 0.62, 0.18], [0, 0, 0.42], [1, 1, 1], "Microphone");
      addMesh(root, new BoxGeometry(0.18, 0.08, 0.02), materials.tech, [-0.36, 1.18, 0.02], [0, 0, 0], [1, 1, 1], "WaveBarA");
      addMesh(root, new BoxGeometry(0.12, 0.05, 0.02), materials.tech, [-0.26, 1.28, 0.02], [0, 0, 0], [1, 1, 1], "WaveBarB");
      addMesh(root, new BoxGeometry(0.22, 0.14, 0.02), materials.accessory, [0.26, 1.18, -0.02], [0.04, -0.22, 0.12], [1, 1, 1], "VoiceCard");
    }
  );
}

function createDesignerModel() {
  return createNpcModel(
    "designer",
    {
      headColor: "#ECF3EE",
      suitColor: "#A7D1B7",
      visorColor: "#1B2B2D",
      accentColor: "#27AE60",
      gloveColor: "#EDF4EF",
      bootColor: "#D7E2D9",
      accessoryColor: "#5E7667",
      backpackColor: "#C0D0C4"
    },
    ({ root, head, materials }) => {
      addMesh(head, new SphereGeometry(0.28, 10, 8, 0.6, 1.9, 0.52, 1.1), materials.visor, [0, -0.02, 0.18], [0, 0, 0], [1, 0.72, 0.52], "DesignerVisor");
      addMesh(root, new BoxGeometry(0.16, 0.22, 0.03), materials.accessory, [-0.34, 1.08, 0.02], [0, 0.48, 0], [1, 1, 1], "FrameA");
      addMesh(root, new BoxGeometry(0.12, 0.16, 0.03), materials.tech, [-0.22, 1.24, -0.06], [0.08, -0.34, 0.12], [1, 1, 1], "FrameB");
      addMesh(root, new CylinderGeometry(0.06, 0.06, 0.08, 6), materials.tech, [0.32, 0.48, 0.16], [0, 0, 0], [1, 1, 1], "PaletteBadge");
    }
  );
}

function createSocialMediaModel() {
  return createNpcModel(
    "social-media",
    {
      headColor: "#EEF4F9",
      suitColor: "#8CC5E6",
      visorColor: "#16293C",
      accentColor: "#00C2FF",
      gloveColor: "#EFF4F7",
      bootColor: "#D3DDE4",
      accessoryColor: "#53718A",
      backpackColor: "#BCCAD4"
    },
    ({ root, head, rightArm, materials }) => {
      addMesh(head, new TorusGeometry(0.28, 0.028, 8, 22), materials.accessory, [0, 0.05, 0], [Math.PI / 2, 0, 0], [1, 1, 1], "SocialHeadphones");
      addMesh(root, new BoxGeometry(0.11, 0.18, 0.02), materials.tech, [0.34, 0.46, 0.18], [0.08, -0.24, 0], [1, 1, 1], "Phone");
      addMesh(root, new IcosahedronGeometry(0.06, 0), materials.tech, [-0.34, 1.12, 0], [0, 0, 0], [1, 1, 1], "IconA");
      addMesh(root, new IcosahedronGeometry(0.05, 0), materials.accessory, [-0.24, 1.24, -0.04], [0, 0, 0], [1, 1, 1], "IconB");
      addMesh(root, new IcosahedronGeometry(0.04, 0), materials.tech, [-0.18, 1.08, 0.1], [0, 0, 0], [1, 1, 1], "IconC");
      rightArm.rotation.z = -0.34;
    }
  );
}

async function exportBinary(scene, outputPath) {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(scene, {
    binary: true,
    onlyVisible: true,
    trs: false
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, Buffer.from(result));
}

async function main() {
  await exportBinary(createPlayerModel(), path.join(assetRoot, "player/player-main.glb"));
  await exportBinary(createBrandBrainModel(), path.join(assetRoot, "npcs/brand-brain.glb"));
  await exportBinary(createEditorialModel(), path.join(assetRoot, "npcs/editorial.glb"));
  await exportBinary(createNarrationModel(), path.join(assetRoot, "npcs/narration.glb"));
  await exportBinary(createDesignerModel(), path.join(assetRoot, "npcs/designer.glb"));
  await exportBinary(createSocialMediaModel(), path.join(assetRoot, "npcs/social-media.glb"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
