import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { Quaternion, Vector3, Raycaster, Triangle, Color, Box3 } from 'three';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const {BUILDING_SHARED_FLOOR:shared,COLONY_BUILDINGS:buildings,REPLACED_BUILDING_ROOMS:replaced,REMOVED_BUILDING_COLLIDERS:removed}=loadSource('src/game/colonyBuildingsLayout.ts');
const {createWorld}=loadSource('src/game/marsWorld.ts');
const {ColonyBuildingRuntime}=loadSource('src/scene/marsColony/colonyBuildingRuntime.ts');
const {removeRoomsForBuildings}=loadSource('src/scene/marsColony/colonyBuildingsColony.ts');
const {validateMasterplan}=loadSource('src/scene/marsColony/masterplanRuntime.ts');
const {INITIAL_POSITION}=loadSource('src/game/config.ts');
const {MarsInteriorProbe}=loadSource('src/audio/marsInterior.ts');
const base='art-source/predios-colonia-v001/';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources=JSON.parse(fs.readFileSync(base+'notas/fontes.json'));
const variants=JSON.parse(fs.readFileSync(base+'notas/padronizacao-v002.json'));

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

test('S6.12: fontes GLB/Blend preservadas por hash, variantes derivadas rastreáveis e portas previstas',async()=>{
 for(const f of sources){assert.equal(sha(fs.readFileSync(base+'originais/'+f.arquivo)),f.sha256)}
 for(const v of variants){assert.equal(sha(fs.readFileSync(base+'export/'+v.id+'-v002.glb')),v.sha256);assert.equal(sha(fs.readFileSync('src/assets/buildings/'+v.id+'.glb')),v.sha256);assert.equal(v.source_sha256,sources.find(f=>f.arquivo===v.id+'.glb').sha256);assert.equal(sha(fs.readFileSync('src/assets/control-room/control-room-v002.glb')),v.reference_sha256);}
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
 assert.ok(buildings[2].doors[0].x < buildings[2].placement.x);
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

test('S6.12: portas deslizam e seus cuboides acompanham, teto entra/sai, pausa congela e cache fica intacto',async()=>{
 for(const b of buildings){
  const gltf=await loadGlb('src/assets/buildings/'+b.id+'.glb'),scene=gltf.scene.clone(true),world=createWorld();
  const rt=new ColonyBuildingRuntime(scene,gltf.animations,b,world.movingCuboids);
  assert.equal(scene.getObjectByName('Building_Floor'),undefined);assert.equal(scene.getObjectByName('Building_Pad'),undefined);
  const remains=[];scene.traverse(n=>{if(n.name.startsWith('Juntas_'))remains.push(n)});assert.equal(remains.length,0);
  for(const d of b.doors){
   const c=world.movingCuboids.find(c=>c.id===b.dynamicCuboids.find(c => c.node.startsWith(`COL_Door${d.side[0]}`)).id),before=JSON.stringify(c.position),rotation=JSON.stringify(c.rotation);
   for(let i=0;i<90;i++)rt.update(d,1/60);
   assert.notEqual(JSON.stringify(c.position),before);assert.equal(JSON.stringify(c.rotation),rotation);
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
 for(const target of [[-2.8,0],[-9.5,0],[8.2,11.7],[0,10],[0,23],[0,29.5],[12,5.3],[0,-6],[-7,6]])assert.ok(reachable(world,start,target),`rota ${target}`);
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

test('S6.12: letreiros e portas padronizados permanecem; pisos e pads não entram no runtime',async()=>{
 for(const b of buildings){
  const gltf=await loadGlb('src/assets/buildings/'+b.id+'.glb');
  const sign=gltf.scene.getObjectByName('Letreiro_Padrao');assert.ok(sign);assert.equal(sign.parent.name,b.id==='meeting-room'?'Wall_E':'Wall_S');
  assert.ok(sign.children.some(c=>c.name.startsWith('Texto_')));
  for(const clip of gltf.animations)assert.ok(clip.tracks.every(t=>t.name.endsWith('.position')));
 }
});

test('S6.12: letreiros centralizados acima da porta e presos à fachada; Meeting Room olha para o Hangar',async()=>{
 for(const b of buildings){
  const gltf=await loadGlb('src/assets/buildings/'+b.id+'.glb'),scene=gltf.scene;
  scene.position.set(b.placement.x,0,b.placement.z);scene.rotation.y=b.placement.rotationY;scene.updateMatrixWorld(true);
  const side=b.id==='meeting-room'?'East':'South',door=b.doors.find(d=>d.side===side),sign=scene.getObjectByName('Letreiro_Padrao');
  const expected=new Vector3(...(b.id==='meeting-room'?[0,0,1]:b.id==='data-center'?[1,0,0]:[-1,0,0]));
  const normal=new Vector3(0,0,1).applyQuaternion(sign.getWorldQuaternion(new Quaternion())),tangent=new Vector3(normal.z,0,-normal.x);
  assert.ok(normal.distanceTo(expected)<1e-5,`${b.id}: face correta`);
  const origin=new Vector3(door.x,0,door.z),plates=new Box3();
  for(const p of sign.children.filter(n=>n.name.startsWith('Placa')))plates.union(new Box3().setFromObject(p));
  const center=plates.getCenter(new Vector3()).sub(origin);
  assert.ok(Math.abs(center.dot(tangent))<1e-5,'placa composta centralizada no vão, incluindo tag');
  assert.ok(plates.min.y>2.47&&plates.min.y<2.49);assert.ok(plates.max.y<2.85,'logo acima do cabeçalho, sem subir ao telhado');
  assert.ok(Math.abs(center.dot(normal)-.28)<1e-5,'sem balanço de 85 cm sobre o corredor');
  const backing=sign.getObjectByName('Fundo_Letreiro'),backBounds=new Box3().setFromObject(backing);
  assert.ok(backBounds.intersectsBox(plates),'placas encostadas no fundo');
  // Fixação real: o fundo chega até a casca, dos dois lados do vão (não só AABB da parede).
  for(const x of [-1.4,1.4]){
   const start=origin.clone().addScaledVector(tangent,x).addScaledVector(normal,1);start.y=2.66;
   const ray=new Raycaster(start,normal.clone().negate());
   const wallHit=ray.intersectObject(sign.parent,true).find(h=>!sign.children.includes(h.object));
   assert.ok(wallHit,`${b.id}: casca atrás da fixação ${x}`);
   const depth=wallHit.point.clone().sub(origin).dot(normal);
   assert.ok(depth>.12&&depth<.34,'fundo/placa alcançam a superfície da fachada');
  }
  const portal=scene.getObjectByName('Padrao_ARQ_Control_Portal_S_'+side),portalBounds=new Box3().setFromObject(portal);
  const brackets=sign.children.filter(n=>n.name.startsWith('Suporte_Letreiro'));assert.equal(brackets.length,2);
  for(const bracket of brackets){const bounds=new Box3().setFromObject(bracket);assert.ok(bounds.intersectsBox(portalBounds));assert.ok(bounds.intersectsBox(backBounds));}
  // Nada da placa é animado com as folhas ou ocultado junto ao teto.
  const runtime=new ColonyBuildingRuntime(scene,gltf.animations,b,createWorld().movingCuboids),before=sign.matrixWorld.clone();
  for(let f=0;f<90;f++)runtime.update({x:b.placement.x,z:b.placement.z},1/60);
  assert.equal(scene.getObjectByName('Building_Roof').visible,false);assert.equal(sign.visible,true);assert.ok(sign.matrixWorld.equals(before));runtime.dispose();
 }
});

test('S6.12: pavimento compartilhado plano, tile real do corredor, interior sem areia e exterior preservado',async()=>{
 const path='src/assets/buildings/colony-shared-floor-v001.glb';assert.equal(sha(fs.readFileSync(path)),shared.sha256);assert.equal(sha(fs.readFileSync(shared.source)),shared.sourceSha256);
 const gltf=await loadGlb(path),clean=gltf.scene.getObjectByName('ColonyFloor_Clean'),exterior=gltf.scene.getObjectByName('ColonyFloor_Exterior');
 assert.ok(clean.material.vertexColors&&exterior.material.vertexColors);assert.equal(clean.material.name,'M_Piso_Patio_Vcol');
 for(const mesh of [clean,exterior]){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i))<1e-6,'sem espessura ou plataforma');}
 const colors=clean.geometry.attributes.color;
 for(let i=0;i<colors.count;i++)assert.ok(shared.cleanColors.some(c=>Math.hypot(colors.getX(i)-c[0],colors.getY(i)-c[1],colors.getZ(i)-c[2])<1e-5),'apenas placa limpa ou junta');
 const dirty=new Set(),color=exterior.geometry.attributes.color;for(let i=0;i<color.count;i++)dirty.add([color.getX(i),color.getY(i),color.getZ(i)].map(v=>v.toFixed(4)).join(','));assert.ok(dirty.size>20,'variação de areia permanece fora');
});

test('S6.12: corredores e interiores cobertos sem buracos ou pisos sobrepostos na montagem',async()=>{
 const base=await loadGlb('src/assets/colony-v007.glb'),next=await loadGlb('src/assets/buildings/colony-shared-floor-v001.glb'),manifest=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json')),owned=[];
 removeRoomsForBuildings(base.scene,manifest,owned);base.scene.updateMatrixWorld(true);next.scene.updateMatrixWorld(true);
 const floors=[base.scene.getObjectByName('PISO_v007_Interno'),base.scene.getObjectByName('PISO_v007_Externo'),...next.scene.children];
 const ray=new Raycaster(),up=new Vector3(0,-1,0),origin=new Vector3();
 // Toda célula da união exata e três percursos que antes eram recortados pelas bases.
 const points=shared.surfaceCells.map(c=>{const n=c.polygon.length,total=n*(n+1)/2;return [c.polygon.reduce((s,v,i)=>s+v[0]*(i+1),0)/total,c.polygon.reduce((s,v,i)=>s+v[1]*(i+1),0)/total]});
 for(let z=5.9;z<17.7;z+=.23)points.push([5.8,z]);
 for(let x=-16;x< -4.1;x+=.23)points.push([x,.23]);
 for(let x=5.5;x<15.6;x+=.23)points.push([x,16.3]);
 for(const [x,z]of points){origin.set(x,1,z);ray.set(origin,up);const hits=ray.intersectObjects(floors,true).filter(h=>Math.abs(h.point.y)<1e-5);assert.ok(hits.length,`buraco ${x}/${z}`);assert.equal(new Set(hits.map(h=>h.object)).size,1,`sobreposição ${x}/${z}`);}
 // Fase/juntas e cor do exterior coincidem com o piso original dos corredores.
 const original=await loadGlb('src/assets/colony-v006.glb');original.scene.updateMatrixWorld(true);
 const tile=original.scene.getObjectByName('ARQ_Lab_Piso_Patio'),bounds=new Box3().setFromObject(tile),repeat=(v,lo,size)=>lo+((v-lo)%size+size)%size;
 const colorAt=hit=>{const g=hit.object.geometry,p=g.attributes.position,c=g.attributes.color,f=hit.face,local=hit.object.worldToLocal(hit.point.clone());const bary=Triangle.getBarycoord(local,new Vector3().fromBufferAttribute(p,f.a),new Vector3().fromBufferAttribute(p,f.b),new Vector3().fromBufferAttribute(p,f.c),new Vector3());return new Color().setRGB(c.getX(f.a)*bary.x+c.getX(f.b)*bary.y+c.getX(f.c)*bary.z,c.getY(f.a)*bary.x+c.getY(f.b)*bary.y+c.getY(f.c)*bary.z,c.getZ(f.a)*bary.x+c.getZ(f.b)*bary.y+c.getZ(f.c)*bary.z);};
 let compared=0;
 for(const [x,z]of points){origin.set(repeat(x,bounds.min.x,5),1,repeat(z,bounds.min.z,9));ray.set(origin,up);const a=ray.intersectObject(tile,true)[0];origin.set(x,1,z);ray.set(origin,up);const b=ray.intersectObject(next.scene.getObjectByName('ColonyFloor_Exterior'),true)[0];if(a&&b){const c=colorAt(a),d=colorAt(b);assert.ok(Math.hypot(c.r-d.r,c.g-d.g,c.b-d.b)<1e-4,`fase do corredor ${x}/${z}`);compared++;}}
 assert.ok(compared>5);owned.forEach(g=>g.dispose());
});

test('S6.12: interiores têm uma única camada por ponto, sem fundo do tile achatado sobre as juntas',async()=>{
 const gltf=await loadGlb('src/assets/buildings/colony-shared-floor-v001.glb'),mesh=gltf.scene.getObjectByName('ColonyFloor_Clean');
 gltf.scene.updateMatrixWorld(true);
 const p=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?.count??p.count;
 let projected=0;
 for(let at=0;at<count;at+=3){const [a,b,c]=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,index?index.getX(at+k):at+k));projected+=Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))/2;}
 const expected=shared.interiors.reduce((sum,a)=>sum+(a.maxX-a.minX)*(a.maxZ-a.minZ),0);
 assert.ok(Math.abs(projected-expected)<1e-4,`cobertura ${projected} m² deve ser ${expected}, nunca o dobro`);
 const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0);
 for(const b of shared.interiors){
  let checked=0;
  for(let x=b.minX+.137;x<b.maxX-.05;x+=.317)for(let z=b.minZ+.173;z<b.maxZ-.05;z+=.293){
   origin.set(x,1,z);ray.set(origin,down);assert.equal(ray.intersectObject(mesh).length,1,`camada única ${x}/${z}`);checked++;
  }
  assert.ok(checked>400);
 }
 assert.equal(shared.interiorTopOnly,true);assert.equal(shared.interiorLayers,1);
});

