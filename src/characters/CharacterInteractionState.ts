export type CharacterStateName =
  | "idle"
  | "highlighted"
  | "interacting"
  | "actionTriggered"
  | "completed";

export interface CharacterStateFlags {
  highlighted: boolean;
  interacting: boolean;
  actionTriggered: boolean;
  completed: boolean;
}

export function resolveCharacterState(flags: CharacterStateFlags): CharacterStateName {
  if (flags.completed) {
    return "completed";
  }

  if (flags.actionTriggered) {
    return "actionTriggered";
  }

  if (flags.interacting) {
    return "interacting";
  }

  if (flags.highlighted) {
    return "highlighted";
  }

  return "idle";
}
