import { Group, Object3D } from "three";
import { getCharacterConfig } from "./characterConfig";
import { createCharacterAccessories, type CharacterAccessoryRefs } from "./createCharacterAccessories";
import {
  createBaseBody,
  createCharacterMaterials,
  createHairOrHelmet,
  type CharacterBaseRig,
  type CharacterMaterialSet
} from "./createCharacterParts";

export interface MCPCharacter {
  config: ReturnType<typeof getCharacterConfig>;
  root: Group;
  labelAnchor: Object3D;
  base: CharacterBaseRig;
  materials: CharacterMaterialSet;
  refs: CharacterAccessoryRefs;
  accentMaterials: CharacterBaseRig["accentMaterials"];
  glowMaterials: CharacterBaseRig["glowMaterials"];
  glassMaterials: CharacterBaseRig["glassMaterials"];
  defaultRotationY: number;
  idleAnimation: ReturnType<typeof getCharacterConfig>["idleAnimation"];
}

export function createMCPCharacter(npcId: string, accentColor: string) {
  const config = getCharacterConfig(npcId);
  const materials = createCharacterMaterials(accentColor || config.accentColor);
  const base = createBaseBody(config.silhouette, materials, config.headScale, config.bodyWidth);

  if (config.silhouette === "scientist") {
    const brain = createHairOrHelmet(materials, "brain");
    brain.position.set(0, 0.05, -0.04);
    base.anchors.head.add(brain);
  }

  if (config.silhouette === "social") {
    const socialHair = createHairOrHelmet(materials, "cap");
    socialHair.position.set(0, 0.05, -0.02);
    base.anchors.head.add(socialHair);
  }

  if (config.silhouette === "editorial") {
    const cap = createHairOrHelmet(materials, "cap");
    cap.position.set(0, 0.02, -0.04);
    base.anchors.head.add(cap);
  }

  if (config.silhouette === "designer") {
    const visor = createHairOrHelmet(materials, "visor");
    visor.position.set(0, 0.02, 0);
    base.anchors.head.add(visor);
  }

  const refs = createCharacterAccessories(config, base, materials);
  base.root.scale.setScalar(config.height / 1.52);

  if (config.silhouette === "social") {
    base.bodyRoot.rotation.y = -0.1;
  }

  if (config.silhouette === "editorial") {
    base.bodyRoot.rotation.y = 0.08;
  }

  if (config.silhouette === "designer") {
    base.bodyRoot.rotation.y = -0.08;
  }

  return {
    config,
    root: base.root,
    labelAnchor: base.labelAnchor,
    base,
    materials,
    refs,
    accentMaterials: base.accentMaterials,
    glowMaterials: base.glowMaterials,
    glassMaterials: base.glassMaterials,
    defaultRotationY: base.root.rotation.y,
    idleAnimation: config.idleAnimation
  } satisfies MCPCharacter;
}
