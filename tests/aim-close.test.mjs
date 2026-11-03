import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
const { projectAimPoint } = loadSource('src/characters/player/aimProjection.ts');
const { updateAimAngle, dampFacing } = loadSource('src/characters/player/aimMovement.ts');
const { PLAYER_LOCOMOTION } = loadSource('src/characters/player/playerConfig.ts');
const { ReticleAim } = loadSource('src/characters/player/reticle.ts');
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const { robotConfig, patrolChoice, COMBAT, writeRifleMuzzle } = loadSource('src/combat/config.ts');
const close = (a,b,eps=1e-8) => assert.ok(Math.abs(a-b)<eps, `${a} != ${b}`);
const bounds = { minX:-60, maxX:60, minZ:-60, maxZ:60 };
const world = { bounds, walkableAreas:[bounds], obstacles:[] };
const pose = { valid:true, side:.08, forward:.72, height:1.09 };

test('Cursor: projeção cruza o jogador nos dois sentidos sem prender ponto antigo, em ambos os tipos de câmera', () => {
  const ray = new Raycaster(), plane = new Plane(new Vector3(0,1,0)), hit = new Vector3();
  const pointer = new Vector2(), target = new Vector3(), out = {x:999,z:999};
  for (const camera of [new OrthographicCamera(-12,12,8,-8,.1,200), new PerspectiveCamera(50,1.5,.1,200)]) {
    camera.position.set(9,14,12); camera.lookAt(0,.6,0); camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
    for (const height of [1.09,1.21]) for (const direction of [-1,1]) for (const offset of [-.2,-.09,-.02,0,.02,.09,.2]) {
      target.set(offset*direction,height,offset*direction*.2).project(camera); pointer.set(target.x,target.y);
      assert.equal(projectAimPoint(ray,pointer,camera,plane,hit,height,out),true);
      close(out.x,offset*direction); close(out.z,offset*direction*.2);
    }
  }
  const camera = new OrthographicCamera(-1,1,1,-1,.1,100); camera.position.set(0,3,0); camera.lookAt(0,3,-1); camera.updateMatrixWorld(true);
  assert.equal(projectAimPoint(ray,new Vector2(0,0),camera,plane,hit,1.09,out),false,'raio paralelo invalida a mira');
});

test('Cursor: giro de 360° num raio de 10 cm; cruzar o centro não causa voltas longas', () => {
  const min = PLAYER_LOCOMOTION.aimMinDistance;
  let facing = 0, desired = 0;
  for (let i=0;i<=360;i++) {
    const angle = i*Math.PI/180;
    desired = updateAimAngle(desired,0,0,.1*Math.sin(angle),.1*Math.cos(angle),true,min);
    close(Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle)),0);
    facing = dampFacing(facing,desired,10,1/60);
    assert.ok(Number.isFinite(facing));
  }
  const previous = desired;
  close(updateAimAngle(previous,0,0,0,0,true,min),previous);
  close(updateAimAngle(previous,0,0,.01,0,true,min),previous);
  close(updateAimAngle(previous,0,0,.2,0,false,min),previous);
});

test('Cursor: alvos dos quatro tipos em contato são capturados e atingidos após girar pela mira próxima', () => {
  for (const kind of ['patrol','largePatrol','smallMutant','largeMutant']) for (const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]) {
    const sim = new CombatSimulation(world,patrolChoice(kind,1)), r = sim.robots[0], config = robotConfig(r);
    const player = {x:0,z:0}, preview = new ReticleAim();
    Object.assign(r,{x:Math.sin(angle)*config.contactRange,z:Math.cos(angle)*config.contactRange,pace:0});
    // Primeiro cruza a silhueta com o cursor; depois aponta ao inimigo em contato.
    const facing = updateAimAngle(0,0,0,.1*Math.sin(angle),.1*Math.cos(angle),true,PLAYER_LOCOMOTION.aimMinDistance);
    const aim = {x:r.x,z:r.z}, hp = r.hp;
    assert.equal(preview.target(player,aim,facing,pose,1.09,world,sim.robots),r,kind);
    assert.deepEqual(preview.marker,aim);
    sim.step(1/60,{player,muzzle:pose,aim,facingAngle:facing,firing:true,reload:false});
    assert.equal(r.hp,hp-COMBAT.rifle.damage,kind);
  }
});

test('Cursor: sobre/atrás do corpo continua livre mesmo com parede entre centro e cano; dano não atravessa', () => {
  const terrain = {...world,obstacles:[{minX:-1,maxX:1,minZ:.3,maxZ:.4,minY:0,maxY:2}]};
  const sim = new CombatSimulation(terrain,1), player={x:0,z:0}, preview = new ReticleAim();
  const r = sim.robots[0]; Object.assign(r,{x:0,z:3,pace:0});
  for (const point of [{x:0,z:0},{x:0,z:-.02},{x:.01,z:.01}]) {
    assert.equal(preview.target(player,point,0,pose,1.09,terrain,sim.robots),null);
    assert.deepEqual(preview.marker,point);
  }
  const hp = r.hp;
  sim.step(1/60,{player,muzzle:pose,aim:{x:0,z:0},facingAngle:0,firing:true,reload:false});
  assert.equal(r.hp,hp); assert.ok(sim.shots[0].to.z<=.4);
  const muzzle={x:0,z:0}; writeRifleMuzzle(muzzle,0,0,0,pose);close(muzzle.z,.72);
});
