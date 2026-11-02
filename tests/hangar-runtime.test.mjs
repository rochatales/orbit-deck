const {retainControlRoomCollider}=loadSource('src/game/controlRoomLayout.ts');
const {LABORATORIO,retainLaboratorioCollider,retainLaboratorioFloor}=loadSource('src/game/laboratorioLayout.ts');
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { Box3, Mesh, Vector3 } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const {HANGAR,hangarSupportHeight,retainColonyCollider,retainColonyFloor}=loadSource('src/game/hangarLayout.ts');
const {retainQuartelCollider,retainQuartelFloor}=loadSource('src/game/quartelLayout.ts');
const {createWorld}=loadSource('src/game/marsWorld.ts');
const {HangarRuntime,hangarClip}=loadSource('src/scene/marsColony/hangarRuntime.ts');
const {removeDockForHangar}=loadSource('src/scene/marsColony/hangarColony.ts');
const {validateMasterplan,MasterplanRuntime}=loadSource('src/scene/marsColony/masterplanRuntime.ts');
const {clearSegment,traversable}=loadSource('src/combat/navigation.ts');
const {PLAYER_COLLIDER_CENTER_Y:y,PLAYER_COLLIDER_HALF_HEIGHT:half,PLAYER_MOVEMENT:move,PLAYER_PHYSICS:physics}=loadSource('src/characters/player/playerConfig.ts');
const colony=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json')),greenhouse=JSON.parse(fs.readFileSync('src/assets/greenhouse/greenhouse-v001.manifest.json'));
const glb=await loadGlb('src/assets/hangar/hangar-v002.glb');
const step=(r,x,z,n=180)=>{for(let i=0;i<n;i++)r.update({x,z},1/60);};

test('Hangar runtime: cópia exata v002; três rotas, equipamentos e reserva do deck',()=>{
 const file=fs.readFileSync('src/assets/hangar/hangar-v002.glb');assert.equal(createHash('sha256').update(file).digest('hex'),HANGAR.sha256);assert.deepEqual(file,fs.readFileSync('art-source/hangar/export/hangar_mars_v002.glb'));
 const w=createWorld(),paths=[[[0,3],[0,12],[0,17],[0,21],[0,29.5]],[[5.9,15],[4.5,15],[3.1,15.5],[3.1,16.5],[0,16.5]]];
 for(const path of paths)for(let i=1;i<path.length;i++)assert.ok(clearSegment({x:path[i-1][0],z:path[i-1][1]},{x:path[i][0],z:path[i][1]},w,.36),JSON.stringify(path[i]));
 for(const p of [{x:1.8,z:13.5},{x:-1.2,z:15.5},{x:1.3,z:15.5},{x:3.9,z:12.5}])assert.equal(traversable(p,w,.32),false,'carga/casco não atravessáveis');
 for(const b of HANGAR.colliders){assert.ok(b.maxZ<25);assert.ok(!(b.minX<-2.5299&&b.maxX>-3.4701&&b.minZ<26.2616&&b.maxZ>25.5384));}
 const retained=[...colony.colliders.filter(retainColonyCollider).filter(retainQuartelCollider).filter(retainLaboratorioCollider).filter(retainControlRoomCollider),...greenhouse.colliders].map(({minX,maxX,minZ,maxZ})=>({minX,maxX,minZ,maxZ}));assert.deepEqual(w.obstacles.slice(0,retained.length),retained);assert.equal(HANGAR.removedColliders.length,15);
 for(const area of colony.walkableAreas.filter(retainColonyFloor).filter(retainQuartelFloor).filter(retainLaboratorioFloor))assert.ok(w.walkableAreas.some(a=>['minX','maxX','minZ','maxZ'].every(k=>a[k]===area[k])),area.id);
 assert.equal(hangarSupportHeight(0,14),.16);assert.ok(Math.abs(hangarSupportHeight(0,18.9725)-.09)<1e-9);assert.ok(Math.abs(hangarSupportHeight(0,20.15)-.02)<1e-9);assert.equal(hangarSupportHeight(5.3,15),0);assert.equal(hangarSupportHeight(0,25),0);assert.equal(hangarSupportHeight(0,-10),0);
});

