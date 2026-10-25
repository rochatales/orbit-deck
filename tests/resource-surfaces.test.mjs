import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationClip,Group}from'three';
import {loadSource}from'./load-source.mjs';
const{phase01SurfaceHeight:height}=loadSource('src/game/shanghai/surfaces.ts');
const{placeResourceDrop}=loadSource('src/combat/resourcePlacement.ts');
const{RESOURCE_VISUAL:V}=loadSource('src/combat/resourceVisual.ts');
const{ResourceRig}=loadSource('src/combat/resourceRig.ts');
const{CombatSimulation}=loadSource('src/combat/simulation.ts');
const{createPhase01Terrain}=loadSource('src/game/shanghai/layout.ts');

test('Drops: rua/calçada/canteiro/grama/pintura pelos dados; anel 6 mm acima, inclusive cantos arredondados',()=>{
 const rig=new ResourceRig(new Group(),['SpawnDrop','Idle','CollectPickup'].map(n=>new AnimationClip(n,1,[])));
 for(const[x,z,expected]of[[-17.5,10,0],[-24.8,5,.12],[-44.55,-28.9,.148],[-44.144267376547816,-27.661831820686604,.25],[-17.5,-50,.016],[-19.5,-4.5,.022],[-45.9,-48.9,0]]){
  const d={};placeResourceDrop(d,x,z,'titanium',height);assert.equal(d.surfaceTitanium,expected);
  assert.ok(d.surfaceTitanium+V.ringY>expected);assert.ok(Math.abs(d.surfaceTitanium+V.ringY-expected-.006)<1e-12);
  rig.update(true,.1,true,d.surfaceTitanium);assert.ok(Math.abs((rig.root.position.y-d.surfaceTitanium)-.35)<=.06+1e-8);
 }
 assert.equal(createPhase01Terrain().surfaceHeight,height);rig.dispose();
});

test('Drops: dois metais amostram pisos diferentes na borda; altura fica cacheada após nascer',()=>{
 let queries=0;const surface=(x,z)=>{queries++;return height(x,z)},d={};
 placeResourceDrop(d,-24,5,'metals',surface);assert.equal(queries,2);assert.equal(d.surfaceIron,.12);assert.equal(d.surfaceCopper,0);
 const clips=['SpawnDrop','Idle','CollectPickup'].map(n=>new AnimationClip(n,1,[])),rig=new ResourceRig(new Group(),clips);
 for(let i=0;i<240;i++)rig.update(true,1/60,true,d.surfaceIron);
 rig.update(false,1/60,true,d.surfaceIron);assert.equal(queries,2,'render/coleta não consultam layout');
 const fresh={};placeResourceDrop(fresh,-24.8,5,'titanium',surface);assert.equal(queries,3);assert.equal(fresh.surfaceTitanium,.12);
 placeResourceDrop(fresh,0,0,'titanium');assert.equal(fresh.surfaceTitanium,0,'fallback legado sem função de superfície');rig.dispose();
});

test('Simulação: morte amostra apoio uma vez; passos seguintes e coleta mantêm alturas',()=>{
 const bounds={minX:-20,maxX:20,minZ:-20,maxZ:20};let queries=0;
 const world={bounds,walkableAreas:[bounds],obstacles:[],surfaceHeight:x=>{queries++;return x<0?.12:0}};
 const sim=new CombatSimulation(world,1),r=sim.robots[0];Object.assign(r,{x:0,z:0,hp:25});
 const input={player:{x:0,z:8},aim:{x:0,z:0},facingAngle:Math.PI,firing:true,reload:false};
 sim.step(1/60,input);assert.equal(sim.kills,1);assert.equal(queries,2);assert.equal(sim.drops[0].surfaceIron,.12);assert.equal(sim.drops[0].surfaceCopper,0);
 for(let i=0;i<120;i++)sim.step(1/60,{...input,firing:false});assert.equal(queries,2);
 sim.step(1/60,{...input,player:{x:0,z:0},firing:false});assert.equal(sim.iron,1);assert.equal(queries,2);
});
