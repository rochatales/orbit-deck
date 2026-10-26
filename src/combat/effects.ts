import { RIFLE_POSE } from './config';
export const COMBAT_VFX = { capacity: 128, life: .3, flash: .05, recoil: .12, recoilDistance: .07, recoilTilt: .06 } as const;
export type ImpactKind = 'metal' | 'organic' | 'dust';
export function impactKind(kind?: string): ImpactKind {
    return !kind ? 'dust' : kind === 'smallMutant' || kind === 'largeMutant' ? 'organic' : 'metal';
}
/** Estado visual da tentativa: slots e clarão únicos reutilizados, sem eventos React. */
export class CombatEffects {
    readonly particles = Array.from({ length: COMBAT_VFX.capacity }, () => ({ x:0, y:0, z:0, vx:0, vy:0, vz:0, life:0, duration:0, kind:'dust' as ImpactKind, white:false }));
    readonly muzzle = { x:0, y:RIFLE_POSE.height, z:0, life:0, serial:0 };
    private cursor = 0;
    fire(x: number, z: number) { const m=this.muzzle; m.x=x; m.z=z; m.life=COMBAT_VFX.flash; m.serial++; }
    impact(x: number, z: number, kind: ImpactKind) {
        for(let i=0;i<12;i++) {
            const p=this.particles[this.cursor++ % this.particles.length], angle=i*2.399963+this.cursor*.37, speed=kind==='dust'?.9:2.2;
            p.x=x; p.y=RIFLE_POSE.height; p.z=z; p.vx=Math.cos(angle)*speed; p.vz=Math.sin(angle)*speed;
            p.vy=.6+(i%4)*.35; p.life=p.duration=.18+(i%4)*.04; p.kind=kind; p.white=kind==='metal'&&i%3===0;
        }
    }
    step(dt: number) {
        this.muzzle.life=Math.max(0,this.muzzle.life-dt);
        for(const p of this.particles) if(p.life>0) {
            p.life=Math.max(0,p.life-dt);p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy-=4*dt;
        }
    }
    clear() { this.muzzle.life=0; for(const p of this.particles)p.life=0; this.cursor=0; }
}
