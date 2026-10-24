import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {Box3,Vector3,Raycaster,DoubleSide} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {loadSource} from './load-source.mjs';
const {applyColonyLayout,MARS_CONSOLE_WEST_COLLIDER:consoleBox}=loadSource('src/scene/marsColony/layout.ts');
function createWorld(){
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillText(){}})})};
 return loadSource('src/game/marsWorld.ts').createWorld();
}
const {Navigation,traversable,clearSegment}=loadSource('src/combat/navigation.ts');
const {MAPS}=loadSource('src/game/config.ts');

test('S0.4: consoles reais reposicionados na cópia, Oeste voltado à colônia e fonte intacta',async()=>{
 const bytes=fs.readFileSync('src/assets/colony-v006.glb');
 const {scene:source}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=source.clone(true);applyColonyLayout(scene);
 const center=new Vector3();
 for(const [name,x,z] of [['PLAT_Console_Oeste',-3,25.9],['PLAT_Console_Leste',6.85,31.8]]){
  const node=scene.getObjectByName(name),bounds=new Box3().setFromObject(node);
  bounds.getCenter(center);
  assert.ok(Math.abs(center.x-x)<1e-6 && Math.abs(center.z-z)<1e-6,name);
  assert.equal(bounds.min.y,0,'base apoia no piso sem rebaixar geometria');
  assert.ok(Math.abs(bounds.max.y-1.165939)<1e-5);
  if(name.endsWith('Oeste')){
   assert.ok(bounds.min.x>=consoleBox.minX&&bounds.max.x<=consoleBox.maxX);
   assert.ok(bounds.min.z>=consoleBox.minZ&&bounds.max.z<=consoleBox.maxZ);
   assert.ok(-2-bounds.max.x>=.5,'passarela de 4 m fica livre com folga');
   const screen=new Box3().setFromObject(node.getObjectByName('PLAT_Console_2'));
   assert.ok(screen.getCenter(new Vector3()).z<center.z,'tela voltada ao acesso da colônia, −Z');
  }
 }
 assert.ok(Math.abs(new Box3().setFromObject(source.getObjectByName('PLAT_Console_Oeste')).getCenter(center).x+8.191501)<1e-5);
 assert.ok(Math.abs(new Box3().setFromObject(source.getObjectByName('PLAT_Console_Leste')).getCenter(center).x-8.191501)<1e-5);
 assert.equal(source.getObjectByName('PLAT_Console_Oeste').rotation.y,-Math.PI/2);
});

test('S0.4: só Oeste ganha colisor; passarela, praça, caminho da colônia e embarque livres',()=>{
 const world=createWorld(),radius=.36;
 assert.deepEqual(world.obstacles.at(-1),{...consoleBox});
 assert.equal(world.obstacles.length,133,'126 da colônia + 6 ARES + 1 console; nenhum para rack/tanques');
 assert.equal(traversable({x:-6.75,z:31.6},world,0),false,'rack fica fora da área caminhável');
 assert.equal(traversable({x:-3,z:25.9},world,radius),false);
 assert.equal(world.obstacles.some(b=>b.minX<=6.85&&b.maxX>=6.85&&b.minZ<=31.8&&b.maxZ>=31.8),false,'Leste sem colisor');
 assert.equal(traversable({x:6.85,z:31.8},world,0),false,'Leste continua fora da área caminhável');
 for(const x of [-2,-1,0,1,2])assert.ok(clearSegment({x,z:25},{x,z:27.4},world,radius),'passarela X='+x);
 assert.ok(clearSegment({x:0,z:20},MAPS.mars.exit,world,radius));
 assert.ok(traversable(MAPS.mars.exit,world,radius));
 const nav=new Navigation(world,radius,.5),start={x:0,z:.8},route=nav.path(start,MAPS.mars.exit);
 assert.ok(route.length,'colônia → deck → embarque alcançável');
 let previous=start;
 for(const point of route){assert.ok(clearSegment(previous,point,world,radius));previous=point;}
 assert.ok(Math.hypot(previous.x,previous.z-29.5)<1e-8);
});

