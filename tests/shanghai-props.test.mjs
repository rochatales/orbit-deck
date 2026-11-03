import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { AnimationMixer, Box3, Quaternion, Vector3 } from 'three';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const { SHANGHAI_CARS, DESTROYED_CAR, carObstacle, retainPhase01Obstacle }=loadSource('src/game/shanghai/propPlacements.ts');
const { createPhase01Terrain, SHANGHAI_PHASE01:layout }=loadSource('src/game/shanghai/layout.ts');
const { createDestroyedCars, removeLegacyCars }=loadSource('src/game/shanghai/propVisuals.ts');
const { createLockerRig }=loadSource('src/game/props/lockerRig.ts');
const { crateMarker, crateObstacle, SHANGHAI_SUPPLY_CRATES, SUPPLY_CRATE }=loadSource('src/game/props/supplyCrate.ts');
const { createMedkitRig }=loadSource('src/combat/healthPickupRig.ts');
const { CombatSimulation, hordeEdgeSpawns, validContactSpawn }=loadSource('src/combat/simulation.ts');
const { encounterLayout, COMBAT, robotConfig }=loadSource('src/combat/config.ts');
const { Navigation, clearSegment, traversable }=loadSource('src/combat/navigation.ts');
const source=await loadGlb('src/assets/shanghai-fase01/shanghai-fase01.glb');
const car=await loadGlb('src/assets/props/shanghai/rusted-car.glb');
const locker=await loadGlb('src/assets/props/shanghai/emergency-locker.glb');
const medkit=await loadGlb('src/assets/props/shanghai/medkit.glb');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('Shanghai props: três fontes intactas por SHA e runtime com nove carros/sete cabines',()=>{
 const root='art-source/shanghai-props-v002/';const manifest=JSON.parse(fs.readFileSync(root+'notas/fontes.json'));
 assert.equal(manifest.length,3);for(const f of manifest){assert.equal(hash(root+f.copy),f.sha256);assert.equal(hash('src/assets/props/shanghai/'+f.copy.split('/').at(-1)),f.sha256);}
 assert.equal(SHANGHAI_CARS.length,9);assert.equal(SHANGHAI_SUPPLY_CRATES.length,7);
 assert.equal(new Set(SHANGHAI_CARS.map(c=>c.id)).size,9);assert.equal(new Set(SHANGHAI_SUPPLY_CRATES.map(c=>c.id)).size,7);
 const map=source.scene.clone(true), count=root=>{let n=0;root.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count??0)/3;});return n;};
 const before=count(source.scene);assert.equal(removeLegacyCars(map),432);assert.equal(count(map),before-432);
 assert.equal(count(source.scene),before,'cache e prédios/piso preservados');
 assert.equal(layout.obstacles.filter(retainPhase01Obstacle).length,30);
});

test('Shanghai carros: apoio, escala proporcional, dimensões contidas nos colisores e sem sobrepor prédios',()=>{
 const world=createPhase01Terrain(),visual=createDestroyedCars(car.scene,world.surfaceHeight);visual.updateMatrixWorld(true);
 assert.equal(visual.children.length,9);
 for(let i=0;i<SHANGHAI_CARS.length;i++){
  const p=SHANGHAI_CARS[i],floor=world.surfaceHeight(p.x,p.z),bounds=new Box3().setFromObject(visual.children[i]),solid=carObstacle(p,floor);
  assert.ok(Math.abs(bounds.min.y-floor)<1e-6);
  assert.ok(bounds.min.x>=solid.minX-1e-6&&bounds.max.x<=solid.maxX+1e-6&&bounds.min.z>=solid.minZ-1e-6&&bounds.max.z<=solid.maxZ+1e-6);
  for(const b of layout.obstacles.filter(retainPhase01Obstacle))assert.ok(!(solid.minX<b.maxX&&solid.maxX>b.minX&&solid.minZ<b.maxZ&&solid.maxZ>b.minZ),p.id);
  assert.equal(traversable({x:p.x,z:p.z}, {...world,obstacles:[]},.32),true);
 }
 assert.ok(DESTROYED_CAR.length===3.8);assert.equal(car.scene.parent,null);
});

