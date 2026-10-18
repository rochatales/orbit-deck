import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Group, Object3D, Vector3, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';
import { loadSource } from './load-source.mjs';
const { ColonyVisibility } = loadSource('src/scene/marsColony/visibility.ts');
const manifest = JSON.parse(fs.readFileSync('src/assets/colony-v006.manifest.json', 'utf8'));
function fixture(parts) {
 const scene = new Group();
 for (const part of parts) { const node = new Mesh(new BoxGeometry(4,3,0.2),new MeshStandardMaterial()); node.position.set(0,1.5,1.1); node.name = part.name; scene.add(node); }
 return { scene, visibility: new ColonyVisibility(scene, parts) };
}
const part = (name, extra = {}) => ({name, bounds:{minX:-2,maxX:2,minY:0,maxY:3,minZ:1,maxZ:1.2},apoiado_em:[],apoiado_em_todos:[],...extra});

test('S6.12: exportação completa B3 sem referências, variantes antigas ou colisores de malha', () => {
 const file = fs.readFileSync('src/assets/colony-v006.glb');
 assert.equal(file.readUInt32LE(0), 0x46546c67);
 const json = JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());
 const names = new Set(json.nodes.map(node=>node.name));
 assert.ok(manifest.parts.length > 350);
 assert.equal(new Set(manifest.parts.map(p=>p.name)).size,manifest.parts.length);
 for (const p of manifest.parts) {
  assert.ok(names.has(p.name),p.name);
  assert.ok(json.nodes.some(node=>node.extras?.colony_name===p.name),`identidade estável: ${p.name}`);
  assert.doesNotMatch(p.name,/^(REF_|COL_|SPAWN_|INTERACT_|CAM_|LUZ_|PLAT_[AB]_|PLAT_B2_)/);
  for (const support of [...p.apoiado_em,...p.apoiado_em_todos]) assert.ok(names.has(support), support);
 }
 assert.ok(names.has('PLAT_B3_Foguete'));
 assert.ok(names.has('TET_Laboratorio'));
 assert.equal(json.cameras,undefined);
});

test('S6.12: fade contínuo, histerese, materiais privados e piso intacto', () => {
 const parts=[part('ARQ_Parede'),part('ARQ_Piso')];
 const {scene,visibility}=fixture(parts);
 const wall=scene.getObjectByName('ARQ_Parede'),floor=scene.getObjectByName('ARQ_Piso');
 visibility.update({x:0,z:0},new Vector3(0,2,10),1/60);
 assert.equal(wall.visible,true);
 assert.ok(wall.material.opacity<1 && wall.material.opacity>0.8);
 assert.equal(floor.material.opacity,1);
 for(let i=0;i<120;i++)visibility.update({x:0,z:0},new Vector3(0,2,10),1/60);
 assert.ok(wall.material.opacity<0.081);
 for(let i=0;i<60;i++)visibility.update({x:0,z:0},new Vector3(0,2,-10),1/60);
 assert.ok(wall.material.opacity<0.081);
 for(let i=0;i<120;i++)visibility.update({x:0,z:0},new Vector3(0,2,-10),1/60);
 assert.ok(wall.material.opacity>0.99);
 visibility.dispose();
});

test('S6.12: fade não altera materiais do cache e não oscila ao tangenciar peça', () => {
 const source=new Group(),wall=new Mesh(new BoxGeometry(4,3,0.2),new MeshStandardMaterial());
 wall.name='ARQ_Parede';wall.position.set(0,1.5,1.1);source.add(wall);
 const copy=source.clone(true),visibility=new ColonyVisibility(copy,[part(wall.name)]);
 const material=copy.getObjectByName(wall.name).material;
 assert.notEqual(material,wall.material);
 let last=1;
 for(let i=0;i<120;i++){
  visibility.update({x:0,z:0},new Vector3(0,2,i%2?10:-10),1/60);
  assert.ok(material.opacity<=last);last=material.opacity;
 }
 assert.equal(wall.material.opacity,1);assert.equal(wall.material.transparent,false);
 let disposed=0;material.addEventListener('dispose',()=>disposed++);visibility.dispose();assert.equal(disposed,1);
});

