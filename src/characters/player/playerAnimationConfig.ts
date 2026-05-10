export const PLAYER_ANIMATION = {
  idleBobAmplitude: 0.025,
  idleBobSpeed: 1.6,
  walkBobAmplitude: 0.065,
  walkBobSpeed: 7.5,
  armSwingAmplitude: 0.32,
  legSwingAmplitude: 0.22,
  handSwingAmplitude: 0.12,
  bodyLeanAmount: 0.08,
  backpackBounceAmount: 0.045,
  rotationLerp: 0.18,
  interactionTilt: 0.08,
  actionBounceAmount: 0.08,
  visorPulseAmplitude: 0.16,
  chestGlowIdle: 0.12,
  chestGlowActive: 0.46,
  actionTriggerDuration: 0.75
} as const;

export const PLAYER_GLB_PART_NAMES = {
  head: ["Head", "head", "Helmet", "helmet"],
  body: ["Body", "body", "Torso", "torso"],
  leftArm: ["Arm_L", "arm_l", "LeftArm", "leftArm"],
  rightArm: ["Arm_R", "arm_r", "RightArm", "rightArm"],
  leftHand: ["Hand_L", "hand_l", "LeftHand", "leftHand"],
  rightHand: ["Hand_R", "hand_r", "RightHand", "rightHand"],
  leftLeg: ["Leg_L", "leg_l", "LeftLeg", "leftLeg"],
  rightLeg: ["Leg_R", "leg_r", "RightLeg", "rightLeg"],
  leftBoot: ["Boot_L", "boot_l", "LeftBoot", "leftBoot"],
  rightBoot: ["Boot_R", "boot_r", "RightBoot", "rightBoot"],
  backpack: ["Backpack", "backpack"],
  chestDevice: ["ChestDevice", "chestDevice"],
  visor: ["Visor", "visor"]
} as const;
