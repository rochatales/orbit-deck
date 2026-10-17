import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
const {CombatSimulation,traceShot,canSeePlayer}=loadSource('src/combat/simulation.ts');
const {Navigation,clearSegment,traversable}=loadSource('src/combat/navigation.ts');
const {COMBAT,HIT_LAYER,RIFLE_MASK}=loadSource('src/combat/config.ts');
const {createWorld}=loadSource('src/game/shanghaiWorld.ts');
const bounds={minX:-20,maxX:20,minZ:-20,maxZ:20};
const terrain={bounds,walkableAreas:[bounds],obstacles:[]};
const input={player:{x:0,z:9.5},aim:{x:0,z:-3},firing:false,reload:false};
function ticks(sim,seconds,custom=input){for(let i=0;i<Math.ceil(seconds*60);i++)sim.step(1/60,custom);}

test('hitscan selects nearest living robot and walls stop bullets; player excluded',()=>{
 const sim=new CombatSimulation(terrain,3);sim.robots[0].x=0;sim.robots[0].z=0;sim.robots[1].x=0;sim.robots[1].z=-2;
 assert.equal(RIFLE_MASK&HIT_LAYER.player,0);
 assert.equal(traceShot(input.player,{x:0,z:-10},terrain,sim.robots).robot.id,0);
 const wall={...terrain,obstacles:[{minX:-2,maxX:2,minZ:3,maxZ:4}]};
 const hit=traceShot(input.player,{x:0,z:-10},wall,sim.robots);assert.equal(hit.robot,null);assert.equal(hit.to.z,4);
 sim.robots[0].hp=0;assert.equal(traceShot(input.player,{x:0,z:-10},terrain,sim.robots).robot.id,1);
});
test('manual rifle cadence, kill, finite ammo and partial reload',()=>{
 const sim=new CombatSimulation(terrain,1);
 ticks(sim,1);Object.assign(sim.robots[0],{x:0,z:-3});assert.equal(sim.ammo,24,'must never auto-fire');
 ticks(sim,.4,{...input,firing:true});assert.equal(sim.ammo,21);assert.equal(sim.kills,1);assert.equal(sim.cleared,true);
 sim.ammo=2;sim.reserve=5;sim.step(1/60,{...input,reload:true});
 ticks(sim,1,{...input,firing:true});assert.equal(sim.ammo,2,'cannot shoot during reload');
 ticks(sim,.6);assert.equal(sim.ammo,7);assert.equal(sim.reserve,0);
 ticks(sim,3,{...input,firing:true});assert.equal(sim.ammo,0);assert.equal(sim.hp,100);
});
test('pause freezes reload, enemy positions, contact immunity, shots and simulation time',()=>{
 const sim=new CombatSimulation(terrain,3);sim.step(1/60,{...input,firing:true});sim.step(1/60,{...input,reload:true});
 const before=JSON.stringify(sim);
 for(let i=0;i<300;i++)sim.step(1/60,{...input,firing:true,reload:true},true);
 assert.equal(JSON.stringify(sim),before);
 ticks(sim,1.6);assert.equal(sim.ammo,24);assert.equal(sim.reserve,95);
});
test('five simultaneous contacts use a global damage interval; death is terminal',()=>{
 const sim=new CombatSimulation(terrain,5);sim.robots.forEach(r=>Object.assign(r,{x:input.player.x,z:input.player.z}));
 sim.step(1/60,input);assert.equal(sim.hp,85);
 ticks(sim,.7);assert.equal(sim.hp,85);
 ticks(sim,6);assert.equal(sim.hp,0);assert.equal(sim.dead,true);
 const before=JSON.stringify(sim);ticks(sim,3,{...input,firing:true,reload:true});assert.equal(JSON.stringify(sim),before);
 const fresh=new CombatSimulation(terrain,5);assert.equal(fresh.hp,100);assert.equal(fresh.ammo,24);assert.equal(fresh.kills,0);assert.equal(fresh.shots.length,0);assert.equal(fresh.elapsed,0);
});
test('navigation goes around real Shanghai buildings without crossing their footprint',()=>{
 const world=createWorld(),nav=new Navigation(world,COMBAT.robot.radius,COMBAT.grid);
 const start={x:-14,z:1},goal={x:-5,z:1},path=nav.path(start,goal);
 assert.ok(path.length>2,'must route around building');
 let previous=start;
 for(const p of path){assert.ok(clearSegment(previous,p,world,COMBAT.robot.radius));previous=p;}
 const sim=new CombatSimulation(world,1);Object.assign(sim.robots[0],start,{alerted:true});
 for(let i=0;i<1800;i++){sim.step(1/60,{...input,player:goal});assert.ok(traversable(sim.robots[0],world,COMBAT.robot.radius));}
 assert.ok(Math.hypot(sim.robots[0].x-goal.x,sim.robots[0].z-goal.z)<=COMBAT.robot.contactRange);
 assert.ok(sim.hp<100,'must eventually reach and attack');
});
test('contact cannot damage through a thin wall',()=>{
 const wall={...terrain,obstacles:[{minX:-2,maxX:2,minZ:0,maxZ:.1}]};
 const sim=new CombatSimulation(wall,1);Object.assign(sim.robots[0],{x:0,z:-.45});
 sim.step(1/60,{...input,player:{x:0,z:.4}});assert.equal(sim.hp,100);
});
test('1, 3 and 5 robot encounters can be cleared with the finite starting loadout',()=>{
 for(const count of [1,3,5]){
  const sim=new CombatSimulation(createWorld(),count);
  for(let frame=0;frame<60*40&&!sim.cleared&&!sim.dead;frame++){
   const target=sim.robots.filter(r=>r.hp>0).sort((a,b)=>Math.hypot(a.x-input.player.x,a.z-input.player.z)-Math.hypot(b.x-input.player.x,b.z-input.player.z))[0];
   sim.step(1/60,{...input,aim:target,firing:traceShot(input.player,target,sim.terrain,sim.robots).robot!==null,reload:sim.ammo===0});
  }
  assert.ok(sim.cleared,`encounter ${count}: must be beatable`);assert.equal(sim.kills,count);assert.ok(sim.hp>0);assert.ok(sim.ammo+sim.reserve>=120-count*5,'loadout allows misses');
 }
});
test('robots still pursue a player hugging a wall with smaller player clearance',()=>{
 const world=createWorld(),sim=new CombatSimulation(world,1),player={x:-7.15,z:1};
 // Player radius .32 fits here, robot radius .42 does not; route to adjacent free cell.
 assert.ok(traversable(player,world,.32));assert.equal(traversable(player,world,COMBAT.robot.radius),false);
 Object.assign(sim.robots[0],{x:-5,z:-5,alerted:true});
 ticks(sim,15,{...input,player});assert.ok(sim.hp<100,'wall hugging must not disable pursuit');
});


