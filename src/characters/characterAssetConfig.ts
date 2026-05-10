import brandBrainAsset from "../assets/characters/npcs/brand-brain.glb";
import designerAsset from "../assets/characters/npcs/designer.glb";
import editorialAsset from "../assets/characters/npcs/editorial.glb";
import narrationAsset from "../assets/characters/npcs/narration.glb";
import socialMediaAsset from "../assets/characters/npcs/social-media.glb";
import playerMainAsset from "../assets/characters/player/player-main.glb";
import { getNpcActions, type NpcAction } from "../domain/mcpActions";

export type CharacterFallbackType =
  | "player"
  | "brand-brain"
  | "editorial"
  | "narration"
  | "design"
  | "output-review";

export interface CharacterAssetConfig {
  id: string;
  name: string;
  role: string;
  assetPath: string;
  scale: number;
  positionOffset: [number, number, number];
  rotationOffset: [number, number, number];
  accentColor: string;
  fallbackType: CharacterFallbackType;
  interactionRadius: number;
  dialogue?: string;
  actions?: NpcAction[];
  zoneName?: string;
  position?: { x: number; y: number; z: number };
}

export const PLAYER_CHARACTER_ASSET: CharacterAssetConfig = {
  id: "player",
  name: "Explorer Unit",
  role: "Premium low-poly sci-fi toy explorer",
  assetPath: playerMainAsset,
  // Source GLB is now Mixamo-rigged at ~1.75m tall with feet at origin.
  // Scale matches old in-game visual height (~1.5m).
  scale: 0.857,
  // Mixamo-rigged model is upright with feet on the floor at origin, no
  // vertical offset needed.
  positionOffset: [0, 0, 0],
  // Mixamo character faces -Z by default which already matches Three.js forward;
  // the old asset was authored sideways (hence the previous Math.PI/2 offset).
  rotationOffset: [0, 0, 0],
  accentColor: "#66E6FF",
  fallbackType: "player",
  interactionRadius: 2.3
};

export const NPC_CHARACTER_ASSET_CONFIG: Record<
  Exclude<CharacterFallbackType, "player">,
  CharacterAssetConfig
> = {
  "brand-brain": {
    id: "brand-brain",
    name: "EDEN",
    zoneName: "Deck de Estratégia",
    role: "Fonte única de verdade para regras de marca, tom, estilo e restrições.",
    assetPath: brandBrainAsset,
    scale: 1.3,
    positionOffset: [0.06, 0.68, 0],
    rotationOffset: [0, 0.06, 0],
    accentColor: "#F2C94C",
    fallbackType: "brand-brain",
    interactionRadius: 2.3,
    position: { x: 0, y: 0, z: -10 },
    dialogue:
      "Eu mantenho as regras de marca, o tom de voz, as hashtags, o estilo visual, os slogans e os elementos fixos alinhados para cada cliente.",
    actions: getNpcActions("brand-brain")
  },
  editorial: {
    id: "editorial",
    name: "MISTER",
    zoneName: "Direção Editorial",
    role: "Ideação de conteúdo, hooks, texto para carrossel, legendas e estruturação de briefings editoriais.",
    assetPath: editorialAsset,
    scale: 1.56,
    positionOffset: [0.04, 0.66, 0],
    rotationOffset: [0, -0.08, 0],
    accentColor: "#2F80ED",
    fallbackType: "editorial",
    interactionRadius: 2.3,
    position: { x: -10.2, y: 0, z: -0.8 },
    dialogue:
      "Eu transformo estratégia em ideias de posts, hooks, estruturas de carrossel, legendas e briefings editoriais organizados.",
    actions: getNpcActions("editorial")
  },
  narration: {
    id: "narration",
    name: "NARA",
    zoneName: "Cabine de Narração",
    role: "Roteiros de voz, texto de narração, IDs de voz e preparação do pipeline de áudio.",
    assetPath: narrationAsset,
    // Mixamo-rigged at 1.75m; 0.891 keeps the in-game silhouette at the
    // previous 1.56m visual height.
    scale: 0.891,
    // Feet at origin in source -> sit them on top of the pedestal (height 0.12).
    positionOffset: [0, 0.12, 0],
    // Mixamo character already faces -Z (Three.js forward). Old 0.08 yaw was
    // a manual aim into the room; can be re-added if needed after testing.
    rotationOffset: [0, 0, 0],
    accentColor: "#9B51E0",
    fallbackType: "narration",
    interactionRadius: 2.3,
    position: { x: -7.35, y: 0, z: 9 },
    dialogue:
      "Eu transformo roteiros aprovados em textos limpos de narração, prompts de voz e conteúdo pronto para áudio.",
    actions: getNpcActions("narration")
  },
  design: {
    id: "design",
    name: "MAX",
    zoneName: "Estúdio de Design",
    role: "Prompts visuais, seleção de fotos, layout gráfico e sistemas de design para carrossel.",
    assetPath: designerAsset,
    scale: 1.9,
    positionOffset: [-0.04, 0.66, 0],
    rotationOffset: [0, Math.PI / 2, 0],
    accentColor: "#27AE60",
    fallbackType: "design",
    interactionRadius: 2.3,
    position: { x: 9.95, y: 0, z: 0.95 },
    dialogue:
      "Eu transformo briefings editoriais em direções visuais, prompts de imagem, instruções de layout e sistemas de design para carrossel.",
    actions: getNpcActions("design")
  },
  "output-review": {
    id: "output-review",
    name: "ASTRA",
    zoneName: "Console de Revisão",
    role: "Aprovação final, revisão de conteúdo e organização de pacotes prontos para exportação.",
    assetPath: socialMediaAsset,
    scale: 1.56,
    positionOffset: [-0.05, 0.86, 0],
    rotationOffset: [0, 0.04, 0],
    accentColor: "#00C2FF",
    fallbackType: "output-review",
    interactionRadius: 2.3,
    position: { x: 8, y: 0, z: 9 },
    dialogue:
      "Revise tudo antes de publicar. Aqui você organiza legendas finais, visuais, roteiros e pacotes de posts prontos para exportação.",
    actions: getNpcActions("output-review")
  }
};

export function getNpcCharacterAssetConfig(id: string) {
  return NPC_CHARACTER_ASSET_CONFIG[id as keyof typeof NPC_CHARACTER_ASSET_CONFIG] ?? NPC_CHARACTER_ASSET_CONFIG["brand-brain"];
}