test('S6.12: vão real não corta parede e apoio não desaparece em cascata', () => {
 const scene=new Group(),wall=new Group();wall.name='ARQ_Parede';
 for(const x of [-2,2]){const mesh=new Mesh(new BoxGeometry(1,3,0.2),new MeshStandardMaterial());mesh.position.set(x,1.5,1);wall.add(mesh);}
 const prop=new Object3D();prop.name='PROP_Tela';scene.add(wall,prop);
 const visibility=new ColonyVisibility(scene,[part('ARQ_Parede'),part('PROP_Tela',{apoiado_em:['ARQ_Parede']})]);
 for(let i=0;i<120;i++)visibility.update({x:0,z:0},new Vector3(0,2,10),1/60);
 assert.equal(wall.children[0].material.opacity,1);
 for(let i=0;i<120;i++)visibility.update({x:2,z:0},new Vector3(2,2,10),1/60);
 assert.ok(wall.children[0].material.opacity<0.081);
 assert.equal(prop.visible,true);
});

test('S6.12: foguete/base centralizados, serviços e baia retirados só da cópia', () => {
 const {applyColonyLayout,REMOVED_COLONY_PARTS}=loadSource('src/scene/marsColony/layout.ts');
 const scene=new Group();
 for(const part of manifest.parts){const node=new Object3D();node.name=part.name;node.position.set((part.bounds.minX+part.bounds.maxX)/2,0,(part.bounds.minZ+part.bounds.maxZ)/2);scene.add(node);}
 const copy=scene.clone(true);applyColonyLayout(copy);
 for(const name of ['PLAT_B3_Foguete','PLAT_B3_Base_Lancamento']){
  assert.ok(Math.abs(copy.getObjectByName(name).position.x)<0.0001);
  assert.ok(Math.abs(copy.getObjectByName(name).position.z-33)<0.0001);
  assert.equal(scene.getObjectByName(name).position.x,-10);
 }
 for(const name of REMOVED_COLONY_PARTS)assert.equal(copy.getObjectByName(name).visible,false,name);
 const rocket=new Mesh(new BoxGeometry(2,10,2),new MeshStandardMaterial());rocket.name='PLAT_B3_Foguete';rocket.position.set(0,5,33);
 const group=new Group();group.add(rocket);const visibility=new ColonyVisibility(group,[part(rocket.name)]);
 for(let i=0;i<120;i++)visibility.update({x:0,z:29.5},new Vector3(0,15,50),1/60);
 assert.ok(rocket.material.opacity<0.081);
});

function marsWorld(){
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillText(){}})})};
 return loadSource('src/game/marsWorld.ts').createWorld();
}
test('S6.12: todas as folhas preservam raio, amortecimento, escala, slide, opacidade e luz', () => {
 const world=marsWorld(),doors=[];world.group.traverse(n=>{if(n.name==='PortaAutomatica')doors.push(n);});
 assert.ok(doors.length>5);
 assert.ok(doors.some(d=>{const p=d.getWorldPosition(new Vector3());return Math.hypot(p.x-9.5,p.z+10)<0.1;}),'porta do laboratório');
 for(const door of doors){
  const p=door.getWorldPosition(new Vector3());
  world.update(new Vector3(1000,0,1000),10);
  const [left,right,light]=door.children,width=left.geometry.parameters.width/0.46;
  world.update(new Vector3(p.x+2.36,0,p.z),1/60);assert.equal(left.material.opacity,0.82);
  world.update(new Vector3(p.x+2.34,0,p.z),0.1);
  const amount=1-Math.exp(-0.7);
  assert.ok(Math.abs(left.material.opacity-(0.82-amount*0.68))<1e-9);
  assert.ok(Math.abs(left.scale.x-(1-amount*0.18))<1e-9);
  assert.ok(Math.abs(left.position.x-(-width*0.24-width*0.19*amount))<1e-9);
  assert.ok(Math.abs(right.position.x-(width*0.24+width*0.19*amount))<1e-9);
  assert.ok(Math.abs(light.material.emissiveIntensity-(0.45+amount*0.5))<1e-9);
  assert.equal(door.visible,true);
 }
 const lights=[];world.group.traverse(n=>{if(n.isLight)lights.push(n);});
 assert.ok(lights.some(l=>l.isAmbientLight&&l.intensity===0.22));
 assert.ok(lights.some(l=>l.isPointLight&&l.intensity===8));
});

test('S6.12: embarque acessível antes da base sólida e saída preservada', () => {
 const {isNearShip}=loadSource('src/state/playerTransient.ts');
 assert.equal(isNearShip('mars',{x:0,y:0,z:28}),true);
 assert.equal(isNearShip('mars',{x:0,y:0,z:29.5}),true);
 const {MAPS}=loadSource('src/game/config.ts');assert.equal(MAPS.mars.ship.z,33);assert.equal(MAPS.mars.exit.z,29.5);
});

