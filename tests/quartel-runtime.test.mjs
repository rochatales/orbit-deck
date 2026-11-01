import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {Box3,Group,Vector3,Quaternion} from 'three';
import {loadGlb} from './load-glb.mjs';
import {loadSource} from './load-source.mjs';
const {LaboratorioRuntime}=loadSource('src/scene/marsColony/laboratorioRuntime.ts');
const {clone}=await import('three/examples/jsm/utils/SkeletonUtils.js');
const labGltf=await loadGlb('src/assets/laboratorio/laboratorio-v002.glb');
const {QUARTEL:Q}=loadSource('src/game/quartelLayout.ts');
const {createWorld}=loadSource('src/game/marsWorld.ts');
const {QuartelRuntime}=loadSource('src/scene/marsColony/quartelRuntime.ts');
const {removeRoomForQuartel}=loadSource('src/scene/marsColony/quartelColony.ts');
const {validateMasterplan}=loadSource('src/scene/marsColony/masterplanRuntime.ts');
const {PLAYER_COLLIDER_CENTER_Y:Y,PLAYER_COLLIDER_HALF_HEIGHT:half,PLAYER_MOVEMENT:M,PLAYER_PHYSICS:P}=loadSource('src/characters/player/playerConfig.ts');
const gltf=await loadGlb('src/assets/quartel/barracks-v006.glb');
const base=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));
const step=(r,x,z,n=120)=>{for(let i=0;i<n;i++)r.update({x,z},1/60);};
function scene(){const placement=new Group(),s=gltf.scene.clone(true);placement.position.x=12;placement.rotation.y=-Math.PI/2;placement.add(s);placement.updateMatrixWorld(true);return {placement,s};}
test('Quartel v006: escala única, COL orientados batem com GLB e telescópicas liberam os três vãos',()=>{
 assert.deepEqual(fs.readFileSync('src/assets/quartel/barracks-v006.glb'),fs.readFileSync('art-source/quartel/export/barracks-v006.glb'));
 assert.deepEqual(Q.placement,{x:12,y:0,z:0,rotationY:-Math.PI/2,scale:1});
 const {placement,s}=scene(),w=createWorld(),r=new QuartelRuntime(s,gltf.animations,w.movingCuboids);
 assert.deepEqual(s.getObjectByName('Barracks').scale.toArray(),[1,1,1]);
 for(const c of [...Q.staticCuboids,...Q.dynamicCuboids]){const o=s.getObjectByName(c.id),p=o.getWorldPosition(new Vector3()),q=o.getWorldQuaternion(new Quaternion()),scale=o.getWorldScale(new Vector3());assert.ok(p.distanceTo(new Vector3(c.position.x,c.position.y,c.position.z))<1e-6,c.id);assert.ok(q.angleTo(new Quaternion(c.rotation.x,c.rotation.y,c.rotation.z,c.rotation.w))<1e-6);assert.ok(scale.distanceTo(new Vector3(...c.halfExtents))<1e-6);}
 for(const door of Q.doors){step(r,door.x,door.z);placement.updateMatrixWorld(true);
  for(const c of Q.dynamicCuboids.filter(c=>c.side===door.side)){
   const leaf=s.getObjectByName(c.panel),b=new Box3().setFromObject(leaf),axis=door.axis,center=axis==='x'?door.x:door.z;
   assert.ok(b.max[axis]<center-door.width/2||b.min[axis]>center+door.width/2,JSON.stringify({panel:c.panel,b}));
   const col=s.getObjectByName(c.id),p=col.getWorldPosition(new Vector3()),motion=w.movingCuboids.find(m=>m.id===c.id);assert.ok(p.distanceTo(new Vector3(motion.position.x,motion.position.y,motion.position.z))<1e-5);
  }
 }
 step(r,0,0);assert.ok(r.status.north<1e-5&&r.status.west<1e-5&&r.status.bathroom<1e-5);r.dispose();
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
async function physicsFixture(start,auditWalkable=false,automaticDoors=true){await R.init();const source=createWorld(),world=new R.World({x:0,y:0,z:0}),visual=scene(),runtime=new QuartelRuntime(visual.s,gltf.animations,source.movingCuboids),moving=[],labScene=clone(labGltf.scene),labRuntime=new LaboratorioRuntime(labScene,labGltf.animations,source.movingCuboids);
 for(const o of source.obstacles.filter(o=>o.physics!==false))world.createCollider(R.ColliderDesc.cuboid((o.maxX-o.minX)/2,P.obstacleHeight/2,(o.maxZ-o.minZ)/2).setTranslation((o.minX+o.maxX)/2,P.obstacleHeight/2,(o.minZ+o.maxZ)/2));
 for(const c of source.simpleCuboids)world.createCollider(R.ColliderDesc.cuboid(...c.halfExtents).setTranslation(c.position.x,c.position.y,c.position.z).setRotation(c.rotation));
 for(const c of source.movingCuboids){const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(c.position.x,c.position.y,c.position.z).setRotation(c.rotation));world.createCollider(R.ColliderDesc.cuboid(...c.halfExtents),body);moving.push([body,c]);}
 const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start[0],Y+source.supportHeight(...start),start[1])),collider=world.createCollider(R.ColliderDesc.capsule(half,M.colliderRadius),body),controller=world.createCharacterController(P.controllerOffset);
 controller.enableAutostep(P.autostepMaxHeight,P.autostepMinWidth,false);controller.enableSnapToGround(P.snapToGroundDistance);controller.setMaxSlopeClimbAngle(Math.PI*.34);controller.setMinSlopeSlideAngle(Math.PI*.45);world.step();
 function moveTo(x,z,frames=1200){for(let i=0;i<frames;i++){const p=body.translation(),distance=Math.hypot(x-p.x,z-p.z);if(distance<.02)break;runtime.update(p,automaticDoors?1/60:0);labRuntime.update(p,automaticDoors?1/60:0);for(const [b,c]of moving)b.setNextKinematicTranslation(c.position);const d=Math.min(distance,M.runSpeed/60),dx=(x-p.x)/distance*d,dz=(z-p.z)/distance*d;controller.computeColliderMovement(collider,{x:dx,y:Y+source.supportHeight(p.x+dx,p.z+dz)-p.y,z:dz});const out=controller.computedMovement(),nx=p.x+out.x,nz=p.z+out.z;body.setNextKinematicTranslation({x:nx,y:Y+source.supportHeight(nx,nz),z:nz});world.step();if(auditWalkable)assert.ok(source.walkableAreas.some(a=>nx>=a.minX&&nx<=a.maxX&&nz>=a.minZ&&nz<=a.maxZ),JSON.stringify({nx,nz}));}return body.translation();}
 return {world,source,body,runtime,moveTo,dispose(){runtime.dispose();labRuntime.dispose();world.free();}};
}
test('Quartel: Rapier percorre praça → rampa oeste → interior → rampa norte → Lab, nos dois sentidos',async()=>{
 const route=[[3,0],[5.5,0],[6.8,0],[10.5,0],[10.5,-4.6],[10.5,-6.4],[15.5,-6.4],[15.5,-9]];
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

test('Quartel: Rapier bloqueia camas, armários, mesa, bancos, pia, privada e três faces do banheiro',async()=>{
 const cases=[
  ['COL_Interior_Bed_1',[14.4,-3.26],[16,-3.26]],
  ['COL_Interior_Bed_2',[14.4,-1.54],[16,-1.54]],
  ['COL_Interior_Bed_3',[14.4,.18],[16,.18]],
  ['COL_Interior_Locker_2',[15.4,-2.36],[16.9,-2.36]],
  ['COL_Interior_Table_1',[8.02,.8],[8.02,2.5]],
  ['COL_Interior_Bench_1',[6.6,2.5],[7.38,2.5]],
  ['COL_Interior_Cabinet_1',[10.5,3],[10.5,4.15]],
  ['COL_Interior_Sink_1',[15.8,2.25],[17,2.25]],
  ['COL_Interior_Toilet_1',[15.5,3.15],[16.9,3.15]],
  ['COL_Bathroom_Wall_0',[14.5,.9],[14.5,2.15]],
  ['COL_Bathroom_Wall_2',[12.15,1.98],[13.55,1.98]],
  ['COL_Bathroom_Wall_5',[12.15,3.95],[13.55,3.95]],
 ];
 for(const[id,start,target]of cases){
  assert.ok(Q.staticCuboids.some(c=>c.id===id),id);const f=await physicsFixture(start);
  try{const end=f.moveTo(...target,180);assert.ok(Math.hypot(end.x-target[0],end.z-target[1])>.3,JSON.stringify({id,end,target}));
   const b=Q.staticCuboids.find(c=>c.id===id).bounds,dx=Math.max(b.minX-end.x,0,end.x-b.maxX),dz=Math.max(b.minZ-end.z,0,end.z-b.maxZ);
   assert.ok(Math.hypot(dx,dz)>=M.colliderRadius-.002,JSON.stringify({id,end,dx,dz}));
  }finally{f.dispose();}
 }
});

test('Banheiro: folha fechada bloqueia; proximidade libera 1,20 m, entrada/saída e aproximação da privada',async()=>{
 const door=Q.doors.find(d=>d.side==='bathroom'),f=await physicsFixture([12.2,2.9],true,false);
 try{
  const blocked=f.moveTo(13.8,2.9,120);assert.ok(blocked.x<12.9,'porta fechada sólida');
  step(f.runtime,door.x,door.z);assert.ok(f.runtime.status.bathroom>.999);
  const inside=f.moveTo(14.8,2.9);assert.ok(Math.hypot(inside.x-14.8,inside.z-2.9)<.03);
  const behind=f.moveTo(15.5,2.9);assert.ok(Math.hypot(behind.x-15.5,behind.z-2.9)<.03);
  const outside=f.moveTo(12.1,2.9);assert.ok(Math.hypot(outside.x-12.1,outside.z-2.9)<.03);
  step(f.runtime,10,0);assert.ok(f.runtime.status.bathroom<1e-5,'fecha ao afastar');
 }finally{f.dispose();}
 // Controle automático real nas duas direções; a privada é alcançável pela frente sem cruzar a parede.
 for(const reverse of [false,true]){
  const path=[[12,0],[12,2.9],[13.8,2.9],[15.5,2.9],[15.5,3.15],[16.1,3.15]],route=reverse?[...path].reverse():path,g=await physicsFixture(route[0],true);
  try{for(const[x,z]of route.slice(1)){const end=g.moveTo(x,z);assert.ok(Math.hypot(end.x-x,end.z-z)<.03,JSON.stringify({reverse,x,z,end}));}}finally{g.dispose();}
 }
});

test('Banheiro: base do chuveiro tem apoio de 6,6 cm e o vidro permanece sólido',async()=>{
 const f=await physicsFixture([15.2,3.86],true);
 try{
  const onTray=f.moveTo(14.15,3.86);assert.ok(Math.hypot(onTray.x-14.15,onTray.z-3.86)<.03);assert.ok(Math.abs(onTray.y-Y-.3285)<1e-6);
  const againstGlass=f.moveTo(14.15,2.9,180);assert.ok(againstGlass.z>3.69,'vidro bloqueia saída lateral');
  const leave=f.moveTo(15.2,3.86);assert.ok(Math.hypot(leave.x-15.2,leave.z-3.86)<.03);assert.ok(Math.abs(leave.y-Y-.2625)<1e-6);
 }finally{f.dispose();}
});

test('Quartel: caixas móveis coincidem com COL do GLB durante todos os quadros de abertura e fechamento',()=>{
 const{s,placement}=scene(),world=createWorld(),runtime=new QuartelRuntime(s,gltf.animations,world.movingCuboids);
 try{for(const door of Q.doors)for(let frame=0;frame<90;frame++){
  runtime.update(frame<45?{x:door.x,z:door.z}:{x:0,z:0},1/60);placement.updateMatrixWorld(true);
  for(const c of Q.dynamicCuboids){const p=s.getObjectByName(c.id).getWorldPosition(new Vector3()),actual=world.movingCuboids.find(m=>m.id===c.id).position;
   assert.ok(p.distanceTo(new Vector3(actual.x,actual.y,actual.z))<1e-5,JSON.stringify({door:door.side,frame,id:c.id,p,actual}));
  }
 }}finally{runtime.dispose();}
});