test('S6.12: entorno dos prédios tem uma camada por ponto, preservando tile e areia',async()=>{
 const gltf=await loadGlb('src/assets/buildings/colony-shared-floor-v001.glb');gltf.scene.updateMatrixWorld(true);
 const outside=shared.cells.filter(([a,b,c,d])=>!shared.interiors.some(r=>(a+b)/2>r.minX&&(a+b)/2<r.maxX&&(c+d)/2>r.minZ&&(c+d)/2<r.maxZ));
 const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0);
 for(const [name,cells]of [['ColonyFloor_Exterior',outside]]){
  const m=gltf.scene.getObjectByName(name),p=m.geometry.attributes.position,index=m.geometry.index;let area=0;
  for(let i=0;i<(index?.count??p.count);i+=3){const[a,b,c]=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,index?index.getX(i+k):i+k));area+=Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))/2;}
  const expected=shared.exteriorAreaM2;assert.ok(Math.abs(area-expected)<1e-4,`${name} área ${area} vs ${expected}`);
  for(const cell of shared.surfaceCells.filter(c=>!c.clean)){const weights=cell.polygon.map((_,i)=>(i+1)**2+.137*(i+1)),total=weights.reduce((a,b)=>a+b,0);origin.set(cell.polygon.reduce((s,v,i)=>s+v[0]*weights[i],0)/total,1,cell.polygon.reduce((s,v,i)=>s+v[1]*weights[i],0)/total);ray.set(origin,down);assert.equal(ray.intersectObject(m).length,1,`${name} camada ${origin.x}/${origin.z}`);}
 }
 assert.equal(shared.exteriorLayers,1);
});