test('S6.12: preserva os 129 retângulos da fonte e acrescenta a base sólida no runtime', () => {
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillText(){}})})};
 const {createWorld}=loadSource('src/game/marsWorld.ts');
 const world=createWorld();
 const key = rect => rect.map(v=>v.toFixed(3)).join(',');
 assert.equal(manifest.colliders.length,129);
 assert.equal(world.obstacles.length,130);
 assert.deepEqual(world.obstacles.slice(0,129).map(r=>key([r.minX,r.maxX,r.minZ,r.maxZ])).sort(),manifest.colliders.map(key).sort());
 assert.deepEqual({...world.obstacles[129]},{minX:-1.68,maxX:1.68,minZ:30.7,maxZ:35.3});
});

async function colonyDoors() {
 const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const bytes=fs.readFileSync('src/assets/colony-v006.glb');
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 loadSource('src/scene/marsColony/layout.ts').applyColonyLayout(scene);
 const world=marsWorld();
 const visibility=new ColonyVisibility(scene,manifest.parts,world.group);
 const doors=[];world.group.traverse(n=>{if(n.name==='PortaAutomatica')doors.push(n);});
 return {scene,world,visibility,doors};
}

test('S6.12: 16 portas alinhadas ao GLB sem interseção durante todo o slide', async () => {
 const {Box3,Triangle}=await import('three');
 const {scene,world,visibility,doors}=await colonyDoors();
 assert.equal(doors.length,16);
 const meshes=[];scene.traverseVisible(n=>{if(n.isMesh)meshes.push({mesh:n,box:new Box3().setFromObject(n)});});
 const box=new Box3(),triangle=new Triangle(),far=new Vector3(1000,0,1000);
 for(const door of doors){
  assert.ok(door.userData.colonyPortal);
  const anchor=door.getWorldPosition(new Vector3());
  for(const amount of [0,0.25,0.5,0.75,1]){
   world.update(far,10);world.update(anchor,amount===1?10:-Math.log(1-amount)/7);
   world.group.updateMatrixWorld(true);
   for(const leaf of door.children){
    if(!leaf.isMesh)continue;
    box.setFromObject(leaf);
    for(const {mesh,box:other} of meshes){
     if(!box.intersectsBox(other))continue;
     const p=mesh.geometry.attributes.position,idx=mesh.geometry.index;
     for(let i=0;i<(idx?idx.count:p.count);i+=3){
      [triangle.a,triangle.b,triangle.c].forEach((v,j)=>v.fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
      assert.equal(box.intersectsTriangle(triangle),false,`${door.userData.colonyPortal}: slide ${amount}, ${mesh.name}`);
     }
    }
   }
  }
 }
 visibility.dispose();
});

test('S6.12: fachada da porta esmaece como um só grupo e nada translúcido escreve profundidade', async () => {
 // Regressão de 17/10/2026: batente, verga, folhas e paredes decidiam o corte
 // separadamente e o contorno verde das portas piscava ao andar. Ver o cabeçalho
 // de src/scene/marsColony/visibility.ts.
 const {world,visibility,doors}=await colonyDoors();
 assert.equal(doors.length,16);
 const parts=new Map(manifest.parts.map(p=>[p.name,p]));
 const materialsOf=group=>group.materials.map(i=>i.material);
 const noTranslucentDepth=()=>{for(const owner of [...visibility.groups,...visibility.followers])for(const item of owner.materials)
  assert.ok(!(item.material.opacity<0.995&&item.material.depthWrite),`${owner.name}: translúcido escrevendo profundidade`);};
 for(const door of doors){
  const portal=door.userData.colonyPortal,group=visibility.groupOfPart.get(portal);
  assert.ok(group,portal);
  // Paredes de apoio, verga e folhas animadas no MESMO grupo do batente.
  for(const wall of parts.get(portal).apoiado_em)assert.equal(visibility.groupOfPart.get(wall),group,`${portal} × ${wall}`);
  if(parts.has(portal+'_Verga'))assert.equal(visibility.groupOfPart.get(portal+'_Verga'),group,`${portal}_Verga`);
  const member=group.members.find(m=>m.node===door);assert.ok(member&&member.dynamic,`${portal}: folhas animadas no grupo`);
  // Atravessa a porta nos quatro ângulos da câmera: todos os materiais do grupo
  // têm sempre a mesma opacidade relativa e ninguém translúcido escreve profundidade.
  const anchor=door.getWorldPosition(new Vector3()),b=parts.get(portal).bounds;
  const alongX=(b.maxX-b.minX)<(b.maxZ-b.minZ);
  for(const angle of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4])for(let f=0;f<90;f++){
   const u=f/89*2-1,player=new Vector3(alongX?anchor.x+3*u:anchor.x,0,alongX?anchor.z:anchor.z+3*u);
   const camera=new Vector3(player.x+Math.cos(angle)*55.14,39.55,player.z+Math.sin(angle)*55.14);
   world.update(player,1/60);visibility.update(player,camera,1/60);
   for(const item of group.materials){
    const base=item.dynamic?item.material.userData.doorOpacity??item.opacity:item.opacity;
    assert.ok(Math.abs(item.material.opacity-base*group.opacity)<1e-9,`${portal}: material fora do fade do grupo`);
    if(item.dynamic)assert.equal(item.material.depthWrite,false);
   }
   noTranslucentDepth();
  }
 }
 // Triângulos das folhas acompanham o slide (buffer preparado na montagem, sem realocar).
 const door=doors[0],group=visibility.groupOfPart.get(door.userData.colonyPortal),member=group.members.find(m=>m.node===door);
 const buffer=member.triangles,anchor=door.getWorldPosition(new Vector3()),camera=new Vector3(anchor.x,20,anchor.z+10);
 world.update(new Vector3(1000,0,1000),10);visibility.update(anchor,camera,1/60);const closed=buffer[0];
 world.update(anchor,10);visibility.update(anchor,camera,1/60);
 assert.equal(member.triangles,buffer);assert.notEqual(buffer[0],closed,'triângulos seguem o slide/escala atual');
 // Cantos entre duas fachadas não decidem: seguem a menor opacidade dos apoios.
 const corners=visibility.followers.filter(f=>f.name.includes('_Canto_'));assert.ok(corners.length>=30);
 for(const corner of corners)assert.equal(corner.opacity,Math.min(...corner.supports.map(s=>s.opacity)),corner.name);
 visibility.dispose();
});

