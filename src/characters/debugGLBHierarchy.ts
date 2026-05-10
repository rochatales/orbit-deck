import { Mesh, SkinnedMesh, type Material, type Object3D } from "three";

const CHARACTER_PART_KEYWORDS = {
  head: ["head", "helmet"],
  body: ["body", "torso", "chest", "spine"],
  arms: ["arm", "shoulder"],
  hands: ["hand", "wrist", "glove"],
  legs: ["leg", "thigh"],
  boots: ["boot", "shoe", "feet", "foot"],
  backpack: ["backpack", "pack", "tank"],
  visor: ["visor", "glass", "faceplate"],
  chestDevice: ["chestdevice", "chest_device", "device", "badge", "module"]
} as const;

function getMaterialNames(material: Material | Material[] | undefined) {
  if (!material) {
    return ["none"];
  }

  const materials = Array.isArray(material) ? material : [material];
  return materials.map((entry) => entry.name || "(unnamed material)");
}

function detectNamedParts(names: string[]) {
  const loweredNames = names.map((name) => name.toLowerCase());

  return Object.fromEntries(
    Object.entries(CHARACTER_PART_KEYWORDS).map(([part, keywords]) => [
      part,
      loweredNames.some((name) => keywords.some((keyword) => name.includes(keyword)))
    ])
  ) as Record<keyof typeof CHARACTER_PART_KEYWORDS, boolean>;
}

export function debugGLBHierarchy(scene: Object3D) {
  const objectNames: string[] = [];
  let meshCount = 0;
  let skinnedMeshCount = 0;

  console.groupCollapsed(`[GLB Debug] Hierarchy: ${scene.name || "(unnamed scene)"}`);

  scene.traverse((object) => {
    const label = object.name || "(unnamed)";
    objectNames.push(label);

    if (object instanceof Mesh) {
      meshCount += 1;
    }

    if (object instanceof SkinnedMesh) {
      skinnedMeshCount += 1;
    }

    const materialNames =
      object instanceof Mesh ? getMaterialNames(object.material).join(", ") : "none";

    console.log({
      name: label,
      type: object.type,
      material: materialNames
    });
  });

  const detectedParts = detectNamedParts(objectNames);

  console.log("[GLB Debug] Detected character parts", detectedParts);
  console.log("[GLB Debug] Mesh summary", {
    meshCount,
    skinnedMeshCount
  });

  if (meshCount === 1 && skinnedMeshCount === 0) {
    console.warn(
      "[GLB Debug] This GLB appears to be a single mesh. Arm/hand animation is not practical unless you either separate the model into named parts or rig it with bones in Blender."
    );
  }

  console.groupEnd();
}
