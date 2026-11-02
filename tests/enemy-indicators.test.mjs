import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Matrix4, OrthographicCamera, Vector3 } from 'three';
import { loadSource } from './load-source.mjs';
const {ENEMY_INDICATORS:C,EnemyIndicatorState,EnemyIndicators,enemyIndicatorHeight}=loadSource('src/combat/enemyIndicators.ts');
const {robotConfig,patrolChoice}=loadSource('src/combat/config.ts');
const {CombatSimulation}=loadSource('src/combat/simulation.ts');
const kinds=['patrol','largePatrol','smallMutant','largeMutant'];
function robot(kind='patrol',id=0){return{kind,id,x:0,z:6,hp:robotConfig({kind}).hp,spawned:true,generation:1,flash:0};}
const close=(a,b,epsilon=1e-5)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);

test('Vida inimiga: quatro tipos usam HP próprio e barra proporcional; não há acerto ao nascer',()=>{
 const state=new EnemyIndicatorState(4);
 kinds.forEach((kind,i)=>{
  const r=robot(kind,i);state.update(i,r,0);assert.equal(state.ratio,1);assert.equal(state.showBar,true);assert.equal(state.showHit,false);
  close(enemyIndicatorHeight(r),robotConfig(r).hitHeight.maxY+C.aboveHead);
  r.hp/=2;state.update(i,r,1/60);close(state.ratio,.5);assert.equal(state.showHit,true);
 });
});
test('Acerto inimigo: marcador é por vítima, repete a cada dano e congela com delta zero',()=>{
 const state=new EnemyIndicatorState(2),a=robot(),b=robot('largeMutant',1);
 state.update(0,a,0);state.update(1,b,0);a.hp-=25;
 state.update(0,a,1/60);assert.equal(state.showHit,true);assert.ok(state.hitAlpha>.99);
 state.update(1,b,1/60);assert.equal(state.showHit,false);
 state.update(0,a,.1);const alpha=state.hitAlpha,progress=state.hitProgress;
 state.update(0,a,0);assert.equal(state.hitAlpha,alpha);assert.equal(state.hitProgress,progress);
 a.hp-=25;state.update(0,a,.02);assert.ok(state.hitAlpha>.99,'segundo tiro reinicia animação');
 state.update(0,a,C.hitDuration+.01);assert.equal(state.showHit,false);
});
test('Vida/acerto inimigo: tiro letal mostra acerto sem barra; despawn e geração nova limpam o pool',()=>{
 const state=new EnemyIndicatorState(1),r=robot('smallMutant');state.update(0,r,0);
 r.hp=0;state.update(0,r,1/60);assert.equal(state.showBar,false);assert.equal(state.ratio,0);assert.equal(state.showHit,true);
 r.spawned=false;state.update(0,r,0);assert.equal(state.showHit,false);
 r.spawned=true;r.generation++;r.kind='largePatrol';r.hp=150;state.update(0,r,0);
 assert.equal(state.ratio,1);assert.equal(state.showHit,false);
 r.hp=125;r.flash=.15;r.generation++;state.update(0,r,0);assert.equal(state.showHit,true,'primeiro quadro já atingido também aparece');
});
test('Barras instanciadas: acima da cabeça/piso, largura de 56 px e preenchimento ancorado à esquerda',()=>{
 const indicator=new EnemyIndicators(1),r=robot(),visual=new Group();r.hp/=2;visual.position.set(4,.25,-6);visual.rotation.y=.8;
 const alert=new Group();visual.add(alert);visual.updateMatrixWorld(true);
 const camera=new OrthographicCamera(-12,12,8,-8,.1,200);camera.position.set(18,14,18);camera.lookAt(0,0,0);
 for(const zoom of [.7,3]){
  camera.zoom=zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  indicator.update([r],[visual],camera,720,0,[alert]);
  const border=new Matrix4(),fill=new Matrix4(),track=new Matrix4();
  indicator.border.getMatrixAt(0,border);indicator.fill.getMatrixAt(0,fill);indicator.track.getMatrixAt(0,track);
  visual.updateMatrixWorld(true);
  const alertPosition=alert.getWorldPosition(new Vector3()).project(camera),barPosition=new Vector3().setFromMatrixPosition(border).project(camera);
  close((alertPosition.x-barPosition.x)*540,C.alertOffset,.001);close((alertPosition.y-barPosition.y)*360,0,.001);
  const center=new Vector3().setFromMatrixPosition(border);close(center.y,.25+enemyIndicatorHeight(r));close(center.x,4);close(center.z,-6);
  const screen=(x,matrix)=>new Vector3(x,0,0).applyMatrix4(matrix).project(camera);
  const a=screen(-28,border),b=screen(28,border);close(Math.hypot((b.x-a.x)*540,(b.y-a.y)*360),56);
  assert.ok(new Vector3(-26,0,0).applyMatrix4(fill).distanceTo(new Vector3(-26,0,0).applyMatrix4(track))<1e-5);
  const f0=screen(-26,fill),f1=screen(26,fill);close(Math.hypot((f1.x-f0.x)*540,(f1.y-f0.y)*360),26);
 }
 assert.equal(indicator.root.children.length,4);assert.equal(indicator.fill.material.color.getHexString(),C.fill.slice(1));
 assert.equal(indicator.hit.material.uniforms.color.value.getHexString(),C.hit.slice(1));indicator.dispose();
});
test('Indicadores: 44 slots reutilizados, mortos/inativos não desenham barra e acertos letais expiram',()=>{
 const indicator=new EnemyIndicators(44),robots=Array.from({length:44},(_,i)=>robot(kinds[i%4],i)),visuals=robots.map(()=>new Group());
 const camera=new OrthographicCamera(-12,12,8,-8,.1,200);camera.position.set(0,10,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 for(let i=1;i<44;i+=2)robots[i].spawned=false;
 indicator.update(robots,visuals,camera,720,0);assert.equal(indicator.border.count,22);assert.equal(indicator.hit.count,0);
 const buffer=indicator.fill.instanceMatrix.array,alpha=indicator.hit.geometry.attributes.hitAlpha.array;
 robots[0].hp=0;indicator.update(robots,visuals,camera,720,1/60);assert.equal(indicator.fill.count,21);assert.equal(indicator.hit.count,1);
 indicator.update(robots,visuals,camera,720,C.hitDuration+.01);assert.equal(indicator.hit.count,0);
 assert.equal(indicator.fill.instanceMatrix.array,buffer);assert.equal(indicator.hit.geometry.attributes.hitAlpha.array,alpha);
 indicator.dispose();
});
test('Tiro real: só a vítima perde barra e recebe marcador; obstáculo não dispara feedback inimigo',()=>{
 const bounds={minX:-20,maxX:20,minZ:-20,maxZ:20};
 for(const blocked of [false,true]){
  const terrain={bounds,walkableAreas:[bounds],obstacles:blocked?[{minX:-1,maxX:1,minZ:3,maxZ:3.5}]:[]};
  const sim=new CombatSimulation(terrain,patrolChoice('patrol',3));
  Object.assign(sim.robots[0],{x:0,z:6});Object.assign(sim.robots[1],{x:6,z:6});Object.assign(sim.robots[2],{x:-6,z:6});
  const state=new EnemyIndicatorState(3);sim.robots.forEach((r,i)=>state.update(i,r,0));
  sim.step(1/60,{player:{x:0,z:0},aim:{x:0,z:6},facingAngle:0,muzzle:{valid:true,side:0,forward:.7,height:.85},firing:true,reload:false});
  sim.robots.forEach((r,i)=>{state.update(i,r,1/60);assert.equal(state.showHit,!blocked&&i===0);close(state.ratio,!blocked&&i===0?50/75:1);});
 }
});