test('S6.12: toda a cobertura usa o fade do teto no mesmo passo, incluindo apoios indiretos', () => {
 const parts=[part('TET_Teste'),part('TET_Teste_Equip',{apoiado_em:['TET_Teste']}),
  part('PROP_Duto',{apoiado_em_todos:['TET_Teste_Equip']}),part('ARQ_Parede'),
  part('PROP_Tela',{apoiado_em:['ARQ_Parede']})];
 const {scene,visibility}=fixture(parts);
 const roof=scene.getObjectByName('TET_Teste');
 const equip=scene.getObjectByName('TET_Teste_Equip'),duct=scene.getObjectByName('PROP_Duto');
 // Peças fora do raio: só a malha do teto deve decidir a obstrução.
 equip.position.x=50;duct.position.x=-50;
 for(let frame=0;frame<400;frame++){
  visibility.update({x:0,z:0},new Vector3(0,2,frame<120?10:-10),1/60);
  assert.equal(equip.material.opacity,roof.material.opacity);
  assert.equal(duct.material.opacity,roof.material.opacity);
  // Peça presa à parede segue a parede (regra 1 de visibility.ts), não fica opaca sobre parede esmaecida.
  assert.equal(scene.getObjectByName('PROP_Tela').material.opacity,scene.getObjectByName('ARQ_Parede').material.opacity);
  assert.equal(equip.visible,true);assert.equal(duct.visible,true);
  if(frame===119)assert.ok(roof.material.opacity<0.081);
 }
 assert.ok(roof.material.opacity>0.999);
 visibility.dispose();
 const {colonyRoofOwners}=loadSource('src/scene/marsColony/roofSupports.ts');
 assert.throws(()=>colonyRoofOwners([part('PROP_Ciclo',{apoiado_em:['PROP_Ciclo']})]),/Ciclo/);
 assert.throws(()=>colonyRoofOwners([part('PROP_SemApoio',{apoiado_em:['ausente']})]),/ausente/);
});

test('S6.12: GLB real mantém zero diferença absoluta entre os 10 apoios e os 9 tetos', async () => {
 const {scene,visibility}=await colonyDoors();
 const {colonyRoofOwners}=loadSource('src/scene/marsColony/roofSupports.ts');
 const owners=colonyRoofOwners(manifest.parts),nodes=new Map();
 scene.traverse(n=>nodes.set(n.userData.colony_name??n.name,n));
 const children=[...owners].filter(([name,owner])=>name!==owner);
 assert.equal(children.length,10);assert.equal(new Set(children.map(([,owner])=>owner)).size,9);
 for(const rootName of new Set(children.map(([,owner])=>owner))){
  const bounds=manifest.parts.find(p=>p.name===rootName).bounds;
  const x=(bounds.minX+bounds.maxX)/2,z=(bounds.minZ+bounds.maxZ)/2;
  const rootMaterials=[];nodes.get(rootName).traverse(n=>{if(n.isMesh)rootMaterials.push(...(Array.isArray(n.material)?n.material:[n.material]));});
  for(let frame=0;frame<400;frame++){
   const player={x:x+(frame<120?0:30),z:z+(frame<120?0:30)};
   visibility.update(player,new Vector3(player.x+18,13.55,player.z+18),1/60);
   for(const [child,owner] of children){if(owner!==rootName)continue;nodes.get(child).traverse(n=>{
    if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])assert.equal(m.opacity,rootMaterials[0].opacity,child);
   });}
   if(frame===119)assert.ok(rootMaterials[0].opacity<0.081,rootName);
  }
  assert.ok(rootMaterials[0].opacity>0.999,rootName);
 }
 visibility.dispose();
});

