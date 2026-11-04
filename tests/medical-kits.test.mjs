import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Box3, Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
const { CombatSimulation }=loadSource('src/combat/simulation.ts');
const { createPhase01Terrain }=loadSource('src/game/shanghai/layout.ts');
const { encounterLayout, COMBAT }=loadSource('src/combat/config.ts');
const { SHANGHAI_MEDICAL_KITS }=loadSource('src/game/props/medicalKit.ts');
const { SHANGHAI_SUPPLY_CRATES,crateMarker }=loadSource('src/game/props/supplyCrate.ts');
const { Navigation,clearSegment,traversable }=loadSource('src/combat/navigation.ts');
const { createMedkitRig }=loadSource('src/combat/healthPickupRig.ts');
const { createLockerRig }=loadSource('src/game/props/lockerRig.ts');
const { SupplyLightPool,SUPPLY_LIGHTING }=loadSource('src/game/props/supplyLighting.ts');
const { useCombatStore:combat,combatRuntime }=loadSource('src/state/useCombatStore.ts');
const { useExpeditionStore:expedition }=loadSource('src/state/useExpeditionStore.ts');
const { useGameStore:game }=loadSource('src/state/useGameStore.ts');
const { playerPosition }=loadSource('src/state/playerTransient.ts');
const { useStoredMedicalKit }=loadSource('src/game/props/medicalKitInteraction.ts');
const world=createPhase01Terrain();
const input={player:{x:0,z:9.5},aim:{x:0,z:-3},facingAngle:Math.PI,firing:false,reload:false};
const create=(encounter=1)=>new CombatSimulation(world,encounter,encounterLayout(true),SHANGHAI_SUPPLY_CRATES);

test('Kits: quatro pontos distribuídos e acessíveis, passar por cima guarda e funciona com vida cheia',()=>{
 const s=create(),nav=new Navigation(world,.32,.5);s.robots.forEach(r=>r.hp=0);
 assert.equal(s.hearts.length,4);assert.equal(SHANGHAI_MEDICAL_KITS.length,4);
 for(let i=0;i<s.hearts.length;i++){
  const kit=s.hearts[i];assert.ok(traversable(kit,world,.32));const path=nav.path(input.player,kit);assert.ok(path.length);let prev=input.player;
  for(const p of path){assert.ok(clearSegment(prev,p,world,.32));prev=p;}
  for(let j=i+1;j<s.hearts.length;j++)assert.ok(Math.hypot(kit.x-s.hearts[j].x,kit.z-s.hearts[j].z)>=35);
  const before=s.medkits;s.step(1/60,{...input,player:kit});assert.equal(kit.active,false);
  assert.equal(s.medkits,before+1);assert.equal(s.hp,100);assert.equal(s.collectMedicalKit(kit),false);
 }
 assert.equal(s.medkits,4);assert.equal(s.snapshot.medkits,4);
});

test('Kits: coleta só de passar por cima, sem interação, respeitando raio, pausa e morte',()=>{
 const s=create(),kit=s.hearts[0];s.robots.forEach(r=>r.hp=0);s.hp=40;
 s.step(1/60,{...input,player:{x:kit.x+COMBAT.pickupRadius+.1,z:kit.z}});assert.equal(kit.active,true);assert.equal(s.medkits,0);
 s.step(1/60,{...input,player:kit},true);assert.equal(kit.active,true);
 s.step(1/60,{...input,player:{x:kit.x+COMBAT.pickupRadius-.1,z:kit.z}});assert.equal(kit.active,false);assert.equal(s.medkits,1);assert.equal(s.hp,40,'guarda sem curar');
 assert.equal(s.sounds.slots.slice(0,s.sounds.count).filter(e=>e.type==='collect').length,1);
 const dead=create(),other=dead.hearts[0];dead.hp=0;dead.step(1/60,{...input,player:other});assert.equal(other.active,true);
 assert.ok(!fs.existsSync('src/interactions/MedicalKitBubbles.tsx'),'sem balão de interação');
});

test('Kits: quatro no total das quatro hordas, sem reaparecer na primeira ou nas seguintes; nova tentativa começa limpa',()=>{
 const s=create('hordas');for(const kit of s.hearts)assert.equal(s.collectMedicalKit(kit),true);
 for(let wave=1;wave<=4;wave++){
  for(let f=0;s.wave<wave;f++){assert.ok(f<650);s.hp=100;s.step(1/60,input);}
  assert.equal(s.hearts.length,4);assert.ok(s.hearts.every(h=>!h.active));assert.equal(s.medkits,4);
  for(const robot of s.robots)robot.hp=0;s.step(1/60,input);
 }
 assert.equal(s.cleared,true);assert.equal(s.medkits,4);
 const fresh=create('hordas');assert.equal(fresh.medkits,0);assert.equal(fresh.hearts.filter(h=>h.active).length,4);
});

