import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadSource} from './load-source.mjs';
const {openCrate,advanceCrate,revealIntensity,SUPPLY_CRATE}=loadSource('src/game/props/supplyCrate.ts');
test('Caixa: somente interação próxima inicia, sem repetir abertura',()=>{
 const s={phase:'closed',elapsed:0};assert.equal(openCrate(s,0,4,0,1.1),false);assert.equal(revealIntensity(s),0);
 assert.equal(openCrate(s,0,1.5,0,1.1),true);advanceCrate(s,.8);const t=s.elapsed;
 assert.equal(openCrate(s,0,1.5,0,1.1),false);assert.equal(s.elapsed,t);
 assert.ok(revealIntensity(s)>0);advanceCrate(s,20);assert.equal(s.phase,'open');assert.equal(s.elapsed,2.4);assert.equal(openCrate(s,0,1.5,0,1.1),false);
});
test('Caixa: pausa, delta inválido e final não reiniciam revelação',()=>{
 const s={phase:'opening',elapsed:1};for(const d of [0,-1,NaN,Infinity])advanceCrate(s,d);
 assert.equal(s.elapsed,1);assert.ok(revealIntensity(s)>20);advanceCrate(s,1.4);assert.equal(revealIntensity(s),2);
 advanceCrate(s,.1);assert.equal(s.elapsed,2.4);
});
test('Caixa: GLB traz Open, pivô, efeito recolhido e IDs únicos; sem luzes/física automáticas',()=>{
 const b=fs.readFileSync('src/assets/props/caixa-suprimentos/caixa-suprimentos-v001.glb');const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
 const manifest=JSON.parse(fs.readFileSync('src/assets/props/caixa-suprimentos/manifesto.json','utf8'));
 const ids=gltf.nodes.map(n=>n.extras?.id_estavel).filter(Boolean);assert.equal(new Set(ids).size,ids.length);
 const clip=gltf.animations.find(a=>a.name==='Open');assert.ok(clip);assert.equal(clip.channels.length,4);
 const names=clip.channels.map(c=>gltf.nodes[c.target.node].name);for(const id of ['LID_Pivot','LOCK_Left','LOCK_Right','VFX_Reveal'])assert.ok(names.includes(id),id);
 const reveal=gltf.nodes.find(n=>n.name==='VFX_Reveal');assert.ok(reveal.scale.every(n=>n<.001));
 assert.equal(gltf.extensions?.KHR_lights_punctual,undefined);assert.equal(manifest.collision.meshIsCollider,false);assert.equal(manifest.light.color,SUPPLY_CRATE.neon);
 const duration=Math.max(...clip.samplers.map(s=>gltf.accessors[s.input].max[0]));assert.ok(Math.abs(duration-SUPPLY_CRATE.duration)<.00001);
});

const {CombatSimulation,traceShot}=loadSource('src/combat/simulation.ts');
const {COMBAT,encounterLayout}=loadSource('src/combat/config.ts');
const {createPhase01Terrain,SHANGHAI_PHASE01}=loadSource('src/game/shanghai/layout.ts');
const {Navigation,clearSegment,traversable}=loadSource('src/combat/navigation.ts');
const {SHANGHAI_SUPPLY_CRATES,crateMarker,crateObstacle}=loadSource('src/game/props/supplyCrate.ts');
function mission(){const s=new CombatSimulation(createPhase01Terrain(),1,encounterLayout(true),SHANGHAI_SUPPLY_CRATES);s.robots.forEach(r=>r.hp=0);return s;}
function input(player){return {player,aim:{x:0,z:-10},firing:false,reload:false};}
function tick(s,seconds,p,paused=false){for(let f=0;f<Math.ceil(seconds*60);f++)s.step(1/60,input(p),paused);}

