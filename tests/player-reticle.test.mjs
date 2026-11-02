import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
const {ReticleAim,ReticleAnimation,reticlePixelScale}=loadSource('src/characters/player/reticle.ts');
const {CombatSimulation}=loadSource('src/combat/simulation.ts');
const {COMBAT,patrolChoice,robotConfig}=loadSource('src/combat/config.ts');
const bounds={minX:-60,maxX:60,minZ:-60,maxZ:60};
const terrain=()=>({bounds,walkableAreas:[bounds],obstacles:[]});
const pose={valid:true,side:0,forward:.7,height:.85};
const player={x:0,y:0,z:0},aim={x:0,z:10};
function robot(id,x,z,kind='patrol'){return{id,x,z,hp:robotConfig({kind}).hp,kind,spawned:true};}
const query=(preview,world,robots,height=.85,point=aim)=>preview.target(player,point,0,pose,height,world,robots);

test('Mira: captura o primeiro inimigo vivo com os mesmos raios/alturas dos quatro tipos',()=>{
 for(const kind of ['patrol','largePatrol','smallMutant','largeMutant']){
  const preview=new ReticleAim(),r=robot(1,0,7,kind),far=robot(2,0,12,kind);
  assert.equal(query(preview,terrain(),[far,r]),r);
  r.hp=0;assert.equal(query(preview,terrain(),[far,r]),far);
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
test('Mira: alcance nasce no cano; cursor perto/atrás conserva a direção do corpo',()=>{
 const preview=new ReticleAim(),world=terrain(),r=robot(1,0,34);
 assert.equal(query(preview,world,[r]),null);
 r.z=COMBAT.rifle.range+.7+robotConfig(r).radius-.01;assert.equal(query(preview,world,[r]),r);
 r.z=6;
 for(const point of [{x:0,z:0},{x:0,z:.5},{x:0,z:-4}]){
  assert.equal(query(preview,world,[r],.85,point),r);assert.ok(preview.marker.z>pose.forward);
 }
 assert.equal(r.hp,robotConfig(r).hp,'consulta não causa dano nem consome disparos');
});
test('Mira: filtro de altura considera o piso e resultado coincide com o tiro real',()=>{
 const world=terrain(),s=new CombatSimulation(world,patrolChoice('smallMutant',1));
 const r=s.robots[0];Object.assign(r,{x:0,z:6,pace:0});const preview=new ReticleAim();
 assert.equal(query(preview,world,s.robots,1.21),null);
 world.surfaceHeight=()=>.25;assert.equal(query(preview,world,s.robots,1.21),r);
 delete world.surfaceHeight;const before=r.hp;
 assert.equal(query(preview,world,s.robots),r);
 assert.equal(s.ammo,COMBAT.rifle.magazine);
 s.step(1/60,{player,muzzle:pose,aim,facingAngle:0,firing:true,reload:false});
 assert.equal(r.hp,before-COMBAT.rifle.damage);assert.equal(s.shots[0].hit,true);
});
test('Mira: captura fecha e pulsa; saída abre, bloqueio reinicia e delta zero congela',()=>{
 const a=new ReticleAnimation();a.update(2,1/60,true);assert.ok(a.scale<1);
 const first=a.scale;for(let i=0;i<60;i++)a.update(2,1/60,true);assert.notEqual(a.scale,first);
 assert.ok(a.scale>.75&&a.scale<.85);const frozen=a.scale;a.update(2,0,true);assert.equal(a.scale,frozen);
 for(let i=0;i<90;i++)a.update(-1,1/60,true);assert.ok(Math.abs(a.scale-1)<1e-5);
 a.update(8,.1,true);a.update(-1,0,false);assert.equal(a.targetId,-1);assert.equal(a.scale,1);
});
test('Mira: 32 pixels CSS em câmeras reais, independente do zoom e distância',()=>{
 const cameras=[new OrthographicCamera(-12,12,8,-8,.1,200),new PerspectiveCamera(50,1.5,.1,200)];
 for(const camera of cameras)for(const zoom of [.7,3])for(const depth of [5,20]){
  camera.zoom=zoom;camera.updateProjectionMatrix();
  const unit=reticlePixelScale(camera.projectionMatrix.elements[5],720,-depth,camera.isOrthographicCamera===true);
  const a=new Vector3(-16*unit,0,-depth).project(camera),b=new Vector3(16*unit,0,-depth).project(camera);
  const px=(b.x-a.x)*1080/2;assert.ok(Math.abs(px-32)<1e-5,`${px}`);
 }
});
