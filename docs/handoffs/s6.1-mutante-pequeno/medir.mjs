// Medição somente leitura dos GLBs; envelope da pele animada a 60 Hz, sem texturas em Node.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{AnimationMixer,LoopOnce,Box3,Vector3}from'three';
import{loadGlb}from'../../../tests/load-glb.mjs';import{loadSource}from'../../../tests/load-source.mjs';
const{Navigation,clearSegment,traversable}=loadSource('src/combat/navigation.ts');const{hordeEdgeSpawns}=loadSource('src/combat/simulation.ts');
const{createPhase01Terrain,SHANGHAI_PHASE01:d}=loadSource('src/game/shanghai/layout.ts');const{SMALL_MUTANT:M,COMBAT}=loadSource('src/combat/config.ts');
const report={base:'f786255',method:'GLBs reais sem texturas só em memória; vértices skinados a 60 Hz; navegação com raio 0,50 e contato 0,90 até desembarque ARES-I.',assets:{}};
for(const[type,file]of[['animal','src/assets/enemies/mutant-animal.glb'],['organic','src/assets/props/materia-organica.glb'],['large','src/assets/enemies/large-patrol-unit.glb']]){
 const b=fs.readFileSync(file),g=await loadGlb(file);if(type==='large')g.scene.scale.setScalar(3.2/2.08507967);const mixer=new AnimationMixer(g.scene),point=new Vector3(),bounds=new Box3();
 function sample(){g.scene.updateMatrixWorld(true);bounds.makeEmpty();g.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);bounds.expandByPoint(point)}});return{minY:bounds.min.y,maxY:bounds.max.y,width:bounds.max.x-bounds.min.x,height:bounds.max.y-bounds.min.y,length:bounds.max.z-bounds.min.z};}
 const row={bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),rest:sample(),clips:{}};
 for(const clip of g.animations){mixer.stopAllAction();const a=mixer.clipAction(clip);a.reset().setLoop(LoopOnce,1).play();a.clampWhenFinished=true;let minY=Infinity,maxY=-Infinity;const frames=Math.ceil(clip.duration*60);for(let i=0;i<=frames;i++){mixer.setTime(Math.min(clip.duration,i/60));const e=sample();minY=Math.min(minY,e.minY);maxY=Math.max(maxY,e.maxY)}row.clips[clip.name]={duration:clip.duration,minY,maxY,samples:frames+1}}
 report.assets[type]=row;
}
const terrain=createPhase01Terrain(),nav=new Navigation(terrain,M.radius,COMBAT.grid),points=hordeEdgeSpawns(terrain,nav,d.exit,M.radius,M.contactRange);
function route(start){const path=nav.path(start,d.exit);let previous=start,valid=path.length>0&&traversable(start,terrain,M.radius);for(const p of path){valid&&=clearSegment(previous,p,terrain,M.radius);previous=p}const distance=Math.hypot(previous.x-d.exit.x,previous.z-d.exit.z);return{valid:valid&&traversable(previous,terrain,M.radius)&&distance<=M.contactRange,distance,end:previous,segments:path.length}}
const checks=points.map(p=>({...p,...route(p)}));report.navigation={radius:M.radius,contactRange:M.contactRange,nodes:nav.points.length,spawns:d.spawns.map(p=>({...p,...route(p)})),perimeter:checks,valid:checks.filter(p=>p.valid).length,total:points.length,maxDistance:Math.max(...checks.map(p=>p.distance))};
const clips=report.assets.animal.clips;report.aliveEnvelope={minY:Math.min(...['Idle','PatrolWalk','ChaseRun','AggressiveLunge'].map(c=>clips[c].minY)),maxY:Math.max(...['Idle','PatrolWalk','ChaseRun','AggressiveLunge'].map(c=>clips[c].maxY))};
assert.equal(report.navigation.valid,272);assert.ok(report.navigation.spawns.every(p=>p.valid));assert.ok(report.aliveEnvelope.maxY<1.20);assert.ok(report.assets.animal.rest.width>.67&&report.assets.animal.rest.width<.68);
fs.writeFileSync('docs/handoffs/s6.1-mutante-pequeno/medidas.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,navigation:{...report.navigation,spawns:undefined,perimeter:undefined}},null,2));