test('Hangar runtime: Rapier caminha praça → interior/rampa/deck/embarque e Refeitório em ambos sentidos',async()=>{
 const require=createRequire(import.meta.url),R=createRequire(require.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');await R.init();
 const source=createWorld();
 const paths=[[[0,3],[0,12],[0,17],[0,21],[0,29.5]],[[5.9,15],[4.5,15],[3.1,15.5],[3.1,16.5],[0,16.5]]];
 for(const original of paths)for(const reverse of [false,true]){
  const path=reverse?[...original].reverse():original,world=new R.World({x:0,y:0,z:0}),visited=[];
  try{
   for(const r of source.obstacles)world.createCollider(R.ColliderDesc.cuboid((r.maxX-r.minX)/2,physics.obstacleHeight/2,(r.maxZ-r.minZ)/2).setTranslation((r.minX+r.maxX)/2,physics.obstacleHeight/2,(r.minZ+r.maxZ)/2));
   const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(path[0][0],y+source.supportHeight(...path[0]),path[0][1]));
   const collider=world.createCollider(R.ColliderDesc.capsule(half,move.colliderRadius),body),controller=world.createCharacterController(physics.controllerOffset);
   controller.enableAutostep(physics.autostepMaxHeight,physics.autostepMinWidth,false);controller.enableSnapToGround(physics.snapToGroundDistance);world.step();
   for(const [x,z]of path.slice(1)){
    for(let frame=0;frame<1800;frame++){
     const p=body.translation(),distance=Math.hypot(x-p.x,z-p.z);if(distance<.025)break;
     const d=Math.min(distance,move.runSpeed/60),dx=(x-p.x)/distance*d,dz=(z-p.z)/distance*d;
     controller.computeColliderMovement(collider,{x:dx,y:y+source.supportHeight(p.x+dx,p.z+dz)-p.y,z:dz});
     const delta=controller.computedMovement(),nx=p.x+delta.x,nz=p.z+delta.z,ground=source.supportHeight(nx,nz);
     body.setNextKinematicTranslation({x:nx,y:y+ground,z:nz});world.step();visited.push(ground);
    }
    const end=body.translation();assert.ok(Math.hypot(end.x-x,end.z-z)<.03,JSON.stringify({reverse,x,z,end}));assert.ok(Math.abs(end.y-y-source.supportHeight(end.x,end.z))<1e-6);
   }
   assert.ok(visited.some(h=>h>.159));assert.ok(visited.some(h=>h<.01));
  }finally{world.free();}
 }
});

test('Hangar runtime: corte do teto, portas por proximidade, rampa e canais complementares sem tocar o cache',()=>{
 const scene=clone(glb.scene),runtime=new HangarRuntime(scene,glb.animations),roof=scene.getObjectByName('TETO_Hangar'),body=scene.getObjectByName('HangarMesh');
 const original=glb.scene.getObjectByName('TETO_Hangar').material,opacity=original.opacity;
 const tracks=new Set();for(const clip of glb.animations)for(const t of hangarClip(clip).tracks){assert.ok(!tracks.has(t.name),t.name);tracks.add(t.name);}
 const initialBridge=scene.getObjectByName('Crane_Trolley_L').position.x;step(runtime,0,15.8,19);assert.notEqual(scene.getObjectByName('Crane_Trolley_L').position.x,initialBridge);assert.ok(runtime.status.idleTime>0&&runtime.status.craneTime>0);
 step(runtime,0,15.8);assert.equal(roof.visible,false);assert.equal(body.visible,true);assert.ok(runtime.status.rampOpen>.999);assert.ok(runtime.status.roofOpacity<.001);
 for(const [side,x,z]of [['north',0,11.5],['east',4.05,15]]){
  step(runtime,x,z);scene.updateMatrixWorld(true);
  for(const suffix of ['L','R']){const b=new Box3().setFromObject(scene.getObjectByName(`D_hangar_${side}_${suffix}`)),center=side==='north'?0:.425;assert.ok(side==='north'?(b.max.x<center-1||b.min.x>center+1):(b.max.z<center-1||b.min.z>center+1));}
 }
 step(runtime,0,25);assert.equal(roof.visible,true);assert.ok(runtime.status.rampOpen<.001);assert.ok(runtime.status.roofOpacity>.999);assert.ok(Math.abs(scene.getObjectByName('Access_Ramp').quaternion.x)>.6);
 assert.equal(original.opacity,opacity);assert.notEqual(roof.material,original);assert.notEqual(body.material,glb.scene.getObjectByName('HangarMesh').material);
 runtime.dispose();runtime.dispose();
});

