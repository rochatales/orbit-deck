import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Raycaster, Vector3 } from 'three';
import {loadGlb} from './load-glb.mjs';
import {loadSource} from './load-source.mjs';
import {buildingGeometry} from './colony-buildings-geometry.mjs';
const {ControlRoomRuntime}=loadSource('src/scene/marsColony/controlRoomRuntime.ts');
const {CONTROL_ROOM:C,retainControlRoomCollider}=loadSource('src/game/controlRoomLayout.ts');
const {removeRoomForControlRoom}=loadSource('src/scene/marsColony/controlRoomColony.ts');
const {createWorld}=loadSource('src/game/marsWorld.ts');
const {clearSegment,traversable}=loadSource('src/combat/navigation.ts');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const source=await loadGlb('src/assets/control-room/control-room-v002.glb');
const manifest=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));
const step=(r,x,z,n=180)=>{for(let i=0;i<n;i++)r.update({x,z},1/60);};

test('Prédios aprovados: snapshot íntegro; 9320/8732 triângulos e UVs válidos nas faces visíveis',async()=>{
 const snapshot=JSON.parse(fs.readFileSync('docs/handoffs/s6.12-predios-aprovados-01-11/fontes.json'));
 for(const f of snapshot.arquivos)assert.equal(hash(f.arquivo),f.sha256,f.arquivo);
 for(const [file,triangles] of [['src/assets/control-room/control-room-v002.glb',9320],['src/assets/hangar/hangar-v002.glb',8732]]){
  const g=await loadGlb(file),stats=buildingGeometry(g);assert.equal(stats.triangles,triangles);assert.equal(stats.zeroUVMeaningfulTriangles,0);
  // Booleano deixa no Hangar dois microtriângulos de 0,24 micrômetro de largura; preservar o GLB aprovado.
  assert.ok(stats.microAreas.every(a=>a<2e-7));
  if(file.includes('hangar'))assert.deepEqual(stats.cyanParts,{});
  else assert.ok(Object.keys(stats.cyanParts).every(id=>['PROP_Control_Console','PROP_Control_EDEN_Emissor','PROP_Control_EDEN_Projecao','PROP_Control_Interacao'].includes(id)));
  const joints=stats.floorJoints;assert.ok(joints.length>=9);
  const xs=[...new Set(joints.filter(j=>j.size[0]<.031).map(j=>j.x))].sort((a,b)=>a-b);
  const zs=[...new Set(joints.filter(j=>j.size[2]<.031).map(j=>j.z))].sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i++)assert.ok(Math.abs(xs[i]-xs[i-1]-1.25)<1e-5);
  for(let i=1;i<zs.length;i++)assert.ok(Math.abs(zs[i]-zs[i-1]-1.5)<1e-5);
 }
});

test('Control Room: praça/porta sul e conector leste chegam a EDEN; pedestal e móveis sólidos',()=>{
 const w=createWorld(),paths=[[[0,-3.1],[0,-7.25],[0,-8.9]],[[5.5,-10.5],[3.5,-10.5],[1.5,-10.5],[1.5,-8.9],[0,-8.9]],[[0,-8.9],[-1.5,-8.9],[-1.5,-12],[1.5,-12]]];
 for(const path of paths)for(let i=1;i<path.length;i++)assert.ok(clearSegment({x:path[i-1][0],z:path[i-1][1]},{x:path[i][0],z:path[i][1]},w,.36),JSON.stringify(path[i]));
 for(const p of [{x:0,z:-10.5},{x:-2.54,z:-13.07},{x:1.2,z:-13.05}])assert.equal(traversable(p,w,.32),false);
 const removed=manifest.colliders.filter(c=>!retainControlRoomCollider(c));assert.equal(removed.length,7);
 for(const c of removed)assert.ok(!w.obstacles.some(b=>['minX','maxX','minZ','maxZ'].every(k=>b[k]===c[k])));
 for(const c of C.obstacles)assert.ok(w.obstacles.some(b=>['minX','maxX','minZ','maxZ'].every(k=>b[k]===c[k])));
});