test('S0.4: Rapier bloqueia o console Oeste nas quatro aproximações sem autostep',async()=>{
 const require=createRequire(import.meta.url),rapierRequire=createRequire(require.resolve('@react-three/rapier'));
 const R=rapierRequire('@dimforge/rapier3d-compat');await R.init();
 const {PLAYER_PHYSICS:p,PLAYER_MOVEMENT:m,PLAYER_COLLIDER_CENTER_Y:y,PLAYER_COLLIDER_HALF_HEIGHT:half}=loadSource('src/characters/player/playerConfig.ts');
 const source=createWorld();
 for(const [start,velocity,axis,edge,direction] of [
  [{x:-4.6,z:25.9},{x:.05,z:0},'x',consoleBox.minX,-1],
  [{x:-1.3,z:25.9},{x:-.05,z:0},'x',consoleBox.maxX,1],
  [{x:-3,z:24.2},{x:0,z:.05},'z',consoleBox.minZ,-1],
  [{x:-3,z:27.6},{x:0,z:-.05},'z',consoleBox.maxZ,1]
 ]){
  const world=new R.World({x:0,y:0,z:0});
  try{
   for(const r of source.obstacles)world.createCollider(R.ColliderDesc.cuboid((r.maxX-r.minX)/2,p.obstacleHeight/2,(r.maxZ-r.minZ)/2).setTranslation((r.minX+r.maxX)/2,p.obstacleHeight/2,(r.minZ+r.maxZ)/2));
   const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x,y,start.z));
   const capsule=world.createCollider(R.ColliderDesc.capsule(half,m.colliderRadius),body);
   const controller=world.createCharacterController(p.controllerOffset);
   controller.enableAutostep(p.autostepMaxHeight,p.autostepMinWidth,false);controller.enableSnapToGround(p.snapToGroundDistance);
   world.step();
   for(let i=0;i<100;i++){
    controller.computeColliderMovement(capsule,{...velocity,y:0});
    const position=body.translation(),delta=controller.computedMovement();
    body.setNextKinematicTranslation({x:position.x+delta.x,y,z:position.z+delta.z});world.step();
   }
   const result=body.translation();
   assert.ok(direction*(result[axis]-edge)>=m.colliderRadius-.001,JSON.stringify({start,result}));
   assert.equal(result.y,y);
  }finally{world.free();}
 }
});


test('S0.4: rack junto ao deck recebe ponta original do tubo; tanques grandes imóveis',async()=>{
 const read=async file=>{const b=fs.readFileSync(file);return(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
 const source=await read('src/assets/colony-v006.glb'),scene=source.clone(true);
 const originalTanks=new Box3().setFromObject(source.getObjectByName('PROP_Tanques'));
 applyColonyLayout(scene);
 const rack=scene.getObjectByName('PLAT_Rack_Cilindros'),box=new Box3().setFromObject(rack),center=box.getCenter(new Vector3());
 assert.ok(Math.abs(center.x+6.75)<1e-6&&Math.abs(center.z-31.6)<1e-6);
 assert.equal(rack.rotation.y,0,'fileira recebe tubo na ponta oeste');
 const deck=await read('src/assets/ares-mars/deck-mars.glb');deck.position.z=33;
 const deckBox=new Box3().setFromObject(deck);
 assert.ok(deckBox.min.x-box.max.x>=.05&&deckBox.min.x-box.max.x<.1,'folga visual mínima de 7 cm sem atravessar para-choques');
 assert.ok(box.max.x<-6,'rack inteiro fora da área caminhável do deck');
 assert.ok(originalTanks.equals(new Box3().setFromObject(scene.getObjectByName('PROP_Tanques'))));
 const pipe=scene.getObjectByName('PROP_Tanques_2'),originalPipe=source.getObjectByName('PROP_Tanques_2');
 assert.equal(pipe.geometry,originalPipe.geometry);
 assert.deepEqual(pipe.matrixWorld.toArray(),originalPipe.matrixWorld.toArray(),'tubo fundido não se move');
 const vertices=pipe.geometry.attributes.position,endX=new Box3().setFromObject(pipe).max.x,tipBounds=new Box3();
 for(let i=0;i<vertices.count;i++){
  const p=new Vector3().fromBufferAttribute(vertices,i).applyMatrix4(pipe.matrixWorld);
  if(Math.abs(p.x-endX)<1e-6)tipBounds.expandByPoint(p);
 }
 const tip=tipBounds.getCenter(new Vector3()),cylinders=[];
 assert.ok(Math.abs(tip.x+7.25)<1e-5&&Math.abs(tip.z-31.6)<1e-5);
 rack.traverse(n=>{if(n.isMesh&&['M_Painel','M_Foguete_Casco'].includes(n.material.name)){n.material=n.material.clone();n.material.side=DoubleSide;cylinders.push(n);}});
 for(const sign of [-1,1]){
  const hit=new Raycaster(tip,new Vector3(sign,0,0)).intersectObjects(cylinders,false)[0];
  assert.ok(hit&&hit.distance>0&&hit.distance<.24,'ponta dentro do cilindro real, sem conexão só por AABB');
 }
});
