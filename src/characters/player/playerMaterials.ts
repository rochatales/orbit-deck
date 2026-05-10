import { Color, MeshStandardMaterial } from "three";
import { PLAYER_COLORS } from "./playerConfig";

export interface PlayerMaterialSet {
  helmet: MeshStandardMaterial;
  helmetShadow: MeshStandardMaterial;
  suit: MeshStandardMaterial;
  suitShadow: MeshStandardMaterial;
  gloves: MeshStandardMaterial;
  boots: MeshStandardMaterial;
  visor: MeshStandardMaterial;
  visorHighlight: MeshStandardMaterial;
  backpack: MeshStandardMaterial;
  harness: MeshStandardMaterial;
  techFrame: MeshStandardMaterial;
  techGlow: MeshStandardMaterial;
  utility: MeshStandardMaterial;
  shadow: MeshStandardMaterial;
}

export function createPlayerMaterials(): PlayerMaterialSet {
  const techAccent = new Color(PLAYER_COLORS.techAccent);

  return {
    helmet: new MeshStandardMaterial({
      color: PLAYER_COLORS.helmet,
      roughness: 0.82,
      metalness: 0.04,
      flatShading: true
    }),
    helmetShadow: new MeshStandardMaterial({
      color: "#DBC6CC",
      roughness: 0.86,
      metalness: 0.03,
      flatShading: true
    }),
    suit: new MeshStandardMaterial({
      color: PLAYER_COLORS.suit,
      roughness: 0.86,
      metalness: 0.04,
      flatShading: true
    }),
    suitShadow: new MeshStandardMaterial({
      color: PLAYER_COLORS.suitShadow,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true
    }),
    gloves: new MeshStandardMaterial({
      color: PLAYER_COLORS.gloves,
      roughness: 0.86,
      metalness: 0.03,
      flatShading: true
    }),
    boots: new MeshStandardMaterial({
      color: PLAYER_COLORS.boots,
      roughness: 0.82,
      metalness: 0.05,
      flatShading: true
    }),
    visor: new MeshStandardMaterial({
      color: PLAYER_COLORS.visor,
      emissive: new Color(PLAYER_COLORS.visor).multiplyScalar(0.18),
      roughness: 0.14,
      metalness: 0.28,
      transparent: true,
      opacity: 0.96,
      flatShading: true
    }),
    visorHighlight: new MeshStandardMaterial({
      color: PLAYER_COLORS.visorHighlight,
      emissive: new Color(PLAYER_COLORS.visorHighlight).multiplyScalar(0.28),
      roughness: 0.2,
      metalness: 0.18,
      transparent: true,
      opacity: 0.9,
      flatShading: true
    }),
    backpack: new MeshStandardMaterial({
      color: PLAYER_COLORS.backpack,
      roughness: 0.74,
      metalness: 0.08,
      flatShading: true
    }),
    harness: new MeshStandardMaterial({
      color: PLAYER_COLORS.harness,
      roughness: 0.78,
      metalness: 0.06,
      flatShading: true
    }),
    techFrame: new MeshStandardMaterial({
      color: "#D8D9DC",
      roughness: 0.54,
      metalness: 0.12,
      flatShading: true
    }),
    techGlow: new MeshStandardMaterial({
      color: "#C6F7FF",
      emissive: techAccent.clone().multiplyScalar(0.9),
      roughness: 0.26,
      metalness: 0.18,
      flatShading: true
    }),
    utility: new MeshStandardMaterial({
      color: PLAYER_COLORS.utility,
      roughness: 0.76,
      metalness: 0.1,
      flatShading: true
    }),
    shadow: new MeshStandardMaterial({
      color: PLAYER_COLORS.shadowBlue,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.12,
      flatShading: true
    })
  };
}