test('Control Room: teto, duas portas, pausa e descarte sem alterar materiais do cache',()=>{
 const copy=source.scene.clone(true),cache=[];source.scene.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])cache.push([m,m.opacity,m.transparent]);});
 const r=new ControlRoomRuntime(copy);step(r,0,-8.9);assert.ok(r.status.roofOpacity<.01);assert.equal(copy.getObjectByName('TET_Control').visible,false);assert.ok(r.status.south>.99);
 step(r,3.5,-10.5);assert.ok(r.status.east>.99);const p=copy.getObjectByName('D_Control_L_A').position.clone();r.update({x:100,z:100},0);assert.ok(copy.getObjectByName('D_Control_L_A').position.equals(p));
 step(r,100,100);assert.ok(r.status.roofOpacity>.99);assert.equal(copy.getObjectByName('TET_Control').visible,true);assert.ok(r.status.east<.01&&r.status.south<.01);
 for(const [m,opacity,transparent] of cache){assert.equal(m.opacity,opacity);assert.equal(m.transparent,transparent);}
 r.dispose();r.dispose();
});

test('Control Room: recorte dos dois pisos globais elimina sobreposição e preserva a geometria fonte',async()=>{
 const original=await loadGlb('src/assets/colony-v007.glb'),copy=original.scene.clone(true),owned=[],cached=[];
 for(const id of ['PISO_v007_Externo','PISO_v007_Interno'])original.scene.getObjectByName(id).traverse(n=>{if(n.isMesh)cached.push([n,n.geometry,n.geometry.attributes.position.array.slice()]);});
 const filtered=removeRoomForControlRoom(copy,manifest,owned);assert.ok(owned.length>=2);assert.ok(!filtered.parts.some(p=>p.ambiente==='brand-brain'));
 copy.updateMatrixWorld(true);const floors=['PISO_v007_Externo','PISO_v007_Interno'].map(id=>copy.getObjectByName(id)),ray=new Raycaster();
 for(let x=-3.25;x<=3.25;x+=.5)for(let z=-13.5;z<=-7.5;z+=.5){ray.set(new Vector3(x,1,z),new Vector3(0,-1,0));assert.equal(ray.intersectObjects(floors,true).length,0,`${x}/${z}`);}
 for(const [n,g,positions]of cached){assert.equal(n.geometry,g);assert.deepEqual(g.attributes.position.array,positions);}
 for(const g of owned)g.dispose();
});

test('Control Room: cápsula Rapier atravessa as portas sul/leste em ambos os sentidos e chega à interação',async()=>{
 const {createRequire}=await import('node:module'),require=createRequire(import.meta.url),R=createRequire(require.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');await R.init();
 const {PLAYER_COLLIDER_CENTER_Y:y,PLAYER_COLLIDER_HALF_HEIGHT:h,PLAYER_MOVEMENT:M}=loadSource('src/characters/player/playerConfig.ts'),w=createWorld();
 const routes=[[[0,-3.1],[0,-7.25],[0,-8.9]],[[5.5,-10.5],[3.5,-10.5],[1.5,-10.5],[1.5,-8.9],[0,-8.9]]];
 for(const route of routes)for(const reverse of [false,true]){
  const path=reverse?[...route].reverse():route,world=new R.World({x:0,y:0,z:0});
  try{
   for(const b of w.obstacles)world.createCollider(R.ColliderDesc.cuboid((b.maxX-b.minX)/2,1,(b.maxZ-b.minZ)/2).setTranslation((b.minX+b.maxX)/2,1,(b.minZ+b.maxZ)/2));
   const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(path[0][0],y,path[0][1])),collider=world.createCollider(R.ColliderDesc.capsule(h,M.colliderRadius),body),controller=world.createCharacterController(.06);world.step();
   for(const [x,z]of path.slice(1)){
    for(let f=0;f<1200;f++){
     const p=body.translation(),d=Math.hypot(x-p.x,z-p.z);if(d<.025)break;
     const speed=Math.min(d,M.runSpeed/60);controller.computeColliderMovement(collider,{x:(x-p.x)/d*speed,y:0,z:(z-p.z)/d*speed});const delta=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+delta.x,y,z:p.z+delta.z});world.step();
    }
    const p=body.translation();assert.ok(Math.hypot(x-p.x,z-p.z)<.03,JSON.stringify({reverse,x,z,p}));
   }
  }finally{world.free();}
 }
});