test('Kits: uso +50 limitado a 100, não gasta sem vida faltante; distância, parede, pausa e morte bloqueiam',()=>{
 const s=create(),kit=s.hearts[0];
 assert.equal(s.collectMedicalKit(input.player),false);assert.equal(s.collectMedicalKit({x:NaN,z:0}),false);
 assert.equal(s.collectMedicalKit(kit,true),false);assert.equal(s.useMedicalKit(),false);
 s.terrain={...world,obstacles:[...world.obstacles,{minX:kit.x-.5,maxX:kit.x-.4,minZ:kit.z-.5,maxZ:kit.z+.5}]};
 assert.equal(s.collectMedicalKit({x:kit.x-.8,z:kit.z}),false);s.terrain=world;
 s.hp=0;assert.equal(s.collectMedicalKit(kit),false);s.hp=20;
 assert.equal(s.collectMedicalKit(kit),true);assert.equal(s.hp,20);assert.equal(s.useMedicalKit(true),false);assert.equal(s.medkits,1);
 assert.equal(s.useMedicalKit(),true);assert.equal(s.hp,70);assert.equal(s.medkits,0);
 assert.equal(s.collectMedicalKit(s.hearts[1]),true);assert.equal(s.useMedicalKit(),true);assert.equal(s.hp,100);
 assert.equal(s.collectMedicalKit(s.hearts[2]),true);assert.equal(s.useMedicalKit(),false);assert.equal(s.medkits,1);
 s.hp=0;assert.equal(s.useMedicalKit(),false);assert.equal(s.medkits,1);
});

test('Kits: slot publica contador, validam estado atual e não consomem sob menus ou em Marte',()=>{
 const previous=[expedition.getState(),game.getState(),combat.getState(),combatRuntime.simulation,{...playerPosition}];
 try{
  const s=create();combatRuntime.simulation=s;const kit=s.hearts[0];Object.assign(playerPosition,kit);
  expedition.setState({ready:true,panel:null,session:{map:'shanghai',phase:'walking',destination:null,revision:1}});game.setState({isPaused:false});combat.setState({dead:false});
  s.step(1/60,{...input,player:kit});combat.getState().publish(s.snapshot);assert.equal(combat.getState().medkits,1);assert.equal(combat.getState().hp,100);
  s.hp=30;game.setState({isPaused:true});assert.equal(useStoredMedicalKit(),false);assert.equal(s.medkits,1);
  game.setState({isPaused:false});assert.equal(useStoredMedicalKit(),true);assert.equal(combat.getState().hp,80);assert.equal(combat.getState().medkits,0);
  s.step(1/60,{...input,player:s.hearts[1]});assert.equal(s.medkits,1);expedition.setState({session:{...expedition.getState().session,map:'mars'}});assert.equal(useStoredMedicalKit(),false);
  combat.getState().restart();assert.equal(combat.getState().medkits,0);
 }finally{expedition.setState(previous[0],true);game.setState(previous[1],true);combat.setState(previous[2],true);combatRuntime.simulation=previous[3];Object.assign(playerPosition,previous[4]);}
});

test('Luzes: kit apoiado no solo, emissão própria/sem ring, cabine com baliza antes de abrir, cache intacto',async()=>{
 const source=await loadGlb('src/assets/props/shanghai/medkit.glb'),cabinet=await loadGlb('src/assets/props/shanghai/emergency-locker.glb');
 const kit={x:0,z:0,active:true},rig=createMedkitRig(source.scene,kit,.12,0);rig.update();rig.root.updateMatrixWorld(true);
 const box=new Box3().setFromObject(rig.root);assert.ok(Math.abs(box.min.y-.12)<1e-6);assert.equal(rig.item.position.y,0);assert.ok(rig.root.getObjectByName('MedkitBeacon'));
 assert.ok([...rig.materials.values()].every(m=>m.emissiveIntensity>0));assert.equal('radius' in rig,false);assert.equal('ringY' in rig,false);
 for(const time of [0,.5,10,99]){rig.update(time);assert.equal(rig.item.position.y,0);assert.equal(rig.item.rotation.y,0);}
 const s=create(),locker=createLockerRig(cabinet.scene,cabinet.animations,s.crates[0],.12),beacon=locker.root.getObjectByName('LockerBeacon');assert.ok(beacon);assert.equal(beacon.material.toneMapped,false);assert.equal(s.crates[0].phase,'closed');
 assert.equal(cabinet.scene.getObjectByName('LockerBeacon'),undefined);assert.equal(source.scene.getObjectByName('MedkitBeacon'),undefined);
 kit.active=false;rig.update();assert.equal(rig.root.visible,false);rig.dispose();locker.dispose();
});

test('Luzes: orçamento de três fontes próximas, seleção reaproveitada e coleta apaga o foco do kit',()=>{
 const s=create(),pool=new SupplyLightPool(s.hearts,s.crates,world.surfaceHeight),selected=pool.selected,kit=s.hearts[0];
 pool.update(kit);assert.equal(pool.selected[0],0);assert.equal(selected.length,SUPPLY_LIGHTING.maxLights);
 kit.active=false;pool.update(kit);assert.ok(!Array.from(pool.selected).includes(0));assert.equal(pool.selected,selected);
 pool.update({x:1000,z:1000});assert.ok(Array.from(pool.selected).every(i=>i===-1));assert.equal(pool.sources.length,11);
});
