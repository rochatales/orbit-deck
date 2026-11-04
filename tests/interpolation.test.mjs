import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSourceLoader,loadSource} from './load-source.mjs';
const {isInterpolationEnabled,PHYSICS_STEP}=loadSource('src/physics/interpolation.ts');
const transient=loadSource('src/state/playerTransient.ts');
const {COMBAT,RIFLE_POSE}=loadSource('src/combat/config.ts');
const {CombatSimulation}=loadSource('src/combat/simulation.ts');

test('Interpolação é o padrão; só ?interp=0 desliga para comparar; passo permanece 1/60',()=>{
 for(const value of ['', '?interp', '?interp=1','?interp=true','?perf&interp=1'])assert.equal(isInterpolationEnabled(value),true);
 assert.equal(isInterpolationEnabled('?interp=0'),false);assert.equal(isInterpolationEnabled('?perf&interp=0'),false);assert.equal(PHYSICS_STEP,1/60);assert.equal(COMBAT.fixedStep,PHYSICS_STEP);
 for(const enabled of [false,true]){
  globalThis.window={location:{search:enabled?'':'?interp=0'}};
  try{const c=createSourceLoader()('src/physics/interpolation.ts');assert.equal(c.INTERPOLATE,enabled);assert.deepEqual([c.PHYSICS_PRIORITY,c.PLAYER_POSE_PRIORITY,c.CAMERA_PRIORITY],enabled?[-100,-90,-80]:[0,0,0]);}
  finally{delete globalThis.window;}
 }
 const physics=fs.readFileSync('src/physics/PhysicsWorld.tsx','utf8');assert.match(physics,/timeStep=\{PHYSICS_STEP\}/);assert.doesNotMatch(physics,/"vary"/);
});

test('S2.11: reposição reseta físico e visual no mesmo instante, sem substituir referências',()=>{
 const p=transient.playerPosition,v=transient.playerVisualPosition;
 for(const target of [{x:0,y:0,z:29.5},{x:0,y:0,z:9.5},{x:0,y:.16,z:14.5}]){
  transient.writePlayerVisualPosition(-90,2,80);transient.placePlayer(target);
  assert.deepEqual({...p},target);assert.deepEqual({...v},target);assert.equal(transient.playerPosition,p);assert.equal(transient.playerVisualPosition,v);
 }
 transient.writePlayerVisualPosition(100,0,100);transient.publishPlayerFrame(1,0,2,'shanghai',0);
 assert.deepEqual({...v},{x:100,y:0,z:100},'publicação física não contamina visual');
});

test('S2.11: tiro real e checagem centro→cano continuam físicos com visual deslocado',()=>{
 const bounds={minX:-20,maxX:20,minZ:-20,maxZ:20};
 for(const blocked of [false,true]){
  const terrain={bounds,walkableAreas:[bounds],obstacles:blocked?[{minX:.1,maxX:.3,minZ:.4,maxZ:.6,minY:0,maxY:RIFLE_POSE.height}]:[]};
  const s=new CombatSimulation(terrain,1),r=s.robots[0];Object.assign(r,{x:.34,z:5,hp:75});
  transient.placePlayer({x:0,y:0,z:0});transient.writePlayerVisualPosition(10,.25,10);
  s.step(1/60,{player:transient.playerPosition,aim:{x:.34,z:10},facingAngle:0,firing:true,reload:false});
  assert.equal(r.hp,blocked?75:50);assert.deepEqual(s.shots[0].from,blocked?{x:0,z:0}:{x:.34,z:.95});
 }
});

test('S2.11: câmera visual após Rapier; combate continua referenciando posição física',()=>{
 const camera=fs.readFileSync('src/scene/CameraRig.tsx','utf8'),controller=fs.readFileSync('src/characters/player/PlayerController.tsx','utf8'),combat=fs.readFileSync('src/combat/CombatScene.tsx','utf8');
 assert.match(camera,/INTERPOLATE \? playerVisualPosition : playerPosition/);assert.match(camera,/\}, CAMERA_PRIORITY\)/);
 assert.match(controller,/rigidBodyStates.get\(body.handle\)\?\.object/);assert.match(controller,/visual.getWorldPosition\(movementRef.current\)/);assert.match(controller,/\}, PLAYER_POSE_PRIORITY\)/);
 assert.match(controller,/revision.current !== useExpeditionStore.getState\(\).session.revision/);
 assert.match(combat,/player: playerPosition/);assert.doesNotMatch(combat,/playerVisualPosition/);
});