test('visão exige cone frontal, alcance e ausência de parede',()=>{
 const sim=new CombatSimulation(terrain,1),r=sim.robots[0];Object.assign(r,{x:0,z:0,angle:0});
 assert.equal(canSeePlayer(r,{x:0,z:5},terrain),true);
 assert.equal(canSeePlayer(r,{x:0,z:-5},terrain),false);
 assert.equal(canSeePlayer(r,{x:5,z:0},terrain),false);
 assert.equal(canSeePlayer(r,{x:0,z:11},terrain),false);
 const wall={...terrain,obstacles:[{minX:-2,maxX:2,minZ:2,maxZ:3}]};
 assert.equal(canSeePlayer(r,{x:0,z:5},wall),false);
 sim.step(1/60,{...input,player:{x:0,z:5}});assert.equal(r.alerted,true);
 sim.step(1/60,{...input,player:{x:0,z:-5}});assert.equal(r.alerted,true,'perseguição permanece após aquisição');
});
test('horda começa completa, patrulha de forma determinística e respeita prédios',()=>{
 const world=createWorld(),sim=new CombatSimulation(world,COMBAT.encounterSize),again=new CombatSimulation(world,COMBAT.encounterSize);
 assert.equal(sim.robots.length,32);assert.deepEqual(sim.robots,again.robots);
 const starts=sim.robots.map(r=>({x:r.x,z:r.z}));
 for(const r of sim.robots){assert.equal(r.alerted,false);assert.ok(traversable(r,world,COMBAT.robot.radius));}
 for(let frame=0;frame<60*45;frame++){
  sim.step(1/60,{...input,player:{x:0,z:17}});
  for(const r of sim.robots){assert.equal(r.alerted,false);assert.ok(traversable(r,world,COMBAT.robot.radius));}
 }
 for(const r of sim.robots)assert.ok(Math.hypot(r.x-starts[r.id].x,r.z-starts[r.id].z)>1,'cada robô percorre seu circuito');
 assert.ok(COMBAT.rifle.magazine+COMBAT.rifle.reserve>=32*Math.ceil(COMBAT.robot.hp/COMBAT.rifle.damage)*1.25);
 const fresh=new CombatSimulation(world,32);assert.deepEqual(fresh.robots,again.robots);
});
