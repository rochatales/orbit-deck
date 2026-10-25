import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{createHash}from'node:crypto';
import{loadSource}from'./load-source.mjs';import{loadGlb}from'./load-glb.mjs';
const{COMBAT,SMALL_MUTANT:M,HORDE_TOTALS,robotConfig,waveRobotKind,RIFLE_POSE,encounterTotal,encounterLayout}=loadSource('src/combat/config.ts');
const{CombatSimulation,hordeEdgeSpawns,canSeePlayer}=loadSource('src/combat/simulation.ts');
const{Navigation,clearSegment,traversable}=loadSource('src/combat/navigation.ts');
const{createPhase01Terrain,SHANGHAI_PHASE01:d}=loadSource('src/game/shanghai/layout.ts');
const{PatrolUnitRig}=loadSource('src/combat/patrolUnit.ts');const{ResourceRig}=loadSource('src/combat/resourceRig.ts');
const{RESOURCE_VISUAL:V,collectDuration}=loadSource('src/combat/resourceVisual.ts');
const{phase01SurfaceHeight}=loadSource('src/game/shanghai/surfaces.ts');const{placeResourceDrop}=loadSource('src/combat/resourcePlacement.ts');
const{useCombatStore:store}=loadSource('src/state/useCombatStore.ts');
const b={minX:-30,maxX:30,minZ:-30,maxZ:30},open={bounds:b,walkableAreas:[b],obstacles:[]};
const idle={player:{x:0,z:0},aim:{x:0,z:0},firing:false,reload:false,facingAngle:0};
function advance(sim,n,input=idle){for(let i=0;i<Math.ceil(n*60);i++)sim.step(1/60,input)}
function animalsOnly(terrain=open){const s=new CombatSimulation(terrain,'hordas');s.waveLeft=.001;s.step(1/60,idle);const animals=s.robots.filter(r=>r.kind==='smallMutant');s.robots.forEach(r=>{if(r.kind!=='smallMutant')r.hp=0});return{s,animals}}
function validRoute(nav,start){let previous=start;const path=nav.path(start,d.exit);assert.ok(path.length);assert.ok(traversable(start,nav.terrain,M.radius));for(const p of path){assert.ok(clearSegment(previous,p,nav.terrain,M.radius));previous=p}assert.ok(traversable(previous,nav.terrain,M.radius));assert.ok(Math.hypot(previous.x-d.exit.x,previous.z-d.exit.z)<=M.contactRange)}

test('Mutante/organica: GLBs exatos do autor, orçamento, clipes e dimensões',async()=>{
 for(const[file,sha,tri,clips]of[
  ['src/assets/enemies/mutant-animal.glb','6680135e3ab13a3aa55651426d1bbe8bb9152ce9368ea383a2166e49c66d8796',7988,['Idle','PatrolWalk','ChaseRun','AggressiveLunge','ShockAttack','DamagedDeath']],
  ['src/assets/props/materia-organica.glb','35ab83514c49d72e119420d5aebc93b68d0bc0d755fbd512621d7fbdc158d50c',3456,['SpawnDrop','Idle','PulseGlow','CollectPickup']]]){
  const bytes=fs.readFileSync(file),j=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.equal(createHash('sha256').update(bytes).digest('hex'),sha);assert.equal(j.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+j.accessors[p.indices].count/3,0),0),tri);assert.deepEqual(j.animations.map(a=>a.name).sort(),clips.sort());
  if(file.includes('enemies')){const p=j.accessors[j.meshes[0].primitives[0].attributes.POSITION];assert.ok(Math.abs(p.max[0]-p.min[0]-.671)<.002);assert.ok(Math.abs(p.max[1]-p.min[1]-.962)<.002);assert.ok(Math.abs(p.max[2]-p.min[2]-2.07)<.002)}
 }
});