test('Atlas: filtro sem mipmaps evita filetes; texturas privadas compartilham só imagens e descartam uma vez',async()=>{
 const {DataTexture,LinearFilter,LinearMipmapLinearFilter}=await import('three');
 const {HangarRuntime}=loadSource('src/scene/marsColony/hangarRuntime.ts');
 for(const file of ['src/assets/control-room/control-room-v002.glb','src/assets/hangar/hangar-v002.glb']){
  const g=await loadGlb(file),originals=new Set(),textures=[];
  for(let i=0;i<4;i++){const t=new DataTexture(new Uint8Array([255,255,255,255]),1,1);t.minFilter=LinearMipmapLinearFilter;t.generateMipmaps=true;textures.push(t);}
  g.scene.traverse(n=>{if(!n.isMesh)return;for(const m of Array.isArray(n.material)?n.material:[n.material]){
   if(!['MAT_Control_Atlas_2K','MAT_Control_Vidro','MAT_Hangar_Atlas_2K'].includes(m.name))continue;
   originals.add(m);m.map=textures[0];m.normalMap=textures[1];m.emissiveMap=textures[2];m.roughnessMap=m.metalnessMap=textures[3];
  }});
  const clone=file.includes('hangar')?(await import('three/examples/jsm/utils/SkeletonUtils.js')).clone(g.scene):g.scene.clone(true);
  const runtime=file.includes('hangar')?new HangarRuntime(clone,g.animations):new ControlRoomRuntime(clone),owned=new Set();
  clone.traverse(n=>{if(!n.isMesh)return;for(const m of Array.isArray(n.material)?n.material:[n.material])if(['MAT_Control_Atlas_2K','MAT_Control_Vidro','MAT_Hangar_Atlas_2K'].includes(m.name)){
   assert.ok(!originals.has(m));for(const key of ['map','normalMap','emissiveMap','roughnessMap','metalnessMap'])if(m[key]){
    assert.ok(!textures.includes(m[key]));assert.equal(m[key].minFilter,LinearFilter);assert.equal(m[key].generateMipmaps,false);
    assert.ok(textures.some(t=>t.source===m[key].source));owned.add(m[key]);
   }
  }});
  assert.equal(owned.size,4);let disposed=0;for(const t of owned)t.addEventListener('dispose',()=>disposed++);
  runtime.dispose();runtime.dispose();assert.equal(disposed,4);
  for(const t of textures){assert.equal(t.minFilter,LinearMipmapLinearFilter);assert.equal(t.generateMipmaps,true);t.dispose();}
 }
});


test('EDEN: somente projeção do pedestal, com interação e pausa preservadas',()=>{
 const office=fs.readFileSync('src/scene/OfficeScene.tsx','utf8');
 assert.ok(!office.includes('EDEN_CHARACTER_ASSET'));
 assert.ok(!office.includes('<GLBCharacter'));
 assert.ok(office.includes("map === 'mars' ? <MarsColony world={world}/>"));
 const {EDEN}=loadSource('src/game/config.ts'),copy=source.scene.clone(true);
 const projection=copy.getObjectByName('PROP_Control_EDEN_Projecao');
 assert.ok(projection?.visible);assert.ok(copy.getObjectByName('PROP_Control_EDEN_Emissor')?.visible);
 const initial=projection.position.y,r=new ControlRoomRuntime(copy);
 step(r,EDEN.position.x,EDEN.position.z,60);
 assert.equal(r.status.interaction,true);assert.equal(copy.getObjectByName('PROP_Control_Interacao').visible,true);
 assert.ok(Math.abs(projection.position.y-initial)<=.025);
 const paused=projection.position.y;r.update(EDEN.position,0);assert.equal(projection.position.y,paused);
 step(r,100,100);assert.equal(r.status.interaction,false);assert.equal(projection.visible,true);
 r.dispose();
});
