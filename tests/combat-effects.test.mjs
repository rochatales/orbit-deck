import test from 'node:test';import assert from 'node:assert/strict';import{loadSource}from'./load-source.mjs';
const{CombatEffects,COMBAT_VFX,impactKind}=loadSource('src/combat/effects.ts');const{CombatSimulation}=loadSource('src/combat/simulation.ts');const{RIFLE_POSE,writeRifleMuzzle}=loadSource('src/combat/config.ts');
const b={minX:-30,maxX:30,minZ:-30,maxZ:30},terrain={bounds:b,walkableAreas:[b],obstacles:[]},input={player:{x:0,z:0},aim:{x:.34,z:10},facingAngle:0,firing:true,reload:false};
test('VFX: todo disparo usa ponta real do cano, até com centro→cano bloqueado',()=>{
 for(const blocked of [false,true]){const s=new CombatSimulation({...terrain,obstacles:blocked?[{minX:.1,maxX:.3,minZ:.4,maxZ:.6}]:[]},1);s.robots[0].hp=0;const muzzle={x:0,z:0};writeRifleMuzzle(muzzle,0,0,0);s.step(1/60,input);assert.equal(s.effects.muzzle.x,muzzle.x);assert.equal(s.effects.muzzle.z,muzzle.z);assert.equal(s.effects.muzzle.y,RIFLE_POSE.height);assert.equal(s.effects.muzzle.serial,1);assert.equal(s.effects.muzzle.life,.05);s.cooldown=0;s.step(1/60,input);assert.equal(s.effects.muzzle.serial,2);}
});
test('VFX: metal, orgânico e parede no ponto do impacto; tranco só visual',()=>{
 for(const kind of ['patrol','largePatrol','smallMutant']){const s=new CombatSimulation(terrain,1),r=s.robots[0];Object.assign(r,{kind,x:.34,z:5,hp:200});s.step(1/60,input);const particles=s.effects.particles.filter(p=>p.life>0);assert.equal(particles.length,40);assert.ok(particles.every(p=>p.kind===impactKind(kind)&&p.y===.85&&p.x===s.shots[0].to.x&&p.z===s.shots[0].to.z));assert.equal(r.hp,175);assert.equal(r.recoil,COMBAT_VFX.recoil);}
 const s=new CombatSimulation({...terrain,obstacles:[{minX:-1,maxX:1,minZ:3,maxZ:4}]},1);s.robots[0].hp=0;s.step(1/60,input);assert.ok(s.effects.particles.filter(p=>p.life>0).every(p=>p.kind==='dust'&&p.z===3));assert.equal(impactKind('largeMutant'),'organic');
});
test('VFX: pool estável de 256, vida ≤0,5, clear e tentativa nova sem resíduos',()=>{
 const f=new CombatEffects(),refs=[...f.particles];for(let i=0;i<100;i++)f.impact(0,0,'metal');assert.equal(f.particles.length,256);assert.ok(f.particles.every((p,i)=>p===refs[i]&&p.life<=.5+1e-9));f.step(.51);assert.ok(f.particles.every(p=>p.life===0));f.fire(0,0);f.impact(0,0,'organic');f.clear();assert.equal(f.muzzle.life,0);assert.ok(f.particles.every(p=>!p.life));const s=new CombatSimulation(terrain,1);assert.equal(s.effects.muzzle.serial,0);assert.ok(s.effects.particles.every(p=>!p.life));
});
test('VFX: pausa congela partículas, clarão e tranco junto do combate',()=>{
 const s=new CombatSimulation(terrain,1);Object.assign(s.robots[0],{x:.34,z:5});s.step(1/60,input);const before=JSON.stringify(s.effects),kick=s.robots[0].recoil;s.step(10,input,true);assert.equal(JSON.stringify(s.effects),before);assert.equal(s.robots[0].recoil,kick);
});

test('VFX reforçado: traçador 2×/0,12 s, clarão 2×, impacto 40; pico do rifle cabe em 256',()=>{
 assert.equal(COMBAT_VFX.tracerRadius,.056);assert.equal(COMBAT_VFX.tracerLife,.12);assert.equal(COMBAT_VFX.muzzleSize,.6*2);assert.equal(COMBAT_VFX.particleScale,1.8);
 const f=new CombatEffects();let peak=0;for(let frame=0;frame<600;frame++){f.step(1/60);if(frame%11===0)f.impact(0,0,'metal');peak=Math.max(peak,f.particles.filter(p=>p.life>0).length);}assert.ok(peak>=80&&peak<=120);assert.ok(peak<COMBAT_VFX.capacity);
 f.clear();assert.ok(f.contacts.every(p=>p.life===0));const s=new CombatSimulation(terrain,1);s.step(1/60,input);assert.equal(s.shots[0].life,.12);
});

function seeded(){let seed=73021;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
test('Estilhaços: 40 no hemisfério do atirador, 4–7 m/s, 0,35–0,5 s e raio visível até 2,5 m',()=>{
 for(const kind of ['metal','organic']){const f=new CombatEffects(undefined,seeded());f.impact(0,0,kind,1,0);const live=f.particles.filter(p=>p.life>0);assert.equal(live.length,40);assert.ok(live.every(p=>p.vx>=0&&Math.hypot(p.vx,p.vy,p.vz)>=4-1e-9&&Math.hypot(p.vx,p.vy,p.vz)<=7+1e-9&&p.life>=.35&&p.life<=.5));let max=0,bounced=0;for(let i=0;i<50;i++){f.step(.01);for(const p of live){max=Math.max(max,Math.hypot(p.x,p.z));bounced=Math.max(bounced,p.bounces);assert.ok(Math.hypot(p.x,p.z)<=2.5+1e-9);}}assert.ok(max>=1.5&&max<=2.5+1e-9);assert.ok(bounced>0);assert.ok(live.every(p=>p.bounces<=p.maxBounces&&p.maxBounces<=(kind==='metal'?2:1)));}
});
test('Ricochete: quatro pisos, energia reduzida, sem afundar e menos quique orgânico; poeira preservada',()=>{
 for(const floor of [0,.12,.148,.25])for(const kind of ['metal','organic']){const f=new CombatEffects(()=>floor,seeded());f.impact(0,0,kind);const p=f.particles[0];p.vy=-5;p.vx=4;p.vz=0;p.range=2.5;let bounced=false;for(let i=0;i<100&&p.life>0;i++){const vy=p.vy,n=p.bounces;f.step(.005);assert.ok(p.y>=floor-1e-9);if(p.bounces>n){bounced=true;assert.ok(p.vy>0&&p.vy<Math.abs(vy)+.2);}}assert.ok(bounced);}
 const f=new CombatEffects(()=>.25);f.impact(0,0,'dust');const dust=f.particles.filter(p=>p.life>0);assert.equal(dust.length,24);assert.ok(dust.every(p=>p.duration<=.3+1e-9&&Math.abs(Math.hypot(p.vx,p.vz)-.9)<1e-9));
});
