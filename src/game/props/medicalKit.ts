/** Quatro unidades por tentativa de quatro hordas; coletar não cura automaticamente. */
export const MEDICAL_KIT = { heal: 50, interactionRadius: 1.8 } as const;
export const SHANGHAI_MEDICAL_KITS = [
  { id: 'medkit-northwest', x: -17.5, z: -25 },
  { id: 'medkit-northeast', x: 17.5, z: -25 },
  { id: 'medkit-southwest', x: -17.5, z: 25 },
  { id: 'medkit-southeast', x: 17.5, z: 25 }
] as const;