test('Shanghai cabines: fechadas até E, porta normalizada 0→108°, instâncias/tempo independentes e cache intacto',()=>{
 const make=(p)=>({...p,phase:'closed',elapsed:0,marker:crateMarker(p),rewarded:false});
 const a=make(SHANGHAI_SUPPLY_CRATES[0]),b=make(SHANGHAI_SUPPLY_CRATES[1]);
 const original=Array.from(locker.animations[0].tracks[0].values),left=createLockerRig(locker.scene,locker.animations,a,.12),right=createLockerRig(locker.scene,locker.animations,b,0);
 const hinge=left.root.getObjectByName('DoorPivot');assert.ok(hinge.quaternion.angleTo(new Quaternion())<1e-6);
 a.phase='opening';a.elapsed=SUPPLY_CRATE.duration;left.update();
 assert.ok(Math.abs(hinge.quaternion.angleTo(new Quaternion())-Math.PI*.6)<1e-5);
 assert.ok(right.root.getObjectByName('DoorPivot').quaternion.angleTo(new Quaternion())<1e-6);
 const frozen=hinge.quaternion.clone();left.update();assert.ok(hinge.quaternion.equals(frozen));
 assert.deepEqual(Array.from(locker.animations[0].tracks[0].values),original);
 for(const p of SHANGHAI_SUPPLY_CRATES){const c=crateObstacle(p);for(const o of layout.obstacles.filter(retainPhase01Obstacle))assert.ok(!(c.minX<o.maxX&&c.maxX>o.minX&&c.minZ<o.maxZ&&c.maxZ>o.minZ),p.id);}
 left.dispose();right.dispose();
});

test('Shanghai kits: modelo de 0,6 m, no solo sem anel/flutuação/giro e coleta some com o item',()=>{
 for(const floor of [0,.12,.148,.25]){
  const pickup={x:0,z:0,active:true},rig=createMedkitRig(medkit.scene,pickup,floor,0),initial=rig.item.quaternion.clone();
  assert.equal(rig.root.position.y,floor);assert.equal('ringY' in rig,false);
  for(const time of [0,.4,.8,1.2,1.6]){rig.update(time);assert.ok(rig.item.quaternion.equals(initial));assert.equal(rig.item.position.y,0);}
  rig.update(0);rig.root.updateMatrixWorld(true);const bounds=new Box3().setFromObject(rig.item);assert.ok(Math.abs(bounds.getSize(new Vector3()).x-.6)<1e-6);
  pickup.active=false;rig.update(0);assert.equal(rig.root.visible,false);rig.dispose();
 }
 const code=fs.readFileSync('src/combat/CombatScene.tsx','utf8');assert.match(code,/<HealthPickups/);assert.doesNotMatch(code,/heartShape|shapeGeometry/);
});

test('Shanghai kits: coleta por E guarda sem curar; uso separado e retry restaura',()=>{
 const world=createPhase01Terrain(),s=new CombatSimulation(world,1,encounterLayout(true));s.robots.forEach(r=>r.hp=0);const h=s.hearts[0];
 const input={player:h,aim:{x:0,z:0},firing:false,reload:false};s.step(1/60,input);assert.equal(h.active,true);
 s.hp=40;s.step(1/60,input,true);assert.equal(s.hp,40);assert.equal(h.active,true);
 s.step(1/60,input);assert.equal(s.hp,40);assert.equal(h.active,true);assert.equal(s.collectMedicalKit(h),true);assert.equal(s.medkits,1);assert.equal(s.hp,40);assert.equal(s.useMedicalKit(),true);assert.equal(s.hp,90);assert.equal(h.active,false);s.step(1/60,input);assert.equal(s.hp,90);
 assert.equal(s.sounds.slots.slice(0,s.sounds.count).filter(e=>e.type==='collect').length,1);
 const fresh=new CombatSimulation(world,1,encounterLayout(true));assert.ok(fresh.hearts.every(h=>h.active));
});

test('Shanghai navegação: 32 spawns e todos os candidatos por tipo chegam ao desembarque; sete acessos humanos livres',()=>{
 const world=createPhase01Terrain(),exit=layout.exit;
 for(const kind of ['patrol','largePatrol','smallMutant','largeMutant']){
  const r=robotConfig({kind}),nav=new Navigation(world,r.radius,COMBAT.grid),candidates=hordeEdgeSpawns(world,nav,exit,r.radius,r.contactRange);
  assert.ok(candidates.length>=260,kind);
  for(const p of [...layout.spawns,...candidates])assert.equal(validContactSpawn(world,nav,p,exit,r.radius,r.contactRange),true,kind);
 }
 const nav=new Navigation(world,.32,.5);
 for(const p of SHANGHAI_SUPPLY_CRATES){const marker=crateMarker(p);assert.equal(traversable(marker,world,.32),true);const path=nav.path(exit,marker);assert.ok(path.length);let from=exit;for(const to of path){assert.ok(clearSegment(from,to,world,.32));from=to;}assert.ok(Math.hypot(from.x-marker.x,from.z-marker.z)<1e-8);}
});