test('S6.12: caixa física envolve base/foguete já trasladados e deixa desembarque livre', async()=>{
 const {scene,world,visibility}=await colonyDoors();
 const {Box3}=await import('three');
 const {circleIntersectsRect}=loadSource('src/utils/math.ts');
 const {MAPS}=loadSource('src/game/config.ts');
 const {isNearShip}=loadSource('src/state/playerTransient.ts');
 const collider=world.obstacles.at(-1);
 for(const name of ['PLAT_B3_Base_Lancamento','PLAT_B3_Foguete']) {
  const box=new Box3().setFromObject(scene.getObjectByName(name));
  assert.ok(box.min.x>=collider.minX-1e-5&&box.max.x<=collider.maxX+1e-5,name);
  assert.ok(box.min.z>=collider.minZ-1e-5&&box.max.z<=collider.maxZ+1e-5,name);
  if(name==='PLAT_B3_Base_Lancamento')for(const [bound,coordinate] of [['minX',box.min.x],['maxX',box.max.x],['minZ',box.min.z],['maxZ',box.max.z]])assert.ok(Math.abs(collider[bound]-coordinate)<1e-5,bound);
 }
 assert.ok(circleIntersectsRect(0,33,0.36,collider));
 for(const z of [28,29.5,30.25]) {
  assert.equal(world.obstacles.some(r=>circleIntersectsRect(0,z,0.36,r)),false,`acesso Z=${z}`);
  assert.equal(isNearShip('mars',{x:0,y:0,z}),true);
 }
 assert.equal(MAPS.mars.exit.x,0);assert.equal(MAPS.mars.exit.z,29.5);
 visibility.dispose();
});

test('S6.12: Rapier bloqueia a base de todos os lados sem autostep por cima',async()=>{
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url),rapierRequire=createRequire(require.resolve('@react-three/rapier'));
 const R=rapierRequire('@dimforge/rapier3d-compat');await R.init();
 const {PLAYER_PHYSICS:p,PLAYER_MOVEMENT:m,PLAYER_COLLIDER_CENTER_Y:y,PLAYER_COLLIDER_HALF_HEIGHT:halfHeight}=loadSource('src/characters/player/playerConfig.ts');
 const source=marsWorld();
 for(const [start,velocity,axis,edge,direction] of [
  [{x:0,z:29.5},{x:0,z:0.05},'z',30.7,-1],
  [{x:0,z:37},{x:0,z:-0.05},'z',35.3,1],
  [{x:-4,z:33},{x:0.05,z:0},'x',-1.68,-1],
  [{x:4,z:33},{x:-0.05,z:0},'x',1.68,1]
 ]) {
  const world=new R.World({x:0,y:0,z:0});
  try {
   for(const r of source.obstacles)world.createCollider(R.ColliderDesc.cuboid((r.maxX-r.minX)/2,p.obstacleHeight/2,(r.maxZ-r.minZ)/2).setTranslation((r.minX+r.maxX)/2,p.obstacleHeight/2,(r.minZ+r.maxZ)/2));
   const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x,y,start.z));
   const capsule=world.createCollider(R.ColliderDesc.capsule(halfHeight,m.colliderRadius),body);
   const controller=world.createCharacterController(p.controllerOffset);
   controller.enableAutostep(p.autostepMaxHeight,p.autostepMinWidth,false);
   controller.enableSnapToGround(p.snapToGroundDistance);
   world.step();
   for(let i=0;i<160;i++) {
    controller.computeColliderMovement(capsule,{...velocity,y:0});
    const position=body.translation(),delta=controller.computedMovement();
    body.setNextKinematicTranslation({x:position.x+delta.x,y,z:position.z+delta.z});world.step();
   }
   const result=body.translation();
   assert.ok(direction*(result[axis]-edge)>=m.colliderRadius,JSON.stringify({start,result}));
   assert.equal(result.y,y);
  }finally{world.free();}
 }
});
