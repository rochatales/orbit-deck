/** Boca animada em coordenadas locais do corpo. Amostra mutável, sem React por quadro. */
export interface WeaponMuzzleOffset {
    valid: boolean;
    side: number;
    forward: number;
    height: number;
}
export const playerWeaponPose: WeaponMuzzleOffset = { valid: false, side: 0, forward: 0, height: 0 };
export const playerHeadPose: WeaponMuzzleOffset = { valid:false, side:0, forward:0, height:0 };
export function resetPlayerWeaponPose() {
    playerWeaponPose.valid = false;
    playerHeadPose.valid = false;
    playerWeaponPose.side = playerWeaponPose.forward = playerWeaponPose.height = 0;
}
export function weaponShotHeight(feetY: number, fallback: number) {
    return playerWeaponPose.valid ? feetY + playerWeaponPose.height : fallback;
}
