import { LARGE_MUTANT, MUTANT_CHARGE as C, robotConfig, type RobotKind } from './config';
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

interface PushedEnemy extends Position {
    steerLeft?: number; id: number; kind: RobotKind; recoil: number; recoilX: number; recoilZ: number;
    path: Position[]; repath: number; stuck: number;
}
/** Varredura do corpo na corrida. Aliados não bloqueiam; só o terreno limita o empurrão. */
export function pushChargeEnemy(r: ChargeState, next: Position, other: PushedEnemy, terrain: Terrain, out: Position) {
    const R=robotConfig(other),dx=next.x-r.x,dz=next.z-r.z,length2=dx*dx+dz*dz;
    const t=length2?Math.max(0,Math.min(1,((other.x-r.x)*dx+(other.z-r.z)*dz)/length2)):0;
    if(Math.hypot(other.x-r.x-dx*t,other.z-r.z-dz*t)>LARGE_MUTANT.radius+R.radius)return false;
    const nx=r.chargeDirZ,nz=-r.chargeDirX,side=(other.x-r.x)*nx+(other.z-r.z)*nz;
    const sign=side===0?(other.id%2?1:-1):Math.sign(side),edge=C.warningHalfWidth+R.radius+C.pushMargin;
    let shift=0;
    // Lado mais próximo primeiro; se não couber, tenta o oposto. Sempre valida o trajeto inteiro.
    for(let attempt=0;attempt<2;attempt++) {
        const goal=(attempt?-sign:sign)*edge-side;
        out.x=other.x+nx*goal;out.z=other.z+nz*goal;
        if(clearSegment(other,out,terrain,R.radius)){shift=goal;break;}
    }
    if(!shift) {
        // Ambos os lados fechados: maior empurrão seguro no lado próximo; jamais atravessa parede.
        let low=0,high=Math.abs(sign*edge-side);
        for(let i=0;i<16;i++){const mid=(low+high)/2;out.x=other.x+nx*sign*mid;out.z=other.z+nz*sign*mid;
            if(clearSegment(other,out,terrain,R.radius))low=mid;else high=mid;}
        shift=sign*low;
    }
    if(Math.abs(shift)<1e-6)return false;
    other.x+=nx*shift;other.z+=nz*shift;other.recoil=.12;other.recoilX=nx*Math.sign(shift);other.recoilZ=nz*Math.sign(shift);
    if(other.steerLeft!==undefined)other.steerLeft=0;
    other.path.length=0;other.repath=0;other.stuck=0;return true;
}
