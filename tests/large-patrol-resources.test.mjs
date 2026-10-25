import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {AnimationClip,Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import {loadSource} from './load-source.mjs';
const {COMBAT,LARGE_PATROL,robotConfig,waveRobotKind,encounterLayout}=loadSource('src/combat/config.ts');
const {CombatSimulation,hordeEdgeSpawns,traceShot}=loadSource('src/combat/simulation.ts');
const {Navigation,clearSegment,traversable}=loadSource('src/combat/navigation.ts');
const {createPhase01Terrain,SHANGHAI_PHASE01:d}=loadSource('src/game/shanghai/layout.ts');
const {ResourceRig}=loadSource('src/combat/resourceRig.ts');
const {PatrolUnitRig,PATROL_UNIT,LARGE_PATROL_VISUAL}=loadSource('src/combat/patrolUnit.ts');
const {useCombatStore:store}=loadSource('src/state/useCombatStore.ts');
const bounds={minX:-20,maxX:20,minZ:-20,maxZ:20},open={bounds,walkableAreas:[bounds],obstacles:[]};
const input={player:{x:0,z:9.5},aim:{x:0,z:-3},firing:false,reload:false,facingAngle:Math.PI};
function advance(sim,seconds,custom=input){for(let i=0;i<Math.ceil(seconds*60);i++)sim.step(1/60,custom);}
function glb(file){const b=fs.readFileSync(file);return{bytes:b,json:JSON.parse(b.subarray(20,20+b.readUInt32LE(12)))}}
function assertRoute(nav,start,goal,contact){let previous=start;const path=nav.path(start,goal);assert.ok(path.length);assert.ok(traversable(start,nav.terrain,nav.radius));for(const p of path){assert.ok(clearSegment(previous,p,nav.terrain,nav.radius));previous=p;}assert.ok(traversable(previous,nav.terrain,nav.radius));assert.ok(Math.hypot(previous.x-goal.x,previous.z-goal.z)<=contact+1e-8);}

test('Recursos/Patrol grande: GLBs do autor preservados, rigs e clipes esperados',()=>{
 for(const[file,sha,triangles,bones,clips]of[
  ['src/assets/props/ferro.glb','bdaf53f4b8766c11bb8dce387f07279a3ab7301c20b4f65c81816eb87ff8ad30',3968,7,['Idle','SpawnDrop','CollectPickup','PulseGlow']],
  ['src/assets/props/cobre.glb','6e8aad10f8345bc454ff8e788b655b3d4796c4a99a6511f5a0302c869dace997',4308,6,['Idle','SpawnDrop','CollectPickup','PulseGlow']],
  ['src/assets/enemies/large-patrol-unit.glb','acb2d8e1846b5bb21e66046549a30170a4de6b5452a4b2f40ea241be1677d6f4',8482,23,['Idle','PatrolWalk','ChaseRun','AggressiveLunge','DamagedDeath','ShockAttack']]]){
  const{bytes,json:j}=glb(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);assert.equal(j.meshes.length,1);assert.equal(j.skins[0].joints.length,bones);
  assert.equal(j.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+j.accessors[p.indices].count/3,0),0),triangles);assert.deepEqual(j.animations.map(a=>a.name).sort(),clips.sort());
 }
});

test('Hordas: 10/20 comuns, depois 25+5 e 30+10, com 100 inimigos totais',()=>{
 assert.deepEqual([...COMBAT.hordes.waves],[10,20,30,40]);
 for(let w=0;w<4;w++)assert.equal(Array.from({length:COMBAT.hordes.waves[w]},(_,i)=>waveRobotKind(w,i)).filter(k=>k==='largePatrol').length,[0,0,5,10][w]);
 const sim=new CombatSimulation(createPhase01Terrain(),'hordas',encounterLayout(true));
 const usedDrops=new Set();
 for(let w=1;w<=4;w++){
  for(let guard=0;sim.wave<w;guard++){assert.ok(guard<650);sim.hp=100;sim.step(1/60,input);}
  const live=sim.robots.filter(r=>r.hp>0);assert.equal(live.length,COMBAT.hordes.waves[w-1]);assert.equal(live.filter(r=>r.kind==='largePatrol').length,[0,0,5,10][w-1]);
  for(const r of live){assert.equal(r.hp,robotConfig(r).hp);assert.ok(!usedDrops.has(r.drop));usedDrops.add(r.drop);assertRoute(r.kind==='largePatrol'?sim.largeNavigation:sim.navigation,r,d.exit,robotConfig(r).contactRange);}
  const need=Math.ceil(live.reduce((s,r)=>s+Math.ceil(robotConfig(r).hp/COMBAT.rifle.damage),0)*COMBAT.hordes.ammoMargin);assert.ok(sim.ammo+sim.reserve>=need);
  live.forEach(r=>{r.hp=0});
 }
 assert.equal(usedDrops.size,100);assert.equal(sim.total,100);assert.equal(sim.drops.length,100);
});