test('Hangar runtime: alerta em decolagem/pouso compõe com guindaste e pausa; descarte de recursos privados',()=>{
 const scene=clone(glb.scene),runtime=new HangarRuntime(scene,glb.animations),body=scene.getObjectByName('HangarMesh'),atlas=body.material[0],base=atlas.emissiveIntensity;
 runtime.setDeparture(true);step(runtime,0,25,13);assert.equal(runtime.status.alert,true);assert.notEqual(atlas.emissiveIntensity,base);
 const time=runtime.status.craneTime,amount=runtime.status.rampOpen;runtime.update({x:0,z:18},0);assert.equal(runtime.status.craneTime,time);assert.equal(runtime.status.rampOpen,amount);
 runtime.setDeparture(false);step(runtime,0,25,1);assert.equal(runtime.status.alert,false);assert.equal(atlas.emissiveIntensity,base);
 runtime.startLanding();step(runtime,0,25,60);assert.equal(runtime.status.alert,true);step(runtime,0,25,180);assert.equal(runtime.status.alert,false);
 let sharedDisposed=0;glb.scene.getObjectByName('HangarMesh').geometry.addEventListener('dispose',()=>sharedDisposed++);
 const materials=new Set();scene.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);});const counts=new Map();for(const m of materials){counts.set(m,0);m.addEventListener('dispose',()=>counts.set(m,counts.get(m)+1));}
 runtime.dispose();runtime.dispose();assert.equal(sharedDisposed,0);assert.ok([...counts.values()].every(c=>c===1));
});

test('Hangar runtime: somente Doca/antecâmara e seus pisos saem; manifesto/cache e Refeitório permanecem',async()=>{
 const gltf=await loadGlb('src/assets/colony-v007.glb'),scene=gltf.scene.clone(true),geometry=[];
 const oldParts=colony.parts.length,original=[];gltf.scene.traverse(n=>{if(n.isMesh)original.push([n.geometry,n.geometry.index?.count]);});
 const filtered=removeDockForHangar(scene,colony,geometry);validateMasterplan(scene,filtered);assert.equal(colony.parts.length,oldParts);
 const ids=new Map();scene.traverse(n=>{if(n.userData.id_estavel)ids.set(n.userData.id_estavel,n);});
 for(const id of HANGAR.removedParts)assert.equal(ids.get(id),undefined,id);
 for(const p of colony.parts.filter(p=>!HANGAR.removedParts.includes(p.id)))assert.ok(ids.has(p.id),p.id);
 assert.ok(filtered.parts.some(p=>p.ambiente==='coffee-nook'));assert.ok(!filtered.doors.some(d=>d.owner==='meeting-suite'));assert.ok(geometry.length>=2);
 for(const[g,n]of original)assert.equal(g.index?.count,n,'cache de piso não muda');
 const runtime=new MasterplanRuntime(scene,filtered);runtime.update({x:5.8,z:15},1/60);runtime.dispose();for(const g of geometry)g.dispose();
});


