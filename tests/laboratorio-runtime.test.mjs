import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {Box3,Group,Vector3,SRGBColorSpace} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {loadGlb} from './load-glb.mjs';
import {loadSource} from './load-source.mjs';
const {LABORATORIO:L}=loadSource('src/game/laboratorioLayout.ts');
const {LaboratorioRuntime,LABORATORIO_MODES}=loadSource('src/scene/marsColony/laboratorioRuntime.ts');
const {QuartelRuntime}=loadSource('src/scene/marsColony/quartelRuntime.ts');
const {QUARTEL:Q}=loadSource('src/game/quartelLayout.ts');
const {createWorld}=loadSource('src/game/marsWorld.ts');
const {removeRoomForLaboratorio}=loadSource('src/scene/marsColony/laboratorioColony.ts');
const {validateMasterplan}=loadSource('src/scene/marsColony/masterplanRuntime.ts');
const {SandwindController,sandwindResources}=loadSource('src/scene/marsColony/SandwindController.ts');
const {sandwindTargets}=loadSource('src/scene/marsColony/sandwindTargets.ts');
const {PLAYER_COLLIDER_CENTER_Y:Y,PLAYER_COLLIDER_HALF_HEIGHT:half,PLAYER_MOVEMENT:M,PLAYER_PHYSICS:P}=loadSource('src/characters/player/playerConfig.ts');
const gltf=await loadGlb('src/assets/laboratorio/laboratorio-v001.glb'),qGltf=await loadGlb('src/assets/quartel/barracks-v006.glb');
const base=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));
function fixture(world=createWorld()){
 const root=new Group();root.name='Laboratorio';const s=clone(gltf.scene);s.position.set(L.placement.x,0,L.placement.z);root.add(s);root.updateMatrixWorld(true);
 const runtime=new LaboratorioRuntime(s,gltf.animations,world.movingCuboids);
 return {root,s,runtime,world};
}
const step=(runtime,x,z,frames=120)=>{for(let i=0;i<frames;i++)runtime.update({x,z},1/60);};
function boneBounds(s,name){
 const mesh=s.getObjectByName('LaboratorySynthesizerMesh'),bone=mesh.skeleton.bones.findIndex(b=>b.name===name),index=mesh.geometry.getAttribute('skinIndex'),weight=mesh.geometry.getAttribute('skinWeight'),box=new Box3(),v=new Vector3();
 s.updateWorldMatrix(true,true);
 for(let i=0;i<index.count;i++)for(let k=0;k<4;k++)if(index.getComponent(i,k)===bone&&weight.getComponent(i,k)>.99){mesh.getVertexPosition(i,v);box.expandByPoint(v.applyMatrix4(mesh.matrixWorld));break;}
 return box;
}
test('Laboratório: fonte preservada por SHA-256, escala 1×, rig/atlas/clipes e orçamento reais',()=>{
 const origin=JSON.parse(fs.readFileSync('art-source/laboratorio-sintetizador/notas/origem-v001.sha256.json'));
 for(const f of origin.arquivos)assert.equal(createHash('sha256').update(fs.readFileSync(`art-source/laboratorio-sintetizador/${f.arquivo}`)).digest('hex'),f.sha256,f.arquivo);
 const bytes=fs.readFileSync('src/assets/laboratorio/laboratorio-v001.glb');assert.equal(createHash('sha256').update(bytes).digest('hex'),L.sourceSha256);
 assert.deepEqual(bytes,fs.readFileSync('art-source/laboratorio-sintetizador/export/laboratorio_sintetizador_v001.glb'));
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.equal(json.materials.length,1);assert.equal(json.meshes.length,1);
 assert.equal(gltf.scene.getObjectByName('LaboratorySynthesizerMesh').geometry.index.count/3,7382);
 assert.deepEqual(new Set(gltf.animations.map(c=>c.name)),new Set(LABORATORIO_MODES));
 assert.deepEqual(L.placement,{x:13.5,y:0,z:-12.5,rotationY:0,scale:1});
 const f=fixture(),b=new Box3().setFromObject(f.s);assert.ok(Math.abs(b.min.x-5.3)<1e-5&&Math.abs(b.max.x-20.8)<1e-5&&Math.abs(b.min.z+17.8)<1e-5&&Math.abs(b.max.z+6)<1e-5);
 assert.ok(f.world.bounds.minZ<b.min.z-.5);assert.equal(L.materials,1);f.runtime.dispose();
});
test('Laboratório: sala antiga sai só da cópia; vizinhos, física simples e save v1 permanecem',async()=>{
 const source=await loadGlb('src/assets/colony-v007.glb'),s=source.scene.clone(true),geometry=[],filtered=removeRoomForLaboratorio(s,base,geometry);
 validateMasterplan(s,filtered);assert.ok(source.scene.getObjectByName('TET_smart-lab'));assert.equal(s.getObjectByName('TET_smart-lab'),undefined);
 for(const id of ['TET_brand-brain','TET_output-review','TET_design'])assert.ok(s.getObjectByName(id),id);
 for(const id of L.removedParts)assert.equal(s.getObjectByName(id),undefined,id);
 const world=createWorld();assert.equal(world.movingCuboids.length,Q.dynamicCuboids.length+2);assert.equal(world.simpleCuboids.length,Q.staticCuboids.length+25);
 for(const box of L.staticCuboids){assert.ok(box.halfExtents.every(n=>n>0));assert.ok(world.simpleCuboids.some(c=>c.id===box.id));}
 for(const c of base.colliders.filter(c=>L.removedColliders.includes(c.id)))assert.ok(!world.obstacles.some(b=>b.minX===c.minX&&b.maxX===c.maxX&&b.minZ===c.minZ&&b.maxZ===c.maxZ),c.id);
 const {MAP_ROOMS,getLocationLabelByPosition}=loadSource('src/world/mapConfig.ts');assert.equal(MAP_ROOMS.find(r=>r.id==='smart-lab').position.x,13.5);assert.equal(getLocationLabelByPosition(18,-16),'Laboratório');
 const {parseSave}=loadSource('src/game/session.ts');assert.equal(parseSave(JSON.stringify({version:1,profile:{displayName:'Autor',color:'#66e6ff'},briefingSeen:true,room:'smart-lab'})).profile.displayName,'Autor');
 geometry.forEach(g=>g.dispose());
});
test('Laboratório: folhas reais e colisores coincidem em todos os quadros, sem interferência dos quatro modos',()=>{
 const f=fixture(),v=new Vector3();
 try{for(const mode of LABORATORIO_MODES){f.runtime.setMode(mode);
  for(let frame=0;frame<160;frame++){
   const d=L.doors[Math.floor(frame/80)];f.runtime.update(frame%80<40?{x:d.x,z:d.z}:{x:0,z:0},1/60);
   for(let i=0;i<2;i++){
    const b=boneBounds(f.s,L.doors[i].bone),c=f.world.movingCuboids.find(c=>c.id===L.doors[i].collider);
    b.getCenter(v);assert.ok(v.distanceTo(new Vector3(c.position.x,c.position.y,c.position.z))<1e-5,JSON.stringify({mode,frame,b,c}));
    assert.ok(b.getSize(v).distanceTo(new Vector3(...c.halfExtents).multiplyScalar(2))<1e-5);
   }
  }
 }
 for(let i=0;i<2;i++){const d=L.doors[i];step(f.runtime,d.x,d.z);const b=boneBounds(f.s,d.bone);assert.ok(i===0?b.min.x>16.54:b.max.z< -13.64,'vão livre inteiro');}
 const pose=f.s.getObjectByName('Diamond_Core').matrix.clone(),doors=[...f.runtime.doors];f.runtime.update({x:0,z:0},0);assert.deepEqual(f.runtime.doors,doors);assert.ok(f.s.getObjectByName('Diamond_Core').matrix.equals(pose));
 }finally{f.runtime.dispose();}
});
test('Laboratório: gate Sandwind único, distância pela caixa inteira, cache intacto em três montagens',()=>{
 const before={...sandwindResources},sourceMaterial=gltf.scene.getObjectByName('LaboratorySynthesizerMesh').material;
 for(let cycle=0;cycle<3;cycle++){
  const f=fixture(),scope=new Group(),architecture=new Group();scope.add(architecture,f.root);
  const targets=sandwindTargets(scope,architecture,base),target=targets.find(t=>t.id==='laboratorio');assert.deepEqual(target.nodes,[f.root]);
  const controller=new SandwindController(scope,[gltf.scene],targets,SRGBColorSpace),settings={enabled:true,culling:true,wind:true,profile:'compact'};
  controller.update(200,200,.1,settings,false);assert.equal(f.root.parent.visible,false);
  step(f.runtime,6.74,-12.7);assert.ok(f.runtime.doors[1]>.99);assert.equal(f.root.visible,true);
  controller.update(22,-12.5,.2,settings,false);assert.equal(f.root.parent.visible,true,'borda leste da caixa retém o prédio grande');
  controller.dispose();f.runtime.dispose();assert.equal(f.s.getObjectByName('LaboratorySynthesizerMesh').material,sourceMaterial);
 }
 assert.deepEqual(sandwindResources,before);
});
const require=createRequire(import.meta.url),R=createRequire(require.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');
async function physics(start,automaticDoors=true){await R.init();const source=createWorld(),f=fixture(source),world=new R.World({x:0,y:0,z:0}),qScene=qGltf.scene.clone(true),qRoot=new Group(),moving=[];
 qRoot.position.set(Q.placement.x,0,Q.placement.z);qRoot.rotation.y=Q.placement.rotationY;qRoot.add(qScene);qRoot.updateMatrixWorld(true);const qr=new QuartelRuntime(qScene,qGltf.animations,source.movingCuboids);
 for(const o of source.obstacles.filter(o=>o.physics!==false))world.createCollider(R.ColliderDesc.cuboid((o.maxX-o.minX)/2,P.obstacleHeight/2,(o.maxZ-o.minZ)/2).setTranslation((o.minX+o.maxX)/2,P.obstacleHeight/2,(o.minZ+o.maxZ)/2));
 for(const c of source.simpleCuboids)world.createCollider(R.ColliderDesc.cuboid(...c.halfExtents).setTranslation(c.position.x,c.position.y,c.position.z).setRotation(c.rotation));
 for(const c of source.movingCuboids){const b=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(c.position.x,c.position.y,c.position.z).setRotation(c.rotation));world.createCollider(R.ColliderDesc.cuboid(...c.halfExtents),b);moving.push([b,c]);}
 const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start[0],Y+source.supportHeight(...start),start[1])),collider=world.createCollider(R.ColliderDesc.capsule(half,M.colliderRadius),body),controller=world.createCharacterController(P.controllerOffset);
 controller.enableAutostep(P.autostepMaxHeight,P.autostepMinWidth,false);controller.enableSnapToGround(P.snapToGroundDistance);world.step();
 function move(x,z,frames=900){for(let i=0;i<frames;i++){const p=body.translation(),distance=Math.hypot(x-p.x,z-p.z);if(distance<.02)break;
  qr.update(p,1/60);f.runtime.update(p,automaticDoors?1/60:0);for(const[b,c]of moving)b.setNextKinematicTranslation(c.position);
  const d=Math.min(distance,M.runSpeed/60),dx=(x-p.x)/distance*d,dz=(z-p.z)/distance*d;controller.computeColliderMovement(collider,{x:dx,y:Y+source.supportHeight(p.x+dx,p.z+dz)-p.y,z:dz});const out=controller.computedMovement(),nx=p.x+out.x,nz=p.z+out.z;
  body.setNextKinematicTranslation({x:nx,y:Y+source.supportHeight(nx,nz),z:nz});world.step();
  assert.ok(source.walkableAreas.some(a=>nx>=a.minX&&nx<=a.maxX&&nz>=a.minZ&&nz<=a.maxZ),JSON.stringify({nx,nz}));
 }return body.translation();}
 return {...f,move,dispose(){f.runtime.dispose();qr.dispose();world.free();}};
}
test('Laboratório: Rapier percorre EDEN → porta oeste → laboratório → porta sul → quartel → praça, ida e volta',async()=>{
 const path=[[3,-10.5],[5.5,-10.5],[5.5,-12.7],[9.5,-12.7],[9.5,-9.5],[15.5,-9.5],[15.5,-6.4],[10.5,-6.4],[10.5,-3.5],[10.5,0],[6.8,0],[3,0]];
 for(const reverse of [false,true]){const route=reverse?[...path].reverse():path,f=await physics(route[0]);try{for(const[x,z]of route.slice(1)){const p=f.move(x,z);assert.ok(Math.hypot(p.x-x,p.z-z)<.03,JSON.stringify({reverse,x,z,p}));}}finally{f.dispose();}}
});
test('Laboratório: portas fechadas, paredes, bancadas, armários e máquina são sólidos; proximidade libera entrada',async()=>{
 for(const[start,target]of [[[5.5,-12.7],[8,-12.7]],[[15.5,-6.4],[15.5,-9]]]){const f=await physics(start,false);try{const p=f.move(...target,120);assert.ok(Math.hypot(p.x-target[0],p.z-target[1])>.5);const d=L.doors[start[0]===5.5?1:0];step(f.runtime,d.x,d.z);const end=f.move(...target);assert.ok(Math.hypot(end.x-target[0],end.z-target[1])<.03);}finally{f.dispose();}}
 for(const[start,target]of [[[10,-12.5],[13.5,-12.5]],[[9.5,-9.9],[8,-9.9]],[[11.1,-15.4],[11.1,-16.8]],[[18.8,-15.4],[19.75,-15.4]],[[18.4,-12.7],[19.4,-12.7]],[[17,-16],[17,-18.2]],[[19.7,-11],[21,-11]],[[10,-8.3],[10,-6.7]]]){
  const f=await physics(start);try{const p=f.move(...target,180);assert.ok(Math.hypot(p.x-target[0],p.z-target[1])>.35,JSON.stringify({start,target,p}));}finally{f.dispose();}
 }
});

test('Laboratório: passarelas ficam fora do descarte, em uma malha/material e sem sobreposição nas quinas',()=>{
 const {createLaboratorioWalkways}=loadSource('src/scene/marsColony/laboratorioWalkways.ts'),mesh=createLaboratorioWalkways();
 assert.equal(mesh.geometry.getAttribute('position').count,18);assert.ok(!Array.isArray(mesh.material));
 for(let i=0;i<L.connectors.length;i++)for(let j=i+1;j<L.connectors.length;j++){
  const a=L.connectors[i],b=L.connectors[j];assert.ok(Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX)<=1e-9||Math.min(a.maxZ,b.maxZ)-Math.max(a.minZ,b.minZ)<=1e-9);
 }
 const source=fs.readFileSync('src/scene/marsColony/Laboratorio.tsx','utf8');assert.match(source,/<\/group><group ref={walkways}/);assert.match(source,/useSimulationBlocked/);
 mesh.geometry.dispose();mesh.material.dispose();
});