test('S6.12: pavimento fecha faixa Cafeteria–Quartel e todo o pátio em volta da estufa',async()=>{
 const gltf=await loadGlb('src/assets/buildings/colony-shared-floor-v001.glb');gltf.scene.updateMatrixWorld(true);
 const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0),world=createWorld();
 const points=[[14.5,6.5],[16,5.5],[6.2,17],[6.2,28],[20.5,28.3],[20.5,17.5],[10,28.5]];
 for(const [baseX,baseZ]of points){const x=baseX+.0137,z=baseZ+.0173;origin.set(x,1,z);ray.set(origin,down);assert.equal(ray.intersectObject(gltf.scene,true).length,1,`tile ${x}/${z}`);assert.ok(world.walkableAreas.some(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ),`área caminhável ${x}/${z}`);}
});

test('S6.12: ligação sul cobre a transição diagonal ao deck sem sobrepor piso à base da nave',async()=>{
 const floor=await loadGlb('src/assets/buildings/colony-shared-floor-v001.glb'),deck=await loadGlb('src/assets/ares-mars/deck-mars.glb');
 assert.equal(sha(fs.readFileSync('src/assets/ares-mars/deck-mars.glb')),shared.deckSourceSha256);
 deck.scene.position.z=33;deck.scene.updateMatrixWorld(true);floor.scene.updateMatrixWorld(true);
 const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0);
 for(let x=.0173;x<6.25;x+=.117){origin.set(x,1,28.6137);ray.set(origin,down);
  const ground=ray.intersectObject(floor.scene,true),platform=ray.intersectObject(deck.scene,true).filter(h=>h.point.y>-.26);
  assert.ok(ground.length||platform.length,`ligação sem buraco ${x}`);
  for(const a of ground)for(const b of platform)assert.ok(Math.abs(a.point.y-b.point.y)>.0005,'sem faces coplanares entre piso e deck');
 }
});

