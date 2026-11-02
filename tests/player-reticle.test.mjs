import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
const {RETICLE,ReticleAim,ReticleAnimation,reticlePixelScale,reticleVisible}=loadSource('src/characters/player/reticle.ts');
const {ReticleGeometry}=loadSource('src/characters/player/reticleGeometry.ts');
const {CombatSimulation}=loadSource('src/combat/simulation.ts');
const {COMBAT,patrolChoice,robotConfig}=loadSource('src/combat/config.ts');
const bounds={minX:-60,maxX:60,minZ:-60,maxZ:60};
const terrain=()=>({bounds,walkableAreas:[bounds],obstacles:[]});
const pose={valid:true,side:0,forward:.7,height:.85};
const player={x:0,y:0,z:0},aim={x:0,z:7};
function robot(id,x,z,kind='patrol'){return{id,x,z,hp:robotConfig({kind}).hp,kind,spawned:true};}
const query=(preview,world,robots,height=.85,point=aim)=>preview.target(player,point,0,pose,height,world,robots);

test('Mira: captura o primeiro inimigo vivo com os mesmos raios/alturas dos quatro tipos',()=>{
 for(const kind of ['patrol','largePatrol','smallMutant','largeMutant']){
  const preview=new ReticleAim(),r=robot(1,0,7,kind),far=robot(2,0,12,kind);
  assert.equal(query(preview,terrain(),[far,r]),r);
  r.hp=0;assert.equal(query(preview,terrain(),[far,r],.85,far),far);
  far.hp=0;assert.equal(query(preview,terrain(),[far,r]),null);
 }
});
test('Mira: paredes e caixas à altura do tiro impedem captura, inclusive entre centro e cano',()=>{
 const preview=new ReticleAim(),r=robot(1,0,7),world=terrain();
 for(const z of [.3,3]){
  world.obstacles=[{minX:-1,maxX:1,minZ:z,maxZ:z+.2,minY:0,maxY:1.195}];
  assert.equal(query(preview,world,[r]),null);
  world.obstacles[0].maxY=.84;assert.equal(query(preview,world,[r]),r,'obstáculo abaixo do tiro');
  delete world.obstacles[0].minY;delete world.obstacles[0].maxY;assert.equal(query(preview,world,[r]),null,'volume sem altura');
 }
});
test('Mira: alcance nasce no cano; cursor perto/atrás fica livre sem inverter o tiro',()=>{
 const preview=new ReticleAim(),world=terrain(),r=robot(1,0,34);
 assert.equal(query(preview,world,[r],.85,r),null);
 r.z=COMBAT.rifle.range+.7+robotConfig(r).radius-.01;assert.equal(query(preview,world,[r],.85,r),r);
 r.z=6;
 for(const point of [{x:0,z:0},{x:0,z:.5},{x:0,z:-4}]){
  assert.equal(query(preview,world,[r],.85,point),null);assert.deepEqual(preview.marker,point);
 }
 assert.equal(r.hp,robotConfig(r).hp,'consulta não causa dano nem consome disparos');
});
test('Mira: filtro de altura considera o piso e resultado coincide com o tiro real',()=>{
 const world=terrain(),s=new CombatSimulation(world,patrolChoice('smallMutant',1));
 const r=s.robots[0];Object.assign(r,{x:0,z:6,pace:0});const preview=new ReticleAim();
 assert.equal(query(preview,world,s.robots,1.21,r),null);
 world.surfaceHeight=()=>.25;assert.equal(query(preview,world,s.robots,1.21,r),r);
 delete world.surfaceHeight;const before=r.hp;
 assert.equal(query(preview,world,s.robots,.85,r),r);
 assert.equal(s.ammo,COMBAT.rifle.magazine);
 s.step(1/60,{player,muzzle:pose,aim,facingAngle:0,firing:true,reload:false});
 assert.equal(r.hp,before-COMBAT.rifle.damage);assert.equal(s.shots[0].hit,true);
});
test('Mira: captura fecha e pulsa; saída abre, bloqueio reinicia e delta zero congela',()=>{
 const a=new ReticleAnimation();a.update(2,1/60,true);assert.ok(a.spread<RETICLE.normalSpread);
 const first=a.spread;for(let i=0;i<60;i++)a.update(2,1/60,true);assert.notEqual(a.spread,first);
 assert.ok(a.spread>9.5&&a.spread<10.5);const frozen=a.spread;a.update(2,0,true);assert.equal(a.spread,frozen);
 for(let i=0;i<90;i++)a.update(-1,1/60,true);assert.ok(Math.abs(a.spread-RETICLE.normalSpread)<.001);
 a.update(8,.1,true);a.update(-1,0,false);assert.equal(a.targetId,-1);assert.equal(a.spread,RETICLE.normalSpread);
});
test('Mira: 40 pixels CSS em câmeras reais, independente do zoom e distância',()=>{
 const cameras=[new OrthographicCamera(-12,12,8,-8,.1,200),new PerspectiveCamera(50,1.5,.1,200)];
 for(const camera of cameras)for(const zoom of [.7,3])for(const depth of [5,20]){
  camera.zoom=zoom;camera.updateProjectionMatrix();
  const unit=reticlePixelScale(camera.projectionMatrix.elements[5],720,-depth,camera.isOrthographicCamera===true);
  const a=new Vector3(-20*unit,0,-depth).project(camera),b=new Vector3(20*unit,0,-depth).project(camera);
  const px=(b.x-a.x)*1080/2;assert.ok(Math.abs(px-40)<1e-5,`${px}`);
 }
});


