import type { CratePlacement } from '../props/supplyCrate';
import data from '../../assets/rio-fase01/layout.json';

export const RIO_MEDICAL_KITS = [
    ...data.loot.map(({ x, z }) => ({ x: x + 1, z })),
    { x: .5, z: -10 },
    { x: -37, z: 13 }
];
export const RIO_SUPPLY_CRATES: readonly CratePlacement[] = [
    ...data.loot.map(({ id, x, z }) => ({ id, x: x + 2, z: z + 4, angle: Math.PI / 2 })),
    { id: 'rio-ammo-praca', x: .5, z: 31 },
    { id: 'rio-ammo-rua-fundo', x: -30, z: -11, angle: -Math.PI / 2 }
];