test('S6.12: Rapier percorre Cafeteria → lateral Hangar → volta externa estufa → deck nos dois sentidos',async()=>{
 const {createRequire}=await import('node:module'),require=createRequire(import.meta.url),R=createRequire(require.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');await R.init();
 const {PLAYER_COLLIDER_CENTER_Y:Y,PLAYER_COLLIDER_HALF_HEIGHT:half,PLAYER_MOVEMENT:M,PLAYER_PHYSICS:P}=loadSource('src/characters/player/playerConfig.ts');
 const {constrainToWalkableAreas}=loadSource('src/characters/player/playerMovement.ts');
 const route=[[5.2,11.7],[5.2,17.2],[20.6,17.2],[20.6,28.6],[6.2,28.6],[0,28.6],[0,29.5]];
 for(const reverse of [false,true]){
  const source=createWorld(),physics=new R.World({x:0,y:0,z:0}),path=reverse?[...route].reverse():route;
  try{
   for(const c of source.obstacles.filter(c=>c.physics!==false))physics.createCollider(R.ColliderDesc.cuboid((c.maxX-c.minX)/2,P.obstacleHeight/2,(c.maxZ-c.minZ)/2).setTranslation((c.minX+c.maxX)/2,P.obstacleHeight/2,(c.minZ+c.maxZ)/2));
   for(const c of [...source.simpleCuboids,...source.movingCuboids])physics.createCollider(R.ColliderDesc.cuboid(...c.halfExtents).setTranslation(c.position.x,c.position.y,c.position.z).setRotation(c.rotation));
   const start=path[0],body=physics.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start[0],Y+source.supportHeight(...start),start[1])),capsule=physics.createCollider(R.ColliderDesc.capsule(half,M.colliderRadius),body),controller=physics.createCharacterController(P.controllerOffset),out={x:0,z:0};
   controller.enableAutostep(P.autostepMaxHeight,P.autostepMinWidth,false);controller.enableSnapToGround(P.snapToGroundDistance);physics.step();
   for(const [x,z]of path.slice(1)){
    for(let frame=0;frame<1200;frame++){
     const p=body.translation(),distance=Math.hypot(x-p.x,z-p.z);if(distance<.025)break;
     const step=Math.min(distance,M.runSpeed/60);constrainToWalkableAreas(p.x,p.z,(x-p.x)/distance*step,(z-p.z)/distance*step,source.bounds,source.walkableAreas,M.colliderRadius,out);
     controller.computeColliderMovement(capsule,{x:out.x,y:Y+source.supportHeight(p.x+out.x,p.z+out.z)-p.y,z:out.z});
     const delta=controller.computedMovement(),nx=p.x+delta.x,nz=p.z+delta.z;
     body.setNextKinematicTranslation({x:nx,y:Y+source.supportHeight(nx,nz),z:nz});physics.step();
     assert.ok(free(source,nx,nz),`sem invadir sólido ${nx}/${nz}`);
    }
    const end=body.translation();assert.ok(Math.hypot(end.x-x,end.z-z)<.03,JSON.stringify({reverse,x,z,end}));
   }
  }finally{physics.free();}
 }
});