test('Mira: só captura sob o cursor, sem travar em inimigo noutro trecho da linha',()=>{
 const preview=new ReticleAim(),world=terrain(),r=robot(1,0,7),front=robot(2,0,3);
 assert.equal(query(preview,world,[r],.85,{x:0,z:4}),null);
 assert.equal(query(preview,world,[r],.85,{x:0,z:10}),null);
 assert.equal(query(preview,world,[r],.85,r),r);
 assert.equal(query(preview,world,[r,front],.85,r),null,'outro inimigo na frente impede captura do alvo sob o cursor');
 front.hp=0;assert.equal(query(preview,world,[r,front],.85,r),r);
});

test('Mira: chevrons se aproximam sem encolher o ponto ou os traços; buffer é reaproveitado',()=>{
 const cursor=new ReticleGeometry(),array=cursor.geometry.attributes.position.array,before=Array.from(array);
 cursor.setSpread(RETICLE.targetSpread);
 assert.equal(cursor.geometry.attributes.position.array,array);
 let dot=0,corners=0;
 for(let i=0;i<array.length;i+=3){
  const x=before[i],y=before[i+1];
  if(Math.max(Math.abs(x),Math.abs(y))<5){
   assert.deepEqual(Array.from(array.slice(i,i+3)),before.slice(i,i+3));dot++;
  }else{
   const horizontal=Math.abs(x)>Math.abs(y),axis=horizontal?i:i+1,tangent=horizontal?i+1:i;
   assert.equal(array[axis],before[axis]-Math.sign(before[axis])*7);
   assert.equal(array[tangent],before[tangent]);corners++;
  }
 }
 assert.ok(dot>0&&corners===24);
 cursor.setSpread(RETICLE.normalSpread);assert.deepEqual(Array.from(array),before);
 cursor.geometry.dispose();
});

test('Mira: permanece personalizada no Dash; pausa e saída do ponteiro escondem',()=>{
 const {playerActions}=loadSource('src/state/playerActions.ts');
 for(const dashing of [false,true]){
  playerActions.dashing=dashing;
  assert.equal(reticleVisible(false,true),true);
  assert.equal(reticleVisible(true,true),false);
  assert.equal(reticleVisible(false,false),false);
 }
 playerActions.dashing=false;
});
