import { RIFLE_POSE } from './config';
export const COMBAT_VFX = { capacity: 256, life: .5, flash: .05, recoil: .12, recoilDistance: .07, recoilTilt: .06, tracerLife: .12, tracerRadius: .056, tracerHaloRadius: .095, tracerHaloOpacity: .4, muzzleSize: 1.2, muzzleStrength: 4, muzzleLight: 6,
    impactCount: 40, dustCount: 24, enemyLifeMin: .35, enemyLifeMax: .5, enemySpeedMin: 4, enemySpeedMax: 7, gravity: 22, rangeMin: 1.5, rangeMax: 2.5,
    metalBounce: .5, organicBounce: .2, metalFriction: .7, organicFriction: .4, metalSize: .035, organicSize: .055, trail: .035,
    particleScale: 1.8, contactFlash: .06, contactSize: .45 } as const;
export type ImpactKind = 'metal' | 'organic' | 'dust';
export function impactKind(kind?: string): ImpactKind {
    return !kind ? 'dust' : kind === 'smallMutant' || kind === 'largeMutant' ? 'organic' : 'metal';
}
/** Estado visual pré-alocado; piso consultado na mesma grade O(1) do mundo. */
export class CombatEffects {
    readonly particles = Array.from({ length: COMBAT_VFX.capacity }, () => ({ x:0, y:0, z:0, vx:0, vy:0, vz:0, life:0, duration:0, kind:'dust' as ImpactKind, white:false, originX:0,originZ:0,range:0,bounces:0,maxBounces:0 }));
    readonly muzzle = { x:0, y:RIFLE_POSE.height as number, z:0, life:0, serial:0 };
    readonly contacts = Array.from({length: 4}, () => ({x:0,y:RIFLE_POSE.height as number,z:0,life:0,kind:'dust' as ImpactKind}));
    private contactCursor = 0;
    private cursor = 0;
    constructor(private readonly surfaceHeight?: (x:number,z:number)=>number,private readonly random=Math.random) {}
    fire(x: number, z: number, height: number = RIFLE_POSE.height) { const m=this.muzzle; m.x=x; m.y=height; m.z=z; m.life=COMBAT_VFX.flash; m.serial++; }
    impact(x: number, z: number, kind: ImpactKind, towardX=0, towardZ=-1, height: number = RIFLE_POSE.height) {
        const contact=this.contacts[this.contactCursor++ % this.contacts.length];contact.x=x;contact.y=height;contact.z=z;contact.life=COMBAT_VFX.contactFlash;contact.kind=kind;
        const d=Math.hypot(towardX,towardZ),nx=d>1e-8?towardX/d:0,nz=d>1e-8?towardZ/d:-1;
        const count=kind==='dust'?COMBAT_VFX.dustCount:COMBAT_VFX.impactCount;
        for(let i=0;i<count;i++) {
            const p=this.particles[this.cursor++ % this.particles.length];
            p.x=p.originX=x;p.y=height;p.z=p.originZ=z;p.kind=kind;p.white=kind==='metal'&&i%3===0;p.bounces=0;
            if(kind==='dust'){
                const angle=i*2.399963+this.cursor*.37;p.vx=Math.cos(angle)*.9;p.vz=Math.sin(angle)*.9;p.vy=.6+(i%4)*.35;p.life=p.duration=.18+(i%4)*.04;p.maxBounces=0;p.range=0;
            }else{
                const forward=this.random(),radial=Math.sqrt(1-forward*forward),phi=this.random()*Math.PI*2,speed=COMBAT_VFX.enemySpeedMin+this.random()*(COMBAT_VFX.enemySpeedMax-COMBAT_VFX.enemySpeedMin),side=radial*Math.cos(phi);
                p.vx=(nx*forward-nz*side)*speed;p.vz=(nz*forward+nx*side)*speed;p.vy=radial*Math.sin(phi)*speed;
                p.life=p.duration=COMBAT_VFX.enemyLifeMin+this.random()*(COMBAT_VFX.enemyLifeMax-COMBAT_VFX.enemyLifeMin);
                p.range=COMBAT_VFX.rangeMin+this.random()*(COMBAT_VFX.rangeMax-COMBAT_VFX.rangeMin);p.maxBounces=kind==='metal'?(this.random()<.5?1:2):1;
            }
        }
    }
    step(dt: number) {
        this.muzzle.life=Math.max(0,this.muzzle.life-dt);
        for(const p of this.contacts)p.life=Math.max(0,p.life-dt);
        for(const p of this.particles) if(p.life>0) {
            p.life=Math.max(0,p.life-dt);p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;
            if(p.kind==='dust'){p.vy-=4*dt;continue;}
            const dx=p.x-p.originX,dz=p.z-p.originZ,d=Math.hypot(dx,dz);
            if(d>p.range){p.x=p.originX+dx/d*p.range;p.z=p.originZ+dz/d*p.range;p.vx=p.vz=0;}
            p.vy-=COMBAT_VFX.gravity*dt;
            const speed=Math.hypot(p.vx,p.vy,p.vz),size=(p.kind==='organic'?COMBAT_VFX.organicSize:COMBAT_VFX.metalSize)*COMBAT_VFX.particleScale*Math.sqrt(p.life/p.duration);
            const padding=size+(p.kind==='metal'&&speed>1e-8?Math.min(.35,speed*COMBAT_VFX.trail)*Math.abs(p.vy)/speed:0);
            const floor=(this.surfaceHeight?.(p.x,p.z)??0)+padding;
            if(p.y<=floor){
                p.y=floor;
                if(p.vy<-.1&&p.bounces<p.maxBounces){p.vy=-p.vy*(p.kind==='metal'?COMBAT_VFX.metalBounce:COMBAT_VFX.organicBounce);p.bounces++;}
                else p.vy=0;
                const friction=p.kind==='metal'?COMBAT_VFX.metalFriction:COMBAT_VFX.organicFriction;p.vx*=friction;p.vz*=friction;
            }
        }
    }
    clear() { this.muzzle.life=0; for(const p of this.particles)p.life=0; this.cursor=0; for(const p of this.contacts)p.life=0; this.contactCursor=0; }
}