test('Caixas Shanghai: sete cabines, +48 cada no clarão, sem repetir e sem encher o pente',()=>{
 const s=mission();assert.equal(s.crates.length,7);s.ammo=3;
 for(let i=0;i<s.crates.length;i++){
  const c=s.crates[i],p=c.marker,before=s.reserve;
  assert.equal(s.openSupplyCrate(p),true);tick(s,.5,p);assert.equal(s.reserve,before);
  assert.equal(s.openSupplyCrate(p),false);tick(s,.5,p);assert.equal(s.reserve,before+48);assert.equal(s.ammo,3);
  tick(s,3,p);assert.equal(c.phase,'open');assert.equal(s.openSupplyCrate(p),false);assert.equal(s.reserve,before+48);
 }
 assert.equal(s.reserve,COMBAT.rifle.reserve+7*48);assert.equal(s.snapshot.reserve,s.reserve);
 const fresh=mission();assert.equal(fresh.reserve,96);assert.ok(fresh.crates.every(c=>c.phase==='closed'&&!c.rewarded));
});
test('Caixas: distância, parede, traseira, pausa, morte e coordenada inválida bloqueiam',()=>{
 const s=mission(),c=s.crates[0],p=c.marker;
 assert.equal(s.openSupplyCrate({x:0,z:9.5}),false);
 assert.equal(s.openSupplyCrate({x:NaN,z:p.z}),false);
 assert.equal(s.openSupplyCrate({x:c.x,z:c.z-.4}),false,'não atravessa a caixa');
 assert.equal(s.openSupplyCrate(p,true),false);
 s.terrain.obstacles.push({minX:c.x-2,maxX:c.x+2,minZ:c.z+1.9,maxZ:c.z+2.0});
 assert.equal(s.openSupplyCrate({x:c.x,z:c.z+2.4}),false,'não atravessa paredes');s.terrain.obstacles.pop();
 assert.equal(s.openSupplyCrate(p),true);tick(s,.3,p);const elapsed=c.elapsed;
 tick(s,3,p,true);assert.equal(c.elapsed,elapsed);assert.equal(s.reserve,96);
 tick(s,.5,p);assert.equal(s.reserve,144);
 s.hp=0;assert.equal(s.openSupplyCrate(s.crates[1].marker),false);const time=c.elapsed;
 tick(s,3,p);assert.equal(c.elapsed,time);assert.equal(s.reserve,144);
});
test('Caixas: reserva recebida durante recarga permanece consistente',()=>{
 const s=mission(),p=s.crates[0].marker;s.ammo=0;s.reserve=0;
 assert.equal(s.openSupplyCrate(p),true);tick(s,1,p);
 s.step(1/60,{...input(p),reload:true});tick(s,2,p);
 assert.equal(s.ammo,24);assert.equal(s.reserve,24);
 assert.equal(s.openSupplyCrate(s.crates[1].marker),true);s.ammo=12;
 s.step(1/60,{...input(p),reload:true});tick(s,2,p);
 assert.equal(s.ammo,24);assert.equal(s.reserve,60);
});
test('Caixas: colisão simples bloqueia tiro; acessos e patrulhas continuam conectados',()=>{
 const world=createPhase01Terrain(),nav=new Navigation(world,.36,.5),start={x:0,z:9.5};
 for(const c of SHANGHAI_SUPPLY_CRATES){
  const marker=crateMarker(c),footprint=crateObstacle(c);
  assert.ok(world.obstacles.some(o=>JSON.stringify(o)===JSON.stringify(footprint)));
  assert.equal(traversable(c,world,.32),false);assert.ok(traversable(marker,world,.36));
  const route=nav.path(start,marker);assert.ok(route.length);let previous=start;
  for(const p of route){assert.ok(clearSegment(previous,p,world,.36));previous=p;}
  const hit=traceShot(marker,{x:c.x,z:c.z},{...world,obstacles:[footprint]},[]);assert.equal(hit.blocked,true);
  assert.ok(!SHANGHAI_PHASE01.loot.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<2));
 }
 const robots=new Navigation(world,COMBAT.robot.radius,COMBAT.grid);
 for(const circuit of SHANGHAI_PHASE01.patrolRoutes)for(let i=0;i<circuit.length;i++)assert.ok(robots.path(circuit[i],circuit[(i+1)%circuit.length]).length);
 for(const spawn of SHANGHAI_PHASE01.spawns)assert.ok(traversable(spawn,world,COMBAT.robot.radius));
});
