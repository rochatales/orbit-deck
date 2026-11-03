import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Quaternion, Vector3 } from 'three';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const {COLONY_BUILDINGS:buildings,REPLACED_BUILDING_ROOMS:replaced,REMOVED_BUILDING_COLLIDERS:removed}=loadSource('src/game/colonyBuildingsLayout.ts');
const {createWorld}=loadSource('src/game/marsWorld.ts');
const {ColonyBuildingRuntime}=loadSource('src/scene/marsColony/colonyBuildingRuntime.ts');
const {removeRoomsForBuildings}=loadSource('src/scene/marsColony/colonyBuildingsColony.ts');
const {validateMasterplan}=loadSource('src/scene/marsColony/masterplanRuntime.ts');
const {INITIAL_POSITION}=loadSource('src/game/config.ts');
const {MarsInteriorProbe}=loadSource('src/audio/marsInterior.ts');
const base='art-source/predios-colonia-v001/';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources=JSON.parse(fs.readFileSync(base+'notas/fontes.json'));

// Distância exata círculo–caixa orientada, como os cuboides físicos (não AABB de quina).
function intersects(c,x,z,r=.32){
 const p=new Vector3(x-c.position.x,0,z-c.position.z).applyQuaternion(new Quaternion(c.rotation.x,c.rotation.y,c.rotation.z,c.rotation.w).invert());
 return Math.hypot(Math.max(0,Math.abs(p.x)-c.halfExtents[0]),Math.max(0,Math.abs(p.z)-c.halfExtents[2]))<r-1e-5;
}
function free(world,x,z){
 if(!world.walkableAreas.some(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ))return false;
 if(world.simpleCuboids.some(c=>intersects(c,x,z)))return false;
 return !world.obstacles.some(c=>c.physics!==false&&Math.hypot(Math.max(c.minX-x,0,x-c.maxX),Math.max(c.minZ-z,0,z-c.maxZ))<.32);
}
function reachable(world,from,to){
 const step=.2,key=(x,z)=>`${x},${z}`,sx=Math.round(from[0]/step),sz=Math.round(from[1]/step),queue=[[sx,sz]],seen=new Set([key(sx,sz)]);
 for(let at=0;at<queue.length;at++){
  const [x,z]=queue[at];if(Math.hypot(x*step-to[0],z*step-to[1])<.24)return true;
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,nz=z+dz,k=key(nx,nz);
   if(seen.has(k)||nx*step < -21||nx*step>21||nz*step < -18||nz*step>30||!free(world,nx*step,nz*step))continue;
   seen.add(k);queue.push([nx,nz]);
  }
 }
 return false;
}

test('S6.12: fontes GLB/Blend preservadas por hash, cópias runtime idênticas e portas previstas',async()=>{
 for(const f of sources){assert.equal(sha(fs.readFileSync(base+'originais/'+f.arquivo)),f.sha256);if(f.arquivo.endsWith('.glb'))assert.equal(sha(fs.readFileSync('src/assets/buildings/'+f.arquivo)),f.sha256)}
 assert.equal(replaced.size,4);assert.ok(replaced.has('output-review'));assert.ok(replaced.has('coffee-nook'));
 for(const b of buildings){
  const gltf=await loadGlb('src/assets/buildings/'+b.id+'.glb');
  assert.ok(gltf.scene.getObjectByName('Building_Roof'));assert.ok(gltf.scene.getObjectByName('Building_Floor'));
  assert.equal(b.doors.length,b.id==='meeting-room'?2:1);
  assert.ok(b.staticCuboids.length>10);assert.equal(b.dynamicCuboids.length,b.doors.length*2);
  for(const d of b.doors)assert.ok(gltf.animations.find(a=>a.name===d.clip));
 }
 const meeting=buildings[0],dc=buildings[1];
 assert.ok(meeting.doors.some(d=>d.z>3.8&&Math.abs(d.x)<.01));assert.ok(meeting.doors.some(d=>d.x < -3.8&&Math.abs(d.z)<.01));
 assert.ok(dc.doors[0].x > dc.placement.x);assert.equal(dc.placement.z,0);
});

test('S6.12: substituição remove todos os nós/portas dos quatro ambientes sem afetar vizinhos',async()=>{
 const gltf=await loadGlb('src/assets/colony-v007.glb'),manifest=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json')),owned=[];
 const filtered=removeRoomsForBuildings(gltf.scene,manifest,owned);
 validateMasterplan(gltf.scene,filtered);
 assert.ok(removed.size>=40);
 assert.ok(!filtered.parts.some(p=>replaced.has(p.ambiente)));assert.ok(!filtered.doors.some(d=>replaced.has(d.owner)));
 gltf.scene.traverse(n=>assert.ok(!replaced.has(n.userData.ambiente)));
 for(const id of ['brand-brain','smart-lab','design','meeting-suite'])assert.equal(filtered.parts.filter(p=>p.ambiente===id).length,manifest.parts.filter(p=>p.ambiente===id).length);
 for(const g of owned)g.dispose();
});

