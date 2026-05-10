export type CharacterAccessoryId =
  | "glasses"
  | "sunglasses"
  | "headphones"
  | "neckHeadphones"
  | "labCoat"
  | "hood"
  | "backpack"
  | "brainHalo";

export type CharacterPropId =
  | "brandBook"
  | "networkNodes"
  | "phone"
  | "socialIcons"
  | "tablet"
  | "floatingCards"
  | "calendarBlocks"
  | "microphone"
  | "waveform"
  | "voiceCard"
  | "designFrames"
  | "layerPanels"
  | "paletteBadge";

export type CharacterIdleAnimation =
  | "brainPulse"
  | "phoneCheck"
  | "tabletReview"
  | "audioPulse"
  | "designFloat";

export type CharacterSilhouette = "scientist" | "social" | "editorial" | "narration" | "designer";

export interface CharacterConfig {
  id: string;
  displayName: string;
  archetype: string;
  roleSummary: string;
  accentColor: string;
  silhouette: CharacterSilhouette;
  height: number;
  headScale: number;
  bodyWidth: number;
  accessories: CharacterAccessoryId[];
  props: CharacterPropId[];
  idleAnimation: CharacterIdleAnimation;
}

export const CHARACTER_CONFIG: CharacterConfig[] = [
  {
    id: "brand-brain",
    displayName: "EDEN",
    archetype: "Scientist strategist",
    roleSummary: "Brand memory, tone, rules, hashtags, and visual identity.",
    accentColor: "#F2C94C",
    silhouette: "scientist",
    height: 1.56,
    headScale: 1.22,
    bodyWidth: 1.04,
    accessories: ["glasses", "labCoat", "brainHalo"],
    props: ["brandBook", "networkNodes"],
    idleAnimation: "brainPulse"
  },
  {
    id: "editorial",
    displayName: "MISTER",
    archetype: "Field researcher and brief architect",
    roleSummary: "Hooks, captions, carousel structure, and editorial briefs.",
    accentColor: "#2F80ED",
    silhouette: "editorial",
    height: 1.5,
    headScale: 1.08,
    bodyWidth: 0.98,
    accessories: ["hood", "backpack"],
    props: ["tablet", "floatingCards", "calendarBlocks"],
    idleAnimation: "tabletReview"
  },
  {
    id: "narration",
    displayName: "NARA",
    archetype: "Audio specialist and voice operator",
    roleSummary: "Voice prompts, narration text, pacing, and audio-ready scripts.",
    accentColor: "#9B51E0",
    silhouette: "narration",
    height: 1.48,
    headScale: 1.02,
    bodyWidth: 0.96,
    accessories: ["hood", "headphones", "backpack"],
    props: ["phone", "microphone", "waveform", "voiceCard"],
    idleAnimation: "audioPulse"
  },
  {
    id: "design",
    displayName: "MAX",
    archetype: "Creative technologist and visual systems builder",
    roleSummary: "Design prompts, layouts, image selection, and visual direction.",
    accentColor: "#27AE60",
    silhouette: "designer",
    height: 1.52,
    headScale: 1.06,
    bodyWidth: 0.98,
    accessories: ["glasses", "neckHeadphones"],
    props: ["tablet", "designFrames", "layerPanels", "paletteBadge"],
    idleAnimation: "designFloat"
  },
  {
    id: "output-review",
    displayName: "ASTRA",
    archetype: "Publishing operator and platform-native distribution lead",
    roleSummary: "Platform fit, publishing timing, adaptation, and engagement routing.",
    accentColor: "#00C2FF",
    silhouette: "social",
    height: 1.5,
    headScale: 1.02,
    bodyWidth: 0.94,
    accessories: ["sunglasses", "headphones", "backpack"],
    props: ["phone", "socialIcons"],
    idleAnimation: "phoneCheck"
  }
];

export function getCharacterConfig(id: string) {
  return CHARACTER_CONFIG.find((config) => config.id === id) ?? CHARACTER_CONFIG[0];
}