test('Hangar runtime: envelopes simples contêm carga e ganchos ao compor Idle e CraneWork',()=>{
 const scene=clone(glb.scene),runtime=new HangarRuntime(scene,glb.animations),mesh=scene.getObjectByName('HangarMesh'),point=new Vector3();
 const names=['Crane_Hook_L','Crane_Hook_R'],boxes=['hangar-crane-load-left','hangar-crane-hook-right'].map(id=>HANGAR.colliders.find(b=>b.id===id));
 const vertices=names.map(name=>{const bone=mesh.skeleton.bones.findIndex(b=>b.name===name);assert.ok(bone>=0);return Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i).filter(i=>mesh.geometry.attributes.skinIndex.getX(i)===bone);});
 assert.ok(vertices.every(a=>a.length>0));
 // MMC de Idle (2 s) e CraneWork (1,6 s): ciclo composto de 8 s a 120 Hz.
 for(let frame=0;frame<=960;frame++){
  runtime.update({x:0,z:25},1/120);scene.updateMatrixWorld(true);mesh.skeleton.update();
  for(let side=0;side<2;side++)for(const index of vertices[side]){
   mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);const b=boxes[side],z=point.z+HANGAR.placement.z;
   assert.ok(point.x>=b.minX&&point.x<=b.maxX&&z>=b.minZ&&z<=b.maxZ,JSON.stringify({frame,side,x:point.x,z,b}));
  }
 }
 runtime.dispose();
});


test('Hangar runtime: quatro lados dos dois vãos pretos, sem atlas/emissão; cache e contagem de faces preservados',()=>{
 const source=glb.scene.getObjectByName('HangarMesh'),index=Array.from(source.geometry.index.array),scene=clone(glb.scene),runtime=new HangarRuntime(scene,glb.animations),body=scene.getObjectByName('HangarMesh');
 assert.notEqual(body.geometry,source.geometry);assert.deepEqual(Array.from(source.geometry.index.array),index);
 assert.equal(body.geometry.index.count,source.geometry.index.count);
 const black=body.material[1];assert.equal(black.name,'HangarDoorRevealBlack');assert.equal(black.color.getHex(),0x050505);
 assert.equal(black.side,2);assert.equal(black.map,null);assert.equal(black.emissiveMap,null);assert.equal(black.emissive.getHex(),0);assert.equal(black.transparent,false);assert.equal(black.depthWrite,true);assert.equal(black.polygonOffset,true);
 const group=body.geometry.groups[1];assert.equal(group.materialIndex,1);assert.equal(group.count/3,62);
 const counts=[0,0,0,0,0,0,0,0],p=body.geometry.attributes.position;
 for(let at=group.start;at<group.start+group.count;at+=3){
  const vertices=[0,1,2].map(k=>body.geometry.index.getX(at+k));
  const near=(axis,value)=>vertices.every(i=>Math.abs(p.getComponent(i,axis)-value)<.0001);
  const north=vertices.every(i=>p.getZ(i)<-2.65);
  const side=north?(near(0,-1.1)?0:near(0,1.1)?1:near(1,.16)?2:3):(near(2,-.675)?4:near(2,1.525)?5:near(1,.16)?6:7);
  counts[side]++;
 }
 assert.ok(counts.every(n=>n>0),'ambas as laterais, soleira e verga de cada porta');
 runtime.setDeparture(true);step(runtime,0,15.8);assert.equal(black.emissiveIntensity,1);assert.equal(black.emissive.getHex(),0);
 let disposed=0;body.geometry.addEventListener('dispose',()=>disposed++);runtime.dispose();runtime.dispose();assert.equal(disposed,1);
 assert.equal(source.geometry.groups.length,0);assert.equal(Array.isArray(source.material),false);
});