test('S6.12: portas giram e seus cuboides acompanham, teto entra/sai, pausa congela e cache fica intacto',async()=>{
 for(const b of buildings){
  const gltf=await loadGlb('src/assets/buildings/'+b.id+'.glb'),scene=gltf.scene.clone(true),world=createWorld();
  const rt=new ColonyBuildingRuntime(scene,gltf.animations,b,world.movingCuboids);
  for(const d of b.doors){
   const c=world.movingCuboids.find(c=>c.id===b.dynamicCuboids.find(c => c.node.startsWith(`COL_Door${d.side[0]}`)).id),before=JSON.stringify(c.rotation);
   for(let i=0;i<90;i++)rt.update(d,1/60);
   assert.notEqual(JSON.stringify(c.rotation),before);
  }
  const inside={x:(b.floor.minX+b.floor.maxX)/2,z:(b.floor.minZ+b.floor.maxZ)/2};
  for(let i=0;i<90;i++)rt.update(inside,1/60);
  assert.ok(rt.status.roofOpacity<.01);assert.equal(scene.getObjectByName('Building_Roof').visible,false);
  const amount=rt.status.roofOpacity;rt.update({x:20,z:30},0);assert.equal(rt.status.roofOpacity,amount);
  for(let i=0;i<90;i++)rt.update({x:20,z:30},1/60);assert.ok(rt.status.roofOpacity>.99);
  assert.equal(gltf.scene.position.length(),0);assert.equal(gltf.scene.getObjectByName('Building_Pad').position.y,0);
  rt.dispose();rt.dispose();
 }
});

test('S6.12: rotas com cápsula 0,32 m, entrada inicial livre e apoio plano dos três prédios',()=>{
 const world=createWorld();assert.ok(free(world,INITIAL_POSITION.x,INITIAL_POSITION.z),'spawn');
 const start=[0,6];
 for(const target of [[-2.8,0],[-9.5,0],[11.5,14],[0,10],[0,23],[0,29.5],[12,5.3],[0,-6],[-7,6]])assert.ok(reachable(world,start,target),`rota ${target}`);
 for(const b of buildings){assert.equal(world.supportHeight(b.placement.x,b.placement.z),0);for(const d of b.doors)assert.ok(reachable(world,start,[d.x,d.z]),`porta ${b.id}/${d.side}`)}
 assert.ok(world.simpleCuboids.some(c=>c.id===JSON.parse(fs.readFileSync('src/assets/quartel/barracks-v006.manifest.json')).staticCuboids[0].id));
 const probe=new MarsInteriorProbe();for(const b of buildings)assert.equal(probe.update(b.placement.x,b.placement.z),true);
 assert.equal(probe.update(0,6),false);
});

test('S6.12: cápsula Rapier atravessa as quatro portas novas em ambos os sentidos, com folhas e colisores animados',async()=>{
 const {createRequire}=await import('node:module'),require=createRequire(import.meta.url),R=createRequire(require.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');await R.init();
 const {PLAYER_COLLIDER_CENTER_Y:Y,PLAYER_COLLIDER_HALF_HEIGHT:half,PLAYER_MOVEMENT:M,PLAYER_PHYSICS:P}=loadSource('src/characters/player/playerConfig.ts');
 for(const spec of buildings){
  const gltf=await loadGlb('src/assets/buildings/'+spec.id+'.glb');
  for(const door of spec.doors)for(const reverse of [false,true]){
   const source=createWorld(),physics=new R.World({x:0,y:0,z:0}),runtime=new ColonyBuildingRuntime(gltf.scene.clone(true),gltf.animations,spec,source.movingCuboids),moving=[];
   try{
    // No retorno, a porta já foi aberta pela entrada; evita nascer dentro do arco de uma folha fechada.
    if(reverse)for(let i=0;i<90;i++)runtime.update(door,1/60);
    for(const c of source.simpleCuboids)physics.createCollider(R.ColliderDesc.cuboid(...c.halfExtents).setTranslation(c.position.x,c.position.y,c.position.z).setRotation(c.rotation));
    for(const c of source.obstacles.filter(c=>c.physics!==false))physics.createCollider(R.ColliderDesc.cuboid((c.maxX-c.minX)/2,1.5,(c.maxZ-c.minZ)/2).setTranslation((c.maxX+c.minX)/2,1.5,(c.maxZ+c.minZ)/2));
    for(const c of source.movingCuboids){const body=physics.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(c.position.x,c.position.y,c.position.z).setRotation(c.rotation));physics.createCollider(R.ColliderDesc.cuboid(...c.halfExtents),body);moving.push([body,c]);}
    const vx=door.x-spec.placement.x,vz=door.z-spec.placement.z,length=Math.hypot(vx,vz),dx=vx/length,dz=vz/length,sign=reverse?-1:1;
    const start={x:door.x+dx*(reverse?.8:1.4)*sign,z:door.z+dz*(reverse?.8:1.4)*sign},target={x:door.x-dx*(reverse?1.4:.8)*sign,z:door.z-dz*(reverse?1.4:.8)*sign};
    const body=physics.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x,Y,start.z)),capsule=physics.createCollider(R.ColliderDesc.capsule(half,M.colliderRadius),body),controller=physics.createCharacterController(P.controllerOffset);
    physics.step();
    for(let f=0;f<300;f++){
     const p=body.translation(),distance=Math.hypot(p.x-target.x,p.z-target.z);if(distance<.025)break;
     runtime.update(p,1/60);for(const [body,c]of moving){body.setNextKinematicTranslation(c.position);body.setNextKinematicRotation(c.rotation);}
     const step=Math.min(distance,M.runSpeed/60);controller.computeColliderMovement(capsule,{x:(target.x-p.x)/distance*step,y:0,z:(target.z-p.z)/distance*step});
     const delta=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+delta.x,y:Y,z:p.z+delta.z});physics.step();
    }
    const end=body.translation();assert.ok(Math.hypot(end.x-target.x,end.z-target.z)<.03,JSON.stringify({id:spec.id,door:door.side,reverse,target,end}));
   }finally{runtime.dispose();physics.free();}
  }
 }
});