test('Hordas: 10+3, 20+6, 25+5 e 30+10, total 109 e munição por tipo',()=>{
 assert.deepEqual([...HORDE_TOTALS],[13,26,30,40]);assert.equal(encounterTotal('hordas'),109);
 const s=new CombatSimulation(createPhase01Terrain(),'hordas',encounterLayout(true)),seen=new Set();
 for(let w=0;w<4;w++){
  s.robots.forEach(r=>r.hp=0);s.waveLeft=.0001;s.ammo=s.reserve=0;s.step(1/60,idle);
  const live=s.robots.filter(r=>r.hp>0);assert.equal(live.length,HORDE_TOTALS[w]);assert.equal(s.snapshot.alive,HORDE_TOTALS[w]);
  assert.deepEqual(['patrol','largePatrol','smallMutant'].map(k=>live.filter(r=>r.kind===k).length),[[10,0,3],[20,0,6],[25,5,0],[30,10,0]][w]);
  assert.equal(s.ammo+s.reserve,[54,108,158,225][w]);for(const r of live){assert.ok(!seen.has(r.drop));seen.add(r.drop)}
  const animals=live.filter(r=>r.kind==='smallMutant');if(animals.length){
   const bounds=s.terrain.bounds;const edges=new Set(animals.map(r=>{const v=[r.x-bounds.minX,bounds.maxX-r.x,r.z-bounds.minZ,bounds.maxZ-r.z];return v.indexOf(Math.min(...v))}));assert.ok(edges.size>=3,'animais distribuídos por lados');assert.equal(new Set(animals.map(r=>r.packAngle)).size,animals.length)}
 }
 assert.equal(s.total,109);assert.equal(seen.size,109);assert.equal(s.drops.length,109);
 const slots=Array.from({length:40},(_,i)=>i).filter(i=>HORDE_TOTALS.some((count,w)=>i<count&&waveRobotKind(w,i)==='smallMutant'));assert.equal(slots.length,6,'pool de seis rigs reaproveitados entre ondas 1/2');
});

test('Mutante: spawns e todos os segmentos válidos no próprio raio, com contato até ARES-I',()=>{
 const t=createPhase01Terrain(),nav=new Navigation(t,M.radius,COMBAT.grid),points=hordeEdgeSpawns(t,nav,d.exit,M.radius,M.contactRange);assert.equal(points.length,272);for(const p of points)validRoute(nav,p);for(const p of d.spawns)validRoute(nav,p);
 assert.equal(hordeEdgeSpawns(t,{path:()=>[{x:0,z:-100}]},d.exit,M.radius,M.contactRange).length,0);
});

test('Mutante: dois tiros de 25 pelo cano a 0,85 m, alerta e um único drop orgânico',()=>{
 const{s,animals}=animalsOnly(),r=animals[0];animals.slice(1).forEach(r=>r.hp=0);Object.assign(r,{x:0,z:0,hp:50,alerted:false});
 const input={...idle,player:{x:0,z:7},facingAngle:Math.PI,firing:true};assert.equal(RIFLE_POSE.height,.85);
 s.step(1/60,input);assert.equal(r.hp,25);assert.ok(r.alerted);assert.equal(s.kills,0);assert.equal(s.drops[r.drop].spawned,false);assert.ok(Math.hypot(s.shots[0].from.x,s.shots[0].from.z-7)>.9,'origem no cano, não centro');
 s.cooldown=0;s.step(1/60,input);assert.equal(r.hp,0);assert.equal(s.kills,1);const drop=s.drops[r.drop];assert.equal(drop.kind,'organic');assert.equal(drop.active,true);
 s.step(1/60,{...idle,player:drop},true);assert.equal(s.organic,0);s.step(1/60,{...idle,player:drop});assert.equal(s.organic,1);assert.deepEqual([s.iron,s.copper,s.titanium],[0,0,0]);advance(s,.5,{...idle,player:drop});assert.equal(s.organic,1);assert.equal(s.snapshot.organic,1);
 store.getState().publish(s.snapshot);assert.equal(store.getState().organic,1);store.getState().restart();assert.equal(store.getState().organic,0);
});

test('Mutante: marcha 2,2 e perseguição 4,6 m/s; visão igual à do Patrol e dano global',()=>{
 const{s,animals}=animalsOnly(),r=animals[0];animals.slice(1).forEach(r=>r.hp=0);Object.assign(r,{x:0,z:-20,pace:M.speed,alerted:false,repath:0,path:[]});const z=r.z;advance(s,.5);assert.ok(Math.abs(r.z-z-1.1)<.02);r.alerted=true;advance(s,1.5);const before=r.z;advance(s,.5);assert.ok(Math.abs((r.z-before)/.5-4.6)<.02);
 assert.ok(M.chaseSpeed>4.2);assert.equal(M.hp,50);assert.equal(M.radius,.5);assert.equal(M.contactRange,.9);assert.ok(M.spacing<COMBAT.robot.spacing&&M.separation<COMBAT.robot.separation);
 Object.assign(r,{x:0,z:0,angle:0});assert.ok(canSeePlayer(r,{x:0,z:9.9},open));assert.equal(canSeePlayer(r,{x:0,z:10.1},open),false);assert.equal(canSeePlayer(r,{x:0,z:-2.9},open),false);assert.ok(canSeePlayer(r,{x:2.9,z:0},open));
 const group=animalsOnly();group.animals.forEach((r,i)=>Object.assign(r,{x:Math.sin(i*Math.PI*2/3)*.85,z:Math.cos(i*Math.PI*2/3)*.85,alerted:true,packReady:true}));group.s.step(1/60,idle);assert.equal(group.s.hp,92);advance(group.s,.7);assert.equal(group.s.hp,92);advance(group.s,.2);assert.equal(group.s.hp,84,'três contatos não somam no mesmo intervalo');
});

