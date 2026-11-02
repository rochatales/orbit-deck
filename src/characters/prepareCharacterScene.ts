import { Color, Mesh, MeshStandardMaterial, type Material, type Object3D } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

interface PreparedScene {
  scene: Object3D;
  materials: Material[];
  visorMaterials: MeshStandardMaterial[];
  techMaterials: MeshStandardMaterial[];
}

function getMaterialRole(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("mat_visor")) {
    return "visor";
  }
  if (lower.includes("mat_techaccent")) {
    return "tech";
  }
  if (lower.includes("mat_helmet")) {
    return "helmet";
  }
  if (lower.includes("mat_suit")) {
    return "suit";
  }
  if (lower.includes("mat_gloves") || lower.includes("mat_boots")) {
    return "gear";
  }
  if (lower.includes("mat_backpack")) {
    return "backpack";
  }
  if (lower.includes("mat_accessory")) {
    return "accessory";
  }
  return "default";
}

function toStandardMaterial(material: Material) {
  if (material instanceof MeshStandardMaterial) {
    return material.clone();
  }

  const fallback = new MeshStandardMaterial();
  const maybeColor = material as Material & { color?: Color };
  if (maybeColor.color) {
    fallback.color.copy(maybeColor.color);
  }
  fallback.name = material.name;
  return fallback;
}

function polishMaterial(material: MeshStandardMaterial, accentColor: Color, visorMaterials: MeshStandardMaterial[], techMaterials: MeshStandardMaterial[]) {
  const role = getMaterialRole(material.name);

  material.flatShading = true;

  if (role === "visor") {
    material.color.set("#071827");
    material.emissive.set("#153447");
    material.emissiveIntensity = 0.18;
    material.roughness = 0.08;
    material.metalness = 0.32;
    material.transparent = true;
    material.opacity = 0.94;
    visorMaterials.push(material);
  } else if (role === "tech") {
    material.emissive.copy(accentColor);
    material.emissiveIntensity = 0.3;
    material.roughness = 0.28;
    material.metalness = 0.18;
    techMaterials.push(material);
  } else if (role === "helmet") {
    material.roughness = 0.5;
    material.metalness = 0.08;
  } else if (role === "suit") {
    material.roughness = 0.84;
    material.metalness = 0.04;
  } else if (role === "accessory" || role === "backpack") {
    material.roughness = 0.62;
    material.metalness = 0.14;
  } else {
    material.roughness = Math.max(material.roughness ?? 0.7, 0.48);
    material.metalness = Math.min(material.metalness ?? 0.08, 0.28);
  }

  material.needsUpdate = true;
}

export function prepareScene(scene: Object3D, accentColor: string, materialProfile: "estilizado" | "preservar"): PreparedScene {
  const cloned = clone(scene);
  const materials: Material[] = [];
  const visorMaterials: MeshStandardMaterial[] = [];
  const techMaterials: MeshStandardMaterial[] = [];
  const accent = new Color(accentColor);

  cloned.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
    const polishedMaterials = sourceMaterials.map((sourceMaterial) => {
      const standardMaterial = toStandardMaterial(sourceMaterial);
      // 'preservar': cor, normal map e ORM já vêm bakeados; normais suaves do asset,
      // vidro sem segundo escurecimento nem transparência. Só o clone por instância.
      if (materialProfile === "estilizado") polishMaterial(standardMaterial, accent, visorMaterials, techMaterials);
      materials.push(standardMaterial);
      return standardMaterial;
    });

    child.material = polishedMaterials.length === 1 ? polishedMaterials[0] : polishedMaterials;
  });

  return { scene: cloned, materials, visorMaterials, techMaterials };
}