test('Patrol grande: perímetro recuado respeita raio, todos os segmentos e alcance de contato ARES-I',()=>{
 const terrain=createPhase01Terrain(),nav=new Navigation(terrain,LARGE_PATROL.radius,COMBAT.grid);
 const candidates=hordeEdgeSpawns(terrain,nav,d.exit,LARGE_PATROL.radius,LARGE_PATROL.contactRange);
 assert.ok(candidates.length>=40);for(const p of candidates){assert.ok(traversable(p,terrain,LARGE_PATROL.radius+.2));assertRoute(nav,p,d.exit,LARGE_PATROL.contactRange);}
 const fake={path:()=>[{x:0,z:-100}]};assert.equal(hordeEdgeSpawns(terrain,fake,d.exit,LARGE_PATROL.radius,LARGE_PATROL.contactRange).length,0,'rejeitar caminhos inválidos, não só exigir array não vazio');
});

test('Portes: patrulhas e encontros pequenos continuam comuns; raio do grande participa do hitscan',()=>{
 for(const count of[1,3,5,32]){const sim=new CombatSimulation(createPhase01Terrain(),count,encounterLayout(true));assert.ok(sim.robots.every(r=>r.kind==='patrol'));assert.equal(sim.largeNavigation,null);}
 const sim=new CombatSimulation(open,1),r=sim.robots[0];Object.assign(r,{x:1.5,z:0,kind:'largePatrol'});
 assert.equal(traceShot({x:0,z:5},{x:0,z:-5},open,[r]).robot,r);
 r.kind='patrol';assert.equal(traceShot({x:0,z:5},{x:0,z:-5},open,[r]).robot,null);
});

test('Titânio: um único drop de grande, separado de ferro/cobre, bloqueado por parede/pausa/morte',()=>{
 const sim=new CombatSimulation(open,1),r=sim.robots[0];Object.assign(r,{kind:'largePatrol',x:0,z:-3,hp:25});
 sim.step(1/60,{...input,firing:true});assert.equal(sim.kills,1);assert.equal(sim.drops[0].kind,'titanium');assert.equal(sim.drops[0].active,true);
 const player={x:0,z:-3};sim.step(1/60,{...input,player},true);assert.equal(sim.titanium,0);
 sim.terrain={...open,obstacles:[{minX:-2,maxX:2,minZ:-3.5,maxZ:-2.9}]};sim.step(1/60,{...input,player:{x:0,z:-2.5}});assert.equal(sim.titanium,0);
 sim.terrain=open;sim.step(1/60,{...input,player});assert.equal(sim.titanium,1);assert.equal(sim.iron,0);assert.equal(sim.copper,0);assert.equal(sim.snapshot.titanium,1);
 advance(sim,1,{...input,player,firing:true});assert.equal(sim.titanium,1);assert.equal(sim.kills,1);
 const fresh=new CombatSimulation(open,1);assert.equal(fresh.titanium,0);assert.ok(fresh.drops.every(p=>!p.active));
 store.getState().publish(sim.snapshot);assert.equal(store.getState().titanium,1);store.getState().restart();assert.equal(store.getState().titanium,0);
 const dead=new CombatSimulation(open,1);dead.hp=0;Object.assign(dead.drops[0],{x:0,z:9.5,kind:'titanium',active:true});dead.step(1/60,input);assert.equal(dead.titanium,0);
});

test('Visual GLB do recurso: spawn, idle, coleta única e pausa, sem modificar asset compartilhado',()=>{
 const source=new Group(),material=new MeshStandardMaterial();source.add(new Mesh(new BoxGeometry(1,1,1),material));
 const clips=['Idle','SpawnDrop','CollectPickup'].map(n=>new AnimationClip(n,1,[]));const a=new ResourceRig(source,clips),b=new ResourceRig(source,clips);
 assert.notEqual(a.root,b.root);assert.equal(a.root.visible,false);a.update(true,1/60);assert.equal(a.root.visible,true);assert.equal(b.root.visible,false);
 for(let i=0;i<100;i++)a.update(true,1/60);assert.equal(a.root.visible,true);a.update(false,1/60);
 for(let i=0;i<100;i++)a.update(false,0);assert.equal(a.root.visible,true,'pausa congela animação de coleta');
 for(let i=0;i<70;i++)a.update(false,1/60);assert.equal(a.root.visible,false);
 a.update(true,1/60);assert.equal(a.root.visible,true,'novo nascimento limpa animação anterior');
 a.dispose();b.dispose();assert.equal(source.children[0].material,material);
});

