import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadSource} from './load-source.mjs';
const {phase01SurfaceHeight:reference}=loadSource('src/game/shanghai/surfaces.ts');
const {phase01SurfaceGrid}=loadSource('src/game/shanghai/surfaceGrid.ts');
const {approachSupportHeight:approach}=loadSource('src/game/supportHeight.ts');
const {createPhase01Terrain}=loadSource('src/game/shanghai/layout.ts');
const {SHANGHAI_SUPPLY_CRATES}=loadSource('src/game/props/supplyCrate.ts');
const {PLAYER_COLLIDER_CENTER_Y:center,PLAYER_COLLIDER_HALF_HEIGHT:half,PLAYER_MOVEMENT:move}=loadSource('src/characters/player/playerConfig.ts');
const samples=[[-17.5,10,0],[-24.8,5,.12],[-44.55,-28.9,.148],[-44.144267376547816,-27.661831820686604,.25]];

test('Apoio Shanghai: grade exata nos quatro pisos e bordas; consulta compartilhada sem quantização',()=>{
 const g=phase01SurfaceGrid(),w=createPhase01Terrain();assert.equal(w.surfaceHeight,g);assert.equal(w.supportHeight,g);assert.equal(createPhase01Terrain().surfaceHeight,g);
 for(const[x,z,h]of samples){assert.equal(g(x,z),h);assert.equal(g(x,z),reference(x,z));}
 // Centros, bordas e posições não alinhadas; cobre pinturas e contornos arredondados.
 for(let x=-51;x<=51;x+=.47)for(let z=-54;z<=54;z+=.53)assert.equal(g(x,z),reference(x,z),`${x},${z}`);
 for(const p of SHANGHAI_SUPPLY_CRATES){assert.equal(g(p.x,p.z),0,'as duas caixas estão na rua');}
 assert.equal(g(Infinity,0),0);assert.equal(g(200,200),0);
});

test('Apoio: transição monotônica, independente do FPS, 95% em 0,1 s e Marte imediato',()=>{
 for(const from of [0,.12,.148,.25])for(const to of [0,.12,.148,.25]){
  let y=from;for(let f=0;f<6;f++){const next=approach(y,to,1/60,.1);assert.ok(next>=Math.min(y,to)&&next<=Math.max(y,to));assert.ok(Math.abs(next-y)<.1);y=next;}
  assert.ok(Math.abs(y-to)<=Math.abs(from-to)*.05+1e-8);
  assert.ok(Math.abs(y-approach(from,to,.1,.1))<1e-8);
  assert.equal(approach(from,to,1/60),to,'Hangar sem supportTransition conserva apoio');
 }
});

test('Jogador: Rapier apoia nos quatro pisos e cruza meio-fio nos dois sentidos sem travar ou salto',async()=>{
 const req=createRequire(import.meta.url),R=createRequire(req.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');await R.init();const source=createPhase01Terrain();
 // Piso é apoio lógico; sólidos continuam extrusões 2D, como o runtime.
 for(const reverse of [false,true]){
  const world=new R.World({x:0,y:0,z:0});
  try{
   for(const b of source.obstacles)world.createCollider(R.ColliderDesc.cuboid((b.maxX-b.minX)/2,5,(b.maxZ-b.minZ)/2).setTranslation((b.minX+b.maxX)/2,5,(b.minZ+b.maxZ)/2));
   const start=reverse?-24.8:-23,end=reverse?-23:-24.8,z=5;
   const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start,center+source.supportHeight(start,z),z));
   const collider=world.createCollider(R.ColliderDesc.capsule(half,move.colliderRadius),body),controller=world.createCharacterController(.01);world.step();
   for(let frame=0;frame<90;frame++){
    const p=body.translation(),dx=Math.sign(end-p.x)*Math.min(Math.abs(end-p.x),4.2/60),height=approach(p.y-center,source.supportHeight(p.x+dx,z),1/60,.1);
    controller.computeColliderMovement(collider,{x:dx,y:center+height-p.y,z:0});const d=controller.computedMovement(),nx=p.x+d.x;
    const y=center+approach(p.y-center,source.supportHeight(nx,z),1/60,.1);
    assert.ok(Math.abs(y-p.y)<.05);body.setNextKinematicTranslation({x:nx,y,z});world.step();
   }
   assert.ok(Math.abs(body.translation().x-end)<.001);assert.ok(Math.abs(body.translation().y-center-source.supportHeight(end,z))<1e-5);
   for(const[x,z,h]of samples){body.setTranslation({x,y:center+h,z},true);world.step();assert.ok(Math.abs(body.translation().y-center-h)<1e-6);}
  }finally{world.free();}
 }
});
