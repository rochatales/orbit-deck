import { LARGE_MUTANT, MUTANT_CHARGE as C } from './config';
import { clearSegment, type Position, type Terrain } from './navigation';
export interface ChargeState extends Position {
    chargePhase: 'ready' | 'windup' | 'dash' | 'cooldown';
    chargeLeft: number; chargeDirX: number; chargeDirZ: number;
    chargeOriginX: number; chargeOriginZ: number; chargeDistance: number; chargeTraveled: number; chargeHit: boolean;
}
/** Define uma única faixa; não acompanha o jogador durante a antecipação. */
export function prepareCharge(r: ChargeState, player: Position, terrain: Terrain, out: Position) {
    const dx=player.x-r.x,dz=player.z-r.z,d=Math.hypot(dx,dz);
    if(d<C.min||d>C.max||!clearSegment(r,player,terrain,0))return false;
    const x=dx/d,z=dz/d;let low=0,high: number=C.distance;
    out.x=r.x+x*high;out.z=r.z+z*high;
    if(!clearSegment(r,out,terrain,LARGE_MUTANT.radius))for(let i=0;i<16;i++){
        const mid=(low+high)/2;out.x=r.x+x*mid;out.z=r.z+z*mid;
        if(clearSegment(r,out,terrain,LARGE_MUTANT.radius))low=mid;else high=mid;
    }else low=high;
    if(low<.25)return false;
    r.chargePhase='windup';r.chargeLeft=C.windup;r.chargeDirX=x;r.chargeDirZ=z;
    r.chargeOriginX=r.x;r.chargeOriginZ=r.z;r.chargeDistance=low;r.chargeTraveled=0;r.chargeHit=false;
    return true;
}
export function finishCharge(r: ChargeState) { r.chargePhase='cooldown';r.chargeLeft=C.cooldown; }