test('Patrol grande: ChaseRun, ataque, morte e respawn usam clipes do modelo novo',()=>{
 const source=new Group();source.add(new Mesh(new BoxGeometry(1,1,1),new MeshStandardMaterial()));
 const clips=['Idle','PatrolWalk','ChaseRun','AggressiveLunge','DamagedDeath'].map(n=>new AnimationClip(n,1,[]));const rig=new PatrolUnitRig(source,clips,true);
 const r={x:0,z:0,hp:150,flash:0,alerted:true};for(let i=0;i<80;i++){r.x+=1.55/60;rig.update(r,20,20,2.4,1/60);}
 assert.equal(rig.clip,'ChaseRun');assert.equal(rig.root.scale.x,LARGE_PATROL_VISUAL.scale);
 rig.update(r,r.x,r.z,2.4,1/60);assert.equal(rig.clip,'AggressiveLunge');r.hp=0;rig.update(r,20,20,2.4,1/60);assert.equal(rig.clip,'DamagedDeath');
 for(let i=0;i<180;i++)rig.update(r,20,20,2.4,1/60);assert.equal(rig.visible,false);rig.respawn();assert.equal(rig.clip,'Idle');assert.equal(rig.visible,true);rig.dispose();
});

test('Horda mista: 90 s válida; neutralizar a primeira linha libera contato dos grandes com ARES-I',()=>{
 const terrain=createPhase01Terrain(),sim=new CombatSimulation(terrain,'hordas',encounterLayout(true));
 for(let w=1;w<=4;w++){
  for(let guard=0;sim.wave<w;guard++){assert.ok(guard<650);sim.hp=100;sim.step(1/60,input);}
  if(w<4)sim.robots.forEach(r=>{r.hp=0});
 }
 const starts=sim.robots.map(r=>Math.hypot(r.x-input.player.x,r.z-input.player.z));
 let commonReached=false;
 for(let frame=0;frame<90*60;frame++){
  if(frame===45*60)sim.robots.filter(r=>r.kind==='patrol').forEach(r=>{r.hp=0});
  if(sim.robots.some(r=>r.hp>0&&r.kind==='patrol'&&Math.hypot(r.x-input.player.x,r.z-input.player.z)<=COMBAT.robot.contactRange+.05))commonReached=true;
  sim.hp=100;sim.step(1/60,input);
  for(const r of sim.robots)assert.ok(traversable(r,terrain,robotConfig(r).radius),`${r.kind} ${r.id} dentro de sólido`);
 }
 const large=sim.robots.filter(r=>r.kind==='largePatrol');assert.equal(large.length,10);
 for(const r of large)assert.ok(Math.hypot(r.x-input.player.x,r.z-input.player.z)<starts[r.id]-10,`grande ${r.id} precisa avançar`);
 assert.ok(large.some(r=>Math.hypot(r.x-input.player.x,r.z-input.player.z)<=LARGE_PATROL.contactRange+.05),'grandes chegam a contato');
 assert.ok(commonReached,'comuns alcançam contato antes de serem neutralizados');
});


test('Coleta no mesmo passo da morte ainda apresenta animação GLB uma vez',()=>{
 const source=new Group();source.add(new Mesh(new BoxGeometry(1,1,1),new MeshStandardMaterial()));
 const clips=['Idle','SpawnDrop','CollectPickup'].map(n=>new AnimationClip(n,1,[])),rig=new ResourceRig(source,clips);
 rig.update(false,1/60,true);assert.equal(rig.root.visible,true,'coletado antes do primeiro frame ainda tem feedback');
 for(let i=0;i<100;i++)rig.update(false,1/60,true);assert.equal(rig.root.visible,false);
 rig.update(false,1/60,true);assert.equal(rig.root.visible,false,'não recriar coleta a cada frame');rig.dispose();
});

test('Patrol grande requer seis acertos do rifle e gera somente um titânio',()=>{
 const sim=new CombatSimulation(open,'hordas'),firing={...input,firing:true};sim.wave=2;sim.waveLeft=.0001;sim.step(1/60,input);
 const r=sim.robots.find(r=>r.kind==='largePatrol');sim.robots.forEach(other=>{if(other!==r)other.hp=0});Object.assign(r,{x:0,z:-3,hp:LARGE_PATROL.hp});
 for(let hit=1;hit<=6;hit++){sim.cooldown=0;sim.step(1/60,firing);assert.equal(r.hp,150-hit*25);assert.equal(sim.kills,hit===6?1:0);}
 const drop=sim.drops[r.drop];assert.equal(drop.kind,'titanium');assert.equal(drop.active,true);
 sim.step(1/60,{...input,player:{x:drop.x,z:drop.z}});assert.equal(sim.titanium,1);assert.equal(sim.iron,0);assert.equal(sim.copper,0);
});

test('Contato do grande aplica 25 de dano com intervalo de 1,2 s',()=>{
 const sim=new CombatSimulation(open,'hordas');sim.wave=2;sim.waveLeft=.0001;sim.step(1/60,input);
 const r=sim.robots.find(r=>r.kind==='largePatrol');sim.robots.forEach(other=>{if(other!==r)other.hp=0});Object.assign(r,{x:0,z:input.player.z-2.4,alerted:true});
 sim.step(1/60,input);assert.equal(sim.hp,75);advance(sim,.8);assert.equal(sim.hp,75);advance(sim,.5);assert.equal(sim.hp,50);
});