test('Mutantes: partindo da mesma linha abrem três setores antes de fechar contato; parede não prende',()=>{
 const{s,animals}=animalsOnly();animals.forEach((r,i)=>Object.assign(r,{x:-5,z:(i-1)*1.2,alerted:true,pace:4.6}));
 for(let f=0;f<180;f++){s.hp=100;s.step(1/60,idle);for(const r of animals)assert.ok(traversable(r,open,M.radius))}
 assert.ok(animals.every(r=>r.packReady&&Math.hypot(r.x,r.z)<=M.contactRange+.05));const sectors=new Set(animals.map(r=>Math.floor((Math.atan2(r.x,r.z)+Math.PI)/(Math.PI/3))));assert.equal(sectors.size,3);
 const wall={...open,obstacles:[{minX:5,maxX:6,minZ:-6,maxZ:6}]},t=animalsOnly(wall),player={x:6.34,z:0};t.animals.forEach((r,i)=>Object.assign(r,{x:10,z:(i-1)*1.4,alerted:true}));
 for(let f=0;f<600;f++){t.s.hp=100;t.s.step(1/60,{...idle,player});for(const r of t.animals)assert.ok(traversable(r,wall,M.radius))}assert.ok(t.animals.some(r=>Math.hypot(r.x-player.x,r.z-player.z)<=M.contactRange+.05));
});

test('Orgânica: verde, apoio na calçada, Idle sem giro, flutuação e coleta acelerada',async()=>{
 assert.equal(V.colors.organic,'#76f57b');const drop={};placeResourceDrop(drop,-24.8,5,'organic',phase01SurfaceHeight);assert.equal(drop.surfaceOrganic,.12);assert.equal(drop.surfaceOrganic+V.ringY,.126);
 const g=await loadGlb('src/assets/props/materia-organica.glb'),rig=new ResourceRig(g.scene,g.animations);rig.update(true,.1,true,.12);for(let i=0;i<120;i++)rig.update(true,1/60,true,.12);
 const q=[];rig.model.traverse(o=>q.push([o,o.quaternion.clone()]));let sum=0;
 for(let i=0;i<192;i++){rig.update(true,1/120,true,.12);sum+=rig.root.position.y;for(const[o,rest]of q)assert.ok(o.quaternion.equals(rest))}assert.ok(Math.abs(sum/192-.47)<1e-8);assert.equal(rig.root.rotation.y,0);
 const duration=g.animations.find(a=>a.name==='CollectPickup').duration;assert.ok(Math.abs(collectDuration(duration)-.5)<1e-6);rig.update(false,.1,true,.12);assert.ok(rig.root.visible);rig.update(false,.41,true,.12);assert.equal(rig.root.visible,false);rig.dispose();
});

test('Mutante GLB real: marcha, ChaseRun, bote, morte e renascimento no mesmo rig em escala 1',async()=>{
 const g=await loadGlb('src/assets/enemies/mutant-animal.glb'),rig=new PatrolUnitRig(g.scene,g.animations,'smallMutant'),uuid=rig.root.uuid,r={x:0,z:0,hp:50,alerted:false,flash:0};assert.equal(rig.root.scale.x,1);
 for(let i=0;i<120;i++){r.x+=2.2/60;rig.update(r,20,20,.9,1/60)}assert.equal(rig.clip,'PatrolWalk');r.alerted=true;for(let i=0;i<120;i++){r.x+=4.6/60;rig.update(r,20,20,.9,1/60)}assert.equal(rig.clip,'ChaseRun');
 rig.update(r,r.x,r.z,.9,1/60);assert.equal(rig.clip,'AggressiveLunge');r.hp=0;rig.update(r,20,20,.9,1/60);assert.equal(rig.clip,'DamagedDeath');for(let i=0;i<180;i++)rig.update(r,20,20,.9,1/60);assert.equal(rig.visible,false);rig.respawn();assert.equal(rig.clip,'Idle');assert.equal(rig.root.uuid,uuid);assert.equal(rig.visible,true);rig.dispose();
});
