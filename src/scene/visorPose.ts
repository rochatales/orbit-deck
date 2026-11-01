import type { WeaponMuzzleOffset } from '../state/playerWeaponPose';
import { VISOR_LIGHT } from './lightingConfig';
interface Point3 { x: number; y: number; z: number }
/** Posição/rumo físicos, sem depender da câmera nem alocar no quadro. */
export function writeVisorLight(position: Point3, target: Point3, player: Point3, angle: number, muzzle?: WeaponMuzzleOffset) {
    const sin=Math.sin(angle),cos=Math.cos(angle);
    if(muzzle?.valid){
        position.x=player.x+muzzle.side*cos+muzzle.forward*sin;position.y=player.y+muzzle.height+VISOR_LIGHT.muzzleLift;position.z=player.z-muzzle.side*sin+muzzle.forward*cos;
    }else{
        position.x=player.x+sin*VISOR_LIGHT.forward;position.y=player.y+VISOR_LIGHT.height;position.z=player.z+cos*VISOR_LIGHT.forward;
    }
    target.x=player.x+sin*VISOR_LIGHT.aimDistance;target.y=player.y+VISOR_LIGHT.aimHeight;target.z=player.z+cos*VISOR_LIGHT.aimDistance;
}
