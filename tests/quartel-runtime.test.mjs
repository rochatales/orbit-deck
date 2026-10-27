import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {Box3,Group,Vector3,Quaternion} from 'three';
import {loadGlb} from './load-glb.mjs';
import {loadSource} from './load-source.mjs';
const {QUARTEL:Q}=loadSource('src/game/quartelLayout.ts');
const {createWorld}=loadSource('src/game/marsWorld.ts');
const {QuartelRuntime}=loadSource('src/scene/marsColony/quartelRuntime.ts');
const {removeRoomForQuartel}=loadSource('src/scene/marsColony/quartelColony.ts');
const {validateMasterplan}=loadSource('src/scene/marsColony/masterplanRuntime.ts');
const {PLAYER_COLLIDER_CENTER_Y:Y,PLAYER_COLLIDER_HALF_HEIGHT:half,PLAYER_MOVEMENT:M,PLAYER_PHYSICS:P}=loadSource('src/characters/player/playerConfig.ts');
const gltf=await loadGlb('src/assets/quartel/barracks-v005.glb');
const base=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));
const step=(r,x,z,n=120)=>{for(let i=0;i<n;i++)r.update({x,z},1/60);};
function scene(){const placement=new Group(),s=gltf.scene.clone(true);placement.position.x=12;placement.rotation.y=-Math.PI/2;placement.add(s);placement.updateMatrixWorld(true);return {placement,s};}
test('Quartel v005: escala única, COL orientados batem com GLB e telescópicas liberam ambos os vãos',()=>{
 assert.deepEqual(fs.readFileSync('src/assets/quartel/barracks-v005.glb'),fs.readFileSync('art-source/quartel/export/barracks-v005.glb'));
 assert.deepEqual(Q.placement,{x:12,y:0,z:0,rotationY:-Math.PI/2,scale:1});
 const {placement,s}=scene(),w=createWorld(),r=new QuartelRuntime(s,gltf.animations,w.movingCuboids);
 assert.deepEqual(s.getObjectByName('Barracks').scale.toArray(),[1,1,1]);
 for(const c of [...Q.staticCuboids,...Q.dynamicCuboids]){const o=s.getObjectByName(c.id),p=o.getWorldPosition(new Vector3()),q=o.getWorldQuaternion(new Quaternion()),scale=o.getWorldScale(new Vector3());assert.ok(p.distanceTo(new Vector3(c.position.x,c.position.y,c.position.z))<1e-6,c.id);assert.ok(q.angleTo(new Quaternion(c.rotation.x,c.rotation.y,c.rotation.z,c.rotation.w))<1e-6);assert.ok(scale.distanceTo(new Vector3(...c.halfExtents))<1e-6);}
 for(const door of Q.doors){step(r,door.x,door.z);placement.updateMatrixWorld(true);
  for(const c of Q.dynamicCuboids.filter(c=>c.side===door.side)){
   const leaf=s.getObjectByName(c.panel),b=new Box3().setFromObject(leaf),axis=door.side==='north'?'x':'z',center=door.side==='north'?10.5:0;
   assert.ok(b.max[axis]<center-.9||b.min[axis]>center+.9,JSON.stringify({panel:c.panel,b}));
   const col=s.getObjectByName(c.id),p=col.getWorldPosition(new Vector3()),motion=w.movingCuboids.find(m=>m.id===c.id);assert.ok(p.distanceTo(new Vector3(motion.position.x,motion.position.y,motion.position.z))<1e-5);
  }
 }
 step(r,0,0);assert.ok(r.status.north<1e-5&&r.status.west<1e-5);r.dispose();
});
test('Quartel: design sai só da cópia montada; HUD mantém id compatível e save exoden v1 carrega',async()=>{
 const original=await loadGlb('src/assets/colony-v007.glb'),s=original.scene.clone(true),geometry=[],filtered=removeRoomForQuartel(s,base,geometry);validateMasterplan(s,filtered);
 const ids=[];s.traverse(n=>{if(n.userData.ambiente==='design')ids.push(n.name);});assert.deepEqual(ids,[]);assert.ok(original.scene.getObjectByName('TET_design'));
 const removed=new Set(Q.removedParts),current=new Map();s.traverse(n=>{if(n.userData.id_estavel)current.set(n.userData.id_estavel,n);});
 for(const id of Q.removedZoneMarkers)assert.equal(current.has(id),false,id);
 for(const part of base.parts.filter(p=>!removed.has(p.id)))assert.ok(current.has(part.id),part.id);
 const {MAP_ROOMS,getLocationLabelByPosition}=loadSource('src/world/mapConfig.ts');assert.equal(MAP_ROOMS.find(r=>r.id==='design').name,'Quartel');assert.equal(getLocationLabelByPosition(10.5,0),'Quartel');
 const {loadHubSave}=loadSource('src/state/useExpeditionStore.ts');const old={version:1,profile:{displayName:'Morador',color:'#66e6ff'},briefingSeen:true,room:'design'};
 assert.deepEqual(loadHubSave(()=>({getItem:k=>k==='exoden:hub:v1'?JSON.stringify(old):null})),{version:1,profile:old.profile,briefingSeen:true});
 for(const g of geometry)g.dispose();
});
const require=createRequire(import.meta.url),R=createRequire(require.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');
async function physicsFixture(start,auditWalkable=false){await R.init();const source=createWorld(),world=new R.World({x:0,y:0,z:0}),visual=scene(),runtime=new QuartelRuntime(visual.s,gltf.animations,source.movingCuboids),moving=[];
 for(const o of source.obstacles.filter(o=>o.physics!==false))world.createCollider(R.ColliderDesc.cuboid((o.maxX-o.minX)/2,P.obstacleHeight/2,(o.maxZ-o.minZ)/2).setTranslation((o.minX+o.maxX)/2,P.obstacleHeight/2,(o.minZ+o.maxZ)/2));
 for(const c of source.simpleCuboids)world.createCollider(R.ColliderDesc.cuboid(...c.halfExtents).setTranslation(c.position.x,c.position.y,c.position.z).setRotation(c.rotation));
 for(const c of source.movingCuboids){const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(c.position.x,c.position.y,c.position.z).setRotation(c.rotation));world.createCollider(R.ColliderDesc.cuboid(...c.halfExtents),body);moving.push([body,c]);}
 const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start[0],Y+source.supportHeight(...start),start[1])),collider=world.createCollider(R.ColliderDesc.capsule(half,M.colliderRadius),body),controller=world.createCharacterController(P.controllerOffset);
 controller.enableAutostep(P.autostepMaxHeight,P.autostepMinWidth,false);controller.enableSnapToGround(P.snapToGroundDistance);controller.setMaxSlopeClimbAngle(Math.PI*.34);controller.setMinSlopeSlideAngle(Math.PI*.45);world.step();
 function moveTo(x,z,frames=1200){for(let i=0;i<frames;i++){const p=body.translation(),distance=Math.hypot(x-p.x,z-p.z);if(distance<.02)break;runtime.update(p,1/60);for(const [b,c]of moving)b.setNextKinematicTranslation(c.position);const d=Math.min(distance,M.runSpeed/60),dx=(x-p.x)/distance*d,dz=(z-p.z)/distance*d;controller.computeColliderMovement(collider,{x:dx,y:Y+source.supportHeight(p.x+dx,p.z+dz)-p.y,z:dz});const out=controller.computedMovement(),nx=p.x+out.x,nz=p.z+out.z;body.setNextKinematicTranslation({x:nx,y:Y+source.supportHeight(nx,nz),z:nz});world.step();if(auditWalkable)assert.ok(source.walkableAreas.some(a=>nx>=a.minX&&nx<=a.maxX&&nz>=a.minZ&&nz<=a.maxZ),JSON.stringify({nx,nz}));}return body.translation();}
 return {world,source,body,moveTo,dispose(){runtime.dispose();world.free();}};
}
test('Quartel: Rapier percorre praça → rampa oeste → interior → rampa norte → Lab, nos dois sentidos',async()=>{
 const route=[[3,0],[5.5,0],[6.8,0],[10.5,0],[10.5,-4.6],[10.5,-6.3],[10.5,-8.6]];
 for(const reverse of [false,true]){const path=reverse?[...route].reverse():route,f=await physicsFixture(path[0],true);try{for(const [x,z]of path.slice(1)){const end=f.moveTo(x,z);assert.ok(Math.hypot(x-end.x,z-end.z)<.03,JSON.stringify({reverse,x,z,end}));assert.ok(Math.abs(end.y-Y-f.source.supportHeight(end.x,end.z))<1e-6);assert.ok(f.source.walkableAreas.some(a=>end.x>=a.minX&&end.x<=a.maxX&&end.z>=a.minZ&&end.z<=a.maxZ));}}finally{f.dispose();}}
});
test('Quartel: borda do pedestal bloqueia autostep inclusive com apoio elevado desejado, parâmetros intactos',async()=>{
 assert.equal(P.autostepMaxHeight,.26);assert.equal(M.colliderRadius,.32);
 for(const [start,target]of [[[18.3,1],[16.5,1]],[[10.5,5.6],[10.5,4]],[[5.6,2],[7.1,2]],[[12,-5.5],[12,-4]]]){
  const f=await physicsFixture(start);try{const end=f.moveTo(...target,180);assert.ok(Math.hypot(end.x-target[0],end.z-target[1])>.5,JSON.stringify({start,target,end}));assert.equal(f.source.supportHeight(end.x,end.z),0,'não sobe pela lateral');}finally{f.dispose();}
 }
});

test('Quartel: pausa congela teto/portas; descarte libera somente o material privado uma vez',()=>{
 const {s}=scene(),runtime=new QuartelRuntime(s,gltf.animations),roof=s.getObjectByName('Building_Roof');
 const original=gltf.scene.getObjectByName('Building_Roof').material,privateMaterial=roof.material;
 let privateDisposed=0,cacheDisposed=0;
 privateMaterial.addEventListener('dispose',()=>privateDisposed++);original.addEventListener('dispose',()=>cacheDisposed++);
 step(runtime,6.75,0,4);const status={...runtime.status};runtime.update({x:10.5,z:0},0);assert.deepEqual(runtime.status,status);
 step(runtime,10.5,0);assert.equal(roof.visible,false);assert.equal(s.getObjectByName('Building_Interior').visible,true);
 step(runtime,0,0);assert.equal(roof.visible,true);assert.equal(original.opacity,1);
 runtime.dispose();runtime.dispose();assert.equal(privateDisposed,1);assert.equal(cacheDisposed,0);
});
